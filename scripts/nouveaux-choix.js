// scripts/nouveaux-choix.js
//
// LANCE UN NOUVEAU TRIMESTRE DE CHOIX, en un seul geste :
//
//   1. écrit la PÉRIODE DE SAISIE (planning/periode_saisie) — sans supprimer
//      aucun desiderata, comme basculer-periode-saisie.js ;
//   2. EFFACE LE CODE DE TOUS LES MÉDECINS : chacun fixera le sien à sa
//      première connexion, et ce code vaudra pour tout le trimestre ;
//   3. OUVRE la fenêtre d'inscription (config/inscription.open) — sans elle,
//      personne ne peut définir son code, donc personne ne peut se connecter.
//
// L'ordre compte : la fenêtre est ouverte EN DERNIER, quand tout le reste est
// en place.
//
// ── Pourquoi un script et pas un bouton dans l'application ───────────────────
// Le SDK client Firebase ne permet de changer que le mot de passe de
// l'utilisateur CONNECTÉ. Effacer le code des autres comptes exige les droits
// projet — donc un outil hors application. Ici, ce sont les droits de la
// session du CLI Firebase (`npx firebase-tools login`), pas une clé de compte
// de service.
//
// ── Ce que « effacer le code » veut dire techniquement ───────────────────────
// Le mot de passe du compte est remis à la valeur partagée CODE_A_RECLAMER
// (src/constants/claim.js). Un compte dans cet état accepte, à la première
// connexion, n'importe quel code à 6 chiffres : celui que le médecin tape
// DEVIENT le sien (src/services/authService.js → loginMedecin).
//
// ⚠️ IRRÉVERSIBLE : les codes en cours ne sont pas récupérables (Firebase ne
// stocke que des empreintes).
//
// En revanche, ce n'est PAS un verrouillage : tant que la fenêtre d'inscription
// est ouverte, un médecin qui retape son code habituel se reconnecte
// normalement — l'app échoue, réessaie avec le code partagé, puis adopte le
// code tapé. Il ne voit rien. Seul celui qui a OUBLIÉ son code en choisit un
// nouveau, ce qui est le but. Aucune annonce n'est donc nécessaire.
//
// Le premier code tapé après la remise à zéro est confirmé par une SECONDE
// saisie (écran de connexion) : une faute de frappe ne peut plus devenir le
// code du médecin à son insu.
//
// ⚠️ Tant que la fenêtre d'inscription reste ouverte, un compte dont le code
// n'a pas encore été défini peut être pris par un tiers qui connaît la valeur
// partagée (elle est dans le bundle, donc publique — risque assumé, cf.
// AUDIT.md). Referme-la (app → Gestion des utilisateurs) une fois que tout le
// monde s'est connecté.
//
// Les desiderata ne sont PAS touchés : ceux des trimestres passés restent
// consultables (cf. la note dans src/services/planningService.js).
//
// ── Utilisation ──────────────────────────────────────────────────────────────
//   node nouveaux-choix.js                              # état actuel, rien écrit
//   node nouveaux-choix.js 2026-11-01 2027-01-31        # aperçu du lancement
//   node nouveaux-choix.js 2026-11-01 2027-01-31 --go   # exécution réelle
//   node nouveaux-choix.js --codes-seuls --go           # période déjà définie
//                                                       # dans l'app : codes +
//                                                       # fenêtre seulement
//
// Options :
//   --go                    exécute réellement (sans lui : simple aperçu)
//   --codes-seuls           ne touche pas à la période de saisie
//   --projet <id>           projet Firebase (défaut : lu dans .firebaserc)
//   --sauvegarde <fichier>  état d'avant (défaut : ~/apum-nouveaux-choix-<horodatage>.json)

const fs = require('fs');
const os = require('os');
const path = require('path');
const { creerSession } = require('./lib/session-cli');

// ⚠️ DOIT correspondre EXACTEMENT à CODE_A_RECLAMER de src/constants/claim.js
// (même contrainte que creer-comptes-medecins.js).
const CODE_A_RECLAMER = 'apum-compte-a-reclamer';

const argv = process.argv.slice(2);
const OPTIONS_A_VALEUR = ['--projet', '--sauvegarde'];
const flag = (n) => argv.includes(n);
const valeur = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const positionnels = argv.filter(
  (a, i) => !a.startsWith('--') && !(i > 0 && OPTIONS_A_VALEUR.includes(argv[i - 1]))
);

const GO = flag('--go');
const CODES_SEULS = flag('--codes-seuls');
const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const FICHIER = valeur('--sauvegarde', path.join(os.homedir(), `apum-nouveaux-choix-${horodatage}.json`));

const estDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const jourDe = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : null);
const nomDe = (u) => `${(u.prenom || '').trim()} ${(u.nom || '').trim()}`.trim() || u.email || u.id;

async function main() {
  const [debut, fin] = positionnels;
  const changeLaPeriode = !CODES_SEULS && Boolean(debut || fin);

  if (changeLaPeriode) {
    if (!estDate(debut) || !estDate(fin)) {
      throw new Error('Dates attendues au format AAAA-MM-JJ (début puis fin).');
    }
    if (debut > fin) throw new Error('La date de début doit précéder la date de fin.');
  }

  const session = await creerSession({ projet: valeur('--projet', null) });

  const periode = await session.get('planning/periode_saisie');
  const conf = await session.get('config/inscription');
  const medecins = (await session.lister('users')).filter((u) => u.role === 'medecin');

  const periodeActuelle = periode
    ? `${jourDe(periode.startDate)} → ${jourDe(periode.endDate)}`
    : '(aucune)';

  console.log(`\nProjet : ${session.projet}`);
  console.log(`Période de saisie actuelle : ${periodeActuelle}`);
  console.log(`Fenêtre d'inscription : ${conf && conf.open === true ? 'ouverte' : 'fermée'}`);
  console.log(`Médecins en base : ${medecins.length}`);

  if (medecins.length === 0) {
    console.log('\nAucun médecin : rien à faire.\n');
    return;
  }

  if (!changeLaPeriode && !CODES_SEULS) {
    console.log('\nAucune date fournie — état seul, rien écrit.');
    console.log('Fournis les dates (AAAA-MM-JJ début fin), ou --codes-seuls si la période est déjà définie dans l\'app.\n');
    return;
  }

  console.log('\n▶ Ce qui va être fait :');
  console.log(
    changeLaPeriode
      ? `   1. période de saisie : ${periodeActuelle} → ${debut} → ${fin} (aucun desiderata supprimé)`
      : `   1. période de saisie : INCHANGÉE (${periodeActuelle})`
  );
  console.log(`   2. code effacé pour les ${medecins.length} médecins — chacun fixe le sien à sa première connexion, pour tout le trimestre`);
  console.log('   3. fenêtre d\'inscription : ouverte');

  // Sauvegarde de l'état d'AVANT — utile pour rétablir la période ou savoir qui
  // était en base. Les codes, eux, ne sont pas récupérables.
  fs.writeFileSync(FICHIER, JSON.stringify({
    genere: new Date().toISOString(),
    projet: session.projet,
    periodeSaisie: periode
      ? { debut: jourDe(periode.startDate), fin: jourDe(periode.endDate) }
      : null,
    inscriptionOuverte: Boolean(conf && conf.open === true),
    medecins: medecins.map((m) => ({ id: m.id, email: m.email, nom: m.nom, prenom: m.prenom })),
  }, null, 1));
  console.log(`\nSauvegarde de l'état d'avant : ${FICHIER}`);
  console.log('(les codes actuels ne sont PAS sauvegardables — la remise à zéro est définitive)');

  if (!GO) {
    console.log('\nAperçu seul — RIEN écrit en base. Relance avec --go pour appliquer.\n');
    return;
  }

  if (changeLaPeriode) {
    await session.ecrire('planning/periode_saisie', {
      startDate: new Date(`${debut}T00:00:00Z`),
      endDate: new Date(`${fin}T00:00:00Z`),
    });
    console.log(`\n✓ Période de saisie : ${debut} → ${fin}`);
  }

  console.log('\n▶ Remise à zéro des codes…');
  let ok = 0;
  const echecs = [];
  for (const m of medecins) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await session.majMotDePasse(m.id, CODE_A_RECLAMER);
      ok += 1;
    } catch (e) {
      echecs.push({ m, message: e.message });
      console.error(`   ❌ ${nomDe(m)} <${m.email}> : ${e.message}`);
    }
  }
  console.log(`✓ ${ok} code(s) effacé(s)` + (echecs.length ? `, ${echecs.length} échec(s)` : '') + '.');

  if (echecs.length) {
    // Les médecins en échec gardent leur ancien code : ils pourront se
    // connecter avec, mais ne seront pas invités à en choisir un nouveau.
    console.log('⚠️  Ces médecins conservent leur ancien code — relance le script ou traite-les un par un :');
    echecs.forEach(({ m }) => console.log(`   ${nomDe(m)} <${m.email}> (${m.id})`));
  }

  await session.ecrire('config/inscription', { open: true });
  console.log('✓ Fenêtre d\'inscription ouverte.');

  console.log('\n▶ Ensuite :');
  console.log('   • préviens les médecins : leur ancien code ne marche plus, celui qu\'ils taperont à leur prochaine connexion devient le leur pour tout le trimestre ;');
  console.log('   • si tu as créé des comptes depuis, lance `node synchroniser-annuaire.js` (sinon absents de la liste de connexion) ;');
  console.log('   • referme la fenêtre d\'inscription (app → Gestion des utilisateurs) quand tout le monde s\'est connecté.');
  console.log('');

  if (echecs.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`✗ ${(e && e.message) || e}`);
  process.exit(1);
});
