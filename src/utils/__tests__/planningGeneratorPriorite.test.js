// Tests unitaires pour le helper pur diviserPeriode de
// src/utils/planningGeneratorPriorite.js.
//
// Comme planningGenerator, ce module importe en cascade Firebase via les
// services : on les neutralise par des mocks factory.
import { diviserPeriode } from '../planningGeneratorPriorite';

jest.mock('../../services/planningService', () => ({
  getDesiderataForPeriod: jest.fn()
}));
jest.mock('../../services/userService', () => ({
  getAllUsers: jest.fn()
}));

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

  it('coupe à la moitié exacte, même sur une longue période (plus de plafond à 45 jours)', () => {
    const result = diviserPeriode('2025-01-01', '2025-06-30');
    // 181 jours → 90 + 91 : le second tour démarre 90 jours après le 01/01/2025, soit le 01/04/2025.
    expect(result.premierTour.debut).toBe('2025-01-01');
    expect(result.premierTour.fin).toBe('2025-03-31');
    expect(result.deuxiemeTour.debut).toBe('2025-04-01');
    expect(result.deuxiemeTour.fin).toBe('2025-06-30');
  });

  it('un trimestre de 92 jours (août→octobre) se coupe 46/46, bascule au 16 septembre', () => {
    const result = diviserPeriode('2026-08-01', '2026-10-31');
    expect(result.premierTour).toEqual({ debut: '2026-08-01', fin: '2026-09-15' });
    expect(result.deuxiemeTour).toEqual({ debut: '2026-09-16', fin: '2026-10-31' });
  });
});
