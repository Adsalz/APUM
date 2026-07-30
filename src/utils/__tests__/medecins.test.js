import { trierMedecinsParNom } from '../medecins';

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
