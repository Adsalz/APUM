// Date de dernière modification d'une fiche, lue par l'admin (08/10/2026).

import { libelleModification } from '../modificationDesiderata';

describe('libelleModification', () => {
  it('date et heure de Paris, quel que soit le fuseau du poste', () => {
    // 11:29 UTC = 13:29 à Paris (heure d'été)
    expect(libelleModification({ userId: 'm1', modifieLe: '2026-10-04T11:29:36.787Z' }))
      .toBe('le 4 octobre à 13:29');
    // 10:05 UTC = 11:05 à Paris (heure d'hiver)
    expect(libelleModification({ userId: 'm1', modifieLe: '2026-12-01T10:05:00.000Z' }))
      .toBe('le 1er décembre à 11:05');
  });

  it('écrite par le médecin lui-même : pas d’auteur affiché', () => {
    expect(libelleModification({ userId: 'm1', modifiePar: 'm1', modifieLe: '2026-10-04T11:29:00Z' }))
      .toBe('le 4 octobre à 13:29');
  });

  it('écrite par quelqu’un d’autre : « par l’admin »', () => {
    expect(libelleModification({ userId: 'm1', modifiePar: 'admin-1', modifieLe: '2026-10-04T11:29:00Z' }))
      .toBe('le 4 octobre à 13:29 par l’admin');
  });

  it('fiche sans date (ou pas de fiche) : rien', () => {
    expect(libelleModification({ userId: 'm1' })).toBeNull();
    expect(libelleModification(undefined)).toBeNull();
    expect(libelleModification({ userId: 'm1', modifieLe: 'n’importe quoi' })).toBeNull();
  });
});
