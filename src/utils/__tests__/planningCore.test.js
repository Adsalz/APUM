// Tests des comportements CORRIGÉS du cœur de génération (planningCore).
// planningCore n'importe ni Firebase ni les services → import direct sans mock.
import {
  verifierContraintes,
  evaluerPlanning,
  computePriorite,
  creeraitCreneauxConsecutifs,
  TIRAGE,
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

  it('3 jours consécutifs : ÉVITÉS au tirage quand une alternative existe…', () => {
    // X veut 3 gardes, disponible les 1, 2, 3 et 4 juin sur le 3e quart : le tirage prend
    // les 1 et 2, saute le 3 (troisième jour d'affilée) et prend le 4.
    const desiderata = { X: { nombreGardesSouhaitees: 3, nombreGardesMaxParSemaine: 7, preferences: {
      '2026-06-01': { QUART_3: 'Oui' }, '2026-06-02': { QUART_3: 'Oui' }, '2026-06-03': { QUART_3: 'Oui' }, '2026-06-04': { QUART_3: 'Oui' } } } };
    const p = computePriorite('2026-06-01', '2026-07-31', desiderata, { premierTourIds: ['X'], deuxiemeTourIds: ['X'] });
    const surX = (d) => p[d].QUART_3.includes('X');
    expect([surX('2026-06-01'), surX('2026-06-02'), surX('2026-06-03'), surX('2026-06-04')]).toEqual([true, true, false, true]);
  });

  it('…mais TOLÉRÉS au comblement, en dernier recours, plutôt que de laisser la place vide', () => {
    // Même X, disponible seulement les 1, 2 et 3 juin : sans le 3, la place resterait vide.
    const desiderata = { X: { nombreGardesSouhaitees: 3, nombreGardesMaxParSemaine: 7, preferences: {
      '2026-06-01': { QUART_3: 'Oui' }, '2026-06-02': { QUART_3: 'Oui' }, '2026-06-03': { QUART_3: 'Oui' } } } };
    const p = computePriorite('2026-06-01', '2026-07-31', desiderata, { premierTourIds: ['X'], deuxiemeTourIds: ['X'] });
    expect(['2026-06-01', '2026-06-02', '2026-06-03'].every((d) => p[d].QUART_3.includes('X'))).toBe(true);
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
  it('B1 — pas de 3 jours consécutifs à la frontière de mois quand une autre règle (nuits) les évite', () => {
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

// Le TIRAGE : la règle de l'ordre de choix — le premier de la liste prend ses gardes,
// puis le deuxième, puis le troisième… — avec les réglages lus dans le planning de la
// coordinatrice (voir la constante TIRAGE dans planningCore.js).
describe('planningCore — tirage (le premier de la liste prend ses gardes)', () => {
  const fiche = (prefs, q = 1) => ({
    nombreGardesSouhaitees: q, nombreGardesMaxParSemaine: 7, gardesGroupees: false, renfortsAssocies: false, preferences: prefs,
  });
  const liste = (t1, t2) => ({ premierTourIds: t1, deuxiemeTourIds: t2 || [...t1].reverse() });
  const gardesDe = (planning, id) => {
    const out = [];
    for (const d of Object.keys(planning).sort()) {
      for (const [cid, arr] of Object.entries(planning[d])) { if (arr.includes(id)) { out.push(`${d} ${cid}`); } }
    }
    return out;
  };
  const tousLesJours = (mois, cid, pref) => {
    const prefs = {};
    for (let j = 1; j <= 30; j += 1) { prefs[`${mois}-${String(j).padStart(2, '0')}`] = { [cid]: pref }; }
    return prefs;
  };
  // Juin→juillet 2026 : 61 jours, le 1er tour couvre juin ENTIER (30 j), le 2e juillet (31 j).
  const DEBUT = '2026-06-01'; const FIN = '2026-07-31';

  it('à égalité, le premier de la liste est servi et le second ne l\'est pas — et l\'inverse au 2e tour', () => {
    // Une seule place disputée par mois : le renfort 20h-00h (effectif 1).
    const desiderata = {
      a: fiche({ '2026-06-10': { RENFORT_2: 'Oui' }, '2026-07-10': { RENFORT_2: 'Oui' } }),
      b: fiche({ '2026-06-10': { RENFORT_2: 'Oui' }, '2026-07-10': { RENFORT_2: 'Oui' } }),
    };
    const planning = computePriorite(DEBUT, FIN, desiderata, liste(['a', 'b']));
    expect(planning['2026-06-10'].RENFORT_2).toEqual(['a']); // 1er tour : a choisit avant b
    expect(planning['2026-07-10'].RENFORT_2).toEqual(['b']); // 2e tour : liste inversée, b choisit avant a
  });

  it('pose chaque médecin là où il est le plus utile : le seul volontaire d\'un jour y est envoyé', () => {
    // a est volontaire le 10 (disputé avec b) et le 20 (seul), quota 1 : a va le 20, b prend le 10.
    // Dans l'ordre du calendrier, a prendrait le 10 et b ne serait pas servi.
    const desiderata = {
      a: fiche({ '2026-06-10': { RENFORT_2: 'Oui' }, '2026-06-20': { RENFORT_2: 'Oui' } }),
      b: fiche({ '2026-06-10': { RENFORT_2: 'Oui' } }),
    };
    const planning = computePriorite(DEBUT, FIN, desiderata, liste(['a', 'b']));
    expect(planning['2026-06-20'].RENFORT_2).toEqual(['a']);
    expect(planning['2026-06-10'].RENFORT_2).toEqual(['b']);
  });

  it('les « Possible » ne sont servis qu\'après TOUS les « Oui », même ceux des moins bien placés', () => {
    const desiderata = {
      a: fiche({ '2026-06-10': { RENFORT_2: 'Possible' } }), // 1er de la liste, mais « Possible »
      b: fiche({ '2026-06-10': { RENFORT_2: 'Oui' } }),      // 2e, mais « Oui »
    };
    const planning = computePriorite(DEBUT, FIN, desiderata, liste(['a', 'b']));
    expect(planning['2026-06-10'].RENFORT_2).toEqual(['b']);
  });

  it('un mois coupé par les deux tours est servi au prorata : moitié avant la coupe, moitié après', () => {
    // Juin seul : 1er tour du 1er au 15, 2e du 16 au 30. Un médecin, quota 4, disponible tous
    // les jours sur le 3e quart (3 places). Sans prorata il prendrait ses 4 gardes avant le 15.
    const planning = computePriorite('2026-06-01', '2026-06-30', { a: fiche(tousLesJours('2026-06', 'QUART_3', 'Oui'), 4) }, liste(['a']));
    const gardes = gardesDe(planning, 'a');
    expect(gardes).toHaveLength(4);
    expect(gardes.filter((g) => g.slice(0, 10) <= '2026-06-15')).toHaveLength(2);
  });

  it('les flexibles (souhait 0) tirent après les médecins à quota, même mieux placés', () => {
    const desiderata = {
      a: fiche({ '2026-06-10': { RENFORT_2: 'Oui' } }, 0), // 1er de la liste, flexible
      b: fiche({ '2026-06-10': { RENFORT_2: 'Oui' } }, 1), // 2e, avec un quota
    };
    const planning = computePriorite(DEBUT, FIN, desiderata, liste(['a', 'b']));
    expect(planning['2026-06-10'].RENFORT_2).toEqual(['b']);
  });

  it('une seule nuit par mois pendant le tirage : le premier de la liste n\'accapare pas les nuits', () => {
    // Cinq médecins volontaires toutes les nuits de juin (2 places/nuit), quotas larges.
    // SANS plafond, a et b prendraient une nuit sur deux jusqu'à leur max hebdo et e n'en
    // aurait aucune ; AVEC le plafond, chacun a la sienne puis le comblement égalise.
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const desiderata = Object.fromEntries(ids.map((id) => [id, fiche(tousLesJours('2026-06', 'QUART_1', 'Oui'), 20)]));
    const nuitsDe = (planning) => ids.map((id) => gardesDe(planning, id).filter((g) => g.endsWith('QUART_1')).length);
    const avec = nuitsDe(computePriorite(DEBUT, FIN, desiderata, liste(ids)));
    expect(Math.max(...avec) - Math.min(...avec)).toBeLessThanOrEqual(2);
    expect(Math.min(...avec)).toBeGreaterThanOrEqual(1);
    // Le test discrimine bien son réglage : sans plafond, la répartition s'effondre.
    const sans = nuitsDe(computePriorite(DEBUT, FIN, desiderata, liste(ids), { ...TIRAGE, nuitsMaxParMoisPendantTirage: 0 }));
    expect(Math.max(...sans) - Math.min(...sans)).toBeGreaterThan(5);
  });

  it('un « Possible » du 1er tour ne consomme pas le quota qu\'un « Oui » du 2e tour attend', () => {
    // Juin seul (1er tour 1-15, 2e tour 16-30). a, quota 1 : « Possible » le 10, « Oui » le 20.
    // Les « Oui » des deux tours passent avant les « Possible » : a doit être le 20, pas le 10.
    const desiderata = { a: fiche({ '2026-06-10': { RENFORT_2: 'Possible' }, '2026-06-20': { RENFORT_2: 'Oui' } }, 1) };
    const planning = computePriorite('2026-06-01', '2026-06-30', desiderata, liste(['a']));
    expect(planning['2026-06-20'].RENFORT_2).toEqual(['a']);
    expect(planning['2026-06-10'].RENFORT_2).toEqual([null]);
  });

  it('prorata : une période qui finit avant la fin du mois donne quand même le reliquat au 2e tour', () => {
    // 1er→29 juin : 1er tour 1-14, 2e tour 15-29. Quota 4, disponible tous les jours (3e quart).
    // Le 2e tour est le dernier : juin « se termine » le 29 dans la période → quota entier.
    const planning = computePriorite('2026-06-01', '2026-06-29', { a: fiche(tousLesJours('2026-06', 'QUART_3', 'Oui'), 4) }, liste(['a']));
    const gardes = gardesDe(planning, 'a');
    expect(gardes).toHaveLength(4);
    expect(gardes.filter((g) => g.slice(0, 10) >= '2026-06-15').length).toBeGreaterThanOrEqual(1);
  });

  it('prorata : une période qui commence en cours de mois ne prive pas le 2e tour du reliquat', () => {
    // Période du 16 juin au 15 juillet (30 j) : 1er tour 16-30 juin, 2e tour 1-15 juillet.
    // Juin n'a que 15 jours DANS la période, tous au 1er tour → quota de juin entier au 1er tour.
    const prefs = {}; for (let j = 16; j <= 30; j += 1) { prefs[`2026-06-${j}`] = { QUART_3: 'Oui' }; }
    const planning = computePriorite('2026-06-16', '2026-07-15', { a: fiche(prefs, 4) }, liste(['a']));
    expect(gardesDe(planning, 'a')).toHaveLength(4);
  });

  it('une fiche hors des deux listes ne pèse pas sur le planning des autres (et ne reçoit rien)', () => {
    // Un médecin parti dont la fiche reste en base : même volontaire partout, il est invisible.
    const desiderata = {
      a: fiche({ '2026-06-10': { RENFORT_2: 'Oui' }, '2026-06-20': { RENFORT_2: 'Oui' } }),
      b: fiche({ '2026-06-10': { RENFORT_2: 'Oui' } }),
    };
    const reference = computePriorite(DEBUT, FIN, desiderata, liste(['a', 'b']));
    const fantome = { ...desiderata, z: fiche(tousLesJours('2026-06', 'RENFORT_2', 'Oui'), 20) };
    const avecFantome = computePriorite(DEBUT, FIN, fantome, liste(['a', 'b']));
    expect(avecFantome).toEqual(reference);
    expect(gardesDe(avecFantome, 'z')).toEqual([]);
  });

  it('le réglage « calendrier » redonne l\'ancien comportement : le premier de la liste prend les premiers jours', () => {
    const desiderata = {
      a: fiche({ '2026-06-10': { RENFORT_2: 'Oui' }, '2026-06-20': { RENFORT_2: 'Oui' } }),
      b: fiche({ '2026-06-10': { RENFORT_2: 'Oui' } }),
    };
    const planning = computePriorite(DEBUT, FIN, desiderata, liste(['a', 'b']), { ...TIRAGE, choixDesJours: 'calendrier' });
    expect(planning['2026-06-10'].RENFORT_2).toEqual(['a']);
    expect(planning['2026-06-20'].RENFORT_2).toEqual([null]); // b n'était pas volontaire le 20
  });
});
