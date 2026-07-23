// Tests unitaires pour les helpers PURS de src/utils/planningCore.js.
// planningCore est PUR (aucun accès Firebase) : importable directement, sans mock.

import {
  getWeekNumber,
  aCreneauxChevauchants,
  compterGardesParSemaine,
  verifierContraintes,
  evaluerPlanning
} from '../planningCore';

// Rendre les calculs de dates déterministes quel que soit le fuseau de la machine.
process.env.TZ = 'UTC';

describe('planningGenerator — getWeekNumber (numéro de semaine ISO)', () => {
  it('place le 1er janvier 2025 en semaine 1', () => {
    expect(getWeekNumber(new Date(Date.UTC(2025, 0, 1)))).toBe(1);
  });

  it('place le lundi 6 janvier 2025 en semaine 2', () => {
    expect(getWeekNumber(new Date(Date.UTC(2025, 0, 6)))).toBe(2);
  });

  it('attribue le même numéro à tous les jours d\'une même semaine ISO', () => {
    const lundi = getWeekNumber(new Date(Date.UTC(2025, 0, 6))); // lun 6 jan
    const jeudi = getWeekNumber(new Date(Date.UTC(2025, 0, 9))); // jeu 9 jan
    const dimanche = getWeekNumber(new Date(Date.UTC(2025, 0, 12))); // dim 12 jan
    expect(jeudi).toBe(lundi);
    expect(dimanche).toBe(lundi);
  });

  it('incrémente le numéro à la semaine suivante', () => {
    const s2 = getWeekNumber(new Date(Date.UTC(2025, 0, 6)));
    const s3 = getWeekNumber(new Date(Date.UTC(2025, 0, 13)));
    expect(s3).toBe(s2 + 1);
  });
});

describe('planningGenerator — aCreneauxChevauchants', () => {
  const planning = {
    '2025-06-17': {
      QUART_2: ['m1'],
      RENFORT_1: ['m1'],
      QUART_4: ['m2'],
      RENFORT_2: ['m3']
    }
  };

  it('détecte le chevauchement QUART_2 / RENFORT_1', () => {
    expect(aCreneauxChevauchants('m1', '2025-06-17', 'QUART_2', planning)).toBe(true);
    expect(aCreneauxChevauchants('m1', '2025-06-17', 'RENFORT_1', planning)).toBe(true);
  });

  it('ne signale pas de chevauchement si le médecin n\'est pas sur le créneau associé', () => {
    expect(aCreneauxChevauchants('m2', '2025-06-17', 'QUART_4', planning)).toBe(false);
    expect(aCreneauxChevauchants('m3', '2025-06-17', 'RENFORT_2', planning)).toBe(false);
  });

  it('renvoie false pour un créneau sans association de chevauchement', () => {
    expect(aCreneauxChevauchants('m1', '2025-06-17', 'QUART_1', planning)).toBe(false);
  });

  it('renvoie false si le créneau associé n\'existe pas ce jour-là', () => {
    const partiel = { '2025-06-17': { QUART_2: ['m1'] } };
    expect(aCreneauxChevauchants('m1', '2025-06-17', 'QUART_2', partiel)).toBe(false);
  });
});

describe('planningGenerator — compterGardesParSemaine', () => {
  const planning = {
    '2025-06-17': { QUART_1: ['m1', 'm2'], QUART_2: ['m1'] }, // mar (semaine A)
    '2025-06-18': { QUART_1: ['m1'], QUART_2: ['m2'] }, // mer (semaine A)
    '2025-06-24': { QUART_1: ['m1'], QUART_2: ['m1'] } // mar (semaine B)
  };

  it('compte les gardes du médecin dans la semaine de la date fournie', () => {
    expect(compterGardesParSemaine('m1', '2025-06-17', planning)).toBe(3);
    expect(compterGardesParSemaine('m2', '2025-06-17', planning)).toBe(2);
  });

  it('n\'inclut pas les gardes d\'une autre semaine', () => {
    expect(compterGardesParSemaine('m1', '2025-06-24', planning)).toBe(2);
  });

  it('renvoie 0 pour un médecin sans garde cette semaine', () => {
    expect(compterGardesParSemaine('m3', '2025-06-17', planning)).toBe(0);
  });
});

describe('planningGenerator — verifierContraintes', () => {
  it('accepte un planning simple valide', () => {
    const planning = { '2025-06-17': { QUART_1: ['m1', null] } };
    expect(verifierContraintes(planning)).toBe(true);
  });

  it('rejette un planning avec chevauchement de créneaux', () => {
    const planning = { '2025-06-17': { QUART_2: ['m1'], RENFORT_1: ['m1'] } };
    expect(verifierContraintes(planning)).toBe(false);
  });

  it('rejette trois jours de garde consécutifs pour le même médecin', () => {
    const planning = {
      '2025-06-17': { QUART_1: ['m1'] },
      '2025-06-18': { QUART_1: ['m1'] },
      '2025-06-19': { QUART_1: ['m1'] }
    };
    expect(verifierContraintes(planning)).toBe(false);
  });
});

describe('planningGenerator — evaluerPlanning', () => {
  const baseMedecin = {
    nombreGardesMaxParSemaine: 7,
    gardesGroupees: false,
    renfortsAssocies: false
  };

  it('bonifie une préférence "Oui" respectée (+3)', () => {
    const desiderata = {
      m1: { ...baseMedecin, nombreGardesSouhaitees: 1, preferences: { '2025-06-17': { QUART_1: 'Oui' } } }
    };
    const planning = { '2025-06-17': { QUART_1: ['m1'] } };
    expect(evaluerPlanning(planning, desiderata)).toBe(3);
  });

  it('pénalise une préférence "Non" et l\'écart au quota souhaité', () => {
    const desiderata = {
      m1: { ...baseMedecin, nombreGardesSouhaitees: 0, preferences: { '2025-06-17': { QUART_1: 'Non' } } }
    };
    const planning = { '2025-06-17': { QUART_1: ['m1'] } };
    // -5 (Non) - 2 (|1 garde - 0 souhaitée| * 2)
    expect(evaluerPlanning(planning, desiderata)).toBe(-7);
  });

  it('applique une lourde pénalité de chevauchement (-50 par créneau)', () => {
    const desiderata = {
      m1: {
        ...baseMedecin,
        nombreGardesSouhaitees: 2,
        preferences: { '2025-06-17': { QUART_2: 'Oui', RENFORT_1: 'Oui' } }
      }
    };
    const planning = { '2025-06-17': { QUART_2: ['m1'], RENFORT_1: ['m1'] } };
    // +3 +3 (deux "Oui") - 50 - 50 (chevauchement des deux côtés)
    expect(evaluerPlanning(planning, desiderata)).toBe(-94);
  });

  it('ignore les emplacements vides (null)', () => {
    const desiderata = {
      m1: { ...baseMedecin, nombreGardesSouhaitees: 0, preferences: {} }
    };
    const planning = { '2025-06-17': { QUART_1: [null, null] } };
    expect(evaluerPlanning(planning, desiderata)).toBe(0);
  });
});
