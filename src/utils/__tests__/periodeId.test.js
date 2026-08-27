// Identité d'un trimestre : clé technique (Firestore) et étiquette humaine.
import { idPeriode, libellePeriode } from '../periodeId';

describe('idPeriode', () => {
  it('ne dépend que du mois de début', () => {
    expect(idPeriode({ startDate: '2026-08-01', endDate: '2026-10-31' })).toBe('2026-08');
    // Un ajustement de la date de fin ne change PAS l'identité du trimestre :
    // l'ordre de choix déjà figé reste retrouvé.
    expect(idPeriode({ startDate: '2026-08-01', endDate: '2026-11-02' })).toBe('2026-08');
  });

  it('est triable lexicographiquement dans l’ordre chronologique', () => {
    const ids = ['2026-08', '2025-11', '2026-02'].sort();
    expect(ids).toEqual(['2025-11', '2026-02', '2026-08']);
    expect(idPeriode({ startDate: '2025-11-01' })).toBe('2025-11');
  });

  it('renvoie null sans période exploitable', () => {
    expect(idPeriode(null)).toBeNull();
    expect(idPeriode({ startDate: 'pas une date' })).toBeNull();
  });
});

describe('libellePeriode', () => {
  it('reprend le format APUM des listes officielles', () => {
    expect(libellePeriode({ startDate: '2026-08-01', endDate: '2026-10-31' })).toBe('ASO26');
    expect(libellePeriode({ startDate: '2026-02-01', endDate: '2026-04-30' })).toBe('FMA26');
    expect(libellePeriode({ startDate: '2026-05-01', endDate: '2026-07-31' })).toBe('MJJ26');
  });

  it('marque les trimestres à cheval sur deux années', () => {
    expect(libellePeriode({ startDate: '2025-11-01', endDate: '2026-01-31' })).toBe('NDJ25-26');
  });
});
