import openpyxl
import json
import os
import re
from datetime import datetime

# Liste des fichiers XLSX à traiter
xlsx_files = [
    'FRANCON  T.XLSX',
    'GOUMIDI  T.XLSX',
    'KHERFI  T.XLSX',
    'LEDIAGON  T.XLSX',
    'SINANIAN  T.XLSX',
    'ZIAN  T.XLSX',
    'ZWANEVELD  T.XLSX'
]

desideratas_folder = os.path.join(os.path.dirname(__file__), 'Desideratas papiers')

# Mapping des créneaux selon la position dans le fichier
creneaux_order = ['QUART_1', 'QUART_2', 'RENFORT_1', 'QUART_3', 'QUART_4', 'RENFORT_2']

def normalize_response(value):
    """Normalise les réponses Oui/Non/Possible"""
    if value is None:
        return ''

    value_str = str(value).strip().lower()

    if value_str in ['oui', 'ok', 'yes']:
        return 'Oui'
    elif value_str in ['possible', 'peut-être', 'peut-etre', 'maybe']:
        return 'Possible'
    elif value_str in ['non', 'no']:
        return 'Non'

    return ''

def parse_nombre_gardes(text):
    """Extrait le nombre de gardes souhaitées"""
    if not text:
        return 0

    text_str = str(text).lower()

    # Recherche de nombres en chiffres
    match = re.search(r'\d+', text_str)
    if match:
        return int(match.group())

    # Recherche de nombres en lettres
    nombres = {
        'zero': 0, 'zéro': 0,
        'un': 1, 'une': 1,
        'deux': 2,
        'trois': 3,
        'quatre': 4,
        'cinq': 5,
        'six': 6,
        'sept': 7,
        'huit': 8,
        'neuf': 9,
        'dix': 10
    }

    for mot, valeur in nombres.items():
        if mot in text_str:
            return valeur

    return 0

def parse_oui_non(text):
    """Parse les réponses OUI/NON"""
    if not text:
        return False

    text_str = str(text).strip().lower()
    return 'oui' in text_str or 'ok' in text_str

def extract_nom_prenom(row_data):
    """Extrait nom et prénom de la première ligne"""
    if not row_data or len(row_data) < 2:
        return None, None

    # Les données sont en colonnes B et C (index 1 et 2)
    nom = row_data[1] if len(row_data) > 1 and row_data[1] else None
    prenom = row_data[2] if len(row_data) > 2 and row_data[2] else None

    # Si pas de prénom, chercher dans la première colonne
    if not nom and row_data[0]:
        text = str(row_data[0])
        if ':' in text:
            parts = text.split(':', 1)[1].strip().split()
            if len(parts) >= 2:
                nom = parts[0]
                prenom = ' '.join(parts[1:])
            elif len(parts) == 1:
                nom = parts[0]

    return nom, prenom

def parse_xlsx_file(file_path):
    """Parse un fichier XLSX et retourne les données au format de l'application"""
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active

        # Convertir en liste de listes
        data = []
        for row in sheet.iter_rows(values_only=True):
            data.append(list(row))

        # Extraire les métadonnées
        nom, prenom = extract_nom_prenom(data[0] if len(data) > 0 else [])

        # Ligne 4 (index 3) : Nombre de gardes souhaitées
        nombre_gardes = 0
        if len(data) > 3 and len(data[3]) > 2:
            nombre_gardes = parse_nombre_gardes(data[3][2])

        # Ligne 5 (index 4) : Gardes groupées
        gardes_groupees = False
        if len(data) > 4 and len(data[4]) > 2:
            gardes_groupees = parse_oui_non(data[4][2])

        # Ligne 6 (index 5) : Renforts associés
        renforts_associes = False
        if len(data) > 5 and len(data[5]) > 2:
            renforts_associes = parse_oui_non(data[5][2])

        # Parser les desiderata (à partir de la ligne 11, index 10)
        desiderata = {}

        for row_idx in range(10, len(data)):
            row = data[row_idx]

            # Colonne A (index 0) contient la date
            if len(row) > 0 and isinstance(row[0], datetime):
                date_obj = row[0]
                date_str = date_obj.strftime('%Y-%m-%d')

                desiderata[date_str] = {}

                # Colonnes B à G (index 1 à 6) contiennent les créneaux
                for col_idx, creneau_id in enumerate(creneaux_order, start=1):
                    if col_idx < len(row):
                        value = normalize_response(row[col_idx])
                        if value:
                            desiderata[date_str][creneau_id] = value

        # Déterminer la période (startDate et endDate)
        dates = sorted([d for d in desiderata.keys()])
        start_date = dates[0] if dates else None
        end_date = dates[-1] if dates else None

        return {
            'fileName': os.path.basename(file_path),
            'nom': nom,
            'prenom': prenom,
            'nombreGardesSouhaitees': nombre_gardes,
            'nombreGardesMaxParSemaine': 3,  # Valeur par défaut
            'gardesGroupees': gardes_groupees,
            'renfortsAssocies': renforts_associes,
            'startDate': start_date,
            'endDate': end_date,
            'desiderata': desiderata,
            'totalDays': len(dates),
            'filledDays': len([d for d in desiderata.values() if any(v for v in d.values())])
        }

    except Exception as e:
        print(f"Erreur lors du traitement de {file_path}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

# Traiter tous les fichiers
results = []
for file in xlsx_files:
    file_path = os.path.join(desideratas_folder, file)
    if os.path.exists(file_path):
        print(f"\nTraitement de {file}...")
        result = parse_xlsx_file(file_path)
        if result:
            results.append(result)
            print(f"  Nom: {result['nom']} {result['prenom']}")
            print(f"  Gardes souhaitées: {result['nombreGardesSouhaitees']}")
            print(f"  Gardes groupées: {result['gardesGroupees']}")
            print(f"  Renforts associés: {result['renfortsAssocies']}")
            print(f"  Période: {result['startDate']} -> {result['endDate']}")
            print(f"  Jours remplis: {result['filledDays']}/{result['totalDays']}")
    else:
        print(f"Fichier non trouvé: {file_path}")

# Sauvegarder les résultats
output_file = os.path.join(os.path.dirname(__file__), 'desiderata-transformed.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n=== RÉSUMÉ ===")
print(f"Fichiers traités: {len(results)}/{len(xlsx_files)}")
print(f"Résultats sauvegardés dans: {output_file}")
