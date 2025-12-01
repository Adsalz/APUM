# Guide d'import des desiderata papiers

## Vue d'ensemble

Ce guide explique comment importer les desiderata papiers (fichiers PDF/XLSX) dans l'application via l'interface admin.

## Étape 1 : Préparation des fichiers

Les desiderata papiers ont déjà été extraits et convertis en fichiers JSON individuels pour chaque médecin.

### Fichiers disponibles

Les fichiers JSON sont dans le dossier `desiderata_individuels/` :

```
desiderata_individuels/
├── FRANCON_JEAN_LUC.json
├── GOUMIDI_SOREYA.json
├── IACONO_CHRISTIAN.json
├── STEFANI_LEROY_MANON.json
├── SINANIAN_JEAN_PAUL.json
├── WILLOCX_RENAUD.json
├── ZIAN_MALIKA_INCONNU.json
├── ZWANEVELD_NICOLE_INCONNU.json
├── EL_HARRAR_PATRICK.json
└── KHERFI_FATIMA_PAS_DE_GARDE_EN_NOVEMBRE_5_VACATIONS_PAR_MOIS_1_VACATION_POUR_JOUR.json
```

### Regénérer les fichiers individuels (si nécessaire)

Si vous avez besoin de regénérer les fichiers individuels à partir du fichier fusionné :

```bash
python split_desiderata_by_medecin.py
```

## Étape 2 : Import via l'interface admin

### Accès à la page d'import

1. Connectez-vous en tant qu'admin
2. Allez sur le **Dashboard Admin**
3. Cliquez sur **"Saisie des desiderata (Admin)"**
4. Vous serez redirigé vers `/desiderata-admin`

### Procédure d'import

1. **Sélectionner un médecin**
   - Dans le menu déroulant, choisissez le médecin pour lequel vous voulez importer les desiderata
   - L'application indiquera si ce médecin a déjà des desiderata saisis

2. **Importer le fichier JSON**
   - Cliquez sur le bouton **"Importer un fichier JSON"** (bouton violet)
   - Sélectionnez le fichier JSON correspondant au médecin (ex: `FRANCON_JEAN_LUC.json`)
   - Le fichier sera automatiquement validé et chargé

3. **Vérification**
   - Un message de succès s'affichera : "✓ Desiderata importés avec succès ! X jours chargés."
   - Les données sont chargées dans le formulaire mais **pas encore enregistrées** dans Firebase
   - Vous pouvez vérifier/modifier les données avant de les enregistrer

4. **Enregistrement**
   - Cliquez sur le bouton **"Enregistrer"** en haut à droite
   - Les desiderata seront sauvegardés dans Firebase

### Gestion des conflits

Si un médecin a déjà des desiderata saisis :

- Une confirmation vous sera demandée : "Ce médecin a déjà des desiderata saisis. Voulez-vous les remplacer par les données importées ?"
- **Accepter** : Les anciennes données seront remplacées par les nouvelles
- **Refuser** : L'import sera annulé et les données existantes seront conservées

## Étape 3 : Vérification après import

Après avoir importé et enregistré les desiderata :

1. Allez dans **"Gestion des desiderata"** depuis le Dashboard Admin
2. Vérifiez que le médecin apparaît bien avec le statut **"Complet"**
3. Vous pouvez exporter les desiderata vers Excel pour une vérification supplémentaire

## Structure du fichier JSON

Chaque fichier JSON contient :

```json
{
  "nom": "FRANÇON",
  "prenom": "Jean-Luc",
  "nombreGardesSouhaitees": 4,
  "nombreGardesMaxParSemaine": 3,
  "gardesGroupees": false,
  "renfortsAssocies": false,
  "startDate": "2025-11-01",
  "endDate": "2026-01-31",
  "desiderata": {
    "2025-11-01": {
      "QUART_1": "Possible",
      "QUART_2": "Oui",
      "QUART_3": "Oui",
      "QUART_4": "Possible",
      "RENFORT_1": "Oui",
      "RENFORT_2": "Possible"
    },
    "2025-11-02": {
      ...
    }
  },
  "totalDays": 92,
  "filledDays": 92
}
```

### Champs importants

- **desiderata** : Objet contenant pour chaque date les disponibilités par créneau
- **nombreGardesSouhaitees** : Nombre de gardes souhaitées par mois
- **nombreGardesMaxParSemaine** : Maximum de gardes par semaine
- **gardesGroupees** : Préférence pour des gardes groupées dans un même week-end
- **renfortsAssocies** : Préférence pour des renforts associés à une garde

## Validation des données

Le système vérifie automatiquement :

- ✅ Format JSON valide
- ✅ Présence du champ `desiderata`
- ✅ Structure des données conforme
- ❌ Rejette les fichiers non-JSON
- ❌ Rejette les structures invalides

## Messages d'erreur possibles

| Message | Cause | Solution |
|---------|-------|----------|
| "Veuillez d'abord sélectionner un médecin" | Aucun médecin sélectionné | Sélectionnez un médecin dans le menu déroulant |
| "Le fichier doit être au format JSON" | Fichier non-JSON | Vérifiez que le fichier a l'extension `.json` |
| "Structure JSON invalide: le champ 'desiderata' est manquant" | Structure incorrecte | Vérifiez que le fichier contient bien un objet `desiderata` |
| "Erreur lors de la lecture du fichier JSON: ..." | Fichier corrompu | Régénérez le fichier avec le script Python |

## Scripts de maintenance

### Régénérer tous les fichiers individuels

```bash
python split_desiderata_by_medecin.py
```

### Fusionner tous les desiderata

```bash
python merge_all_desiderata.py
```

### Afficher les statistiques

```bash
python merge_all_desiderata.py
```

Affichera :
- Nombre total de médecins
- Nombre de desiderata depuis XLSX
- Nombre de desiderata depuis PDF
- Liste complète des médecins avec leurs statistiques

## Dépannage

### Le fichier ne se charge pas

1. Vérifiez que le fichier est bien au format JSON
2. Ouvrez le fichier dans un éditeur de texte pour vérifier sa validité
3. Vérifiez que la structure contient bien un objet `desiderata`
4. Régénérez le fichier avec `split_desiderata_by_medecin.py`

### Les données ne correspondent pas

1. Vérifiez le nom du fichier correspond au médecin sélectionné
2. Vérifiez les dates dans le fichier JSON (`startDate` et `endDate`)
3. Comparez avec les fichiers sources (PDF/XLSX) dans `Desideratas papiers/`

### Données déjà existantes

- Si vous devez réimporter des données, acceptez le remplacement lors de la confirmation
- Les anciennes données seront complètement remplacées par les nouvelles
- Assurez-vous que le fichier JSON est correct avant d'accepter le remplacement

## Notes importantes

- ⚠️ L'import ne fait que charger les données dans le formulaire
- ⚠️ Il faut cliquer sur "Enregistrer" pour sauvegarder dans Firebase
- ⚠️ Un remplacement écrase toutes les anciennes données du médecin
- ✅ Vous pouvez modifier les données après import avant de les enregistrer
- ✅ Les fichiers JSON peuvent être réutilisés plusieurs fois
