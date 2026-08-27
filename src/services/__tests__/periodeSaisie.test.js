// Garde-fou de NON-RÉGRESSION : définir la période de saisie ne doit RIEN supprimer.
//
// Jusqu'en août 2026, setPeriodeSaisie() effaçait en cascade tout desiderata
// entièrement hors de la nouvelle période — ce qui rendait impossible de revenir
// consulter un trimestre passé sans détruire celui en cours. La décision de
// CONSERVER les anciennes périodes est un choix métier : ce test empêche qu'une
// réintroduction de la cascade passe inaperçue.
//
// Le mock de firebase/firestore est hoisté par Jest au-dessus des imports.

import { setPeriodeSaisie } from '../planningService';

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDocs = jest.fn(() => Promise.resolve({ docs: [] }));
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());

jest.mock('../../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'admin-1' } } }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name) => ({ name })),
  doc: jest.fn((_db, coll, id) => ({ coll, id })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'nouveau' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: (...a) => mockGetDocs(...a),
  setDoc: (...a) => mockSetDoc(...a),
  query: jest.fn((...a) => a),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  writeBatch: jest.fn(() => ({ delete: mockBatchDelete, set: jest.fn(), commit: mockBatchCommit })),
  deleteField: jest.fn(),
  // Timestamp doit être une CLASSE : planningService fait `instanceof Timestamp`.
  Timestamp: class Timestamp {
    constructor(date) { this.__date = date; }
    static fromDate(d) { return new Timestamp(d); }
    static now() { return new Timestamp(new Date()); }
    toDate() { return this.__date; }
  },
}));

describe('setPeriodeSaisie — aucune suppression en cascade', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('écrit la période sans supprimer le moindre desiderata', async () => {
    await setPeriodeSaisie('2026-11-01', '2027-01-31');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('ne parcourt même pas la collection desiderata', async () => {
    await setPeriodeSaisie('2026-11-01', '2027-01-31');
    // L'ancienne cascade commençait par un getDocs() sur toute la collection.
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('refuse une période dont la fin précède le début', async () => {
    await expect(setPeriodeSaisie('2027-01-31', '2026-11-01')).rejects.toThrow();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('refuse des dates invalides', async () => {
    await expect(setPeriodeSaisie('pas-une-date', '2026-11-01')).rejects.toThrow();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
