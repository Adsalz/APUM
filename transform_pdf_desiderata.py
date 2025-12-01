import json
import os
from datetime import datetime

# Données extraites manuellement des PDF
# Structure : nom, prénom, nombre gardes, gardes groupées, renforts associés, puis les desiderata par date

pdf_data = {
    'EL HARRAR': {
        'nom': 'EL HARRAR',
        'prenom': 'Patrick',
        'nombreGardesSouhaitees': 0,  # "équilibré" -> valeur par défaut
        'gardesGroupees': False,
        'renfortsAssocies': False,
        'startDate': '2025-11-01',
        'endDate': '2026-01-31',
        'desiderata': {
            # Samedi 01/11/2025 - "Possible" pour RENFORT_2 seulement (dernière colonne)
            '2025-11-01': {'QUART_1': 'Non', 'QUART_2': 'Non', 'RENFORT_1': 'Non', 'QUART_3': 'Non', 'QUART_4': 'Non', 'RENFORT_2': 'Non'},
            '2025-11-02': {'QUART_1': 'Non', 'QUART_2': 'Non', 'QUART_3': 'Non', 'QUART_4': 'Non', 'RENFORT_2': 'Possible'},
            # Les jours de semaine ne sont pas remplis donc on va les remplir avec "Non" par défaut
            # En analysant le PDF, presque tout est "Non" sauf quelques "Possible"
        },
        'note': 'Presque tous les créneaux sont à "Non" - médecin très peu disponible'
    },
    'IACONO': {
        'nom': 'IACONO',
        'prenom': 'CHRISTIAN',
        'nombreGardesSouhaitees': 3,
        'gardesGroupees': True,  # OUI
        'renfortsAssocies': True,  # OUI
        'startDate': '2025-11-01',
        'endDate': '2026-01-31',
        'desiderata': {},
        'note': 'Données manuscrites à extraire - fichier en 2 parties'
    },
    'LEROY': {
        'nom': 'STEFANI-LEROY',
        'prenom': 'Manon',
        'nombreGardesSouhaitees': 5,
        'gardesGroupees': False,  # "Possible"
        'renfortsAssocies': False,
        'startDate': '2025-11-01',
        'endDate': '2026-01-31',
        'desiderata': {},
        'note': 'Contraintes: Pas 2 gardes d\'affilée et pas plus de 2 nuits par mois'
    },
    'WILLOCX': {
        'nom': 'WILLOCX',
        'prenom': 'Renaud',
        'nombreGardesSouhaitees': 2,
        'gardesGroupees': False,
        'renfortsAssocies': False,
        'startDate': '2025-11-01',
        'endDate': '2026-01-31',
        'desiderata': {},
        'note': 'La majorité des créneaux sont à "Non", quelques "Oui" et "Possible" éparpillés'
    }
}

def parse_pdf_el_harrar():
    """Parse spécifique pour EL HARRAR - presque tout à Non"""
    desiderata = {}

    # Créer toutes les dates de la période
    from datetime import timedelta
    start = datetime(2025, 11, 1)
    end = datetime(2026, 1, 31)
    current = start

    while current <= end:
        date_str = current.strftime('%Y-%m-%d')
        # Par défaut tout à Non
        desiderata[date_str] = {
            'QUART_1': 'Non',
            'QUART_2': 'Non',
            'RENFORT_1': 'Non',
            'QUART_3': 'Non',
            'QUART_4': 'Non',
            'RENFORT_2': 'Non'
        }
        # Quelques exceptions "Possible" le 02/11
        if date_str == '2025-11-02':
            desiderata[date_str]['RENFORT_2'] = 'Possible'

        current += timedelta(days=1)

    return desiderata

def parse_pdf_willocx():
    """Parse spécifique pour WILLOCX - presque tout à Non avec quelques exceptions"""
    desiderata = {}

    from datetime import timedelta
    start = datetime(2025, 11, 1)
    end = datetime(2026, 1, 31)
    current = start

    exceptions = {
        '2025-11-02': {'RENFORT_2': 'Possible'},
        '2025-11-23': {'QUART_3': 'Possible'},
        '2025-11-24': {'QUART_1': 'Oui'},
        '2025-11-30': {'QUART_3': 'Oui'},
        '2025-12-01': {'QUART_1': 'Possible'},
        '2025-12-07': {'QUART_3': 'Possible'},
        '2025-12-08': {'QUART_1': 'Oui'},
        '2025-12-14': {'QUART_3': 'Oui'},
        '2025-12-15': {'QUART_1': 'Possible'},
    }

    while current <= end:
        date_str = current.strftime('%Y-%m-%d')
        # Par défaut tout à Non
        desiderata[date_str] = {
            'QUART_1': 'Non',
            'QUART_2': 'Non',
            'RENFORT_1': 'Non',
            'QUART_3': 'Non',
            'QUART_4': 'Non',
            'RENFORT_2': 'Non'
        }

        # Appliquer les exceptions
        if date_str in exceptions:
            desiderata[date_str].update(exceptions[date_str])

        current += timedelta(days=1)

    return desiderata

def parse_pdf_leroy():
    """Parse spécifique pour LEROY - beaucoup de Non, quelques Possible"""
    desiderata = {}

    from datetime import timedelta
    start = datetime(2025, 11, 1)
    end = datetime(2026, 1, 31)
    current = start

    # Jours avec "Possible" identifiés dans le PDF
    possible_dates = {
        '2025-11-02': {'QUART_2': 'Possible', 'RENFORT_2': 'Possible'},
        '2025-11-07': {'QUART_2': 'Possible'},
        '2025-11-08': {'QUART_2': 'Possible'},
        '2025-11-12': {'QUART_1': 'Possible', 'QUART_2': 'Possible'},
        '2025-11-20': {'QUART_1': 'Possible', 'QUART_2': 'Possible'},
        '2025-11-27': {'QUART_1': 'Possible', 'QUART_2': 'Possible'},
        '2025-12-05': {'QUART_2': 'Possible'},
        '2025-12-06': {'QUART_2': 'Possible'},
        '2025-12-07': {'QUART_2': 'Possible'},
        '2025-12-12': {'QUART_2': 'Possible'},
        '2025-12-18': {'QUART_1': 'Possible', 'QUART_2': 'Possible'},
        '2026-01-01': {'QUART_2': 'Possible'},
        '2026-01-10': {'QUART_2': 'Possible'},
        '2026-01-11': {'QUART_2': 'Possible'},
        '2026-01-15': {'QUART_1': 'Possible', 'QUART_2': 'Possible'},
        '2026-01-19': {'QUART_2': 'Possible'},
        '2026-01-28': {'QUART_1': 'Possible', 'QUART_2': 'Possible'},
    }

    while current <= end:
        date_str = current.strftime('%Y-%m-%d')
        # Par défaut tout à Non
        desiderata[date_str] = {
            'QUART_1': 'Non',
            'QUART_2': 'Non',
            'RENFORT_1': 'Non',
            'QUART_3': 'Non',
            'QUART_4': 'Non',
            'RENFORT_2': 'Non'
        }

        # Appliquer les jours avec Possible
        if date_str in possible_dates:
            desiderata[date_str].update(possible_dates[date_str])

        current += timedelta(days=1)

    return desiderata

# Mise à jour avec les données parsées
pdf_data['EL HARRAR']['desiderata'] = parse_pdf_el_harrar()
pdf_data['WILLOCX']['desiderata'] = parse_pdf_willocx()
pdf_data['LEROY']['desiderata'] = parse_pdf_leroy()

# Transformation au format final
results = []
for key, data in pdf_data.items():
    if data['desiderata']:  # Si les desiderata ont été parsés
        result = {
            'fileName': f'{key}.PDF',
            'nom': data['nom'],
            'prenom': data['prenom'],
            'nombreGardesSouhaitees': data['nombreGardesSouhaitees'],
            'nombreGardesMaxParSemaine': 3,
            'gardesGroupees': data['gardesGroupees'],
            'renfortsAssocies': data['renfortsAssocies'],
            'startDate': data['startDate'],
            'endDate': data['endDate'],
            'desiderata': data['desiderata'],
            'totalDays': len(data['desiderata']),
            'filledDays': len([d for d in data['desiderata'].values() if any(v != 'Non' for v in d.values())]),
            'note': data.get('note', '')
        }
        results.append(result)
        print(f"\n{key}:")
        print(f"  Nom: {result['nom']} {result['prenom']}")
        print(f"  Gardes souhaitées: {result['nombreGardesSouhaitees']}")
        print(f"  Période: {result['startDate']} -> {result['endDate']}")
        print(f"  Jours avec disponibilités: {result['filledDays']}/{result['totalDays']}")
        print(f"  Note: {result['note']}")

# Sauvegarder les résultats
output_file = os.path.join(os.path.dirname(__file__), 'desiderata-pdf-transformed.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n=== RÉSUMÉ ===")
print(f"Fichiers PDF traités: {len(results)}")
print(f"Résultats sauvegardés dans: {output_file}")
print(f"\nNOTE: Le fichier IACONO nécessite une extraction manuelle plus détaillée")
print(f"      car les données sont manuscrites et difficiles à lire automatiquement.")
