// Tests des comportements CORRIGÉS du cœur de génération (planningCore).
// planningCore n'importe ni Firebase ni les services → import direct sans mock.
import {
  verifierContraintes,
  evaluerPlanning,
  computeClassique,
  computePriorite,
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

describe('planningCore — computeClassique (dispo = contrainte dure, y compris en tabou)', () => {
  it('ne place JAMAIS un médecin ayant répondu « Non » partout', () => {
    const ids = ['dOui', 'dNon'];
    const desiderata = {
      ...desiderataUniforme(['dOui'], '2025-06-01', '2025-06-03', 'Oui'),
      ...desiderataUniforme(['dNon'], '2025-06-01', '2025-06-03', 'Non'),
    };
    const planning = computeClassique('2025-06-01', '2025-06-03', desiderata, ids);
    expect(tousLesMedecinsAffectes(planning).has('dNon')).toBe(false);
  });
});

describe('planningCore — computePriorite (déterministe + invariants)', () => {
  const ids = ['d1', 'd2', 'd3', 'd4', 'd5'];
  const noms = { 'Dr 1': 'd1', 'Dr 2': 'd2', 'Dr 3': 'd3', 'Dr 4': 'd4', 'Dr 5': 'd5', 'Dr Non': 'dNon' };
  const ordre = ['Dr 1', 'Dr 2', 'Dr 3', 'Dr 4', 'Dr 5', 'Dr Non'];
  const listePriorite = { premierTour: ordre, deuxiemeTour: [...ordre].reverse() };
  const debut = '2025-06-01';
  const fin = '2025-06-20'; // 20 jours → 2 tours (10 + 10), tout en juin

  const desiderata = {
    ...desiderataUniforme(ids, debut, fin, 'Oui', { souhaitees: 6, max: 5 }),
    ...desiderataUniforme(['dNon'], debut, fin, 'Non', { souhaitees: 6, max: 5 }),
  };

  const planning = computePriorite(debut, fin, desiderata, noms, listePriorite);

  it('est déterministe (même entrée → même sortie)', () => {
    const planning2 = computePriorite(debut, fin, desiderata, noms, listePriorite);
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
