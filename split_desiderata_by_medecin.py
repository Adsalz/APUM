import json
import os
import re

# Charger le fichier fusionné
with open('desiderata-all-merged.json', 'r', encoding='utf-8') as f:
    all_desiderata = json.load(f)

# Créer un dossier pour les fichiers individuels
output_dir = 'desiderata_individuels'
os.makedirs(output_dir, exist_ok=True)

# Fonction pour nettoyer les noms de fichiers
def clean_filename(nom, prenom):
    # Retirer les caractères spéciaux et remplacer les espaces
    filename = f"{nom}_{prenom}".upper()
    filename = re.sub(r'[^\w\s-]', '', filename)
    filename = re.sub(r'[-\s]+', '_', filename)
    return filename

# Séparer chaque desiderata dans un fichier individuel
print("=== CRÉATION DES FICHIERS INDIVIDUELS ===\n")

for idx, desiderata in enumerate(all_desiderata, 1):
    nom = desiderata.get('nom', 'INCONNU')
    prenom = desiderata.get('prenom', 'INCONNU')

    # Créer un nom de fichier propre
    filename = clean_filename(nom or 'INCONNU', prenom or 'INCONNU')
    filepath = os.path.join(output_dir, f"{filename}.json")

    # Sauvegarder le desiderata individuel
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(desiderata, f, indent=2, ensure_ascii=False)

    nom_display = nom or 'INCONNU'
    prenom_display = prenom or 'INCONNU'
    print(f"{idx:2d}. {nom_display} {prenom_display:20s} -> {filename}.json")

print(f"\n=== RÉSULTAT ===")
print(f"Fichiers créés dans le dossier: {output_dir}")
print(f"Total: {len(all_desiderata)} fichiers")
print(f"\nCes fichiers peuvent être importés individuellement dans l'application.")
