// Tests de la règle d'évolution de l'ordre de choix (genererProchainOrdreChoix).
import { genererProchainOrdreChoix, N_BASCULE } from '../ordreChoix';

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

  it('sans liste précédente : ordre alphabétique reproductible', () => {
    const { premierTour } = genererProchainOrdreChoix(null, ['CASAR D', 'ALEMAN A', 'BELLIOT E']);
    expect(premierTour).toEqual(['ALEMAN A', 'BELLIOT E', 'CASAR D']);
  });

  it('N_BASCULE vaut 10', () => {
    expect(N_BASCULE).toBe(10);
  });
});
