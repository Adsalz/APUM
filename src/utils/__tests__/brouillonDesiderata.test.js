import {
  cleBrouillon,
  lireBrouillon,
  ecrireBrouillon,
  effacerBrouillon,
  brouillonDiffere,
} from '../brouillonDesiderata';

const PERIODE = { startDate: '2026-11-01T00:00:00.000Z', endDate: '2027-01-31T00:00:00.000Z' };
const PAYLOAD = {
  desiderata: { '2026-11-02': { QUART_1: 'Oui' } },
  nombreGardesSouhaitees: '6',
  nombreGardesMaxParSemaine: '2',
  gardesGroupees: false,
  renfortsAssocies: true,
};

describe('cleBrouillon', () => {
  it('isole chaque médecin et chaque trimestre', () => {
    expect(cleBrouillon('u1', PERIODE)).toBe('apum.brouillon-desiderata.u1.2026-11');
    expect(cleBrouillon('u2', PERIODE)).not.toBe(cleBrouillon('u1', PERIODE));
    expect(cleBrouillon('u1', { startDate: '2026-08-01T00:00:00.000Z' }))
      .not.toBe(cleBrouillon('u1', PERIODE));
  });

  it('refuse une période ou un médecin inexploitable', () => {
    expect(cleBrouillon('', PERIODE)).toBeNull();
    expect(cleBrouillon('u1', null)).toBeNull();
    expect(cleBrouillon('u1', { startDate: 'pas une date' })).toBeNull();
  });
});

describe('écriture / lecture', () => {
  beforeEach(() => window.localStorage.clear());

  it('relit ce qui a été écrit', () => {
    expect(ecrireBrouillon('u1', PERIODE, PAYLOAD)).toBe(true);
    expect(lireBrouillon('u1', PERIODE).payload).toEqual(PAYLOAD);
  });

  it('ne rend rien pour un autre médecin', () => {
    ecrireBrouillon('u1', PERIODE, PAYLOAD);
    expect(lireBrouillon('u2', PERIODE)).toBeNull();
  });

  it('efface sur demande', () => {
    ecrireBrouillon('u1', PERIODE, PAYLOAD);
    effacerBrouillon('u1', PERIODE);
    expect(lireBrouillon('u1', PERIODE)).toBeNull();
  });

  it('ignore et nettoie un brouillon de plus de 30 jours', () => {
    ecrireBrouillon('u1', PERIODE, PAYLOAD);
    const dansDeuxMois = Date.now() + 60 * 24 * 60 * 60 * 1000;
    expect(lireBrouillon('u1', PERIODE, dansDeuxMois)).toBeNull();
    // Le nettoyage est immédiat : la clé ne traîne pas.
    expect(window.localStorage.getItem(cleBrouillon('u1', PERIODE))).toBeNull();
  });

  it('ignore et nettoie une entrée corrompue', () => {
    window.localStorage.setItem(cleBrouillon('u1', PERIODE), '{ ceci n\'est pas du JSON');
    expect(lireBrouillon('u1', PERIODE)).toBeNull();
    expect(window.localStorage.getItem(cleBrouillon('u1', PERIODE))).toBeNull();
  });

  it('ignore une version de format inconnue', () => {
    window.localStorage.setItem(
      cleBrouillon('u1', PERIODE),
      JSON.stringify({ version: 99, enregistreLe: new Date().toISOString(), payload: PAYLOAD })
    );
    expect(lireBrouillon('u1', PERIODE)).toBeNull();
  });
});

describe('brouillonDiffere', () => {
  it('ne propose rien si le brouillon est identique à la fiche enregistrée', () => {
    expect(brouillonDiffere(PAYLOAD, { ...PAYLOAD, id: 'abc', userId: 'u1' })).toBe(false);
  });

  it('repère un choix de grille modifié', () => {
    const modifie = { ...PAYLOAD, desiderata: { '2026-11-02': { QUART_1: 'Non' } } };
    expect(brouillonDiffere(modifie, PAYLOAD)).toBe(true);
  });

  it('repère une préférence modifiée', () => {
    expect(brouillonDiffere({ ...PAYLOAD, nombreGardesSouhaitees: '8' }, PAYLOAD)).toBe(true);
  });

  it('considère un brouillon non vide comme différent d\'une fiche absente', () => {
    expect(brouillonDiffere(PAYLOAD, null)).toBe(true);
  });

  // Une fiche enregistrée porte des nombres, le brouillon des chaînes de
  // formulaire : « 6 » et 6 ne doivent pas déclencher un faux bandeau.
  it('ne confond pas 6 et « 6 »', () => {
    expect(brouillonDiffere(PAYLOAD, { ...PAYLOAD, nombreGardesSouhaitees: 6 })).toBe(false);
  });
});
