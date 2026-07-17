// Tests unitaires pour le calcul des jours fériés français.
// Cible : src/utils/joursFeries.js (algorithme de Pâques de Meeus + fériés).
import { getPaques, getJoursFeries, estJourFerie } from '../joursFeries';

// Helper : formate un objet Date UTC en 'YYYY-MM-DD'.
const isoUTC = (date) => date.toISOString().split('T')[0];

describe('joursFeries — getPaques (algorithme de Meeus)', () => {
  it('calcule Pâques 2024 au 31 mars 2024', () => {
    expect(isoUTC(getPaques(2024))).toBe('2024-03-31');
  });

  it('calcule Pâques 2025 au 20 avril 2025', () => {
    expect(isoUTC(getPaques(2025))).toBe('2025-04-20');
  });

  it('calcule Pâques 2026 au 5 avril 2026', () => {
    expect(isoUTC(getPaques(2026))).toBe('2026-04-05');
  });

  it('calcule Pâques 2000 au 23 avril 2000', () => {
    expect(isoUTC(getPaques(2000))).toBe('2000-04-23');
  });

  it('retourne un objet Date en temps UTC', () => {
    const paques = getPaques(2024);
    expect(paques).toBeInstanceOf(Date);
    expect(paques.getUTCFullYear()).toBe(2024);
    expect(paques.getUTCMonth()).toBe(2); // mars (index 0)
    expect(paques.getUTCDate()).toBe(31);
  });
});

describe('joursFeries — getJoursFeries (fériés fixes + mobiles)', () => {
  it('retourne 11 jours fériés pour une année donnée', () => {
    expect(getJoursFeries(2024)).toHaveLength(11);
    expect(getJoursFeries(2025)).toHaveLength(11);
  });

  it('contient les fériés fixes de 2024', () => {
    const feries = getJoursFeries(2024);
    expect(feries).toContain('2024-01-01'); // Jour de l'an
    expect(feries).toContain('2024-05-01'); // Fête du Travail
    expect(feries).toContain('2024-05-08'); // Victoire 1945
    expect(feries).toContain('2024-07-14'); // Fête nationale
    expect(feries).toContain('2024-08-15'); // Assomption
    expect(feries).toContain('2024-11-01'); // Toussaint
    expect(feries).toContain('2024-11-11'); // Armistice 1918
    expect(feries).toContain('2024-12-25'); // Noël
  });

  it('contient les fériés mobiles de 2024 (Pâques+1, +39, +50)', () => {
    const feries = getJoursFeries(2024);
    expect(feries).toContain('2024-04-01'); // Lundi de Pâques
    expect(feries).toContain('2024-05-09'); // Ascension (Pâques + 39)
    expect(feries).toContain('2024-05-20'); // Lundi de Pentecôte (Pâques + 50)
  });

  it('contient les fériés mobiles de 2025', () => {
    const feries = getJoursFeries(2025);
    expect(feries).toContain('2025-04-21'); // Lundi de Pâques
    expect(feries).toContain('2025-05-29'); // Ascension
    expect(feries).toContain('2025-06-09'); // Lundi de Pentecôte
  });

  it('contient les fériés mobiles de 2026', () => {
    const feries = getJoursFeries(2026);
    expect(feries).toContain('2026-04-06'); // Lundi de Pâques
    expect(feries).toContain('2026-05-14'); // Ascension
    expect(feries).toContain('2026-05-25'); // Lundi de Pentecôte
  });

  it('adapte l\'année des fériés fixes (2025 et 2026)', () => {
    expect(getJoursFeries(2025)).toContain('2025-12-25');
    expect(getJoursFeries(2026)).toContain('2026-12-25');
    expect(getJoursFeries(2025)).not.toContain('2024-12-25');
  });

  it('retourne des résultats stables (cache) sur appels répétés', () => {
    expect(getJoursFeries(2027)).toEqual(getJoursFeries(2027));
  });
});

describe('joursFeries — estJourFerie', () => {
  it('reconnaît Noël comme férié sur plusieurs années', () => {
    expect(estJourFerie('2024-12-25')).toBe(true);
    expect(estJourFerie('2025-12-25')).toBe(true);
    expect(estJourFerie('2026-12-25')).toBe(true);
  });

  it('reconnaît un férié mobile (Lundi de Pâques 2025)', () => {
    expect(estJourFerie('2025-04-21')).toBe(true);
  });

  it('renvoie faux pour un jour ordinaire (3 janvier)', () => {
    expect(estJourFerie('2024-01-03')).toBe(false);
    expect(estJourFerie('2025-01-03')).toBe(false);
  });

  it('gère les entrées invalides sans planter', () => {
    expect(estJourFerie('')).toBe(false);
    expect(estJourFerie(null)).toBe(false);
    expect(estJourFerie(undefined)).toBe(false);
    expect(estJourFerie('xx')).toBe(false);
    expect(estJourFerie('abcd-12-25')).toBe(false); // année non numérique
  });
});
