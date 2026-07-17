// Tests unitaires pour le helper pur diviserPeriode de
// src/utils/planningGeneratorPriorite.js.
//
// Comme planningGenerator, ce module importe en cascade Firebase via les
// services : on les neutralise par des mocks factory.
jest.mock('../../services/planningService', () => ({
  getDesiderataForPeriod: jest.fn()
}));
jest.mock('../../services/userService', () => ({
  getAllUsers: jest.fn()
}));

import { diviserPeriode } from '../planningGeneratorPriorite';

// Calculs de dates déterministes quel que soit le fuseau de la machine.
process.env.TZ = 'UTC';

describe('planningGeneratorPriorite — diviserPeriode', () => {
  it('coupe une courte période en deux moitiés contiguës', () => {
    const result = diviserPeriode('2025-01-01', '2025-01-10');
    expect(result).toEqual({
      premierTour: { debut: '2025-01-01', fin: '2025-01-05' },
      deuxiemeTour: { debut: '2025-01-06', fin: '2025-01-10' }
    });
  });

  it('conserve les bornes d\'origine (début et fin globaux)', () => {
    const result = diviserPeriode('2025-03-01', '2025-03-20');
    expect(result.premierTour.debut).toBe('2025-03-01');
    expect(result.deuxiemeTour.fin).toBe('2025-03-20');
  });

  it('produit deux tours sans trou ni recouvrement de date', () => {
    const result = diviserPeriode('2025-01-01', '2025-01-10');
    // La fin du premier tour est la veille du début du second.
    const finTour1 = new Date(result.premierTour.fin);
    const debutTour2 = new Date(result.deuxiemeTour.debut);
    const ecartJours = (debutTour2 - finTour1) / (1000 * 60 * 60 * 24);
    expect(ecartJours).toBe(1);
  });

  it('plafonne le premier tour à 45 jours sur une longue période', () => {
    const result = diviserPeriode('2025-01-01', '2025-06-30');
    // 45 jours après le 01/01/2025 -> le second tour démarre le 15/02/2025.
    expect(result.premierTour.debut).toBe('2025-01-01');
    expect(result.deuxiemeTour.debut).toBe('2025-02-15');
    expect(result.deuxiemeTour.fin).toBe('2025-06-30');
  });
});
