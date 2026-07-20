// Tests de la logique pure de découpage mensuel du planning (export Excel).
// excelExportService n'importe pas Firebase et ne charge exceljs qu'à la
// demande (import dynamique dans les fonctions d'export) : ces helpers purs
// sont testables directement.
import {
  groupPlanningByMonth,
  formatMonthTitle,
  sheetNameForMonth,
} from '../excelExportService';

describe('groupPlanningByMonth', () => {
  it('découpe un planning multi-mois en mois triés, dates triées', () => {
    const planning = {
      planning: {
        '2026-08-01': {},
        '2026-07-31': {},
        '2026-07-01': {},
        '2026-08-15': {},
      },
    };
    const mois = groupPlanningByMonth(planning);
    expect(mois.map((m) => m.monthKey)).toEqual(['2026-07', '2026-08']);
    expect(mois[0].dates).toEqual(['2026-07-01', '2026-07-31']);
    expect(mois[1].dates).toEqual(['2026-08-01', '2026-08-15']);
  });

  it('ignore les clés qui ne sont pas des dates (ex. periode_saisie)', () => {
    const planning = {
      planning: {
        '2026-07-01': {},
        startDate: 'ignorée',
        foo: {},
      },
    };
    const mois = groupPlanningByMonth(planning);
    expect(mois).toHaveLength(1);
    expect(mois[0].dates).toEqual(['2026-07-01']);
  });

  it('retourne [] pour un planning vide ou absent', () => {
    expect(groupPlanningByMonth(null)).toEqual([]);
    expect(groupPlanningByMonth({})).toEqual([]);
    expect(groupPlanningByMonth({ planning: {} })).toEqual([]);
  });

  it('gère un changement d’année (déc → jan)', () => {
    const planning = {
      planning: {
        '2027-01-02': {},
        '2026-12-31': {},
      },
    };
    const mois = groupPlanningByMonth(planning);
    expect(mois.map((m) => m.monthKey)).toEqual(['2026-12', '2027-01']);
  });
});

describe('formatMonthTitle / sheetNameForMonth', () => {
  it('formate le titre du mois en majuscules', () => {
    expect(formatMonthTitle('2026-07')).toBe('JUILLET 2026');
    expect(formatMonthTitle('2026-01')).toBe('JANVIER 2026');
    expect(formatMonthTitle('2026-12')).toBe('DÉCEMBRE 2026');
  });

  it('produit un nom d’onglet en majuscules et ≤ 31 caractères', () => {
    const nom = sheetNameForMonth('2026-07');
    expect(nom).toBe('JUILLET');
    expect(nom.length).toBeLessThanOrEqual(31);
  });
});
