// src/devtools/planningFixtures.js
// DEV UNIQUEMENT — jeu de données FICTIF (aucune donnée réelle de médecin) servant
// à faire tourner l'écran d'édition du planning en local, sans Firebase ni auth.
// Volumétrie calquée sur la période réelle ASO26 : 92 jours, ~42 médecins,
// ~73 % de couverture (le reste = les trous que l'admin comble à la main).
import { creneaux, effectifPour } from '../utils/planningCore';

// PRNG déterministe (mulberry32) : mêmes fixtures à chaque rechargement, donc
// captures d'écran reproductibles.
const mulberry32 = (seed) => {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Noms fictifs, longueurs volontairement variées (dont des noms composés longs :
// c'est là que la troncature de la cellule se voit).
const NOMS = [
  'ALBARET', 'BONNEFOY', 'CASTELLANE', 'DUVIVIER', 'ESTRABAUD', 'FONTVIEILLE',
  'GARRIGUES', 'HAUTECLOQUE', 'IMBERNON', 'JOUVENCEAU', 'KERGUELEN', 'LAFFONT',
  'MARCHESSEAU', 'NOUGAREDE', 'ORSATELLI', 'PEYRIGUER', 'QUILICHINI', 'ROUVEYROL',
  'SANTONI-BRIAND', 'TOURNADRE', 'URBANI', 'VAUCANSON', 'WEISSENBACH', 'XIMENES',
  'YSSARTIER', 'ZAMBELLI', 'ARNOUX', 'BEDARRIDES', 'CHAMPSAUR', 'DELAUNAY-PORT',
  'ETCHEVERRY', 'FRANCHESCHI', 'GRIMALDI', 'HOUDEMONT', 'ISNARD', 'JAUFFRET',
  'LOUBATIERES', 'MISTRAL', 'NAVARRO', 'OLLIVIER', 'PASTOUREAU', 'RIQUELME'
];
const PRENOMS = [
  'Magalie', 'Jean-Baptiste', 'Sophie', 'Karim', 'Anne-Laure', 'Thibaut',
  'Élodie', 'Grégoire', 'Nadia', 'Vincent', 'Clémentine', 'Farid',
  'Isabelle', 'Maxime', 'Solène', 'Pierre-Yves', 'Amandine', 'Olivier',
  'Béatrice', 'Ludovic', 'Charlotte', 'Nicolas', 'Émilie', 'Raphaël',
  'Sandrine', 'Antoine', 'Marion', 'Julien', 'Céline', 'Bastien',
  'Delphine', 'Alexandre', 'Laetitia', 'Hugo', 'Valérie', 'Damien',
  'Aurélie', 'Sébastien', 'Camille', 'Mathieu', 'Nathalie', 'Romain'
];

const PREFS = ['Oui', 'Possible', 'Non'];

// Toutes les dates 'YYYY-MM-DD' entre deux bornes incluses (UTC, comme le moteur).
const listerDates = (debut, fin) => {
  const dates = [];
  const d = new Date(debut);
  const end = new Date(fin);
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
};

export const PERIODE_FIXTURE = { startDate: '2026-08-01', endDate: '2026-10-31' };

/**
 * Construit un jeu {medecins, desiderata, planning} fictif.
 * @param {object} opts
 * @param {number} opts.nbMedecins  nombre de médecins (défaut 42)
 * @param {number} opts.nbJours     nombre de jours depuis le 01/08/2026 (défaut 92)
 * @param {number} opts.couverture  proportion de places pourvues (défaut 0.73)
 */
export const construireFixtures = ({
  nbMedecins = 42,
  nbJours = 92,
  couverture = 0.73,
  seed = 20260801
} = {}) => {
  const rnd = mulberry32(seed);

  const medecins = Array.from({ length: nbMedecins }, (_, i) => ({
    id: `med-${String(i + 1).padStart(2, '0')}`,
    nom: NOMS[i % NOMS.length],
    prenom: PRENOMS[i % PRENOMS.length],
    role: 'medecin'
  }));

  const toutesDates = listerDates(PERIODE_FIXTURE.startDate, PERIODE_FIXTURE.endDate)
    .slice(0, nbJours);
  const finReelle = toutesDates[toutesDates.length - 1];

  // --- Desiderata : une fiche par médecin, préférences par date × créneau.
  const desiderata = medecins.map((m, i) => {
    const prefs = {};
    toutesDates.forEach((date) => {
      const jour = {};
      creneaux.forEach((c) => {
        if (effectifPour(c.id, date) === 0) { return; }
        const r = rnd();
        // ~45 % Oui, ~25 % Possible, ~20 % Non, ~10 % non renseigné.
        if (r < 0.45) { jour[c.id] = PREFS[0]; }
        else if (r < 0.70) { jour[c.id] = PREFS[1]; }
        else if (r < 0.90) { jour[c.id] = PREFS[2]; }
      });
      if (Object.keys(jour).length > 0) { prefs[date] = jour; }
    });
    return {
      id: `des-${m.id}`,
      userId: m.id,
      startDate: PERIODE_FIXTURE.startDate,
      endDate: finReelle,
      desiderata: prefs,
      // Souhait mensuel : 0 pour 2 médecins (= non renseigné), 4→12 sinon.
      nombreGardesSouhaitees: i % 21 === 0 ? 0 : 4 + Math.floor(rnd() * 9),
      nombreGardesMaxParSemaine: 3 + Math.floor(rnd() * 5),
      gardesGroupees: rnd() < 0.3,
      renfortsAssocies: rnd() < 0.3
    };
  });

  // --- Planning : structure identique à celle produite par computePriorite,
  // avec des places laissées à null (les « trous » à combler).
  const planningParDate = {};
  toutesDates.forEach((date) => {
    const jour = {};
    creneaux.forEach((c) => {
      const effectif = effectifPour(c.id, date);
      if (effectif === 0) { return; }
      const places = Array(effectif).fill(null);
      for (let k = 0; k < effectif; k++) {
        if (rnd() > couverture) { continue; } // place laissée vide
        // Pas deux fois le même médecin dans le même créneau.
        let candidat = null;
        for (let essai = 0; essai < 8 && candidat === null; essai++) {
          const pioche = medecins[Math.floor(rnd() * medecins.length)].id;
          if (!places.includes(pioche)) { candidat = pioche; }
        }
        places[k] = candidat;
      }
      jour[c.id] = places;
    });
    planningParDate[date] = jour;
  });

  const planning = {
    id: 'planning-fixture',
    startDate: `${PERIODE_FIXTURE.startDate}T00:00:00.000Z`,
    endDate: `${finReelle}T00:00:00.000Z`,
    planning: planningParDate
  };

  return { medecins, desiderata, planning, periodeSaisie: { ...PERIODE_FIXTURE, endDate: finReelle } };
};

// Statistiques de contrôle (affichées dans le bandeau du harnais).
export const statsFixtures = ({ planning }) => {
  let total = 0; let pourvues = 0; let creneauxVides = 0;
  Object.values(planning.planning).forEach((jour) => {
    Object.values(jour).forEach((places) => {
      total += places.length;
      const remplies = places.filter(Boolean).length;
      pourvues += remplies;
      if (remplies === 0) { creneauxVides++; }
    });
  });
  return { total, pourvues, vides: total - pourvues, creneauxVides };
};
