const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Liste des fichiers XLSX à traiter
const xlsxFiles = [
  'FRANCON  T.XLSX',
  'GOUMIDI  T.XLSX',
  'KHERFI  T.XLSX',
  'LEDIAGON  T.XLSX',
  'SINANIAN  T.XLSX',
  'ZIAN  T.XLSX',
  'ZWANEVELD  T.XLSX'
];

const desideratasFolder = path.join(__dirname, 'Desideratas papiers');

// Mapping des créneaux
const creneauxMapping = {
  '1er QUART': 'QUART_1',
  '2ème QUART': 'QUART_2',
  'RENFORT': 'RENFORT_1',
  '3ème QUART': 'QUART_3',
  'RENFORT 2': 'RENFORT_2',
  '4ème QUART': 'QUART_4'
};

// Fonction pour parser un fichier XLSX
function parseXLSX(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convertir en JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

    console.log(`\n=== ${path.basename(filePath)} ===`);
    console.log(`Nombre de lignes: ${data.length}`);
    console.log(`Première ligne (en-têtes):`, data[0]);
    console.log(`Deuxième ligne:`, data[1]);
    console.log(`Troisième ligne:`, data[2]);

    return {
      fileName: path.basename(filePath),
      data: data,
      headers: data[0] || []
    };
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${filePath}:`, error.message);
    return null;
  }
}

// Parser tous les fichiers
const results = [];
for (const file of xlsxFiles) {
  const filePath = path.join(desideratasFolder, file);
  if (fs.existsSync(filePath)) {
    const result = parseXLSX(filePath);
    if (result) {
      results.push(result);
    }
  } else {
    console.log(`Fichier non trouvé: ${filePath}`);
  }
}

// Sauvegarder les résultats
fs.writeFileSync(
  path.join(__dirname, 'desiderata-parsed.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n✓ Résultats sauvegardés dans desiderata-parsed.json');
