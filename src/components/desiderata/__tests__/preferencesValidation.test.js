// « Gardes souhaitées par mois » est obligatoire et ≥ 1 (décision du 27/08/2026) :
// un 0 vaut « sans limite » pour le générateur, ce qu'aucun médecin ne veut dire.
import { erreurGardesSouhaitees, erreurMaxParSemaine, erreurPreferences } from '../useDesiderataForm';

describe('validation des préférences générales', () => {
  it('refuse un nombre de gardes souhaitées vide, nul ou non renseigné', () => {
    expect(erreurGardesSouhaitees('')).toMatch(/Indiquez/);
    expect(erreurGardesSouhaitees(undefined)).toMatch(/Indiquez/);
    expect(erreurGardesSouhaitees(null)).toMatch(/Indiquez/);
    expect(erreurGardesSouhaitees(0)).toMatch(/0 n'est pas accepté/);
    expect(erreurGardesSouhaitees('0')).toMatch(/0 n'est pas accepté/);
    expect(erreurGardesSouhaitees(-2)).toMatch(/Au moins 1/);
    expect(erreurGardesSouhaitees(2.5)).toMatch(/Au moins 1/);
  });

  it('accepte un entier ≥ 1, même saisi en chaîne', () => {
    expect(erreurGardesSouhaitees(1)).toBeNull();
    expect(erreurGardesSouhaitees(12)).toBeNull();
    expect(erreurGardesSouhaitees('8')).toBeNull();
  });

  it('borne le maximum hebdomadaire entre 1 et 7', () => {
    expect(erreurMaxParSemaine(0)).not.toBeNull();
    expect(erreurMaxParSemaine(8)).not.toBeNull();
    expect(erreurMaxParSemaine(3)).toBeNull();
    expect(erreurMaxParSemaine(7)).toBeNull();
  });

  // Le champ peut rester vide le temps de la frappe (on efface « 1 » avant de
  // taper « 3 ») : c'est la validation qui doit refuser, pas la saisie qui doit
  // réinjecter une valeur — sinon le champ reste bloqué sur 1 (bug du 31/08/2026).
  // Il est aussi vide au départ et obligatoire, d'où un message dédié : le
  // défaut à 3 imposait un plafond que le médecin n'avait pas demandé.
  it('exige un maximum hebdomadaire renseigné', () => {
    expect(erreurMaxParSemaine('')).toMatch(/Indiquez/);
    expect(erreurMaxParSemaine(undefined)).toMatch(/Indiquez/);
    expect(erreurMaxParSemaine(null)).toMatch(/Indiquez/);
    expect(erreurMaxParSemaine('4')).toBeNull();
  });

  it('erreurPreferences renvoie la première erreur, ou null', () => {
    expect(erreurPreferences({ nombreGardesSouhaitees: '', nombreGardesMaxParSemaine: 3 })).toMatch(/Indiquez/);
    expect(erreurPreferences({ nombreGardesSouhaitees: 4, nombreGardesMaxParSemaine: 9 })).toMatch(/entre 1 et 7/);
    expect(erreurPreferences({ nombreGardesSouhaitees: 4, nombreGardesMaxParSemaine: 3 })).toBeNull();
  });
});
