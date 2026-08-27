// src/services/excelImportService.js
// Relecture d'une fiche de desiderata renvoyée au format Excel — le classeur
// produit par « Fiche vierge », rempli par un médecin qui ne passe pas par
// l'application. C'est le retour de excelExportService : même disposition, dans
// l'autre sens.
//
// La lecture est TOLÉRANTE, parce qu'une fiche qui a circulé par mail a pu être
// rouverte sous Excel, Numbers ou LibreOffice, et que le médecin a pu déplacer
// des lignes : on ne se fie donc pas aux numéros de ligne, mais à ce que les
// cellules contiennent (l'en-tête « DATES », puis toute ligne dont la première
// colonne porte une date).
import logger from '../utils/logger';
import { CRENEAUX, CHOIX_DISPONIBILITE } from '../constants/creneaux';

const loadExcelJS = async () => (await import('exceljs')).default;

// Colonnes B→G de la fiche, dans l'ordre canonique des créneaux — le même que
// celui utilisé à l'export (DESID_COLONNES).
const CRENEAUX_PAR_COLONNE = CRENEAUX.map((creneau) => creneau.id);
const PREMIERE_COLONNE_CRENEAU = 2;

// Ligne d'en-tête du modèle, utilisée en dernier recours si « DATES » a été
// effacé de la colonne A.
const LIGNE_ENTETE_MODELE = 10;

/**
 * Ramène une réponse écrite à la main à l'un des choix connus.
 * Tolère la casse, les espaces (la liste déroulante du modèle propose « Oui »
 * avec une espace finale) et les accents absents.
 * @param {*} valeur - Contenu brut de la cellule
 * @returns {string|null} - 'Oui' | 'Possible' | 'Non', ou null si illisible
 */
const normaliserChoix = (valeur) => {
  if (valeur === null || valeur === undefined) { return null; }
  // Une cellule peut être du texte simple ou du texte enrichi (richText).
  const brut = typeof valeur === 'object' && Array.isArray(valeur.richText)
    ? valeur.richText.map((fragment) => fragment.text).join('')
    : String(valeur);

  const nettoye = brut.trim().toLowerCase();
  if (!nettoye) { return null; }
  return CHOIX_DISPONIBILITE.find((choix) => choix.toLowerCase() === nettoye) || null;
};

/**
 * Convertit la date d'une cellule en clé 'YYYY-MM-DD'.
 * ExcelJS relit les dates d'un classeur comme des instants UTC (Excel stocke un
 * numéro de série sans fuseau) : on lit donc en UTC, sans quoi un fuseau à
 * l'ouest ferait basculer chaque date sur la veille.
 * @param {*} valeur - Contenu brut de la cellule de date
 * @returns {string|null} - 'YYYY-MM-DD', ou null si ce n'est pas une date
 */
const cleDeDate = (valeur) => {
  if (!(valeur instanceof Date) || Number.isNaN(valeur.getTime())) { return null; }
  const mois = String(valeur.getUTCMonth() + 1).padStart(2, '0');
  const jour = String(valeur.getUTCDate()).padStart(2, '0');
  return `${valeur.getUTCFullYear()}-${mois}-${jour}`;
};

/**
 * Repère la ligne d'en-tête (« DATES » en colonne A) pour savoir où commencent
 * les dates. Retombe sur la ligne du modèle si elle a été effacée.
 * @param {Object} worksheet - Feuille ExcelJS
 * @returns {number} - Numéro de la ligne d'en-tête
 */
const trouverLigneEntete = (worksheet) => {
  for (let ligne = 1; ligne <= Math.min(worksheet.rowCount, 40); ligne++) {
    const valeur = worksheet.getCell(ligne, 1).value;
    if (typeof valeur === 'string' && valeur.trim().toUpperCase() === 'DATES') {
      return ligne;
    }
  }
  return LIGNE_ENTETE_MODELE;
};

/**
 * Lit une réponse OUI / NON restée à trancher dans le bloc jaune.
 * Tant que les deux figurent encore côte à côte, la question est sans réponse.
 * @param {*} valeur - Contenu de la cellule (question entière)
 * @returns {boolean|undefined} - true/false, ou undefined si non tranchée
 */
const reponseOuiNon = (valeur) => {
  if (typeof valeur !== 'string') { return undefined; }
  const apresLesDeuxPoints = valeur.split(':').slice(1).join(':').toUpperCase();
  const oui = apresLesDeuxPoints.includes('OUI');
  const non = apresLesDeuxPoints.includes('NON');
  if (oui === non) { return undefined; }  // les deux, ou aucun → pas tranché
  return oui;
};

/**
 * Lit le nombre de gardes souhaité dans la première question.
 * @param {*} valeur - Contenu de la cellule A4
 * @returns {number|undefined}
 */
const nombreDeGardes = (valeur) => {
  if (typeof valeur === 'number') { return valeur; }
  if (typeof valeur !== 'string') { return undefined; }
  // On cherche le nombre APRÈS les deux-points, pour ne pas ramasser le « 1 »
  // du numéro de question.
  const apresLesDeuxPoints = valeur.split(':').slice(1).join(':');
  const trouve = apresLesDeuxPoints.match(/\d+/);
  return trouve ? Number(trouve[0]) : undefined;
};

/**
 * Lit les six créneaux d'une ligne de dates.
 * @param {Object} worksheet - Feuille ExcelJS
 * @param {number} ligne - Numéro de ligne
 * @returns {Object} - {duJour, remplies, illisibles}
 */
const lireLigne = (worksheet, ligne) => {
  const duJour = {};
  let remplies = 0;
  let illisibles = 0;

  CRENEAUX_PAR_COLONNE.forEach((creneauId, index) => {
    const brut = worksheet.getCell(ligne, PREMIERE_COLONNE_CRENEAU + index).value;
    const choix = normaliserChoix(brut);
    if (choix) {
      duJour[creneauId] = choix;
      remplies++;
    } else if (brut !== null && brut !== undefined && String(brut).trim()) {
      // Quelque chose a été écrit, mais ce n'est ni Oui, ni Possible, ni Non.
      illisibles++;
    }
  });

  return { duJour, remplies, illisibles };
};

/**
 * Lit une fiche de desiderata Excel et en extrait le contenu.
 * Ne touche à rien : renvoie les données à l'appelant, qui les affiche avant
 * tout enregistrement.
 * @param {File} file - Fichier .xlsx choisi par l'administrateur
 * @returns {Promise<Object>} - {desiderata, préférences, nom lu, statistiques}
 */
export const importDesiderataFromExcel = async (file) => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  // La feuille du modèle s'appelle « Désidératas » ; à défaut, la première.
  const worksheet = workbook.getWorksheet('Désidératas') || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Le classeur ne contient aucune feuille.');
  }

  const ligneEntete = trouverLigneEntete(worksheet);

  const desiderata = {};
  let joursLus = 0;
  let casesRemplies = 0;
  let casesIllisibles = 0;

  for (let ligne = ligneEntete + 1; ligne <= worksheet.rowCount; ligne++) {
    const dateKey = cleDeDate(worksheet.getCell(ligne, 1).value);
    if (!dateKey) { continue; }
    joursLus++;

    const { duJour, remplies, illisibles } = lireLigne(worksheet, ligne);
    casesRemplies += remplies;
    casesIllisibles += illisibles;

    if (Object.keys(duJour).length > 0) {
      desiderata[dateKey] = duJour;
    }
  }

  // Bloc jaune : les trois questions, repérées par leur numéro en tête de ligne
  // plutôt que par leur adresse, au cas où des lignes auraient bougé.
  const questions = {};
  for (let ligne = 1; ligne < ligneEntete; ligne++) {
    const valeur = worksheet.getCell(ligne, 1).value;
    if (typeof valeur !== 'string') { continue; }
    const numero = valeur.trim().match(/^([123])\s*-/);
    if (numero) { questions[numero[1]] = valeur; }
  }

  const resultat = {
    nomLu: typeof worksheet.getCell('A1').value === 'string'
      ? worksheet.getCell('A1').value.replace(/^NOM et Prénom\s*:\s*/i, '').trim()
      : '',
    desiderata,
    nombreGardesSouhaitees: nombreDeGardes(questions['1']),
    gardesGroupees: reponseOuiNon(questions['2']),
    renfortsAssocies: reponseOuiNon(questions['3']),
    stats: { joursLus, casesRemplies, casesIllisibles },
  };

  if (joursLus === 0) {
    throw new Error(
      'Aucune date trouvée dans ce fichier : il ne ressemble pas à une fiche de desiderata.'
    );
  }

  logger.info(
    `Fiche Excel lue : ${joursLus} jours, ${casesRemplies} cases remplies`,
    casesIllisibles ? `(${casesIllisibles} illisibles)` : ''
  );

  return resultat;
};

export default importDesiderataFromExcel;
