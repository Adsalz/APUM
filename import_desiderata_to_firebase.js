// Script pour importer les desiderata transformés dans Firebase
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialiser Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Charger les données transformées (fichier fusionné XLSX + PDF)
const dataPath = path.join(__dirname, 'desiderata-all-merged.json');
const desiderataData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Mapping des noms de fichier vers les IDs utilisateur Firebase
// IMPORTANT: Vous devrez compléter ce mapping avec les vrais IDs utilisateur
const userMapping = {
  'FRANCON': null,  // À remplir avec l'ID Firebase
  'GOUMIDI': null,
  'KHERFI': null,
  'LEDIAGON': null,
  'SINANIAN': null,
  'ZIAN': null,
  'ZWANEVELD': null
};

async function findUserByName(nom, prenom) {
  try {
    // Rechercher l'utilisateur par nom et prénom dans Firestore
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'medecin')
      .get();

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userNom = (userData.nom || '').toUpperCase().trim();
      const userPrenom = (userData.prenom || '').toUpperCase().trim();

      const searchNom = (nom || '').toUpperCase().trim();
      const searchPrenom = (prenom || '').toUpperCase().trim();

      if (userNom === searchNom ||
          (userNom && searchNom && userNom.includes(searchNom)) ||
          (userNom && searchNom && searchNom.includes(userNom))) {
        console.log(`  ✓ Utilisateur trouvé: ${doc.id} - ${userData.nom} ${userData.prenom}`);
        return doc.id;
      }
    }

    console.log(`  ✗ Utilisateur non trouvé pour: ${nom} ${prenom}`);
    return null;
  } catch (error) {
    console.error(`  Erreur lors de la recherche de l'utilisateur ${nom} ${prenom}:`, error.message);
    return null;
  }
}

async function importDesiderata(desiderataEntry) {
  try {
    const { nom, prenom, fileName } = desiderataEntry;

    console.log(`\nTraitement de ${fileName} (${nom} ${prenom})...`);

    // Trouver l'ID utilisateur
    const userId = await findUserByName(nom, prenom);

    if (!userId) {
      console.log(`  ⚠ Import ignoré: utilisateur non trouvé`);
      return { success: false, reason: 'user_not_found' };
    }

    // Vérifier si des desiderata existent déjà pour cette période
    const existingDesiderata = await db.collection('desiderata')
      .where('userId', '==', userId)
      .where('startDate', '==', desiderataEntry.startDate)
      .get();

    if (!existingDesiderata.empty) {
      console.log(`  ⚠ Des desiderata existent déjà pour cette période`);
      console.log(`  Voulez-vous les remplacer? (modifier le script pour forcer le remplacement)`);
      return { success: false, reason: 'already_exists' };
    }

    // Préparer les données à importer
    const desiderataToImport = {
      userId: userId,
      startDate: desiderataEntry.startDate,
      endDate: desiderataEntry.endDate,
      desiderata: desiderataEntry.desiderata,
      nombreGardesSouhaitees: desiderataEntry.nombreGardesSouhaitees,
      nombreGardesMaxParSemaine: desiderataEntry.nombreGardesMaxParSemaine,
      gardesGroupees: desiderataEntry.gardesGroupees,
      renfortsAssocies: desiderataEntry.renfortsAssocies,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      importedFrom: fileName
    };

    // Importer dans Firebase
    const docRef = await db.collection('desiderata').add(desiderataToImport);

    console.log(`  ✓ Desiderata importé avec l'ID: ${docRef.id}`);
    console.log(`  - Période: ${desiderataEntry.startDate} -> ${desiderataEntry.endDate}`);
    console.log(`  - Gardes souhaitées: ${desiderataEntry.nombreGardesSouhaitees}`);
    console.log(`  - Jours remplis: ${desiderataEntry.filledDays}`);

    return { success: true, docId: docRef.id };

  } catch (error) {
    console.error(`  ✗ Erreur lors de l'import:`, error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

async function main() {
  console.log('=== IMPORT DES DESIDERATA DANS FIREBASE ===\n');
  console.log(`Nombre de fichiers à importer: ${desiderataData.length}\n`);

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (const entry of desiderataData) {
    const result = await importDesiderata(entry);

    if (result.success) {
      results.success++;
    } else if (result.reason === 'already_exists') {
      results.skipped++;
    } else {
      results.failed++;
    }

    results.details.push({
      fileName: entry.fileName,
      nom: entry.nom,
      prenom: entry.prenom,
      ...result
    });
  }

  console.log('\n=== RÉSUMÉ DE L\'IMPORT ===');
  console.log(`✓ Importés avec succès: ${results.success}`);
  console.log(`⊘ Ignorés (déjà existants): ${results.skipped}`);
  console.log(`✗ Échecs: ${results.failed}`);

  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, 'import-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nRapport détaillé sauvegardé dans: ${reportPath}`);

  process.exit(0);
}

main().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
