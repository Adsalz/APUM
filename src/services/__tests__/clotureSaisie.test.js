// Clôture de la saisie des desiderata (demande de l'APUM, 04/10/2026).
//
// L'état vit dans config/saisie, À CÔTÉ de planning/periode_saisie : redéfinir
// les dates (app ou scripts, qui réécrivent la période en entier) ne doit pas
// pouvoir rouvrir la saisie. getPeriodeSaisie le rend avec la période.
//
// Le mock de firebase/firestore est hoisté par Jest au-dessus des imports.

import { getPeriodeSaisie, setPeriodeSaisie, setSaisieFermee } from '../planningService';

const mockDocs = {};
const mockSetDoc = jest.fn();
const SERVEUR = { horodatageServeur: true };

jest.mock('../../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'admin-1' } } }));

jest.mock('firebase/firestore', () => {
  // Timestamp doit être une CLASSE : planningService fait `instanceof Timestamp`.
  class Timestamp {
    constructor(date) { this.__date = date; }
    static fromDate(d) { return new Timestamp(d); }
    static now() { return new Timestamp(new Date()); }
    toDate() { return this.__date; }
  }
  // Fonctions simples et non jest.fn(impl) : la config Jest de CRA
  // (resetMocks) efface les implémentations avant chaque test.
  return {
    Timestamp,
    collection: jest.fn(),
    doc: (_db, coll, id) => `${coll}/${id}`,
    getDoc: (chemin) => Promise.resolve({
      exists: () => chemin in mockDocs,
      data: () => mockDocs[chemin],
    }),
    setDoc: (...a) => mockSetDoc(...a),
    serverTimestamp: () => SERVEUR,
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    writeBatch: jest.fn(),
    deleteField: jest.fn(),
  };
});

const { Timestamp } = jest.requireMock('firebase/firestore');
const PERIODE_NDJ = {
  startDate: Timestamp.fromDate(new Date('2026-11-01T00:00:00Z')),
  endDate: Timestamp.fromDate(new Date('2027-01-31T00:00:00Z')),
};

describe('getPeriodeSaisie — état de la saisie', () => {
  beforeEach(() => {
    Object.keys(mockDocs).forEach((k) => { delete mockDocs[k]; });
    mockDocs['planning/periode_saisie'] = PERIODE_NDJ;
  });

  it('ouverte quand config/saisie n’existe pas (fonctionnement d’avant la clôture)', async () => {
    const periode = await getPeriodeSaisie();
    expect(periode.startDate).toBe('2026-11-01T00:00:00.000Z');
    expect(periode.saisieFermee).toBe(false);
    expect(periode.saisieFermeeLe).toBeNull();
  });

  it('close, avec la date de clôture', async () => {
    mockDocs['config/saisie'] = {
      fermee: true,
      fermeeLe: Timestamp.fromDate(new Date('2026-10-05T08:12:00Z')),
    };
    const periode = await getPeriodeSaisie();
    expect(periode.saisieFermee).toBe(true);
    expect(periode.saisieFermeeLe).toBe('2026-10-05T08:12:00.000Z');
  });

  it('rouverte : fermee à false', async () => {
    mockDocs['config/saisie'] = { fermee: false };
    expect((await getPeriodeSaisie()).saisieFermee).toBe(false);
  });

  it('aucune période définie : null, quel que soit l’état de la saisie', async () => {
    delete mockDocs['planning/periode_saisie'];
    mockDocs['config/saisie'] = { fermee: true };
    expect(await getPeriodeSaisie()).toBeNull();
  });
});

describe('setSaisieFermee', () => {
  it('clore horodate la clôture côté serveur', async () => {
    await setSaisieFermee(true);
    expect(mockSetDoc).toHaveBeenCalledWith('config/saisie', { fermee: true, fermeeLe: SERVEUR });
  });

  it('rouvrir efface la date de clôture', async () => {
    await setSaisieFermee(false);
    expect(mockSetDoc).toHaveBeenCalledWith('config/saisie', { fermee: false });
  });

  it('redéfinir la période ne touche pas à la clôture', async () => {
    await setPeriodeSaisie('2026-11-01', '2027-01-31');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][0]).toBe('planning/periode_saisie');
  });
});
