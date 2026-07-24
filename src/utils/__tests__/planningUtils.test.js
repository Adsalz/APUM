// Tests unitaires pour les fonctions pures de src/utils/planningUtils.js.
import {
  sortMedecinsByPreference,
  getPreferenceStyle,
  compterGardesParMedecin,
  compterGardesMoisParMedecin,
  getMedecinPreference,
  getNombreGardesSouhaitees
} from '../planningUtils';

const DATE = '2025-01-01';
const CRENEAU = 'QUART_1';

const medecins = [
  { id: 'm1', nom: 'Alpha' },
  { id: 'm2', nom: 'Bravo' },
  { id: 'm3', nom: 'Charlie' },
  { id: 'm4', nom: 'Delta' }
];

const desiderata = [
  { userId: 'm1', nombreGardesSouhaitees: 5, desiderata: { [DATE]: { [CRENEAU]: 'Oui' } } },
  { userId: 'm2', nombreGardesSouhaitees: 3, desiderata: { [DATE]: { [CRENEAU]: 'Possible' } } },
  { userId: 'm3', nombreGardesSouhaitees: 0, desiderata: { [DATE]: { [CRENEAU]: 'Non' } } }
  // m4 : aucun desiderata -> non spécifié
];

describe('planningUtils — sortMedecinsByPreference', () => {
  const result = sortMedecinsByPreference(medecins, desiderata, DATE, CRENEAU);

  it('range chaque médecin dans sa catégorie de préférence', () => {
    expect(result.oui.map((m) => m.id)).toEqual(['m1']);
    expect(result.possible.map((m) => m.id)).toEqual(['m2']);
    expect(result.non.map((m) => m.id)).toEqual(['m3']);
    expect(result.nonSpecifie.map((m) => m.id)).toEqual(['m4']);
  });

  it('construit "all" dans l\'ordre oui > possible > nonSpecifie > non', () => {
    expect(result.all.map((m) => m.id)).toEqual(['m1', 'm2', 'm4', 'm3']);
  });

  it('classe en nonSpecifie si aucune préférence pour la date/créneau', () => {
    const autreCreneau = sortMedecinsByPreference(medecins, desiderata, DATE, 'QUART_2');
    expect(autreCreneau.nonSpecifie.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(autreCreneau.oui).toEqual([]);
  });
});

describe('planningUtils — getPreferenceStyle', () => {
  it('renvoie le style vert pour "Oui"', () => {
    expect(getPreferenceStyle('Oui')).toEqual({ color: '#059669', backgroundColor: '#ECFDF5' });
  });

  it('renvoie le style orange pour "Possible"', () => {
    expect(getPreferenceStyle('Possible')).toEqual({ color: '#D97706', backgroundColor: '#FFFBEB' });
  });

  it('renvoie le style rouge pour "Non"', () => {
    expect(getPreferenceStyle('Non')).toEqual({ color: '#DC2626', backgroundColor: '#FEF2F2' });
  });

  it('renvoie le style neutre par défaut', () => {
    expect(getPreferenceStyle(undefined)).toEqual({ color: '#6B7280', backgroundColor: 'transparent' });
    expect(getPreferenceStyle('Inconnu')).toEqual({ color: '#6B7280', backgroundColor: 'transparent' });
  });
});

describe('planningUtils — compterGardesParMedecin', () => {
  const planning = {
    planning: {
      '2025-01-01': { QUART_1: ['m1', 'm2'], QUART_2: ['m1'] },
      '2025-01-02': { QUART_1: ['m2'], QUART_2: ['m3'] }
    }
  };

  it('compte le nombre de créneaux d\'un médecin', () => {
    expect(compterGardesParMedecin(planning, 'm1')).toBe(2);
    expect(compterGardesParMedecin(planning, 'm2')).toBe(2);
    expect(compterGardesParMedecin(planning, 'm3')).toBe(1);
  });

  it('renvoie 0 pour un médecin absent', () => {
    expect(compterGardesParMedecin(planning, 'inconnu')).toBe(0);
  });

  it('renvoie 0 pour un planning nul ou incomplet', () => {
    expect(compterGardesParMedecin(null, 'm1')).toBe(0);
    expect(compterGardesParMedecin({}, 'm1')).toBe(0);
    expect(compterGardesParMedecin({ planning: {} }, 'm1')).toBe(0);
  });
});

describe('planningUtils — compterGardesMoisParMedecin', () => {
  const planning = {
    planning: {
      '2025-01-01': { QUART_1: ['m1', 'm2'], QUART_2: ['m1'] },
      '2025-01-15': { QUART_1: ['m1'], QUART_2: [null] },
      '2025-02-03': { QUART_1: ['m1', 'm2'], QUART_2: ['m3'] }
    }
  };
  const parMois = compterGardesMoisParMedecin(planning);

  it('compte les gardes par mois et par médecin', () => {
    expect(parMois['2025-01']).toEqual({ m1: 3, m2: 1 });
    expect(parMois['2025-02']).toEqual({ m1: 1, m2: 1, m3: 1 });
  });

  it('ignore les places vides (null) et n\'agrège pas deux mois', () => {
    expect(parMois['2025-01'].m3).toBeUndefined();
    expect(parMois['2025-02'].m1).toBe(1); // pas 4 : janvier non agrégé
  });

  it('renvoie un objet vide pour un planning nul ou incomplet', () => {
    expect(compterGardesMoisParMedecin(null)).toEqual({});
    expect(compterGardesMoisParMedecin({})).toEqual({});
    expect(compterGardesMoisParMedecin({ planning: {} })).toEqual({});
  });
});

describe('planningUtils — getMedecinPreference', () => {
  it('retourne la préférence enregistrée', () => {
    expect(getMedecinPreference(desiderata, 'm1', DATE, CRENEAU)).toBe('Oui');
    expect(getMedecinPreference(desiderata, 'm2', DATE, CRENEAU)).toBe('Possible');
    expect(getMedecinPreference(desiderata, 'm3', DATE, CRENEAU)).toBe('Non');
  });

  it('retourne une chaîne vide si le médecin est inconnu', () => {
    expect(getMedecinPreference(desiderata, 'm4', DATE, CRENEAU)).toBe('');
  });

  it('retourne une chaîne vide si la date ou le créneau est absent', () => {
    expect(getMedecinPreference(desiderata, 'm1', '2099-01-01', CRENEAU)).toBe('');
    expect(getMedecinPreference(desiderata, 'm1', DATE, 'QUART_9')).toBe('');
  });
});

describe('planningUtils — getNombreGardesSouhaitees', () => {
  it('retourne le nombre souhaité configuré', () => {
    expect(getNombreGardesSouhaitees(desiderata, 'm1')).toBe(5);
    expect(getNombreGardesSouhaitees(desiderata, 'm2')).toBe(3);
  });

  it('retourne 0 quand la valeur est absente ou le médecin inconnu', () => {
    expect(getNombreGardesSouhaitees(desiderata, 'm3')).toBe(0);
    expect(getNombreGardesSouhaitees(desiderata, 'm4')).toBe(0);
  });
});
