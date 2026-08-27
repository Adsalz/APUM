// Tests des effectifs par type de jour (déduits de la feuille de garde APUM).
// planningCore est PUR (pas de Firebase) : importable directement, sans mock.
import { typeDeJour, effectifPour, computePriorite } from '../planningCore';

// Rendre getDay() déterministe quel que soit le fuseau de la machine.
process.env.TZ = 'UTC';

describe('typeDeJour', () => {
  it('classe un jour de semaine', () => {
    expect(typeDeJour('2026-07-01')).toBe('semaine'); // mercredi
  });
  it('classe le samedi et le dimanche', () => {
    expect(typeDeJour('2026-07-04')).toBe('samedi');
    expect(typeDeJour('2026-07-05')).toBe('dimanche');
  });
  it('traite un jour férié en semaine comme un dimanche', () => {
    expect(typeDeJour('2026-07-14')).toBe('dimanche'); // 14 juillet (mardi)
  });
  it('traite un jour férié tombant un samedi comme un dimanche', () => {
    expect(typeDeJour('2026-08-15')).toBe('dimanche'); // Assomption (samedi)
  });
});

describe('effectifPour', () => {
  it('2ème et 3ème quart montent le week-end / férié', () => {
    expect(effectifPour('QUART_2', '2026-07-01')).toBe(3); // semaine
    expect(effectifPour('QUART_2', '2026-07-05')).toBe(4); // dimanche
    expect(effectifPour('QUART_2', '2026-07-14')).toBe(4); // férié
    expect(effectifPour('QUART_3', '2026-07-04')).toBe(4); // samedi
  });

  it('4ème quart : 3 quel que soit le type de jour (samedi soir aligné sur le staffing réel)', () => {
    expect(effectifPour('QUART_4', '2026-07-01')).toBe(3); // semaine
    expect(effectifPour('QUART_4', '2026-07-04')).toBe(3); // samedi (corrigé 2->3)
    expect(effectifPour('QUART_4', '2026-07-05')).toBe(3); // dimanche
  });

  it('renfort 10h/13h : uniquement le samedi, jamais un férié', () => {
    expect(effectifPour('RENFORT_1', '2026-07-01')).toBe(0); // semaine
    expect(effectifPour('RENFORT_1', '2026-07-04')).toBe(1); // samedi
    expect(effectifPour('RENFORT_1', '2026-07-05')).toBe(0); // dimanche
    expect(effectifPour('RENFORT_1', '2026-08-15')).toBe(0); // samedi férié -> 0
  });

  it('1er quart et renfort 20h constants', () => {
    expect(effectifPour('QUART_1', '2026-07-01')).toBe(2);
    expect(effectifPour('QUART_1', '2026-07-05')).toBe(2);
    expect(effectifPour('RENFORT_2', '2026-07-01')).toBe(1);
  });

  it('renvoie 0 pour un créneau inconnu', () => {
    expect(effectifPour('INCONNU', '2026-07-01')).toBe(0);
  });
});

describe('génération — tailles des créneaux selon le type de jour', () => {
  // Sans médecins ni desiderata : la structure (tailles de tableaux) reste
  // déterministe, seul le remplissage varie.
  const planning = computePriorite('2026-07-01', '2026-07-14', {}, { premierTourIds: [], deuxiemeTourIds: [] });

  it('semaine (mer 01/07) : effectif de base, pas de renfort 10h/13h', () => {
    const jour = planning['2026-07-01'];
    expect(jour.QUART_1).toHaveLength(2);
    expect(jour.QUART_2).toHaveLength(3);
    expect(jour.QUART_3).toHaveLength(3);
    expect(jour.QUART_4).toHaveLength(3);
    expect(jour.RENFORT_2).toHaveLength(1);
    expect(jour.RENFORT_1).toBeUndefined();
  });

  it('samedi (04/07) : renfort 10h/13h, 3ème quart à 4, 4ème à 3', () => {
    const jour = planning['2026-07-04'];
    expect(jour.RENFORT_1).toHaveLength(1);
    expect(jour.QUART_3).toHaveLength(4);
    expect(jour.QUART_4).toHaveLength(3);
  });

  it('dimanche (05/07) : 2ème et 3ème quart à 4, pas de renfort 10h/13h', () => {
    const jour = planning['2026-07-05'];
    expect(jour.QUART_2).toHaveLength(4);
    expect(jour.QUART_3).toHaveLength(4);
    expect(jour.RENFORT_1).toBeUndefined();
  });

  it('férié en semaine (14/07) : effectifs de dimanche', () => {
    const jour = planning['2026-07-14'];
    expect(jour.QUART_2).toHaveLength(4);
    expect(jour.QUART_4).toHaveLength(3);
    expect(jour.RENFORT_1).toBeUndefined();
  });
});
