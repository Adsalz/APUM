// Garde-fou de NON-RÉGRESSION : définir la période de saisie ne doit RIEN supprimer.
//
// Jusqu'en août 2026, setPeriodeSaisie() effaçait en cascade tout desiderata
// entièrement hors de la nouvelle période — ce qui rendait impossible de revenir
// consulter un trimestre passé sans détruire celui en cours. La décision de
// CONSERVER les anciennes périodes est un choix métier : ce test empêche qu'une
// réintroduction de la cascade passe inaperçue.
//
// Le mock de firebase/firestore est hoisté par Vitest au-dessus des imports.

import { setPeriodeSaisie } from '../planningService';

const mockSetDoc = vi.fn(() => Promise.resolve());
const mockGetDocs = vi.fn(() => Promise.resolve({ docs: [] }));
const mockDeleteDoc = vi.fn(() => Promise.resolve());
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn(() => Promise.resolve());

vi.mock('../../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'admin-1' } } }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ name })),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'nouveau' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: (...a) => mockGetDocs(...a),
  setDoc: (...a) => mockSetDoc(...a),
  query: vi.fn((...a) => a),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  writeBatch: vi.fn(() => ({ delete: mockBatchDelete, set: vi.fn(), commit: mockBatchCommit })),
  deleteField: vi.fn(),
  // Timestamp doit être une CLASSE : planningService fait `instanceof Timestamp`.
  Timestamp: class Timestamp {
    constructor(date) { this.__date = date; }
    static fromDate(d) { return new Timestamp(d); }
    static now() { return new Timestamp(new Date()); }
    toDate() { return this.__date; }
  },
}));

describe('setPeriodeSaisie — aucune suppression en cascade', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
