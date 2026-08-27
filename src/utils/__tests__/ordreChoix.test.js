// Tests de la règle d'évolution de l'ordre de choix (genererProchainOrdreChoix).
// Les listes manipulées sont des suites d'IDENTIFIANTS : c'est ce qui rend la
// chaîne insensible aux renommages (cf. l'en-tête de ../ordreChoix).
import { genererProchainOrdreChoix, idsDeLOrdre, N_BASCULE } from '../ordreChoix';

describe('genererProchainOrdreChoix — règle N=10 (bascule tête→queue)', () => {
  it('fait basculer les 10 premiers en bas et place le nouveau APRÈS eux', () => {
    const prec = ['A','B','C','D','E','F','G','H','I','J','K','L']; // 12
    const actuels = [...prec, 'NEW'];
    const { premierTour, deuxiemeTour, nouveaux, partis } = genererProchainOrdreChoix(prec, actuels);
    // gardés = prec (aucun parti) ; reste = [K,L] ; tête = [A..J] ; nouveaux = [NEW]
    expect(premierTour).toEqual(['K','L','A','B','C','D','E','F','G','H','I','J','NEW']);
    expect(deuxiemeTour).toEqual([...premierTour].reverse());
    expect(nouveaux).toEqual(['NEW']);
    expect(partis).toEqual([]);
  });

  // Arbitrage métier explicite (cf. l'en-tête de ordreChoix.js) : un nouveau
  // n'est PAS glissé avant le bloc qui redescend, il ferme la liste. Plusieurs
  // arrivées conservent entre elles l'ordre de l'annuaire.
  it('plusieurs nouveaux ferment la liste, dans leur ordre d’arrivée', () => {
    const prec = Array.from({ length: 12 }, (_, i) => `M${i}`);
    const actuels = [...prec, 'N1', 'N2', 'N3'];
    const { premierTour } = genererProchainOrdreChoix(prec, actuels);
    expect(premierTour.slice(-3)).toEqual(['N1', 'N2', 'N3']);
    expect(premierTour.slice(-13, -3)).toEqual(prec.slice(0, 10)); // le bloc de 10 juste avant
  });

  it('retire les médecins partis avant de basculer', () => {
    const prec = ['A','B','C','D','E','F','G','H','I','J','K','L']; // 12
    const actuels = ['A','B','C','D','E','F','G','H','I','J','L']; // K parti
    const { premierTour, partis } = genererProchainOrdreChoix(prec, actuels);
    // gardés = [A..J, L] (11) ; tête = [A..J] ; reste = [L]
    expect(partis).toEqual(['K']);
    expect(premierTour).toEqual(['L','A','B','C','D','E','F','G','H','I','J']);
  });

  it('le 2ème tour est toujours l’exact inverse du 1er', () => {
    const prec = Array.from({ length: 15 }, (_, i) => `M${i}`);
    const { premierTour, deuxiemeTour } = genererProchainOrdreChoix(prec, prec);
    expect(deuxiemeTour).toEqual([...premierTour].reverse());
  });

  it('sans liste précédente : ordre alphabétique des NOMS, sur des identifiants', () => {
    const nomParId = new Map([['id-c', 'CASAR D'], ['id-a', 'ALEMAN A'], ['id-b', 'BELLIOT E']]);
    const { premierTour } = genererProchainOrdreChoix(null, ['id-c', 'id-a', 'id-b'], nomParId);
    expect(premierTour).toEqual(['id-a', 'id-b', 'id-c']);
  });

  // Le cœur du passage aux identifiants : renommer un médecin ne doit RIEN
  // changer. Avec des noms, l'ancien code le voyait « parti » puis « nouveau »
  // et le renvoyait en bas de liste (arrivé en production le 2026-08-26).
  it('renommer un médecin ne le déplace pas dans la liste', () => {
    const prec = Array.from({ length: 12 }, (_, i) => `id${i}`);
    const { premierTour, nouveaux, partis } = genererProchainOrdreChoix(prec, prec);
    // Même population, quel que soit l'état civil affiché.
    expect(nouveaux).toEqual([]);
    expect(partis).toEqual([]);
    expect(premierTour.slice(-10)).toEqual(prec.slice(0, 10));
  });
});

describe('idsDeLOrdre — lecture d’un document stocké', () => {
  const medecins = [
    { id: 'id-a', nom: 'ZWANEVELD', prenom: 'Nicole' },
    { id: 'id-b', nom: 'BENOIT', prenom: 'Grégoire' },
  ];

  it('prend les identifiants quand ils sont là, sans regarder les noms', () => {
    const doc = {
      premierTourIds: ['id-b', 'id-a'],
      premierTour: ['un nom devenu faux', 'un autre'],
    };
    const { premierTourIds, deuxiemeTourIds, migre } = idsDeLOrdre(doc, medecins);
    expect(premierTourIds).toEqual(['id-b', 'id-a']);
    expect(deuxiemeTourIds).toEqual(['id-a', 'id-b']);
    expect(migre).toBe(true);
  });

  it('résout les anciens documents (noms seuls) et SIGNALE ce qu’il n’a pas pu résoudre', () => {
    const doc = { premierTour: ['ZWANEVELD Nicole', 'INCONNU Jean', 'BENOIT Grégoire'] };
    const { premierTourIds, nonResolus, migre } = idsDeLOrdre(doc, medecins);
    expect(premierTourIds).toEqual(['id-a', 'id-b']);
    expect(nonResolus).toEqual(['INCONNU Jean']);
    expect(migre).toBe(false);
  });

  it('N_BASCULE vaut 10', () => {
    expect(N_BASCULE).toBe(10);
  });
});
