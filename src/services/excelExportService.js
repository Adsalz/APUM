import logger from '../utils/logger';
import { estJourFerie } from '../utils/joursFeries';

// exceljs (~lourd) est chargé à la demande (import dynamique) pour ne pas
// alourdir le bundle initial : il n'est utile qu'au moment d'un export.
const loadExcelJS = async () => (await import('exceljs')).default;

/**
 * Service pour l'export des desiderata au format Excel
 * Reproduit exactement le format du modèle APUM
 * Version sécurisée utilisant uniquement ExcelJS
 */

/**
 * Exporte les desiderata de tous les médecins vers un fichier Excel
 * @param {Array} medecins - Liste des médecins
 * @param {Array} desiderataList - Liste des desiderata
 * @param {Object} periode - Période de saisie {startDate, endDate}
 */
export const exportDesiderataToExcel = async (medecins, desiderataList, periode) => {
  try {
    const ExcelJS = await loadExcelJS();
    // Créer un nouveau workbook
    const workbook = new ExcelJS.Workbook();

    // Générer le nom de fichier basé sur la période
    const fileName = generateFileName(periode);

    // Générer la liste des dates pour la période
    const datesList = generateDatesList(periode);

    // Pour chaque médecin, créer une feuille
    for (const medecin of medecins) {
      const medecinDesiderata = desiderataList.find(d => d.userId === medecin.id);

      // Créer la feuille avec le nom du médecin
      const sheetName = `${medecin.nom} ${medecin.prenom}`.substring(0, 31);
      const worksheet = workbook.addWorksheet(sheetName);

      // Générer le contenu de la feuille
      await createMedecinWorksheet(worksheet, medecin, medecinDesiderata, datesList);
    }

    // Générer le buffer Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      fileName: fileName,
      message: `Export Excel généré avec succès : ${fileName}`
    };

  } catch (error) {
    logger.error('Erreur lors de l\'export Excel:', error);
    throw error;
  }
};

/**
 * Crée la feuille Excel pour un médecin avec le format exact du modèle
 * @param {Object} worksheet - Feuille de calcul ExcelJS
 * @param {Object} medecin - Données du médecin
 * @param {Object} desiderata - Desiderata du médecin
 * @param {Array} datesList - Liste des dates de la période
 */
// Couleurs et constantes reprises à l'identique du fichier de référence
// « DESIDERATA ASO26 ».
const DESID_YELLOW = 'FFFFFF00';   // bloc « À COMPLÉTER »
const DESID_ORANGE = 'FFED7D31';   // en-tête RENFORT SAMEDI + 3ème QUART
const DESID_RED = 'FFFF0000';      // dates, questions
const DESID_GREEN = 'FF00B050';    // légende « Oui »
const DESID_AMBER = 'FFFFC000';    // légende « Possible »

// Colonnes B→G du tableau (ordre exact du modèle) : créneau + libellé d'en-tête.
// Les créneaux « RENFORT SAMEDI » (D) et « 3ème QUART » (E) ont un en-tête orange.
const DESID_COLONNES = [
  { col: 2, creneauId: 'QUART_1', header: '1er QUART                      (1h- 7h)' },
  { col: 3, creneauId: 'QUART_2', header: '2ème QUART                                                             (7h - 13h)' },
  { col: 4, creneauId: 'RENFORT_1', orange: true, header: {
    richText: [
      { font: { bold: true, underline: true, size: 14, name: 'Comic Sans MS', family: 4 }, text: 'RENFORT' },
      { font: { bold: true, size: 14, name: 'Comic Sans MS', family: 4 }, text: ' ' },
      { font: { bold: true, underline: true, size: 14, name: 'Comic Sans MS', family: 4 }, text: 'SAMEDI' },
      { font: { bold: true, size: 14, name: 'Comic Sans MS', family: 4 }, text: ' 10H/13H                                        ' },
    ],
  } },
  { col: 5, creneauId: 'QUART_3', orange: true, header: '3ème QUART                                             (13h - 19h)' },
  { col: 6, creneauId: 'QUART_4', header: '4ème QUART                                                         (19h - 1h)' },
  { col: 7, creneauId: 'RENFORT_2', header: 'RENFORT 20H / 00H' },
];

// Couleur de police d'une préférence (cohérente avec la légende du modèle).
const desidPrefColor = (pref) => {
  if (pref === 'Oui') { return DESID_GREEN; }
  if (pref === 'Possible') { return DESID_AMBER; }
  if (pref === 'Non') { return DESID_RED; }
  return null;
};

const createMedecinWorksheet = async (worksheet, medecin, desiderata, datesList) => {
  const THIN = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
  const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESID_YELLOW } };

  // Largeurs de colonnes A→K — valeurs EXACTES reprises du fichier de référence
  // (Excel stocke des largeurs fractionnaires ; on les reproduit au pixel près).
  worksheet.columns = [
    { width: 43.85546875 }, { width: 17.140625 }, { width: 16.28515625 },
    { width: 18.140625 }, { width: 18.85546875 }, { width: 17 }, { width: 16.140625 },
    { width: 11.42578125 }, { width: 11.42578125 }, { width: 11.42578125 }, { width: 11.42578125 },
  ];

  // LIGNE 1 — NOM et Prénom
  worksheet.getRow(1).height = 36;
  const nomCell = worksheet.getCell('A1');
  nomCell.value = `NOM et Prénom : ${medecin.prenom} ${(medecin.nom || '').toUpperCase()}`;
  nomCell.font = { name: 'Calibri', bold: true, size: 28 };
  nomCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // LIGNES 3→8 — bloc jaune « À COMPLÉTER OBLIGATOIREMENT »
  for (let r = 3; r <= 8; r++) {
    for (let c = 1; c <= 7; c++) {
      worksheet.getCell(r, c).fill = yellowFill;
    }
  }
  worksheet.getRow(2).height = 21.75;
  worksheet.getRow(3).height = 28.5;
  worksheet.getRow(4).height = 21;
  [5, 6, 7, 8, 9].forEach((r) => { worksheet.getRow(r).height = 21.75; });

  const titre = worksheet.getCell('A3');
  titre.value = 'A COMPLETER OBLIGATOIREMENT';
  titre.font = { name: 'Calibri', bold: true, size: 22 };

  const nb = desiderata?.nombreGardesSouhaitees ?? '';
  const oa = (v) => (v === true ? 'OUI' : v === false ? 'NON' : 'OUI  NON');
  const redQ = { name: 'Calibri', bold: true, size: 16, color: { argb: DESID_RED } };

  const q1 = worksheet.getCell('A4');
  q1.value = `1 - Nombre de gardes par mois souhaité :          ${nb}          /mois`;
  q1.font = redQ;
  const q2 = worksheet.getCell('A5');
  q2.value = `2 - Gardes groupées  dans un même week-end :   ${oa(desiderata?.gardesGroupees)}`;
  q2.font = redQ;
  const q3 = worksheet.getCell('A6');
  q3.value = `3 - Les renforts associés  à une garde :  ${oa(desiderata?.renfortsAssocies)}`;
  q3.font = redQ;

  // LÉGENDE (colonne K) — sert aussi de source à la liste déroulante ($K$10:$K$12)
  const kOui = worksheet.getCell('K10');
  kOui.value = 'Oui ';
  kOui.font = { name: 'Calibri', size: 14, color: { argb: DESID_GREEN } };
  const kNon = worksheet.getCell('K11');
  kNon.value = 'Non';
  kNon.font = { name: 'Calibri', bold: true, size: 18, color: { argb: DESID_RED } };
  const kPoss = worksheet.getCell('K12');
  kPoss.value = 'Possible';
  kPoss.font = { name: 'Calibri', bold: true, size: 18, color: { argb: DESID_AMBER } };

  // LIGNE 10 — en-tête du tableau (Comic Sans MS)
  worksheet.getRow(10).height = 108.75;
  const headerFont = { name: 'Comic Sans MS', bold: true, size: 14 };
  const hDate = worksheet.getCell('A10');
  hDate.value = 'DATES';
  hDate.font = headerFont;
  hDate.alignment = { horizontal: 'center' };
  hDate.border = THIN;
  DESID_COLONNES.forEach(({ col, header, orange }) => {
    const cell = worksheet.getCell(10, col);
    cell.value = header;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', wrapText: true };
    cell.border = THIN;
    if (orange) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESID_ORANGE } };
    }
  });

  // LIGNES 11+ — une ligne par date de la période
  let currentRow = 11;
  datesList.forEach((date) => {
    worksheet.getRow(currentRow).height = 32.1;

    // Colonne A — date réelle, rouge gras, format long français
    const dateCell = worksheet.getCell(currentRow, 1);
    dateCell.value = date;
    dateCell.numFmt = '[$-F800]dddd, mmmm dd, yyyy';
    dateCell.font = { name: 'Calibri', bold: true, size: 18, color: { argb: DESID_RED } };
    dateCell.alignment = { horizontal: 'center' };
    dateCell.border = THIN;

    const dateKey = date.toISOString().split('T')[0];
    const dayData = desiderata?.desiderata?.[dateKey];

    // Colonnes B→G — préférence par créneau (liste déroulante + couleur légende)
    DESID_COLONNES.forEach(({ col, creneauId }) => {
      const cell = worksheet.getCell(currentRow, col);
      cell.border = THIN;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        showInputMessage: true,
        showErrorMessage: true,
        formulae: ['$K$10:$K$12'],
      };
      const pref = dayData?.[creneauId];
      if (pref) {
        cell.value = pref;
        const couleur = desidPrefColor(pref);
        cell.font = { name: 'Calibri', bold: true, size: 14, color: couleur ? { argb: couleur } : undefined };
      }
    });

    currentRow++;
  });
};

/**
 * Génère la liste des dates pour la période donnée
 * @param {Object} periode - {startDate, endDate}
 * @returns {Array} - Tableau des dates
 */
export const generateDatesList = (periode) => {
  const dates = [];

  if (!periode || !periode.startDate || !periode.endDate) {
    return dates;
  }

  // Heure fixée à MIDI (local) : neutralise les décalages de fuseau et le passage
  // heure d'été↔hiver quand la date est reformatée en clé 'YYYY-MM-DD' via
  // toISOString (à midi, on ne peut jamais basculer sur le jour voisin).
  const startDate = new Date(periode.startDate);
  startDate.setHours(12, 0, 0, 0);
  const endDate = new Date(periode.endDate);
  endDate.setHours(12, 0, 0, 0);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Génère le nom de fichier basé sur la période
 * @param {Object} periode - {startDate, endDate}
 * @returns {string} - Nom du fichier
 */
const generateFileName = (periode) => {
  if (!periode || !periode.startDate || !periode.endDate) {
    return 'DESIDERATA_EXPORT.xlsx';
  }

  const startDate = new Date(periode.startDate);
  const endDate = new Date(periode.endDate);

  // Extraire les mois et années
  const startMonth = startDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
  const endYear = endDate.getFullYear();

  // Format: DESIDERATA NDJ25-26.xlsx (pour Nov-Déc-Jan 2025-2026)
  if (startYear === endYear) {
    return `DESIDERATA ${startMonth}${endMonth}${startYear.toString().slice(-2)}.xlsx`;
  } else {
    return `DESIDERATA ${startMonth}${startYear.toString().slice(-2)}-${endMonth}${endYear.toString().slice(-2)}.xlsx`;
  }
};

/**
 * Exporte les desiderata d'un médecin individuel vers un fichier Excel
 * @param {Object} medecin - Données du médecin
 * @param {Object} desiderata - Desiderata du médecin
 * @param {Object} periode - Période de saisie {startDate, endDate}
 */
export const exportMedecinDesiderataToExcel = async (medecin, desiderata, periode) => {
  try {
    const ExcelJS = await loadExcelJS();
    // Créer un nouveau workbook
    const workbook = new ExcelJS.Workbook();

    // Générer le nom de fichier pour le médecin individuel
    const fileName = generateMedecinFileName(medecin, periode);

    // Générer la liste des dates pour la période
    const datesList = generateDatesList(periode);

    // Une seule feuille, nommée comme le fichier de référence
    const worksheet = workbook.addWorksheet('Désidératas');

    // Générer le contenu de la feuille
    await createMedecinWorksheet(worksheet, medecin, desiderata, datesList);

    // Générer le buffer Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      fileName: fileName,
      message: `Export Excel généré avec succès : ${fileName}`
    };

  } catch (error) {
    logger.error('Erreur lors de l\'export Excel individuel:', error);
    throw error;
  }
};

/**
 * Génère le nom de fichier pour un médecin individuel
 * @param {Object} medecin - Données du médecin
 * @param {Object} periode - {startDate, endDate}
 * @returns {string} - Nom du fichier
 */
const generateMedecinFileName = (medecin, periode) => {
  const baseName = generateFileName(periode);

  // Remplacer "DESIDERATA" par "DESIDERATA_[NOM]"
  const medecinName = `${medecin.nom}_${medecin.prenom}`.toUpperCase().replace(/\s+/g, '_');
  return baseName.replace('DESIDERATA', `DESIDERATA_${medecinName}`);
};

/**
 * Obtient les statistiques d'export
 * @param {Array} medecins - Liste des médecins
 * @param {Array} desiderataList - Liste des desiderata
 * @returns {Object} - Statistiques
 */
export const getExportStatistics = (medecins, desiderataList) => {
  const totalMedecins = medecins.length;
  const medecinsSaisi = desiderataList.filter(d =>
    d.desiderata && Object.keys(d.desiderata).length > 0
  ).length;
  const medecinsNonSaisi = totalMedecins - medecinsSaisi;

  return {
    totalMedecins,
    medecinsSaisi,
    medecinsNonSaisi,
    pourcentageSaisi: totalMedecins > 0 ? Math.round((medecinsSaisi / totalMedecins) * 100) : 0
  };
};

/* -------------------------------------------------------------------------- */
/*  Export du PLANNING généré : un onglet Excel par mois (feuille de garde)    */
/*  Reproduit la mise en page de la feuille papier APUM : DATES en lignes,     */
/*  quarts en colonnes (une sous-colonne par place de médecin).                */
/* -------------------------------------------------------------------------- */

const MOIS_LONGS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const MOIS_COURTS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

// Rose des colonnes RENFORT (ARGB repris à l'identique du fichier de référence).
const RENFORT_PINK = 'FFFF99FF';

// Largeurs des colonnes A→Q (reprises telles quelles du fichier de référence).
const PLANNING_COL_WIDTHS = [
  33.3, 32.3, 34.4, 31.6, 31.3, 31.3, 31.6, 32.0, 33.4,
  34.6, 34.6, 30.9, 35.3, 30.9, 30.9, 30.9, 39.4
];

// Modèle de colonnes de la feuille de garde, calqué EXACTEMENT sur la feuille
// papier APUM. Chaque quart occupe un nombre fixe de colonnes ; l'algo remplit
// autant de places qu'il a de médecins, les colonnes en trop restent vides
// (annotations manuelles possibles, comme dans le fichier de référence) :
//   A=DATES | B,C=1er | D,E,F,G=2ème | H=RENFORT | I,J,K,L=3ème | M=RENFORT | N,O,P=4ème | Q=DATES
const PLANNING_COLUMNS = [
  { type: 'date' },
  { type: 'slot', creneauId: 'QUART_1', slot: 0 },
  { type: 'slot', creneauId: 'QUART_1', slot: 1 },
  { type: 'slot', creneauId: 'QUART_2', slot: 0 },
  { type: 'slot', creneauId: 'QUART_2', slot: 1 },
  { type: 'slot', creneauId: 'QUART_2', slot: 2 },
  { type: 'slot', creneauId: 'QUART_2', slot: 3 },
  { type: 'slot', creneauId: 'RENFORT_1', slot: 0 },
  { type: 'slot', creneauId: 'QUART_3', slot: 0 },
  { type: 'slot', creneauId: 'QUART_3', slot: 1 },
  { type: 'slot', creneauId: 'QUART_3', slot: 2 },
  { type: 'slot', creneauId: 'QUART_3', slot: 3 },
  { type: 'slot', creneauId: 'RENFORT_2', slot: 0 },
  { type: 'slot', creneauId: 'QUART_4', slot: 0 },
  { type: 'slot', creneauId: 'QUART_4', slot: 1 },
  { type: 'slot', creneauId: 'QUART_4', slot: 2 },
  { type: 'date' },
];

// En-têtes (ligne 2). Libellés et espacements repris à l'identique du fichier de
// référence. startCol/endCol en base 1 (A=1) ; endCol > startCol → fusion.
const HEADER_GROUPS = [
  { text: 'DATES', startCol: 1, endCol: 1 },
  { text: '1er QUART      (1h- 7h)', startCol: 2, endCol: 2 },
  { text: '1er QUART      (1h- 7h)', startCol: 3, endCol: 3 },
  { text: '2ème QUART (7h - 13h)', startCol: 4, endCol: 7 },
  { text: 'RENFORT        10h / 13h', startCol: 8, endCol: 8, pink: true },
  { text: '3ème QUART  (13h - 19h)', startCol: 9, endCol: 12 },
  { text: 'RENFORT      20H / 00H', startCol: 13, endCol: 13, pink: true },
  { text: '4ème QUART (19h - 1h)', startCol: 14, endCol: 16 },
  { text: 'DATES', startCol: 17, endCol: 17 },
];

const THIN_BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

// Parse une clé 'YYYY-MM-DD' en Date locale sans ambiguïté de fuseau horaire.
const parseDateKey = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Groupe les dates d'un planning par mois.
 * @param {Object} planning - { planning: { 'YYYY-MM-DD': {...} }, ... }
 * @returns {Array<{ monthKey: string, dates: string[] }>} - mois triés (chrono),
 *          chacun avec ses dates triées. monthKey au format 'YYYY-MM'.
 */
export const groupPlanningByMonth = (planning) => {
  const dateMap = planning?.planning || {};
  const dates = Object.keys(dateMap)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  const parMois = new Map();
  dates.forEach((d) => {
    const monthKey = d.slice(0, 7); // 'YYYY-MM'
    if (!parMois.has(monthKey)) {
      parMois.set(monthKey, []);
    }
    parMois.get(monthKey).push(d);
  });

  return Array.from(parMois.entries()).map(([monthKey, moisDates]) => ({
    monthKey,
    dates: moisDates,
  }));
};

/** Titre lisible d'un mois : 'JUILLET 2026' à partir de 'YYYY-MM'. */
export const formatMonthTitle = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return `${MOIS_LONGS[month - 1].toUpperCase()} ${year}`;
};

/** Nom d'onglet Excel : mois en majuscules (comme le fichier de référence). */
export const sheetNameForMonth = (monthKey) => {
  const month = Number(monthKey.split('-')[1]);
  return MOIS_LONGS[month - 1].toUpperCase().substring(0, 31);
};

// Construit une fonction d'affichage de nom qui désambiguïse les homonymes :
// deux médecins de même nom → on ajoute le prénom (comme « MARCHAND France »
// dans le fichier de référence).
const makeDisplayName = (medecins) => {
  const countByNom = {};
  (medecins || []).forEach((m) => {
    const nom = (m.nom || '').toUpperCase();
    countByNom[nom] = (countByNom[nom] || 0) + 1;
  });
  return (medecin) => {
    const nom = (medecin.nom || '').toUpperCase();
    if (countByNom[nom] > 1 && medecin.prenom) {
      return `${nom} ${medecin.prenom}`;
    }
    return nom;
  };
};

// Remplit une feuille pour un mois donné, au format EXACT de la feuille papier
// APUM (17 colonnes A→Q, titre « MOIS … », en-têtes, renforts roses, dates en
// rouge pour les fériés, paysage A4 ajusté à la page).
const buildMonthWorksheet = (worksheet, monthKey, dates, planningData, medecins) => {
  const [year, month] = monthKey.split('-').map(Number);
  const medecinsById = new Map((medecins || []).map((m) => [m.id, m]));
  const displayName = makeDisplayName(medecins);
  const lastCol = PLANNING_COLUMNS.length; // 17 (A→Q)

  // Largeurs de colonnes
  worksheet.columns = PLANNING_COL_WIDTHS.map((width) => ({ width }));

  // Ligne 1 : titre « MOIS JUILLET  2026 » (non fusionné, déborde comme la réf.)
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `MOIS ${MOIS_LONGS[month - 1].toUpperCase()}  ${year}`;
  titleCell.font = { name: 'Calibri', bold: true, size: 55 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(1).height = 70.5;

  // Ligne 2 : en-têtes (quarts fusionnés, renforts roses)
  HEADER_GROUPS.forEach((g) => {
    if (g.endCol > g.startCol) {
      worksheet.mergeCells(2, g.startCol, 2, g.endCol);
    }
    const cell = worksheet.getCell(2, g.startCol);
    cell.value = g.text;
    if (g.pink) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RENFORT_PINK } };
    }
  });
  for (let c = 1; c <= lastCol; c++) {
    const cell = worksheet.getCell(2, c);
    cell.font = { name: 'Calibri', bold: true, size: 22 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  }
  worksheet.getRow(2).height = 66;

  // Lignes de données : une par date du mois
  let rowIdx = 3;
  dates.forEach((dateKey) => {
    const dateObj = parseDateKey(dateKey);
    const samedi = dateObj.getDay() === 6;
    const ferie = estJourFerie(dateKey);
    const dayData = planningData[dateKey] || {};

    PLANNING_COLUMNS.forEach((colDef, i) => {
      const cell = worksheet.getCell(rowIdx, i + 1);
      cell.border = THIN_BORDER;

      if (colDef.type === 'date') {
        cell.value = dateObj;
        cell.numFmt = 'ddd dd mmm';
        cell.font = {
          name: 'Calibri', bold: true, size: 26,
          color: ferie ? { argb: 'FFFF0000' } : undefined,
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        return;
      }

      // colDef.type === 'slot'
      cell.font = { name: 'Calibri', bold: true, size: 24 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // Rose des renforts : 20H/00H tous les jours, 10h/13h les samedis.
      const pink = colDef.creneauId === 'RENFORT_2'
        || (colDef.creneauId === 'RENFORT_1' && samedi);
      if (pink) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RENFORT_PINK } };
      }

      const assigned = dayData[colDef.creneauId];
      const medecinId = Array.isArray(assigned) ? assigned[colDef.slot] : null;
      const medecin = medecinId ? medecinsById.get(medecinId) : null;
      if (medecin) {
        cell.value = displayName(medecin);
      }
    });

    worksheet.getRow(rowIdx).height = 55;
    rowIdx += 1;
  });

  const lastRow = rowIdx - 1;

  // Mise en page : paysage A4, ajusté à la page (comme le fichier de référence)
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    scale: 25,
    margins: { left: 0, right: 0, top: 0, bottom: 0, header: 0.31, footer: 0.31 },
    printArea: `A1:Q${lastRow}`,
  };
  worksheet.views = [{ state: 'normal', zoomScale: 40, zoomScaleNormal: 40 }];
};

/** Nom de fichier de l'export planning. */
const generatePlanningFileName = (months) => {
  if (months.length === 0) {
    return 'PLANNING.xlsx';
  }
  const fmt = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    return `${MOIS_COURTS[month - 1].toUpperCase()}${String(year).slice(-2)}`;
  };
  if (months.length === 1) {
    return `PLANNING ${fmt(months[0])}.xlsx`;
  }
  return `PLANNING ${fmt(months[0])}-${fmt(months[months.length - 1])}.xlsx`;
};

/**
 * Exporte le planning généré vers un fichier Excel : un onglet par mois.
 * @param {Object} planning - { planning: { 'YYYY-MM-DD': { creneauId: [medecinId] } } }
 * @param {Array} medecins - Liste des médecins (id, nom, prenom)
 * @param {Object} [options] - { months?: string[] } sous-ensemble de mois 'YYYY-MM'
 */
export const exportPlanningToExcel = async (planning, medecins, options = {}) => {
  try {
    let moisPlanning = groupPlanningByMonth(planning);

    if (options.months && options.months.length > 0) {
      const filtre = new Set(options.months);
      moisPlanning = moisPlanning.filter((m) => filtre.has(m.monthKey));
    }

    if (moisPlanning.length === 0) {
      throw new Error('Aucune date à exporter dans le planning');
    }

    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    const planningData = planning.planning || {};

    // Onglets nommés par mois (majuscules). Deux mois de même nom (années
    // différentes) → on suffixe l'année pour garder des noms d'onglet uniques.
    const usedNames = new Set();
    moisPlanning.forEach(({ monthKey, dates }) => {
      let name = sheetNameForMonth(monthKey);
      if (usedNames.has(name)) {
        name = `${name} ${monthKey.slice(0, 4)}`.substring(0, 31);
      }
      usedNames.add(name);
      const worksheet = workbook.addWorksheet(name);
      buildMonthWorksheet(worksheet, monthKey, dates, planningData, medecins);
    });

    const fileName = generatePlanningFileName(moisPlanning.map((m) => m.monthKey));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      message: `Planning exporté : ${fileName}`
    };
  } catch (error) {
    logger.error('Erreur lors de l\'export du planning:', error);
    throw error;
  }
};