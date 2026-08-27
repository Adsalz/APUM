// Garde-fou de NON-RÉGRESSION : l'ordre de choix appartient au TRIMESTRE.
//
// Le défaut d'origine : un document unique `planning/ordre_choix`, réécrit à
// chaque passage dans le générateur. Comme la seule façon de lancer un planning
// était de passer par ce générateur, régénérer dix fois le tableau d'un même
// trimestre appliquait dix fois la bascule des 10 premiers — la liste dérivait
// alors qu'elle aurait dû rester identique. Ces tests verrouillent le contrat.

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn(() => Promise.resolve({ exists: () => false }));
const mockGetDocs = jest.fn(() => Promise.resolve({ empty: true, docs: [] }));

jest.mock('../../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'admin-1' } } }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name) => ({ name })),
  doc: jest.fn((_db, coll, id) => ({ coll, id })),
  getDoc: (...a) => mockGetDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  setDoc: (...a) => mockSetDoc(...a),
  query: jest.fn((...a) => a),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
  documentId: jest.fn(() => '__name__'),
  startAt: jest.fn((v) => ({ type: 'startAt', v })),
  endAt: jest.fn((v) => ({ type: 'endAt', v })),
  endBefore: jest.fn((v) => ({ type: 'endBefore', v })),
  Timestamp: class Timestamp {
    static now() { return new Timestamp(); }
  },
}));

import {
  getOrdreChoixPeriode,
  getOrdreChoixPrecedent,
  saveOrdreChoixPeriode,
} from '../ordreChoixService';
import { genererProchainOrdreChoix } from '../../utils/ordreChoix';

const firestore = require('firebase/firestore');

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDoc.mockResolvedValue({ exists: () => false });
  mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
});

describe('un document par trimestre', () => {
  it('lit et écrit `ordre_choix_<AAAA-MM>`, jamais un document partagé', async () => {
    await getOrdreChoixPeriode('2026-11');
    expect(firestore.doc).toHaveBeenCalledWith({}, 'planning', 'ordre_choix_2026-11');

    await saveOrdreChoixPeriode('2026-11', { premierTour: ['A'], deuxiemeTour: ['A'] });
    expect(firestore.doc).toHaveBeenLastCalledWith({}, 'planning', 'ordre_choix_2026-11');
  });

  it('n’écrit AUCUN champ `startDate` — sinon getLatestPlanning() prendrait la liste pour un planning', async () => {
    await saveOrdreChoixPeriode('2026-11', { premierTour: ['A'], deuxiemeTour: ['A'] });
    const [, donnees] = mockSetDoc.mock.calls[0];
    expect(Object.keys(donnees)).not.toContain('startDate');
    expect(Object.keys(donnees)).not.toContain('endDate');
  });

  it('refuse d’écrire sans trimestre : mieux vaut échouer que polluer un document fourre-tout', async () => {
    await expect(saveOrdreChoixPeriode(null, { premierTour: ['A'], deuxiemeTour: ['A'] }))
      .rejects.toThrow(/Période de saisie/);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('recherche du trimestre précédent', () => {
  it('borne la requête sur le préfixe et exclut le trimestre courant', async () => {
    await getOrdreChoixPrecedent('2026-11');
    expect(firestore.startAt).toHaveBeenCalledWith('ordre_choix_');
    expect(firestore.endBefore).toHaveBeenCalledWith('ordre_choix_2026-11');
  });

  it('n’utilise pas limitToLast : le tri __name__ descendant réclame un index composite absent', () => {
    expect(firestore.limitToLast).toBeUndefined();
  });

  it('retient le DERNIER document du range ascendant', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        { id: 'ordre_choix_2026-02', data: () => ({ premierTour: ['vieux'] }) },
        { id: 'ordre_choix_2026-08', data: () => ({ premierTour: ['récent'] }) },
      ],
    });
    const res = await getOrdreChoixPrecedent('2026-11');
    expect(res.id).toBe('ordre_choix_2026-08');
    expect(res.premierTour).toEqual(['récent']);
  });
});

describe('idempotence : régénérer le tableau ne fait pas évoluer la liste', () => {
  // Reproduit le parcours réel de l'admin sur un magasin en mémoire.
  const magasin = new Map();
  const medecins = Array.from({ length: 25 }, (_, i) => `M${String(i).padStart(2, '0')}`);

  const ouvrirLeGenerateur = (idPeriode) => {
    const existant = magasin.get(idPeriode);
    if (existant) { return existant; }                   // trimestre déjà figé : relu tel quel
    const precedent = [...magasin.entries()].sort().pop();
    const res = genererProchainOrdreChoix(precedent?.[1]?.premierTour, medecins);
    magasin.set(idPeriode, res);                          // l'admin valide
    return res;
  };

  it('dix générations sur le même trimestre donnent la même liste', () => {
    magasin.clear();
    magasin.set('2026-08', { premierTour: [...medecins], deuxiemeTour: [...medecins].reverse() });

    const premiere = ouvrirLeGenerateur('2026-11').premierTour;
    for (let i = 0; i < 9; i++) {
      expect(ouvrirLeGenerateur('2026-11').premierTour).toEqual(premiere);
    }
    // …et la bascule a bien eu lieu UNE fois par rapport au trimestre précédent.
    expect(premiere).not.toEqual(medecins);
    expect(premiere.slice(-10)).toEqual(medecins.slice(0, 10));
  });

  it('le trimestre suivant, lui, bascule à nouveau — une seule fois', () => {
    const aso = magasin.get('2026-11').premierTour;
    const ndj = ouvrirLeGenerateur('2027-02').premierTour;
    expect(ndj.slice(-10)).toEqual(aso.slice(0, 10));
    expect(ouvrirLeGenerateur('2027-02').premierTour).toEqual(ndj);
  });
});
