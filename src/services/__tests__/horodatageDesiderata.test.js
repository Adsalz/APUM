// Date et auteur de la dernière écriture d'une fiche de desiderata
// (demande de l'APUM, 08/10/2026) : posés à chaque enregistrement, rendus en
// ISO à la lecture.
//
// Le mock de firebase/firestore est hoisté par Jest au-dessus des imports.

import { addDesiderata, updateDesiderata, getDesiderataForPeriod } from '../planningService';

const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockFiches = [];
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
    collection: () => 'desiderata',
    doc: (_db, coll, id) => `${coll}/${id}`,
    addDoc: (...a) => { mockAddDoc(...a); return Promise.resolve({ id: 'nouvelle' }); },
    updateDoc: (...a) => { mockUpdateDoc(...a); return Promise.resolve(); },
    getDocs: () => Promise.resolve({
      docs: mockFiches.map((f) => ({ id: f.id, data: () => f })),
    }),
    serverTimestamp: () => SERVEUR,
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: () => ({}),
    where: () => ({}),
    orderBy: jest.fn(),
    limit: jest.fn(),
    writeBatch: jest.fn(),
    deleteField: jest.fn(),
  };
});

const { Timestamp } = jest.requireMock('firebase/firestore');
const FICHE = {
  startDate: '2026-11-01T00:00:00.000Z',
  endDate: '2027-01-31T00:00:00.000Z',
  desiderata: {},
  nombreGardesSouhaitees: 4,
  nombreGardesMaxParSemaine: 2,
  gardesGroupees: false,
  renfortsAssocies: false,
};

describe('écriture d’une fiche', () => {
  it('création : heure du serveur et auteur', async () => {
    await addDesiderata('medecin-1', FICHE);
    const ecrit = mockAddDoc.mock.calls[0][1];
    expect(ecrit.userId).toBe('medecin-1');
    expect(ecrit.modifieLe).toBe(SERVEUR);
    expect(ecrit.modifiePar).toBe('admin-1');
  });

  it('mise à jour : heure du serveur et auteur', async () => {
    await updateDesiderata('fiche-1', FICHE);
    const ecrit = mockUpdateDoc.mock.calls[0][1];
    expect(ecrit.modifieLe).toBe(SERVEUR);
    expect(ecrit.modifiePar).toBe('admin-1');
  });
});

describe('lecture des fiches de la période', () => {
  beforeEach(() => { mockFiches.length = 0; });

  it('rend la date en ISO, et null pour une fiche jamais datée', async () => {
    const periode = {
      startDate: Timestamp.fromDate(new Date(FICHE.startDate)),
      endDate: Timestamp.fromDate(new Date(FICHE.endDate)),
    };
    mockFiches.push(
      { id: 'a', userId: 'm1', ...periode, modifieLe: Timestamp.fromDate(new Date('2026-10-04T11:29:36Z')), modifiePar: 'm1' },
      { id: 'b', userId: 'm2', ...periode },
    );
    const [a, b] = await getDesiderataForPeriod(FICHE.startDate, FICHE.endDate);
    expect(a.modifieLe).toBe('2026-10-04T11:29:36.000Z');
    expect(a.modifiePar).toBe('m1');
    expect(b.modifieLe).toBeNull();
    expect(b.modifiePar).toBeNull();
  });
});
