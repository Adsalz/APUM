// Tests des fonctions pures de l'ÉDITION manuelle du planning.
import {
  indexerDesiderata,
  preferencePour,
  souhaitMensuelDe,
  maxParSemaineDe,
  indexerPlanning,
  gardesDuMois,
  problemesAffectation,
  problemesCandidat,
  pireNiveau,
  analyserPlanning,
  datesIncompletes,
  cleSlot,
  reducerEdition,
  etatEditionInitial,
  NIVEAUX
} from '../planningEdition';

// 2026-08-03 = lundi, 04 = mardi, 05 = mercredi (semaine)
const D1 = '2026-08-03';
const D2 = '2026-08-04';
const D3 = '2026-08-05';

const desiderataDocs = [
  {
    userId: 'm1',
    nombreGardesSouhaitees: 2,
    nombreGardesMaxParSemaine: 3,
    desiderata: {
      [D1]: { QUART_1: 'Oui', QUART_2: 'Oui', QUART_4: 'Oui', RENFORT_2: 'Oui' },
      [D2]: { QUART_1: 'Oui' },
      [D3]: { QUART_1: 'Oui' }
    }
  },
  {
    userId: 'm2',
    nombreGardesSouhaitees: 0, // non renseigné = flexible
    desiderata: { [D1]: { QUART_1: 'Non' } }
  }
];

const planningDoc = {
  planning: {
    [D1]: { QUART_1: ['m1', null], QUART_2: ['m1', null, null] },
    [D2]: { QUART_1: [null, null] }
  }
};

describe('planningEdition — indexerDesiderata', () => {
  const idx = indexerDesiderata(desiderataDocs);

  it('donne un accès O(1) aux préférences', () => {
    expect(preferencePour(idx, 'm1', D1, 'QUART_1')).toBe('Oui');
    expect(preferencePour(idx, 'm2', D1, 'QUART_1')).toBe('Non');
    expect(preferencePour(idx, 'm1', D1, 'QUART_3')).toBe('');
    expect(preferencePour(idx, 'inconnu', D1, 'QUART_1')).toBe('');
  });

  it('expose souhait mensuel et max hebdomadaire (avec défauts)', () => {
    expect(souhaitMensuelDe(idx, 'm1')).toBe(2);
    expect(souhaitMensuelDe(idx, 'm2')).toBe(0);
    expect(maxParSemaineDe(idx, 'm1')).toBe(3);
    expect(maxParSemaineDe(idx, 'm2')).toBe(7); // défaut
  });

  it('fusionne plusieurs fiches d\'un même médecin', () => {
    const fusion = indexerDesiderata([
      { userId: 'm1', desiderata: { [D1]: { QUART_1: 'Oui' } } },
      { userId: 'm1', desiderata: { [D1]: { QUART_2: 'Possible' }, [D2]: { QUART_1: 'Non' } } }
    ]);
    expect(preferencePour(fusion, 'm1', D1, 'QUART_1')).toBe('Oui');
    expect(preferencePour(fusion, 'm1', D1, 'QUART_2')).toBe('Possible');
    expect(preferencePour(fusion, 'm1', D2, 'QUART_1')).toBe('Non');
  });

  it('ignore les documents sans userId', () => {
    expect(indexerDesiderata([null, {}, undefined]).size).toBe(0);
  });
});

describe('planningEdition — indexerPlanning', () => {
  const idx = indexerPlanning(planningDoc);

  it('compte les places et les places vides', () => {
    expect(idx.places).toBe(7);   // 2 + 3 + 2
    expect(idx.pourvues).toBe(2); // m1 deux fois le 03
    expect(idx.placesVides).toHaveLength(5);
  });

  it('agrège par mois, par semaine et par jour', () => {
    expect(gardesDuMois(idx, D1, 'm1')).toBe(2);
    expect(idx.parJour[D1].m1).toBe(2);
    expect(Object.values(idx.parSemaine)[0].m1).toBe(2);
  });

  it('tolère un planning vide', () => {
    expect(indexerPlanning(null).places).toBe(0);
    expect(indexerPlanning({}).placesVides).toEqual([]);
  });
});

describe('planningEdition — détection des problèmes', () => {
  const idx = indexerDesiderata(desiderataDocs);

  it('signale un chevauchement de créneaux (QUART_4 / RENFORT_2)', () => {
    const jours = { [D1]: { QUART_4: ['m1'], RENFORT_2: ['m1'] } };
    const pbs = problemesAffectation('m1', D1, 'QUART_4', jours, indexerPlanning({ planning: jours }), idx);
    expect(pbs.map((p) => p.code)).toContain('chevauchement');
    expect(pireNiveau(pbs)).toBe(NIVEAUX.DUR);
  });

  it('signale un doublon dans le même créneau', () => {
    const jours = { [D1]: { QUART_1: ['m1', 'm1'] } };
    const pbs = problemesAffectation('m1', D1, 'QUART_1', jours, indexerPlanning({ planning: jours }), idx);
    expect(pbs.map((p) => p.code)).toContain('doublon');
  });

  it('signale 3 jours de garde consécutifs', () => {
    const jours = {
      [D1]: { QUART_1: ['m1'] },
      [D2]: { QUART_1: ['m1'] },
      [D3]: { QUART_1: ['m1'] }
    };
    const pbs = problemesAffectation('m1', D2, 'QUART_1', jours, indexerPlanning({ planning: jours }), idx);
    expect(pbs.map((p) => p.code)).toContain('troisJours');
  });

  it('signale un médecin ayant répondu « Non » (niveau fort, pas dur)', () => {
    const jours = { [D1]: { QUART_1: ['m2'] } };
    const pbs = problemesAffectation('m2', D1, 'QUART_1', jours, indexerPlanning({ planning: jours }), idx);
    const indispo = pbs.find((p) => p.code === 'indisponible');
    expect(indispo).toBeDefined();
    expect(indispo.niveau).toBe(NIVEAUX.FORT);
  });

  it('signale le dépassement du quota mensuel, jamais un souhait à 0', () => {
    const jours = { [D1]: { QUART_1: ['m1'], QUART_2: ['m1'], QUART_3: ['m1'] } };
    const idxP = indexerPlanning({ planning: jours });
    const pbs = problemesAffectation('m1', D1, 'QUART_1', jours, idxP, idx);
    expect(pbs.find((p) => p.code === 'quota').detail).toBe('3/2');

    const joursM2 = { [D1]: { QUART_2: ['m2'], QUART_3: ['m2'] } };
    const pbsM2 = problemesAffectation('m2', D1, 'QUART_2', joursM2, indexerPlanning({ planning: joursM2 }), idx);
    expect(pbsM2.map((p) => p.code)).not.toContain('quota');
  });

  // L'écran d'édition doit signaler la MÊME contrainte que le moteur : deux nuits
  // (1h-7h) d'affilée sont interdites, y compris posées à la main.
  it('signale deux nuits consécutives, en avant comme en arrière', () => {
    const jours = { [D1]: { QUART_1: ['m1'] }, [D2]: { QUART_1: [null] } };
    const idxP = indexerPlanning({ planning: jours });
    const codes = problemesCandidat('m1', D2, 'QUART_1', jours, idxP, idx).map((p) => p.code);
    expect(codes).toContain('nuitsConsecutives');

    // Contrôle symétrique : la veille encore libre, le LENDEMAIN déjà pris.
    const joursApres = { [D1]: { QUART_1: [null] }, [D2]: { QUART_1: ['m1'] } };
    const codesAvant = problemesCandidat('m1', D1, 'QUART_1', joursApres,
      indexerPlanning({ planning: joursApres }), idx).map((p) => p.code);
    expect(codesAvant).toContain('nuitsConsecutives');
  });

  it('ne signale rien pour deux jours d\'affilée sur un AUTRE créneau', () => {
    const jours = { [D1]: { QUART_3: ['m1'] }, [D2]: { QUART_3: [null] } };
    const codes = problemesCandidat('m1', D2, 'QUART_3', jours,
      indexerPlanning({ planning: jours }), idx).map((p) => p.code);
    expect(codes).not.toContain('nuitsConsecutives');
  });

  it('problemesCandidat anticipe le quota AVANT affectation', () => {
    const jours = { [D1]: { QUART_1: ['m1'], QUART_2: ['m1'], QUART_3: [null] } };
    const idxP = indexerPlanning({ planning: jours });
    // m1 est pile à 2/2 ce mois : « atteint », pas encore « dépassé »
    const pbs = problemesCandidat('m1', D1, 'QUART_3', jours, idxP, idx);
    const quota = pbs.find((p) => p.code === 'quotaAtteint');
    expect(quota.detail).toBe('2/2');
    expect(quota.libelle).toBe('Quota mensuel atteint');
    expect(pbs.map((p) => p.code)).not.toContain('quota');
    // ... et il a déjà 2 créneaux ce jour-là
    expect(pbs.map((p) => p.code)).toContain('deuxCreneaux');
  });

  it('problemesCandidat distingue « atteint » de « dépassé »', () => {
    const jours = { [D1]: { QUART_1: ['m1'], QUART_2: ['m1'], QUART_3: ['m1', null] } };
    const idxP = indexerPlanning({ planning: jours });
    const pbs = problemesCandidat('m1', D2, 'QUART_1', jours, idxP, idx);
    expect(pbs.find((p) => p.code === 'quota').detail).toBe('3/2');
    expect(pbs.map((p) => p.code)).not.toContain('quotaAtteint');
  });

  it('un souhait à 0 (non renseigné) ne déclenche jamais d\'alerte de quota', () => {
    const jours = { [D1]: { QUART_2: ['m2', 'm2', null] } };
    const idxP = indexerPlanning({ planning: jours });
    const codes = problemesCandidat('m2', D2, 'QUART_1', jours, idxP, idx).map((p) => p.code);
    expect(codes).not.toContain('quota');
    expect(codes).not.toContain('quotaAtteint');
  });

  it('pireNiveau hiérarchise dur > fort > info', () => {
    expect(pireNiveau([])).toBe('');
    expect(pireNiveau([{ niveau: NIVEAUX.INFO }])).toBe(NIVEAUX.INFO);
    expect(pireNiveau([{ niveau: NIVEAUX.INFO }, { niveau: NIVEAUX.FORT }])).toBe(NIVEAUX.FORT);
    expect(pireNiveau([{ niveau: NIVEAUX.FORT }, { niveau: NIVEAUX.DUR }])).toBe(NIVEAUX.DUR);
  });
});

describe('planningEdition — analyserPlanning', () => {
  const idx = indexerDesiderata(desiderataDocs);
  const analyse = analyserPlanning(planningDoc, idx);

  it('calcule couverture et places vides', () => {
    expect(analyse.places).toBe(7);
    expect(analyse.pourvues).toBe(2);
    expect(analyse.vides).toBe(5);
    expect(analyse.tauxCouverture).toBeCloseTo(2 / 7);
  });

  it('n\'indexe que les places réellement problématiques', () => {
    // m1 est à 2/2 : pas de dépassement, préférences « Oui » → aucun problème
    expect(analyse.problemesParSlot.size).toBe(0);
    expect(analyse.violationsDures).toBe(0);
  });

  it('remonte les violations dures avec leur clé de place', () => {
    const doc = { planning: { [D1]: { QUART_4: ['m1'], RENFORT_2: ['m1'] } } };
    const a = analyserPlanning(doc, idx);
    expect(a.violationsDures).toBe(2); // les deux créneaux se chevauchent
    expect(a.problemesParSlot.get(cleSlot(D1, 'QUART_4', 0))).toBeDefined();
  });

  it('datesIncompletes ne retient que les jours à trous', () => {
    const dates = datesIncompletes(planningDoc);
    expect(dates.has(D1)).toBe(true);
    expect(dates.has(D2)).toBe(true);
    expect(datesIncompletes({ planning: { [D1]: { QUART_1: ['m1'] } } }).size).toBe(0);
  });
});

describe('planningEdition — reducerEdition', () => {
  const base = { ...etatEditionInitial, planning: planningDoc, reference: planningDoc };

  it('affecte un médecin SANS muter l\'état précédent', () => {
    const apres = reducerEdition(base, {
      type: 'affecter', date: D1, creneau: 'QUART_1', index: 1, medecinId: 'm2'
    });
    expect(apres.planning.planning[D1].QUART_1).toEqual(['m1', 'm2']);
    // l'objet d'origine est INTACT — c'est ce qui rend l'annulation possible
    expect(planningDoc.planning[D1].QUART_1).toEqual(['m1', null]);
    expect(apres.planning).not.toBe(base.planning);
    expect(apres.historique).toEqual([planningDoc]);
  });

  it('ignore une affectation identique (pas d\'entrée d\'historique)', () => {
    const apres = reducerEdition(base, {
      type: 'affecter', date: D1, creneau: 'QUART_1', index: 0, medecinId: 'm1'
    });
    expect(apres).toBe(base);
  });

  it('vider une place enregistre null', () => {
    const apres = reducerEdition(base, {
      type: 'affecter', date: D1, creneau: 'QUART_1', index: 0, medecinId: ''
    });
    expect(apres.planning.planning[D1].QUART_1[0]).toBeNull();
  });

  it('crée le créneau absent à l\'effectif du type de jour', () => {
    const apres = reducerEdition(base, {
      type: 'affecter', date: D1, creneau: 'QUART_3', index: 0, medecinId: 'm1'
    });
    expect(apres.planning.planning[D1].QUART_3).toEqual(['m1', null, null]); // 3 en semaine
  });

  it('annulerAction revient à l\'état précédent, pas au-delà', () => {
    const e1 = reducerEdition(base, { type: 'affecter', date: D1, creneau: 'QUART_1', index: 1, medecinId: 'm2' });
    const e2 = reducerEdition(e1, { type: 'affecter', date: D2, creneau: 'QUART_1', index: 0, medecinId: 'm1' });
    const retour1 = reducerEdition(e2, { type: 'annulerAction' });
    expect(retour1.planning).toBe(e1.planning);
    const retour2 = reducerEdition(retour1, { type: 'annulerAction' });
    expect(retour2.planning).toBe(planningDoc);
    // pile vide : ne fait plus rien
    expect(reducerEdition(retour2, { type: 'annulerAction' })).toBe(retour2);
  });

  it('abandonner RESTAURE la référence (régression : ne restaurait rien)', () => {
    let etat = base;
    for (let i = 0; i < 3; i++) {
      etat = reducerEdition(etat, {
        type: 'affecter', date: D2, creneau: 'QUART_1', index: i % 2, medecinId: `m${(i % 2) + 1}`
      });
    }
    expect(etat.historique.length).toBeGreaterThan(0);
    const abandon = reducerEdition(etat, { type: 'abandonner' });
    expect(abandon.planning).toBe(planningDoc);
    expect(abandon.historique).toEqual([]);
  });

  it('pointStable fige la référence sur l\'état courant', () => {
    const e1 = reducerEdition(base, { type: 'affecter', date: D1, creneau: 'QUART_1', index: 1, medecinId: 'm2' });
    const stable = reducerEdition(e1, { type: 'pointStable' });
    expect(stable.reference).toBe(e1.planning);
    expect(stable.historique).toEqual([]);
    // abandonner après sauvegarde ne revient PAS avant la sauvegarde
    expect(reducerEdition(stable, { type: 'abandonner' }).planning).toBe(e1.planning);
  });

  it('borne la profondeur de l\'historique', () => {
    let etat = base;
    for (let i = 0; i < 60; i++) {
      etat = reducerEdition(etat, {
        type: 'affecter', date: D2, creneau: 'QUART_1', index: 0, medecinId: i % 2 ? 'm1' : 'm2'
      });
    }
    expect(etat.historique.length).toBe(50);
  });

  it('ignore une action inconnue', () => {
    expect(reducerEdition(base, { type: 'inconnue' })).toBe(base);
  });
});
