// scripts/importer-ordre-choix.js
//
// Amorce la CHAÎNE des ordres de choix à partir d'une liste officielle
// (« ORDRE DE CHOIX <PERIODE>.xlsx », produite par la coordinatrice).
//
// ── POURQUOI ────────────────────────────────────────────────────────────────
// L'ordre de choix ne se recalcule pas de zéro : il se transmet de trimestre en
// trimestre (les N=10 premiers basculent en bas, cf. src/utils/ordreChoix.js).
// Il faut donc un point de départ RÉEL en base ; sans lui, l'application n'a
// d'autre choix que de partir d'un ordre alphabétique, qui n'a rien à voir avec
// la liste historique. UNE seule liste suffit : la règle ne lit jamais plus loin
// que le trimestre précédent.
//
// ── POURQUOI LE RAPPROCHEMENT DES NOMS EST OBLIGATOIRE ──────────────────────
// Les noms stockés doivent correspondre CARACTÈRE POUR CARACTÈRE à
// `${medecin.nom} ${medecin.prenom}` en base : planningGeneratorPriorite.js
// construit `mapMedecinNomVersId[nomComplet]` et planningCore.js y accède par
// clé directe. Une orthographe qui diffère d'un accent ou d'un trait d'union ne
// lève AUCUNE erreur — le médecin est simplement sauté à son tour de choix.
// Pire, au trimestre suivant genererProchainOrdreChoix() le verrait « parti »
// tout en voyant son homologue de la base « nouveau » : la liste se corromprait
// d'elle-même, silencieusement.
// La feuille de la coordinatrice est saisie à la main : sur ASO26, 10 noms sur
// 48 ne tombaient pas juste. Ce script les rapproche et n'écrit QUE des noms
// existant en base.
//
// Le document écrit est `planning/ordre_choix_<AAAA-MM>` (mois de DÉBUT du
// trimestre) : c'est exactement ce que lit l'application. Il ne porte pas de
// champ `startDate`, pour ne pas être confondu avec un planning.
//
// ── Utilisation ─────────────────────────────────────────────────────────────
//   node importer-ordre-choix.js "../ORDRE DE CHOIX ASO26.xlsx" 2026-08        # aperçu
//   node importer-ordre-choix.js "../ORDRE DE CHOIX ASO26.xlsx" 2026-08 --go   # écrit
//
// Options :
//   --go                      exécute réellement (sans lui : aperçu, rien n'est écrit)
//   --projet <id>             projet Firebase (défaut : lu dans .firebaserc)
//   --libelle <s>             étiquette humaine (défaut : déduite du nom de fichier)
//   --retirer-inconnus        retire les noms sans compte en base (médecins partis)
//   --correspondances <f.json>  table « nom de la feuille » -> « nom en base »
//                             pour les cas qu'aucune règle ne peut trancher
//   --force                   réécrit le trimestre même s'il existe déjà

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { creerSession } = require('./lib/session-cli');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const valeur = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OPTIONS_A_VALEUR = ['--projet', '--libelle', '--correspondances'];
const positionnels = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && OPTIONS_A_VALEUR.includes(argv[i - 1])));

const FICHIER = positionnels[0];
const ID_PERIODE = positionnels[1];
const GO = flag('--go');
const FORCE = flag('--force');
const RETIRER_INCONNUS = flag('--retirer-inconnus');

const texte = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return String(v.text ?? v.result ?? (v.richText || []).map((r) => r.text).join('') ?? '');
  return String(v);
};

const nettoyer = (s) => texte(s).replace(/\s+/g, ' ').trim();

// ── Rapprochement des noms ───────────────────────────────────────────────────
// Clé tolérante : accents, casse, traits d'union, apostrophes et barres obliques
// ignorés. « CASTINETTI/BRUN Céline » et « CASTINETTI Céline » partagent le
// début ; « SINANIAN Jean Paul » et « SINANIAN Jean-Paul » deviennent identiques.
const cle = (s) => nettoyer(s)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toUpperCase()
  .replace(/[-'’/.]/g, ' ')
  .replace(/[^A-Z0-9 ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const cleCollee = (s) => cle(s).replace(/ /g, '');           // « M RABET » = « MRABET »
const jetons = (s) => cle(s).split(' ').filter(Boolean);
const cleJetonsTries = (s) => [...jetons(s)].sort().join(' '); // « LEROY-STEFANI » = « STEFANI-LEROY »

// Renvoie { id, nom, motif } — nom = orthographe DE LA BASE — ou null.
// C'est l'IDENTIFIANT qui sera stocké ; le nom n'accompagne que pour relecture.
// Chaque niveau exige une correspondance UNIQUE : deux candidats = ambiguïté,
// qu'on refuse de trancher toute seule.
const rapprocher = (nomFeuille, medecins) => {
  const unique = (predicat, motif) => {
    const trouves = medecins.filter(predicat);
    return trouves.length === 1 ? { id: trouves[0].id, nom: trouves[0].nomComplet, motif } : null;
  };
  return (
    unique((m) => m.nomComplet === nettoyer(nomFeuille), 'exact') ||
    unique((m) => m.cle === cle(nomFeuille), 'accents / casse / trait d’union') ||
    unique((m) => m.cleCollee === cleCollee(nomFeuille), 'espacement du nom de famille') ||
    unique((m) => m.cleJetons === cleJetonsTries(nomFeuille), 'nom composé inversé') ||
    // Dernier recours : tous les mots de la base figurent dans le nom de la
    // feuille (« CASTINETTI/BRUN Céline » -> « CASTINETTI Céline »).
    unique((m) => m.jetons.length >= 2 && m.jetons.every((j) => jetons(nomFeuille).includes(j)), 'nom composé raccourci en base')
  );
};

// ── Lecture de la feuille ────────────────────────────────────────────────────
// La feuille place un rang numéroté devant chaque nom ; on repère donc les
// cellules qui suivent un entier, colonne par colonne.
async function lireListes(fichier) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(fichier);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Classeur vide.');

  const parRang = new Map();
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cellule, col) => {
      const rang = Number(nettoyer(cellule.value));
      if (!Number.isInteger(rang) || rang < 1) return;
      const nom = nettoyer(row.getCell(col + 1).value);
      if (!nom) return;
      if (!parRang.has(col + 1)) parRang.set(col + 1, new Map());
      parRang.get(col + 1).set(rang, nom);
    });
  });

  const colonnes = [...parRang.entries()]
    .filter(([, m]) => m.size >= 5)         // ignore les colonnes accessoires
    .sort((a, b) => a[0] - b[0])
    .map(([, m]) => [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, nom]) => nom));

  if (colonnes.length === 0) throw new Error('Aucune colonne « rang + nom » détectée dans la feuille.');
  return { premierTour: colonnes[0], deuxiemeTour: colonnes[1] || [...colonnes[0]].reverse() };
}

const libelleDepuisNom = (fichier) => {
  const base = path.basename(fichier, path.extname(fichier));
  const m = base.match(/ORDRE\s+DE\s+CHOIX\s+(.+)$/i);
  return m ? m[1].trim() : base;
};

(async () => {
  if (!FICHIER || !/^\d{4}-\d{2}$/.test(ID_PERIODE || '')) {
    console.error('Usage : node importer-ordre-choix.js <fichier.xlsx> <AAAA-MM du 1er mois> [--go] [--force]');
    process.exit(1);
  }

  const brut = await lireListes(FICHIER);
  const libelle = valeur('--libelle', libelleDepuisNom(FICHIER));
  const chemin = `planning/ordre_choix_${ID_PERIODE}`;

  // Cohérence de la feuille elle-même, AVANT tout rapprochement.
  const inverseBrut = [...brut.premierTour].reverse();
  const feuilleCoherente = brut.deuxiemeTour.length === brut.premierTour.length &&
    brut.deuxiemeTour.every((n, i) => n === inverseBrut[i]);

  const session = await creerSession({ projet: valeur('--projet', null) });
  const medecins = (await session.lister('users'))
    .filter((u) => u.role === 'medecin')
    .map((u) => {
      const nomComplet = `${u.nom} ${u.prenom}`.trim();
      return {
        id: u.id,
        nomComplet,
        cle: cle(nomComplet),
        cleCollee: cleCollee(nomComplet),
        cleJetons: cleJetonsTries(nomComplet),
        jetons: jetons(nomComplet),
      };
    });

  const table = valeur('--correspondances', null)
    ? JSON.parse(fs.readFileSync(valeur('--correspondances', null), 'utf8'))
    : {};

  const resolus = [];   // { id, nom }
  const corriges = [];
  const inconnus = [];
  brut.premierTour.forEach((nomFeuille) => {
    const force = table[nomFeuille];
    const parNom = force ? medecins.find((m) => m.nomComplet === force) : null;
    const trouve = force
      ? (parNom ? { id: parNom.id, nom: parNom.nomComplet, motif: 'table de correspondances' } : null)
      : rapprocher(nomFeuille, medecins);
    if (!trouve) { inconnus.push(nomFeuille); return; }
    if (trouve.nom !== nomFeuille) corriges.push({ feuille: nomFeuille, base: trouve.nom, motif: trouve.motif });
    resolus.push(trouve);
  });

  const doublons = resolus.map((r) => r.nom).filter((n, i, t) => t.indexOf(n) !== i);
  const dansListe = new Set(resolus.map((r) => r.id));
  const absentsDeLaListe = medecins.filter((m) => !dansListe.has(m.id)).map((m) => m.nomComplet);

  console.log(`\nFichier   : ${FICHIER}`);
  console.log(`Trimestre : ${ID_PERIODE} (${libelle})`);
  console.log(`Document  : ${chemin}`);
  console.log(`Base      : ${medecins.length} médecins`);
  console.log(`\nFeuille : ${brut.premierTour.length} noms — 2ᵉ tour ${feuilleCoherente ? 'exactement l’inverse du 1er ✓' : '⚠️ N’EST PAS l’inverse du 1er'}`);

  console.log(`\nRapprochement : ${resolus.length - corriges.length} exacts, ${corriges.length} corrigés, ${inconnus.length} sans compte.`);
  if (corriges.length) {
    console.log('\n  Orthographes alignées sur la base :');
    corriges.forEach((c) => console.log(`    « ${c.feuille} » → « ${c.base} »   (${c.motif})`));
  }
  if (inconnus.length) {
    console.log('\n  ⚠️  Aucun compte en base pour :');
    inconnus.forEach((n) => console.log(`    « ${n} »`));
    console.log(RETIRER_INCONNUS
      ? '  → retirés de la liste (--retirer-inconnus).'
      : '  → ces noms ne correspondraient à AUCUN médecin : sautés silencieusement à leur tour\n' +
        '    de choix. Ajoutez --retirer-inconnus (s’ils ont quitté la garde) ou créez leur\n' +
        '    compte, ou tranchez au cas par cas avec --correspondances <fichier.json>.');
  }
  if (doublons.length) {
    console.log(`\n  ✗ Deux lignes de la feuille pointent le même médecin : ${[...new Set(doublons)].join(', ')}`);
  }
  if (absentsDeLaListe.length) {
    console.log(`\n  ℹ️  ${absentsDeLaListe.length} médecin(s) en base absent(s) de cette liste — normal pour des`);
    console.log('     arrivées postérieures : la règle de bascule les insérera au trimestre suivant.');
    absentsDeLaListe.forEach((n) => console.log(`    « ${n} »`));
  }

  if (doublons.length) {
    throw new Error('Doublons dans la liste rapprochée — corrigez la feuille avant d’importer.');
  }
  if (inconnus.length && !RETIRER_INCONNUS) {
    throw new Error('Des noms n’ont pas pu être rapprochés — rien n’a été écrit.');
  }

  const premierTourIds = resolus.map((r) => r.id);
  const deuxiemeTourIds = [...premierTourIds].reverse();
  const premierTour = resolus.map((r) => r.nom);
  const deuxiemeTour = [...premierTour].reverse();

  console.log(`\n1er tour retenu (${premierTour.length}) :`);
  resolus.forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. ${r.nom.padEnd(26)} ${r.id}`));

  const existant = await session.get(chemin);
  if (existant && !FORCE) {
    console.log(`\n⚠️  ${chemin} existe déjà (${existant.premierTour?.length || 0} médecins). Ajoutez --force pour le remplacer.`);
    return;
  }

  if (!GO) {
    console.log('\nAperçu seul — rien n’a été écrit. Ajoutez --go pour enregistrer.');
    return;
  }

  await session.ecrire(chemin, {
    idPeriode: ID_PERIODE,
    libelle,
    baseSur: null,
    source: `import ${path.basename(FICHIER)}`,
    // Ce qui fait foi : les identifiants. Les noms n'accompagnent que pour
    // qu'un humain puisse relire le document.
    premierTourIds,
    deuxiemeTourIds,
    premierTour,
    deuxiemeTour,
  });
  console.log(`\n✓ ${chemin} enregistré (projet ${session.projet}).`);
})().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
