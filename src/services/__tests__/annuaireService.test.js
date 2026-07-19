// Tests de la logique de labels de l'annuaire (désambiguïsation des homonymes).
// computeAnnuaireLabels est une fonction pure. Le jest.mock ci-dessous est
// hoisté par Jest au-dessus de l'import : il évite l'initialisation réelle de
// Firebase (../../firebase) déclenchée à l'import d'annuaireService.
import { computeAnnuaireLabels } from '../annuaireService';

jest.mock('../../firebase', () => ({ db: {}, auth: {} }));

describe('computeAnnuaireLabels', () => {
  it('utilise « Prénom N. » quand il n\'y a pas de collision', () => {
    const labels = computeAnnuaireLabels([
      { id: '1', prenom: 'Jean', nom: 'Dupont' },
      { id: '2', prenom: 'Julie', nom: 'Martin' },
    ]);
    expect(labels['1']).toBe('Jean D.');
    expect(labels['2']).toBe('Julie M.');
  });

  it('élargit le préfixe du nom pour distinguer des noms de famille proches', () => {
    const labels = computeAnnuaireLabels([
      { id: '1', prenom: 'Jean', nom: 'Dupont' },
      { id: '2', prenom: 'Jean', nom: 'Durand' },
    ]);
    // Collision « Jean D. » puis « Jean Du. » -> résolue à « Jean Dup./Dur. »
    expect(labels['1']).toBe('Jean Dup.');
    expect(labels['2']).toBe('Jean Dur.');
    expect(labels['1']).not.toBe(labels['2']);
  });

  it('suffixe (1)/(2) pour de vrais homonymes prénom + nom identiques', () => {
    const labels = computeAnnuaireLabels([
      { id: '1', prenom: 'Jean', nom: 'Dupont' },
      { id: '2', prenom: 'Jean', nom: 'Dupont' },
    ]);
    const values = [labels['1'], labels['2']].sort();
    expect(values).toEqual(['Jean Dupont (1)', 'Jean Dupont (2)']);
  });

  it('produit toujours des labels uniques sur un jeu mixte', () => {
    const medecins = [
      { id: 'a', prenom: 'Jean', nom: 'Dupont' },
      { id: 'b', prenom: 'Jean', nom: 'Durand' },
      { id: 'c', prenom: 'Marie', nom: 'Curie' },
      { id: 'd', prenom: 'Jean', nom: 'Dupont' },
    ];
    const labels = computeAnnuaireLabels(medecins);
    const unique = new Set(Object.values(labels));
    expect(unique.size).toBe(medecins.length);
  });

  it('reste robuste sur un nom manquant', () => {
    const labels = computeAnnuaireLabels([{ id: '1', prenom: 'Jean', nom: '' }]);
    expect(labels['1']).toBe('Jean');
  });
});
