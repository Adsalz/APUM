// Aiguillage du médecin à la connexion : un seul écran, jamais de choix à faire.
import {
  accueilMedecin,
  recueilEnCours,
  saisieOuverte,
  planningCouvrePeriode,
  ROUTE_DESIDERATA,
  ROUTE_PLANNING,
} from '../accueilMedecin';

// Trimestre NDJ26-27 : recueil des desiderata à l'automne 2026, gardes du
// 1er novembre au 31 janvier. Le trimestre précédent est ASO26.
const PERIODE = { startDate: '2026-11-01', endDate: '2027-01-31' };
const PLANNING_DU_TRIMESTRE = { startDate: '2026-11-01', endDate: '2027-01-31' };
const PLANNING_PRECEDENT = { startDate: '2026-08-01', endDate: '2026-10-31' };
// Saisie close par l'admin (config/saisie), telle que getPeriodeSaisie la rend.
const PERIODE_CLOSE = { ...PERIODE, saisieFermee: true };

const AVANT = new Date('2026-09-15');
const PENDANT = new Date('2026-12-10');

describe('saisieOuverte', () => {
  it('est ouverte tant que le trimestre n’a pas commencé', () => {
    expect(saisieOuverte(PERIODE, null, AVANT)).toBe(true);
  });

  it('se referme dès que le planning du trimestre est publié', () => {
    expect(saisieOuverte(PERIODE, PLANNING_DU_TRIMESTRE, AVANT)).toBe(false);
  });

  it('reste ouverte si le planning publié est celui du trimestre précédent', () => {
    expect(saisieOuverte(PERIODE, PLANNING_PRECEDENT, AVANT)).toBe(true);
  });

  it('se referme quand le trimestre a commencé', () => {
    expect(saisieOuverte(PERIODE, null, PENDANT)).toBe(false);
  });

  it('reste fermée sans période exploitable', () => {
    expect(saisieOuverte(null, null, AVANT)).toBe(false);
    expect(saisieOuverte({ startDate: 'pas une date' }, null, AVANT)).toBe(false);
  });

  it('se referme dès que l’admin clôt la saisie', () => {
    expect(saisieOuverte(PERIODE_CLOSE, null, AVANT)).toBe(false);
    expect(saisieOuverte(PERIODE_CLOSE, PLANNING_PRECEDENT, AVANT)).toBe(false);
  });
});

describe('recueilEnCours', () => {
  // Sert au raccourci « Mes desiderata » : la fiche reste consultable après
  // la clôture, tant que le trimestre est à venir.
  it('ignore la clôture de la saisie', () => {
    expect(recueilEnCours(PERIODE_CLOSE, null, AVANT)).toBe(true);
  });

  it('prend fin avec la publication ou le début du trimestre', () => {
    expect(recueilEnCours(PERIODE_CLOSE, PLANNING_DU_TRIMESTRE, AVANT)).toBe(false);
    expect(recueilEnCours(PERIODE_CLOSE, null, PENDANT)).toBe(false);
  });
});

describe('planningCouvrePeriode', () => {
  it('tolère un décalage de quelques jours sur les bornes', () => {
    expect(
      planningCouvrePeriode(PERIODE, { startDate: '2026-11-02', endDate: '2027-01-30' })
    ).toBe(true);
  });

  it('distingue deux trimestres qui ne se touchent pas', () => {
    expect(planningCouvrePeriode(PERIODE, PLANNING_PRECEDENT)).toBe(false);
  });

  it('ne conclut rien sur des dates manquantes', () => {
    expect(planningCouvrePeriode(PERIODE, null)).toBe(false);
    expect(planningCouvrePeriode(null, PLANNING_DU_TRIMESTRE)).toBe(false);
  });
});

describe('accueilMedecin', () => {
  it('envoie sur le formulaire pendant le recueil des desiderata', () => {
    expect(accueilMedecin(PERIODE, null, AVANT)).toBe(ROUTE_DESIDERATA);
    // Le planning du trimestre précédent est publié, mais l'actualité du
    // médecin, c'est le trimestre à venir.
    expect(accueilMedecin(PERIODE, PLANNING_PRECEDENT, AVANT)).toBe(ROUTE_DESIDERATA);
  });

  it('envoie sur le planning une fois celui-ci publié', () => {
    expect(accueilMedecin(PERIODE, PLANNING_DU_TRIMESTRE, AVANT)).toBe(ROUTE_PLANNING);
    expect(accueilMedecin(PERIODE, PLANNING_DU_TRIMESTRE, PENDANT)).toBe(ROUTE_PLANNING);
  });

  it('se replie sur le formulaire quand il n’y a rien à consulter', () => {
    expect(accueilMedecin(null, null, AVANT)).toBe(ROUTE_DESIDERATA);
    expect(accueilMedecin(PERIODE, null, PENDANT)).toBe(ROUTE_DESIDERATA);
  });

  it('saisie close : le planning en cours plutôt qu’une fiche figée', () => {
    expect(accueilMedecin(PERIODE_CLOSE, PLANNING_PRECEDENT, AVANT)).toBe(ROUTE_PLANNING);
  });

  it('saisie close sans planning publié : la fiche, en lecture seule', () => {
    expect(accueilMedecin(PERIODE_CLOSE, null, AVANT)).toBe(ROUTE_DESIDERATA);
  });
});
