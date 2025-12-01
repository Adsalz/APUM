import ExcelJS from 'exceljs';
import logger from '../utils/logger';

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
const createMedecinWorksheet = async (worksheet, medecin, desiderata, datesList) => {
  // Configuration des largeurs de colonnes
  worksheet.columns = [
    { key: 'dates', width: 25 },      // A - DATES
    { key: 'quart1', width: 15 },     // B - 1er QUART
    { key: 'quart2', width: 15 },     // C - 2ème QUART
    { key: 'renfort1', width: 15 },   // D - RENFORT SAMEDI
    { key: 'quart3', width: 15 },     // E - 3ème QUART
    { key: 'quart4', width: 15 },     // F - 4ème QUART
    { key: 'renfort2', width: 15 }    // G - RENFORT 20H
  ];

  // LIGNE 1 - En-tête "NOM et Prénom" (fond bleu)
  const headerRow = worksheet.getRow(1);
  headerRow.getCell(1).value = 'NOM et Prénom :';
  headerRow.getCell(2).value = `${medecin.prenom} ${medecin.nom.toUpperCase()}`;

  // Fusionner A1:G1 pour l'en-tête
  worksheet.mergeCells('A1:G1');

  // Style de l'en-tête (fond bleu clair)
  headerRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB4C6E7' } // Bleu clair
  };
  headerRow.getCell(1).font = { bold: true, size: 12 };
  headerRow.getCell(1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // LIGNES 2-6 - Section "A COMPLETER OBLIGATOIREMENT" (fond jaune)
  const obligatoireRow = worksheet.getRow(2);
  obligatoireRow.getCell(1).value = 'A COMPLETER OBLIGATOIREMENT';
  worksheet.mergeCells('A2:G2');

  // Style section obligatoire (fond jaune)
  obligatoireRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' } // Jaune
  };
  obligatoireRow.getCell(1).font = { bold: true, size: 11 };
  obligatoireRow.getCell(1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Ligne 3 - Question 1 (Nombre de gardes)
  const row3 = worksheet.getRow(3);
  row3.getCell(1).value = '1 - Nombre de gardes par mois souhaité :';
  row3.getCell(5).value = desiderata?.nombreGardesSouhaitees || '';
  row3.getCell(6).value = '/mois';
  worksheet.mergeCells('A3:D3');
  worksheet.mergeCells('F3:G3');

  // Style question 1 (fond jaune)
  ['A3', 'E3', 'F3'].forEach(cell => {
    const cellObj = worksheet.getCell(cell);
    cellObj.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' }
    };
    cellObj.font = { color: { argb: 'FFFF0000' }, bold: true }; // Texte rouge
    cellObj.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Ligne 4 - Question 2 (Gardes groupées)
  const row4 = worksheet.getRow(4);
  row4.getCell(1).value = '2 - Gardes groupées dans un même week-end :';
  row4.getCell(5).value = desiderata?.gardesGroupees ? 'OUI' : '';
  row4.getCell(6).value = desiderata?.gardesGroupees === false ? 'NON' : '';
  worksheet.mergeCells('A4:D4');

  // Style question 2 (fond jaune)
  ['A4', 'E4', 'F4', 'G4'].forEach(cell => {
    const cellObj = worksheet.getCell(cell);
    cellObj.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' }
    };
    cellObj.font = { color: { argb: 'FFFF0000' }, bold: true }; // Texte rouge
    cellObj.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Ligne 5 - Question 3 (Renforts associés)
  const row5 = worksheet.getRow(5);
  row5.getCell(1).value = '3 - Les renforts associés à une garde :';
  row5.getCell(5).value = desiderata?.renfortsAssocies ? 'OUI' : '';
  row5.getCell(6).value = desiderata?.renfortsAssocies === false ? 'NON' : '';
  worksheet.mergeCells('A5:D5');

  // Style question 3 (fond jaune)
  ['A5', 'E5', 'F5', 'G5'].forEach(cell => {
    const cellObj = worksheet.getCell(cell);
    cellObj.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' }
    };
    cellObj.font = { color: { argb: 'FFFF0000' }, bold: true }; // Texte rouge
    cellObj.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Ligne 6 - Ligne vide avec fond jaune
  const row6 = worksheet.getRow(6); // eslint-disable-line no-unused-vars
  ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6'].forEach(cell => {
    const cellObj = worksheet.getCell(cell);
    cellObj.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' }
    };
    cellObj.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // LIGNE 7 - En-têtes des colonnes (fond orange)
  const headerTableRow = worksheet.getRow(7);
  headerTableRow.getCell(1).value = 'DATES';
  headerTableRow.getCell(2).value = '1er QUART\n(1h- 7h)';
  headerTableRow.getCell(3).value = '2ème QUART\n(7h - 13h)';
  headerTableRow.getCell(4).value = 'RENFORT\nSAMEDI\n10H/13H';
  headerTableRow.getCell(5).value = '3ème QUART\n(13h - 19h)';
  headerTableRow.getCell(6).value = '4ème QUART\n(19h - 1h)';
  headerTableRow.getCell(7).value = 'RENFORT\n20H / 00H';

  // Style des en-têtes (fond orange)
  for (let col = 1; col <= 7; col++) {
    const cell = headerTableRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' } // Orange
    };
    cell.font = { bold: true, size: 10, color: { argb: 'FF000080' } }; // Texte bleu foncé
    cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // Hauteur de la ligne d'en-têtes
  headerTableRow.height = 50;

  // LIGNES DE DONNÉES - Une ligne par date
  let currentRow = 8;
  datesList.forEach((date, index) => {
    const dataRow = worksheet.getRow(currentRow);

    // Colonne A - Date formatée
    const dateStr = formatDateForDisplay(date);
    dataRow.getCell(1).value = dateStr;

    // Style de la cellule date
    const dateCell = dataRow.getCell(1);
    dateCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Texte rouge

    // Alternance de couleurs de fond pour les lignes
    const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFE0E0E0'; // Blanc / Gris clair

    // Remplir les données des créneaux si elles existent
    const dateKey = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const dayData = desiderata?.desiderata?.[dateKey];

    // Mapping des créneaux vers les colonnes
    const creneauxMapping = {
      2: 'QUART_1',    // Colonne B - 1er QUART
      3: 'QUART_2',    // Colonne C - 2ème QUART
      4: 'RENFORT_1',  // Colonne D - RENFORT SAMEDI
      5: 'QUART_3',    // Colonne E - 3ème QUART
      6: 'QUART_4',    // Colonne F - 4ème QUART
      7: 'RENFORT_2'   // Colonne G - RENFORT 20H
    };

    // Appliquer le style à toutes les cellules de la ligne
    for (let col = 1; col <= 7; col++) {
      const cell = dataRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Pour les colonnes de créneaux (B à G)
      if (col > 1) {
        // Ajouter liste déroulante
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Oui,Non,Possible"'],
          showDropDown: true
        };

        // Remplir avec les données saisies si elles existent
        const creneauId = creneauxMapping[col];
        if (dayData && dayData[creneauId]) {
          cell.value = dayData[creneauId];
        }
      }
    }

    currentRow++;
  });

  // Ajuster la hauteur des lignes de données
  for (let row = 8; row < currentRow; row++) {
    worksheet.getRow(row).height = 25;
  }
};

/**
 * Génère la liste des dates pour la période donnée
 * @param {Object} periode - {startDate, endDate}
 * @returns {Array} - Tableau des dates
 */
const generateDatesList = (periode) => {
  const dates = [];

  if (!periode || !periode.startDate || !periode.endDate) {
    return dates;
  }

  const startDate = new Date(periode.startDate);
  const endDate = new Date(periode.endDate);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Formate une date pour affichage dans le tableau
 * @param {Date} date - Date à formater
 * @returns {string} - Date formatée (ex: "samedi, novembre 01, 2025")
 */
const formatDateForDisplay = (date) => {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  };

  return date.toLocaleDateString('fr-FR', options);
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
    // Créer un nouveau workbook
    const workbook = new ExcelJS.Workbook();

    // Générer le nom de fichier pour le médecin individuel
    const fileName = generateMedecinFileName(medecin, periode);

    // Générer la liste des dates pour la période
    const datesList = generateDatesList(periode);

    // Créer une seule feuille pour le médecin
    const sheetName = `${medecin.nom} ${medecin.prenom}`.substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName);

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