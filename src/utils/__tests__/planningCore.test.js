// Tests des comportements CORRIGÉS du cœur de génération (planningCore).
// planningCore n'importe ni Firebase ni les services → import direct sans mock.
import {
  verifierContraintes,
  evaluerPlanning,
  computePriorite,
  creeraitCreneauxConsecutifs,
} from '../planningCore';

// Dates déterministes quel que soit le fuseau de la machine.
process.env.TZ = 'UTC';

const CRENEAU_IDS = ['QUART_1', 'QUART_2', 'RENFORT_1', 'QUART_3', 'RENFORT_2', 'QUART_4'];

const datesEntre = (debut, fin) => {
  const out = [];
  const d = new Date(debut);
  const end = new Date(fin);
  while (d <= end) {
    out.push(d.toISOString().split('T')[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

// Construit un desiderata où chaque médecin répond `choix` sur TOUS les créneaux.
const desiderataUniforme = (ids, debut, fin, choix, opts = {}) => {
  const desiderata = {};
  const dates = datesEntre(debut, fin);
  ids.forEach((id) => {
    const preferences = {};
    dates.forEach((date) => {
      preferences[date] = {};
      CRENEAU_IDS.forEach((cid) => { preferences[date][cid] = choix; });
    });
    desiderata[id] = {
      preferences,
      nombreGardesSouhaitees: opts.souhaitees ?? 100,
      nombreGardesMaxParSemaine: opts.max ?? 7,
      gardesGroupees: false,
      renfortsAssocies: false,
    };
  });
  return desiderata;
};

// Récupère l'ensemble des jours (YYYY-MM-DD) où un médecin a au moins une garde.
const joursTravailles = (planning, medecinId) => {
  const jours = new Set();
  for (const date in planning) {
    const present = Object.values(planning[date]).some((m) => m.includes(medecinId));
    if (present) { jours.add(date); }
  }
  return jours;
};

const tousLesMedecinsAffectes = (planning) => {
  const ids = new Set();
  Object.values(planning).forEach((jour) =>
    Object.values(jour).forEach((slots) =>
      slots.forEach((m) => { if (m !== null) { ids.add(m); } })));
  return ids;
};

describe('planningCore — verifierContraintes (max/semaine PROPRE au médecin)', () => {
  // m1 : 3 gardes la même semaine ISO ; m2 intercalé pour éviter la règle des 3 jours.
  const planning = {
    '2025-06-16': { QUART_1: ['m1'] },
    '2025-06-17': { QUART_1: ['m1'] },
    '2025-06-18': { QUART_1: ['m2'] },
    '2025-06-19': { QUART_1: ['m1'] },
  };

  it('rejette quand un médecin dépasse SON maximum hebdomadaire', () => {
    expect(verifierContraintes(planning, { m1: { nombreGardesMaxParSemaine: 2 } })).toBe(false);
  });

  it('accepte quand le maximum du médecin est suffisant', () => {
    expect(verifierContraintes(planning, { m1: { nombreGardesMaxParSemaine: 3 } })).toBe(true);
  });

  it('retombe sur 7 par défaut quand aucun desiderata n’est fourni', () => {
    expect(verifierContraintes(planning)).toBe(true);
  });
});

describe('planningCore — evaluerPlanning (quota évalué PAR MOIS)', () => {
  it('n’agrège pas deux mois : 1 garde en juin + 1 en juillet respecte un quota de 1/mois', () => {
    const desiderata = { m1: { nombreGardesSouhaitees: 1, nombreGardesMaxParSemaine: 7, preferences: {} } };
    const planning = {
      '2025-06-16': { QUART_1: ['m1'] },
      '2025-07-16': { QUART_1: ['m1'] },
    };
    // Aucune préférence renseignée, aucun chevauchement, quota respecté chaque mois → 0.
    expect(evaluerPlanning(planning, desiderata)).toBe(0);
  });

  it('pénalise le dépassement DANS un même mois (3 gardes en juin pour un quota de 1)', () => {
    const desiderata = { m1: { nombreGardesSouhaitees: 1, nombreGardesMaxParSemaine: 7, preferences: {} } };
    const planning = {
      '2025-06-02': { QUART_1: ['m1'] },
      '2025-06-10': { QUART_1: ['m1'] },
      '2025-06-18': { QUART_1: ['m1'] },
    };
    // |3 - 1| * 2 = 4 de pénalité (mois de juin uniquement).
    expect(evaluerPlanning(planning, desiderata)).toBe(-4);
  });
});

describe('planningCore — computePriorite (déterministe + invariants)', () => {
  const ids = ['d1', 'd2', 'd3', 'd4', 'd5'];
  const noms = { 'Dr 1': 'd1', 'Dr 2': 'd2', 'Dr 3': 'd3', 'Dr 4': 'd4', 'Dr 5': 'd5', 'Dr Non': 'dNon' };
  const ordre = ['Dr 1', 'Dr 2', 'Dr 3', 'Dr 4', 'Dr 5', 'Dr Non'];
  const listePriorite = { premierTourIds: ordre.map((n) => noms[n]), deuxiemeTourIds: [...ordre].reverse().map((n) => noms[n]) };
  const debut = '2025-06-01';
  const fin = '2025-06-20'; // 20 jours → 2 tours (10 + 10), tout en juin

  const desiderata = {
    ...desiderataUniforme(ids, debut, fin, 'Oui', { souhaitees: 6, max: 5 }),
    ...desiderataUniforme(['dNon'], debut, fin, 'Non', { souhaitees: 6, max: 5 }),
  };

  const planning = computePriorite(debut, fin, desiderata, listePriorite);

  it('est déterministe (même entrée → même sortie)', () => {
    const planning2 = computePriorite(debut, fin, desiderata, listePriorite);
    expect(planning2).toEqual(planning);
  });

  it('n’assigne jamais 3 jours de garde consécutifs (règle appliquée au mode priorité)', () => {
    const dates = datesEntre(debut, fin);
    ids.forEach((id) => {
      const jours = joursTravailles(planning, id);
      dates.forEach((date) => {
        const j = new Date(date);
        const veille = new Date(j); veille.setUTCDate(j.getUTCDate() - 1);
        const avant = new Date(j); avant.setUTCDate(j.getUTCDate() - 2);
        const trois =
          jours.has(date) &&
          jours.has(veille.toISOString().split('T')[0]) &&
          jours.has(avant.toISOString().split('T')[0]);
        expect(trois).toBe(false);
      });
    });
  });

  it('ne place jamais un médecin non volontaire (« Non »)', () => {
    expect(tousLesMedecinsAffectes(planning).has('dNon')).toBe(false);
  });

  it('ne fait jamais chevaucher deux créneaux pour un même médecin', () => {
    for (const date in planning) {
      const jour = planning[date];
      ids.forEach((id) => {
        if (jour.QUART_2?.includes(id)) { expect(jour.RENFORT_1?.includes(id)).toBeFalsy(); }
        if (jour.QUART_4?.includes(id)) { expect(jour.RENFORT_2?.includes(id)).toBeFalsy(); }
      });
    }
  });
});

describe('planningCore — correctifs d’audit (B1 consécutifs, B3 plafond/jour, B2 sur-service borné)', () => {
  // B1 : la passe LARGEUR (exécutée en dernier, sur des dates déjà remplies) ne doit
  // PAS créer une série de 3 jours consécutifs en comblant une place restée vide
  // alors que J+1 et J+2 sont déjà des gardes. Cas réaliste : frontière de mois, le
  // quota mensuel qui bloque le 31/08 se réinitialise en septembre.
  it('B1 — la passe largeur ne crée jamais 3 jours consécutifs (frontière de mois)', () => {
    const noms = { X: 'X' };
    const listePriorite = { premierTourIds: ['X'].map((n) => noms[n]), deuxiemeTourIds: ['X'].map((n) => noms[n]) };
    const desiderata = {
      X: {
        nombreGardesSouhaitees: 2,
        nombreGardesMaxParSemaine: 3,
        preferences: {
          '2026-08-03': { QUART_1: 'Oui' },
          '2026-08-05': { QUART_1: 'Oui' },
          '2026-08-31': { QUART_1: 'Oui' },
          '2026-09-01': { QUART_1: 'Oui' },
          '2026-09-02': { QUART_1: 'Oui' },
        },
      },
    };
    const planning = computePriorite('2026-08-01', '2026-09-05', desiderata, listePriorite);
    // Le validateur symétrique (contrainte dure) doit être satisfait.
    expect(verifierContraintes(planning, desiderata)).toBe(true);
    // X ne doit pas cumuler les trois jours 31/08 + 01/09 + 02/09.
    const surX = (d) => Object.values(planning[d] || {}).some((s) => s.includes('X'));
    expect(surX('2026-08-31') && surX('2026-09-01') && surX('2026-09-02')).toBe(false);
  });

  // B3 : aucun médecin ne cumule plus de 2 créneaux (MAX_CRENEAUX_PAR_JOUR) le même jour.
  it('B3 — ne cumule jamais plus de 2 créneaux le même jour', () => {
    const ids = ['a', 'b', 'c'];
    const noms = { A: 'a', B: 'b', C: 'c' };
    const ordre = ['A', 'B', 'C'];
    const listePriorite = { premierTourIds: ordre.map((n) => noms[n]), deuxiemeTourIds: [...ordre].reverse().map((n) => noms[n]) };
    const desiderata = desiderataUniforme(ids, '2026-06-01', '2026-06-20', 'Oui', { souhaitees: 100, max: 7 });
    const planning = computePriorite('2026-06-01', '2026-06-20', desiderata, listePriorite);
    for (const date in planning) {
      ids.forEach((id) => {
        const nb = Object.values(planning[date]).filter((s) => s.includes(id)).length;
        expect(nb).toBeLessThanOrEqual(2);
      });
    }
  });

  // B2 : le quota mensuel EXPLICITE d'un médecin n'est JAMAIS dépassé, même par la
  // passe largeur, même s'il est le seul disponible (le créneau reste vide sinon).
  it('B2 — aucune passe ne dépasse le quota donné par le médecin', () => {
    const noms = { A: 'a', B: 'b' };
    const listePriorite = { premierTourIds: ['A', 'B'].map((n) => noms[n]), deuxiemeTourIds: ['B', 'A'].map((n) => noms[n]) };
    const desiderata = {
      ...desiderataUniforme(['a'], '2026-06-01', '2026-06-20', 'Oui', { souhaitees: 1, max: 7 }),
      ...desiderataUniforme(['b'], '2026-06-01', '2026-06-20', 'Non', { souhaitees: 1, max: 7 }),
    };
    const planning = computePriorite('2026-06-01', '2026-06-20', desiderata, listePriorite);
    const totalA = Object.values(planning).reduce((n, jour) =>
      n + Object.values(jour).filter((s) => s.includes('a')).length, 0);
    expect(totalA).toBe(1); // exactement son souhait, jamais plus
  });

  // COUVERTURE D'ABORD : avec 2 médecins limités à 1 garde/semaine — A dispo sur
  // QUART_1 et QUART_2, B dispo sur QUART_1 seul — le glouton empilerait A+B sur
  // QUART_1 et laisserait QUART_2 VIDE ; le spread couvre les DEUX (A sur le créneau
  // rare QUART_2, B sur QUART_1).
  it('couverture d’abord — couvre un créneau que le glouton laisserait vide', () => {
    const noms = { A: 'a', B: 'b' };
    const listePriorite = { premierTourIds: ['A', 'B'].map((n) => noms[n]), deuxiemeTourIds: ['B', 'A'].map((n) => noms[n]) };
    const desiderata = {
      a: { nombreGardesSouhaitees: 10, nombreGardesMaxParSemaine: 1, preferences: { '2026-06-01': { QUART_1: 'Oui', QUART_2: 'Oui' } } },
      b: { nombreGardesSouhaitees: 10, nombreGardesMaxParSemaine: 1, preferences: { '2026-06-01': { QUART_1: 'Oui' } } },
    };
    const planning = computePriorite('2026-06-01', '2026-06-01', desiderata, listePriorite);
    const jour = planning['2026-06-01'];
    const couvert = (cid) => jour[cid].some((m) => m !== null);
    expect(couvert('QUART_1')).toBe(true);
    expect(couvert('QUART_2')).toBe(true); // le point clé : pas laissé vide
  });

  // B2bis : un médecin SANS souhait explicite (0) n'est PAS bloqué — il comble les
  // vacances (le quota par défaut ne s'applique qu'à la passe principale).
  it('B2bis — un médecin sans souhait explicite peut dépasser le quota par défaut', () => {
    const noms = { A: 'a', B: 'b' };
    const listePriorite = { premierTourIds: ['A', 'B'].map((n) => noms[n]), deuxiemeTourIds: ['B', 'A'].map((n) => noms[n]) };
    const desiderata = {
      ...desiderataUniforme(['a'], '2026-06-01', '2026-06-20', 'Oui', { souhaitees: 0, max: 7 }),
      ...desiderataUniforme(['b'], '2026-06-01', '2026-06-20', 'Non', { souhaitees: 0, max: 7 }),
    };
    const planning = computePriorite('2026-06-01', '2026-06-20', desiderata, listePriorite);
    const totalA = Object.values(planning).reduce((n, jour) =>
      n + Object.values(jour).filter((s) => s.includes('a')).length, 0);
    expect(totalA).toBeGreaterThan(8); // dépasse le DEFAUT_GARDES_MENSUEL (comble les vacances)
  });
});


// Règles de répartition du 1er quart (1h-7h), déduites de la feuille de référence
// APUM ASO26 et validées avec la coordinatrice.
describe('planningCore — 1er quart : équité mensuelle et pas deux nuits d\'affilée', () => {
  const noms = { A: 'a', B: 'b', C: 'c' };
  const listePriorite = { premierTourIds: ['A', 'B', 'C'].map((n) => noms[n]), deuxiemeTourIds: ['C', 'B', 'A'].map((n) => noms[n]) };

  const nuitsDe = (planning, id) =>
    Object.values(planning).filter((jour) => (jour.QUART_1 || []).includes(id)).length;

  it('sert la 1re nuit de chacun avant d\'en donner une 2e — malgré l\'ordre de choix', () => {
    // Trois médecins également disponibles : sans équité, « A » (1er de l'ordre)
    // raflerait les nuits jusqu'à épuisement de son quota.
    const desiderata = desiderataUniforme(['a', 'b', 'c'], '2026-06-01', '2026-06-30', 'Oui');
    const planning = computePriorite('2026-06-01', '2026-06-30', desiderata, listePriorite);
    const nuits = ['a', 'b', 'c'].map((id) => nuitsDe(planning, id));
    // Écart maximal d'une nuit entre le plus et le moins servi.
    expect(Math.max(...nuits) - Math.min(...nuits)).toBeLessThanOrEqual(1);
  });

  it('ne place JAMAIS deux nuits consécutives, quitte à laisser la place vide', () => {
    const desiderata = desiderataUniforme(['a', 'b', 'c'], '2026-06-01', '2026-06-30', 'Oui');
    const planning = computePriorite('2026-06-01', '2026-06-30', desiderata, listePriorite);
    const dates = Object.keys(planning).sort();
    for (let i = 1; i < dates.length; i += 1) {
      const veille = (planning[dates[i - 1]].QUART_1 || []).filter(Boolean);
      const jour = (planning[dates[i]].QUART_1 || []).filter(Boolean);
      jour.forEach((m) => expect(veille).not.toContain(m));
    }
  });

  it('laisse la nuit NON POURVUE plutôt que de doubler le seul médecin disponible', () => {
    // « a » est le seul à pouvoir faire les nuits des 1er et 2 juin.
    const desiderata = {
      a: {
        nombreGardesSouhaitees: 10,
        nombreGardesMaxParSemaine: 7,
        preferences: {
          '2026-06-01': { QUART_1: 'Oui' },
          '2026-06-02': { QUART_1: 'Oui' },
        },
      },
    };
    const planning = computePriorite('2026-06-01', '2026-06-02', desiderata,
      { premierTourIds: ['a'], deuxiemeTourIds: ['a'] });
    const nuits1 = planning['2026-06-01'].QUART_1.filter(Boolean);
    const nuits2 = planning['2026-06-02'].QUART_1.filter(Boolean);
    expect(nuits1).toContain('a');
    expect(nuits2).toEqual([]); // vide : « a » a déjà fait la veille
  });

  it('creeraitCreneauxConsecutifs ne s\'applique qu\'au 1er quart', () => {
    const planning = { '2026-06-01': { QUART_1: ['a'], QUART_3: ['a'] } };
    expect(creeraitCreneauxConsecutifs('a', '2026-06-02', 'QUART_1', planning)).toBe(true);
    expect(creeraitCreneauxConsecutifs('a', '2026-06-02', 'QUART_3', planning)).toBe(false);
    expect(creeraitCreneauxConsecutifs('b', '2026-06-02', 'QUART_1', planning)).toBe(false);
  });

  it('contrôle SYMÉTRIQUE : le lendemain déjà rempli bloque aussi', () => {
    const planning = { '2026-06-03': { QUART_1: ['a'] } };
    expect(creeraitCreneauxConsecutifs('a', '2026-06-02', 'QUART_1', planning)).toBe(true);
  });
});
