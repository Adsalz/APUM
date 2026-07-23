// Tests de la logique pure de découpage mensuel du planning (export Excel).
// excelExportService n'importe pas Firebase et ne charge exceljs qu'à la
// demande (import dynamique dans les fonctions d'export) : ces helpers purs
// sont testables directement.
import {
  groupPlanningByMonth,
  formatMonthTitle,
  sheetNameForMonth,
  arrayBufferToBase64,
  generateBlankDesiderataAttachment,
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

describe('arrayBufferToBase64', () => {
  it('encode des octets bruts en base64', () => {
    // 'PK' = signature d'un fichier ZIP/xlsx → base64 'UEs='
    expect(arrayBufferToBase64(new Uint8Array([0x50, 0x4b]))).toBe('UEs=');
  });

  it('gère un tableau vide', () => {
    expect(arrayBufferToBase64(new Uint8Array([]))).toBe('');
  });
});

describe('generateBlankDesiderataAttachment', () => {
  it('génère un modèle vierge .xlsx valide (base64, signature ZIP PK) pour la période', async () => {
    const attachment = await generateBlankDesiderataAttachment({
      startDate: '2026-08-01',
      endDate: '2026-10-31',
    });

    expect(attachment.encoding).toBe('base64');
    expect(attachment.filename).toMatch(/^DESIDERATA .*\.xlsx$/);
    expect(attachment.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(attachment.content.length).toBeGreaterThan(0);
    // Un .xlsx est un ZIP : ses deux premiers octets décodés valent 'PK'.
    expect(atob(attachment.content).slice(0, 2)).toBe('PK');
  });
});
