// Régression : dates fausses/dupliquées/sautées dans la grille de desiderata.
//
// Deux bugs distincts couverts ici :
//  1. Le changement d'heure d'été↔hiver (DST) pendant la période — déjà corrigé
//     par la normalisation « midi ».
//  2. Le fuseau horaire de l'APPAREIL du médecin/de l'admin (bug réel constaté
//     en prod le 10/09/2026 : la grille d'un médecin décalée d'un jour entier,
//     du 31/10 au 30/01 au lieu du 01/11 au 31/01, son appareil n'étant pas à
//     l'heure de Paris). La cause : `periode.startDate` est un horodatage UTC
//     (ex. convertFromTimestamp() → "2026-11-01T00:00:00.000Z"), et le
//     convertir en heure LOCALE avant de fixer midi peut faire tomber la date
//     sur la veille pour un fuseau à l'ouest de Paris.
//
// generateDatesList doit donc travailler en UTC de bout en bout, quel que soit
// le fuseau horaire de la machine qui l'exécute — d'où les tests avec
// plusieurs fuseaux (dont certains très éloignés de Paris) donnant tous les
// mêmes clés.
import { generateDatesList } from '../excelExportService';

const cles = (periode) => generateDatesList(periode).map((d) => d.toISOString().split('T')[0]);

// periode.startDate/endDate arrivent TOUJOURS en horodatage UTC minuit (sortie
// réelle de convertFromTimestamp), jamais en Date locale — c'est cette forme
// qu'on reproduit ici plutôt qu'un `new Date(annee, mois, jour)` local.
const periodeUTC = (debut, fin) => ({
  startDate: `${debut}T00:00:00.000Z`,
  endDate: `${fin}T00:00:00.000Z`,
});

describe('generateDatesList — robustesse au passage heure d’été/hiver', () => {
  const TZ_ORIGINAL = process.env.TZ;
  beforeAll(() => { process.env.TZ = 'Europe/Paris'; });
  afterAll(() => { process.env.TZ = TZ_ORIGINAL; });

  it('retour à l’heure d’hiver (dim 26/10/2025) : chaque jour une seule fois, clés exactes', () => {
    expect(cles(periodeUTC('2025-10-24', '2025-10-28')))
      .toEqual(['2025-10-24', '2025-10-25', '2025-10-26', '2025-10-27', '2025-10-28']);
  });

  it('passage à l’heure d’été (dim 30/03/2025) : clés exactes, aucun jour sauté', () => {
    expect(cles(periodeUTC('2025-03-28', '2025-03-31')))
      .toEqual(['2025-03-28', '2025-03-29', '2025-03-30', '2025-03-31']);
  });

  it('période d’un seul jour tombant le jour du changement d’heure', () => {
    expect(cles(periodeUTC('2025-10-26', '2025-10-26'))).toEqual(['2025-10-26']);
  });
});

describe('generateDatesList — robustesse au fuseau horaire de l’appareil', () => {
  const TZ_ORIGINAL = process.env.TZ;
  afterAll(() => { process.env.TZ = TZ_ORIGINAL; });

  // Pacific/Kiritimati (UTC+14) et Etc/GMT+12 (UTC-12) sont les fuseaux les
  // plus extrêmes qui existent réellement — si les clés restent correctes là,
  // elles le sont pour n'importe quel médecin, où qu'il soit.
  const FUSEAUX = ['Europe/Paris', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Etc/GMT+12'];

  it.each(FUSEAUX)('donne les mêmes clés quel que soit le fuseau (%s)', (tz) => {
    process.env.TZ = tz;
    expect(cles(periodeUTC('2026-11-01', '2026-11-03')))
      .toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });
});
