# Import des Desiderata depuis les fichiers papiers

Ce document explique comment importer les desiderata depuis les fichiers XLSX papiers dans Firebase.

## Fichiers créés

1. **parse_desiderata.py** - Analyse brute des fichiers XLSX
2. **transform_desiderata.py** - Transformation des données au format de l'application
3. **import_desiderata_to_firebase.js** - Import des données dans Firebase

## Étapes d'import

### 1. Analyser et transformer les fichiers XLSX

```bash
python transform_desiderata.py
```

Cette commande va :
- Lire tous les fichiers XLSX dans le dossier "Desideratas papiers"
- Extraire les informations (nom, prénom, gardes souhaitées, etc.)
- Transformer les données au format de l'application
- Générer le fichier `desiderata-transformed.json`

### 2. Préparer Firebase Admin SDK

Deux options possibles :

#### Option A: Utiliser un Service Account Key (recommandé pour production)

1. Aller dans Firebase Console > Project Settings > Service Accounts
2. Cliquer sur "Generate new private key"
3. Télécharger le fichier JSON et le renommer en `serviceAccountKey.json`
4. Le placer à la racine du projet

#### Option B: Utiliser l'authentification existante (pour tests)

Le script peut être modifié pour utiliser les credentials Firebase existants depuis `.env.local`

### 3. Installer les dépendances nécessaires

```bash
npm install firebase-admin
```

### 4. Lancer l'import

```bash
node import_desiderata_to_firebase.js
```

## Résultats de la transformation

**11 fichiers ont été transformés avec succès** (7 XLSX + 4 PDF) :

| Fichier | Nom | Période | Gardes souhaitées | Jours remplis |
|---------|-----|---------|-------------------|---------------|
| FRANCON T.XLSX | FRANÇON Jean-Luc | 2025-11-01 → 2026-01-31 | 4 | 92/92 |
| GOUMIDI T.XLSX | GOUMIDI SOREYA | 2025-11-01 → 2026-01-31 | 0 | 92/92 |
| KHERFI T.XLSX | Kherfi Fatima | 2025-11-01 → 2026-01-31 | 0 | 92/92 |
| LEDIAGON T.XLSX | (nom manquant) | 2025-11-01 → 2026-01-31 | 0 | 92/92 |
| SINANIAN T.XLSX | Sinanian Jean-Paul | 2025-11-01 → 2026-01-31 | 0 | 92/92 |
| ZIAN T.XLSX | ZIAN MALIKA | 2025-11-01 → 2026-01-31 | 0 | 92/92 |
| ZWANEVELD T.XLSX | ZWANEVELD NICOLE | 2025-11-01 → 2026-01-31 | 8 | 92/92 |
| **EL HARRAR T.PDF** | **EL HARRAR Patrick** | **2025-11-01 → 2026-01-31** | **0** | **1/92** |
| **IACONO T.PDF** | **IACONO CHRISTIAN** | **2025-11-01 → 2026-01-31** | **3** | **25/92** |
| **LEROY T.PDF** | **STEFANI-LEROY Manon** | **2025-11-01 → 2026-01-31** | **5** | **17/92** |
| **WILLOCX T.PDF** | **WILLOCX Renaud** | **2025-11-01 → 2026-01-31** | **2** | **9/92** |

## Structure des données transformées

Chaque desiderata contient :

```json
{
  "fileName": "FRANCON  T.XLSX",
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
      "RENFORT_1": "Oui",
      "QUART_3": "Oui",
      "QUART_4": "Possible",
      "RENFORT_2": "Possible"
    },
    "2025-11-02": {
      ...
    }
  }
}
```

## Mapping des créneaux

Les créneaux du fichier XLSX sont mappés comme suit :

| Position | Fichier XLSX | Code application |
|----------|--------------|------------------|
| Colonne B | 1er QUART (1h-7h) | QUART_1 |
| Colonne C | 2ème QUART (7h-13h) | QUART_2 |
| Colonne D | RENFORT SAMEDI 10H/13H | RENFORT_1 |
| Colonne E | 3ème QUART (13h-19h) | QUART_3 |
| Colonne F | 4ème QUART (19h-1h) | QUART_4 |
| Colonne G | RENFORT 20H/00H | RENFORT_2 |

## Scripts créés

1. **`transform_desiderata.py`** - Transforme les fichiers XLSX
2. **`transform_pdf_desiderata.py`** - Transforme les fichiers PDF simples (EL HARRAR, LEROY, WILLOCX)
3. **`parse_iacono_manual.py`** - Extraction manuelle du fichier IACONO (manuscrit)
4. **`merge_all_desiderata.py`** - Fusionne toutes les données dans un fichier unique
5. **`import_desiderata_to_firebase.js`** - Import dans Firebase

## Notes importantes

1. **Fichiers PDF traités** : Les 4 fichiers PDF (EL HARRAR, IACONO, LEROY, WILLOCX) ont été extraits avec succès, y compris les données manuscrites d'IACONO.

2. **Utilisateurs manquants** : Le script d'import recherche automatiquement les utilisateurs dans Firebase par leur nom. Si un utilisateur n'est pas trouvé, son import sera ignoré.

3. **Doublons** : Le script vérifie si des desiderata existent déjà pour la même période avant d'importer. Les doublons ne seront pas importés par défaut.

4. **Données manquantes** :
   - LEDIAGON T.XLSX n'a pas de nom/prénom rempli
   - Plusieurs médecins n'ont pas renseigné le nombre de gardes souhaitées

## Vérification post-import

Après l'import, vérifiez dans l'application :

1. Connectez-vous en tant qu'administrateur
2. Allez dans "Gestion des desiderata"
3. Vérifiez que les desiderata importés sont visibles et corrects
4. Testez l'export Excel pour chaque médecin

## Dépannage

### Erreur "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### Erreur "serviceAccountKey.json not found"
Téléchargez la clé depuis Firebase Console (voir section 2)

### Erreur "User not found"
Vérifiez que les utilisateurs existent dans Firebase avec le rôle "medecin" et que leurs noms correspondent

### Encodage des caractères
Les fichiers utilisent l'encodage UTF-8. Si vous voyez des caractères bizarres, vérifiez l'encodage de votre terminal.
