// Régression : bug de dates au passage heure d'été↔hiver (DST).
// On force le fuseau de la MACHINE sur Europe/Paris (là où le bug se produisait)
// et on part de dates stockées à MINUIT LOCAL (cas réel d'une période enregistrée).
// Sans la normalisation « midi », toISOString() renvoyait le jour précédent, et
// le décalage changeait au passage CEST↔CET → dates fausses/dupliquées/sautées.
import { generateDatesList } from '../excelExportService';

// Fixé après l'import (le fuseau est lu à l'exécution des Date, pas à l'import).
process.env.TZ = 'Europe/Paris';

const cles = (periode) => generateDatesList(periode).map((d) => d.toISOString().split('T')[0]);

describe('generateDatesList — robustesse au passage heure d’été/hiver', () => {
  it('retour à l’heure d’hiver (dim 26/10/2025) : chaque jour une seule fois, clés exactes', () => {
    // Minuit LOCAL Paris (mois 0-indexé : 9 = octobre).
    const periode = { startDate: new Date(2025, 9, 24), endDate: new Date(2025, 9, 28) };
    expect(cles(periode)).toEqual(['2025-10-24', '2025-10-25', '2025-10-26', '2025-10-27', '2025-10-28']);
  });

  it('passage à l’heure d’été (dim 30/03/2025) : clés exactes, aucun jour sauté', () => {
    const periode = { startDate: new Date(2025, 2, 28), endDate: new Date(2025, 2, 31) };
    expect(cles(periode)).toEqual(['2025-03-28', '2025-03-29', '2025-03-30', '2025-03-31']);
  });

  it('période d’un seul jour tombant le jour du changement d’heure', () => {
    const periode = { startDate: new Date(2025, 9, 26), endDate: new Date(2025, 9, 26) };
    expect(cles(periode)).toEqual(['2025-10-26']);
  });
});
