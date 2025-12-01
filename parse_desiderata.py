import openpyxl
import json
import os
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

# Mapping des créneaux
creneaux_mapping = {
    '1er QUART': 'QUART_1',
    '2ème QUART': 'QUART_2',
    '2EME QUART': 'QUART_2',
    'RENFORT': 'RENFORT_1',
    '3ème QUART': 'QUART_3',
    '3EME QUART': 'QUART_3',
    'RENFORT 2': 'RENFORT_2',
    '4ème QUART': 'QUART_4',
    '4EME QUART': 'QUART_4'
}

# Fonction pour parser un fichier XLSX
def parse_xlsx(file_path):
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active

        data = []
        for row in sheet.iter_rows(values_only=True):
            data.append(list(row))

        print(f"\n=== {os.path.basename(file_path)} ===")
        print(f"Nombre de lignes: {len(data)}")
        print(f"Première ligne (en-têtes): {data[0] if len(data) > 0 else 'N/A'}")
        if len(data) > 1:
            print(f"Deuxième ligne: {data[1]}")
        if len(data) > 2:
            print(f"Troisième ligne: {data[2]}")

        return {
            'fileName': os.path.basename(file_path),
            'data': data,
            'headers': data[0] if len(data) > 0 else []
        }
    except Exception as e:
        print(f"Erreur lors de la lecture de {file_path}: {str(e)}")
        return None

# Parser tous les fichiers
results = []
for file in xlsx_files:
    file_path = os.path.join(desideratas_folder, file)
    if os.path.exists(file_path):
        result = parse_xlsx(file_path)
        if result:
            results.append(result)
    else:
        print(f"Fichier non trouvé: {file_path}")

# Sauvegarder les résultats
with open(os.path.join(os.path.dirname(__file__), 'desiderata-parsed.json'), 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2, default=str)

print('\n✓ Résultats sauvegardés dans desiderata-parsed.json')
