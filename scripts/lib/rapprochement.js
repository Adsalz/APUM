// scripts/lib/rapprochement.js
//
// Logique partagée entre `rapprocher-annuaire.js` (rapport) et
// `creer-comptes-medecins.js` (création des manquants) : les deux DOIVENT voir
// exactement le même « qui manque », sous peine de créer un doublon d'un compte
// que le rapport considérait comme déjà présent.
//
// Pure (aucun accès Firebase) : testable directement.

const fs = require('fs');

// Clé de rapprochement par nom : accents, casse, tirets, apostrophes et espaces
// multiples ignorés — « LAUREAU FINI » = « Laureau-Fini », « Jean Luc » = « Jean-Luc ».
const cleNom = (nom, prenom) =>
  `${nom || ''} ${prenom || ''}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[-'’]/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleEmail = (email) => (email || '').trim().toLowerCase();

const nomComplet = (x) => `${x.nom} ${x.prenom}`.trim();

function chargerListe(fichier) {
  if (!fs.existsSync(fichier)) {
    throw new Error(
      `Liste papier introuvable : ${fichier}\n` +
      'Indiquez-la avec --liste <fichier>.'
    );
  }
  let brut;
  try {
    brut = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  } catch (e) {
    throw new Error(`${fichier} n'est pas un JSON valide — ${e.message}`);
  }
  const lignes = Array.isArray(brut) ? brut : brut.medecins;
  if (!Array.isArray(lignes) || lignes.length === 0) {
    throw new Error(`${fichier} ne contient aucun médecin (clé « medecins » attendue).`);
  }
  const sansEmail = lignes.filter((l) => !cleEmail(l.email));
  if (sansEmail.length) {
    throw new Error(
      `${sansEmail.length} ligne(s) sans email dans la liste papier ` +
      `(${sansEmail.map(nomComplet).join(', ')}). ` +
      'L\'email est la clé de rapprochement : complétez la transcription.'
    );
  }
  const doublons = lignes
    .map((l) => cleEmail(l.email))
    .filter((e, i, t) => t.indexOf(e) !== i);
  if (doublons.length) {
    throw new Error(`Emails en double dans la liste papier : ${[...new Set(doublons)].join(', ')}.`);
  }
  // `actif: false` = ne régule plus. On garde la ligne dans la transcription
  // (trace de ce que dit le papier) mais on l'exclut du rapprochement, sinon
  // chaque exécution reproposerait indéfiniment de recréer un compte supprimé.
  const inactifs = lignes.filter((l) => l.actif === false);
  const actifs = lignes.filter((l) => l.actif !== false);
  if (actifs.length === 0) {
    throw new Error(`${fichier} ne contient aucun médecin actif.`);
  }
  return { actifs, inactifs };
}

// Rapprochement en deux passes : l'email d'abord (identifiant de connexion,
// donc le plus fiable), puis le nom pour ceux qui restent — ce qui isole
// précisément les emails ayant changé d'un côté ou de l'autre.
function rapprocher(papier, base) {
  const baseParEmail = new Map();
  const baseParNom = new Map();
  base.forEach((b) => {
    const e = cleEmail(b.email);
    if (e && !baseParEmail.has(e)) baseParEmail.set(e, b);
    const n = cleNom(b.nom, b.prenom);
    if (n && !baseParNom.has(n)) baseParNom.set(n, b);
  });

  const pris = new Set();
  const paires = [];
  const orphelinsPapier = [];

  papier.forEach((p) => {
    const parEmail = baseParEmail.get(cleEmail(p.email));
    if (parEmail && !pris.has(parEmail.id)) {
      pris.add(parEmail.id);
      paires.push({ papier: p, base: parEmail, via: 'email' });
    } else {
      orphelinsPapier.push(p);
    }
  });

  const aCreer = [];
  orphelinsPapier.forEach((p) => {
    const parNom = baseParNom.get(cleNom(p.nom, p.prenom));
    if (parNom && !pris.has(parNom.id)) {
      pris.add(parNom.id);
      paires.push({ papier: p, base: parNom, via: 'nom' });
    } else {
      aCreer.push(p);
    }
  });

  const aRetirer = base.filter((b) => !pris.has(b.id));
  return { paires, aCreer, aRetirer };
}

// Sépare les « à créer » entre ceux qui existent déjà sous un AUTRE rôle
// (un régulateur peut avoir un compte admin — le recréer ferait un doublon)
// et ceux réellement absents.
function trierACreer(aCreer, autresComptes) {
  const parEmail = new Map(autresComptes.map((u) => [cleEmail(u.email), u]));
  const parNom = new Map(autresComptes.map((u) => [cleNom(u.nom, u.prenom), u]));
  const dejaAutreRole = [];
  const vraimentACreer = [];
  aCreer.forEach((p) => {
    const u = parEmail.get(cleEmail(p.email)) || parNom.get(cleNom(p.nom, p.prenom));
    if (u) dejaAutreRole.push({ papier: p, base: u });
    else vraimentACreer.push(p);
  });
  return { dejaAutreRole, vraimentACreer };
}

module.exports = { cleNom, cleEmail, nomComplet, chargerListe, rapprocher, trierACreer };
