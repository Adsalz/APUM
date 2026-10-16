import {
  DOMAINE_ALIAS,
  aliasConnexion,
  estAliasConnexion,
  aliasConnexionAleatoire,
} from '../aliasConnexion';

// Les règles Firestore n'acceptent dans l'annuaire public qu'une adresse de
// cette forme : le test fige le contrat des deux côtés.
const FORME_ACCEPTEE_PAR_LES_REGLES = /^[a-z0-9._%+-]+@apum-login\.invalid$/;

describe('aliasConnexion', () => {
  it('dérive une adresse de l\'identifiant du compte', () => {
    expect(aliasConnexion('abc123')).toBe(`abc123@${DOMAINE_ALIAS}`);
  });

  // Firebase Auth enregistre les adresses en minuscules : si on générait la
  // forme mixte, la valeur stockée dans l'annuaire différerait de celle du
  // compte, et toute comparaison stricte tomberait à faux.
  it('met l\'identifiant en minuscules, comme Firebase', () => {
    expect(aliasConnexion('iMZfn27r9acWZs8jLV6oMcQnPH12'))
      .toBe('imzfn27r9acwzs8jlv6omcqnph12@apum-login.invalid');
  });

  it('ne fabrique rien sans identifiant', () => {
    expect(aliasConnexion('')).toBeNull();
    expect(aliasConnexion(null)).toBeNull();
  });

  it('produit une adresse acceptée par les règles Firestore', () => {
    expect(aliasConnexion('iMZfn27r9acWZs8jLV6oMcQnPH12')).toMatch(FORME_ACCEPTEE_PAR_LES_REGLES);
  });
});

describe('aliasConnexionAleatoire', () => {
  it('produit une adresse acceptée par les règles Firestore', () => {
    expect(aliasConnexionAleatoire()).toMatch(FORME_ACCEPTEE_PAR_LES_REGLES);
  });

  it('ne se répète pas', () => {
    const tirages = new Set(Array.from({ length: 50 }, () => aliasConnexionAleatoire()));
    expect(tirages.size).toBe(50);
  });
});

describe('estAliasConnexion', () => {
  it('reconnaît les deux formes d\'alias', () => {
    expect(estAliasConnexion(aliasConnexion('abc'))).toBe(true);
    expect(estAliasConnexion(aliasConnexionAleatoire())).toBe(true);
  });

  // Le garde-fou qui empêche de republier une adresse personnelle.
  it('rejette une adresse réelle et tout ce qui n\'est pas une chaîne', () => {
    expect(estAliasConnexion('jean.dupont@gmail.com')).toBe(false);
    expect(estAliasConnexion('jean@apum-login.invalid.exemple.fr')).toBe(false);
    expect(estAliasConnexion('')).toBe(false);
    expect(estAliasConnexion(undefined)).toBe(false);
    expect(estAliasConnexion(null)).toBe(false);
  });
});
