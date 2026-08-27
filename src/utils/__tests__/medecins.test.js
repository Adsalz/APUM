import { trierMedecinsParNom, nomFicheCorrespond } from '../medecins';

describe('trierMedecinsParNom', () => {
  it('trie par nom puis prénom, accents et casse ignorés', () => {
    const medecins = [
      { nom: 'Éluard', prenom: 'Paul' },
      { nom: 'durand', prenom: 'Zoé' },
      { nom: 'DURAND', prenom: 'Anne' },
      { nom: 'Astruc', prenom: 'Marc' },
    ];
    const tries = trierMedecinsParNom(medecins);
    expect(tries.map((m) => `${m.nom} ${m.prenom}`)).toEqual([
      'Astruc Marc',
      'DURAND Anne',
      'durand Zoé',
      'Éluard Paul',
    ]);
  });

  it('ne modifie pas la liste d\'origine et tolère les champs manquants', () => {
    const medecins = [{ nom: 'B' }, { prenom: 'seul' }, { nom: 'A' }];
    const tries = trierMedecinsParNom(medecins);
    expect(medecins.map((m) => m.nom)).toEqual(['B', undefined, 'A']);
    expect(tries[0].prenom).toBe('seul'); // nom vide trié en premier
    expect(tries.map((m) => m.nom)).toEqual([undefined, 'A', 'B']);
  });

  it('tolère une liste absente', () => {
    expect(trierMedecinsParNom(undefined)).toEqual([]);
  });
});

describe('nomFicheCorrespond', () => {
  const durand = { nom: 'Durand', prenom: 'Anne' };

  it('accepte les graphies d\'une fiche remplie à la main', () => {
    ['DURAND Anne', 'Anne DURAND', 'Dr Anne Durand', 'a. durand', 'Anne Durand '].forEach((lu) => {
      expect(nomFicheCorrespond(lu, durand)).toBe(true);
    });
  });

  it('ignore les accents', () => {
    expect(nomFicheCorrespond('Léa MÜLLER', { nom: 'Muller', prenom: 'Léa' })).toBe(true);
    expect(nomFicheCorrespond('Jean LEVEQUE', { nom: 'Lévêque', prenom: 'Jean' })).toBe(true);
  });

  it('signale la fiche d\'un autre médecin', () => {
    expect(nomFicheCorrespond('MARTIN Paul', durand)).toBe(false);
  });

  it('ne dit rien quand il n\'y a rien à vérifier', () => {
    // Fiche vierge restée anonyme, ou import JSON qui ne porte pas de nom.
    expect(nomFicheCorrespond('', durand)).toBe(true);
    expect(nomFicheCorrespond('DURAND Anne', null)).toBe(true);
  });
});
