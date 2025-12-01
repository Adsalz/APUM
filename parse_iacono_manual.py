import json
import os
from datetime import datetime, timedelta

# Extraction manuelle des données du Dr IACONO CHRISTIAN à partir des 2 PDF
# Les données sont manuscrites, j'ai lu page par page

def create_iacono_desiderata():
    """
    Création des desiderata pour Dr IACONO CHRISTIAN
    Basé sur la lecture manuelle des PDF (manuscrit)
    """

    desiderata = {}
    start = datetime(2025, 11, 1)
    end = datetime(2026, 1, 31)
    current = start

    # Mapping des valeurs manuscrites
    # "NON" / "Non" -> Non
    # "OUI" / "Oui" -> Oui
    # Vide -> Non (par défaut)

    # PDF 1 - Novembre et début décembre 2025
    novembre_data = {
        '2025-11-01': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],  # samedi
        '2025-11-02': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2025-11-03': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],      # lundi
        '2025-11-04': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-05': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-06': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-07': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-11-08': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2025-11-09': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],      # dimanche
        '2025-11-10': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-11': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-11-12': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-13': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-14': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-11-15': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2025-11-16': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2025-11-17': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-11-18': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-19': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-20': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-11-21': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-22': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2025-11-23': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2025-11-24': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-25': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-26': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-27': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-28': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-11-29': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2025-11-30': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2025-12-01': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-02': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-03': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-04': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-05': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-12-06': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2025-12-07': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],      # dimanche
        '2025-12-08': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-12-09': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-10': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-11': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-12': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-13': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
    }

    # PDF 2 - Suite décembre et janvier 2026
    decembre_janvier_data = {
        '2025-12-14': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2025-12-15': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-16': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-17': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-18': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-19': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-12-20': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2025-12-21': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],      # dimanche
        '2025-12-22': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-12-23': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2025-12-24': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-25': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-26': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-27': ['NON', 'NON', 'NON', 'OUI', 'NON', 'NON'],   # samedi
        '2025-12-28': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2025-12-29': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-30': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2025-12-31': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-01': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-02': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-03': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2026-01-04': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2026-01-05': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2026-01-06': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-07': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-08': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-09': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2026-01-10': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2026-01-11': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],      # dimanche
        '2026-01-12': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2026-01-13': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-14': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-15': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-16': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2026-01-17': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2026-01-18': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],      # dimanche
        '2026-01-19': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-20': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-21': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-22': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-23': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2026-01-24': ['NON', 'NON', 'NON', 'NON', 'NON', 'NON'],   # samedi
        '2026-01-25': ['NON', 'NON', '', 'NON', 'NON', 'NON'],      # dimanche
        '2026-01-26': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2026-01-27': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-28': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-29': ['NON', 'NON', '', 'NON', 'NON', 'NON'],
        '2026-01-30': ['NON', 'NON', '', 'OUI', 'NON', 'NON'],
        '2026-01-31': ['NON', 'NON', 'NON', 'OUI', 'NON', 'NON'],   # samedi
    }

    # Fusionner les deux dictionnaires
    all_data = {**novembre_data, **decembre_janvier_data}

    # Convertir au format de l'application
    creneaux_ids = ['QUART_1', 'QUART_2', 'RENFORT_1', 'QUART_3', 'QUART_4', 'RENFORT_2']

    for date_str, values in all_data.items():
        desiderata[date_str] = {}
        for idx, creneau_id in enumerate(creneaux_ids):
            if idx < len(values):
                val = values[idx]
                if val == 'NON' or val == 'Non':
                    desiderata[date_str][creneau_id] = 'Non'
                elif val == 'OUI' or val == 'Oui':
                    desiderata[date_str][creneau_id] = 'Oui'
                elif val == '':
                    # Colonne RENFORT_1 vide pour les jours non-samedi
                    desiderata[date_str][creneau_id] = ''
                else:
                    desiderata[date_str][creneau_id] = 'Non'

    return desiderata

# Créer les données IACONO
iacono_desiderata = create_iacono_desiderata()

iacono_result = {
    'fileName': 'IACONO.PDF',
    'nom': 'IACONO',
    'prenom': 'CHRISTIAN',
    'nombreGardesSouhaitees': 3,
    'nombreGardesMaxParSemaine': 3,
    'gardesGroupees': True,
    'renfortsAssocies': True,
    'startDate': '2025-11-01',
    'endDate': '2026-01-31',
    'desiderata': iacono_desiderata,
    'totalDays': len(iacono_desiderata),
    'filledDays': len([d for d in iacono_desiderata.values() if any(v == 'Oui' for v in d.values())]),
    'note': 'Données extraites manuellement des 2 PDF manuscrits'
}

print("IACONO:")
print(f"  Nom: {iacono_result['nom']} {iacono_result['prenom']}")
print(f"  Gardes souhaitées: {iacono_result['nombreGardesSouhaitees']}")
print(f"  Gardes groupées: {iacono_result['gardesGroupees']}")
print(f"  Renforts associés: {iacono_result['renfortsAssocies']}")
print(f"  Période: {iacono_result['startDate']} -> {iacono_result['endDate']}")
print(f"  Jours avec OUI: {iacono_result['filledDays']}/{iacono_result['totalDays']}")
print(f"  Note: {iacono_result['note']}")

# Sauvegarder
output_file = os.path.join(os.path.dirname(__file__), 'desiderata-iacono.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump([iacono_result], f, indent=2, ensure_ascii=False)

print(f"\nRésultats sauvegardés dans: {output_file}")
