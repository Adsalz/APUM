import json
import os

# Charger les 3 fichiers JSON
base_path = os.path.dirname(__file__)

# 1. Fichiers XLSX transformés
with open(os.path.join(base_path, 'desiderata-transformed.json'), 'r', encoding='utf-8') as f:
    xlsx_data = json.load(f)

# 2. Fichiers PDF transformés
with open(os.path.join(base_path, 'desiderata-pdf-transformed.json'), 'r', encoding='utf-8') as f:
    pdf_data = json.load(f)

# 3. Fichier IACONO
with open(os.path.join(base_path, 'desiderata-iacono.json'), 'r', encoding='utf-8') as f:
    iacono_data = json.load(f)

# Fusionner toutes les données
all_desiderata = xlsx_data + pdf_data + iacono_data

# Trier par nom
all_desiderata.sort(key=lambda x: (x['nom'] or '', x['prenom'] or ''))

# Statistiques
print("=== FUSION DE TOUTES LES DONNÉES ===\n")
print(f"Total de médecins: {len(all_desiderata)}")
print(f"  - Depuis XLSX: {len(xlsx_data)}")
print(f"  - Depuis PDF: {len(pdf_data) + len(iacono_data)}")
print()

# Afficher le résumé
print("=== LISTE COMPLÈTE DES MÉDECINS ===\n")
for idx, medecin in enumerate(all_desiderata, 1):
    nom_complet = f"{medecin['nom']} {medecin['prenom']}".strip()
    if not nom_complet:
        nom_complet = "(Nom manquant)"

    print(f"{idx:2d}. {nom_complet:30s} | Gardes: {medecin['nombreGardesSouhaitees']:2d} | "
          f"Groupées: {'Oui' if medecin['gardesGroupees'] else 'Non':3s} | "
          f"Jours remplis: {medecin.get('filledDays', 0):2d}/{medecin.get('totalDays', 0):2d}")

# Sauvegarder le fichier fusionné
output_file = os.path.join(base_path, 'desiderata-all-merged.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_desiderata, f, indent=2, ensure_ascii=False)

print(f"\n=== RÉSULTAT ===")
print(f"Toutes les données ont été fusionnées dans: {output_file}")
print(f"Ce fichier peut être utilisé avec le script import_desiderata_to_firebase.js")
