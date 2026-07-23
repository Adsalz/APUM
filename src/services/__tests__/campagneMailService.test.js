// Tests de la logique pure de la campagne mail : déduction des mois concernés
// et assemblage du gabarit de courrier. Le jest.mock ci-dessous (hoisté au-dessus
// de l'import) évite l'initialisation réelle de Firebase déclenchée à l'import du
// service (qui importe ../../firebase pour `db`).
import {
  formatMoisConcernes,
  buildCampagneEmail,
  CAMPAGNE_DEFAULTS,
} from '../campagneMailService';

jest.mock('../../firebase', () => ({ db: {}, auth: {} }));

describe('formatMoisConcernes', () => {
  it('liste les mois d\'une même année avec « et » final et une seule année', () => {
    expect(
      formatMoisConcernes({ startDate: '2026-08-01', endDate: '2026-10-31' })
    ).toBe('août, septembre et octobre 2026');
  });

  it('gère un seul mois', () => {
    expect(
      formatMoisConcernes({ startDate: '2026-08-01', endDate: '2026-08-31' })
    ).toBe('août 2026');
  });

  it('ajoute l\'année à chaque mois quand la période chevauche deux années', () => {
    expect(
      formatMoisConcernes({ startDate: '2026-12-01', endDate: '2027-01-31' })
    ).toBe('décembre 2026 et janvier 2027');
  });

  it('retourne une chaîne vide si la période est incomplète', () => {
    expect(formatMoisConcernes({ startDate: '', endDate: '' })).toBe('');
    expect(formatMoisConcernes(null)).toBe('');
  });
});

describe('buildCampagneEmail', () => {
  const periode = { startDate: '2026-08-01', endDate: '2026-10-31' };

  it('injecte les mois concernés, le nombre de vacations et le signataire', () => {
    const { subject, text } = buildCampagneEmail(CAMPAGNE_DEFAULTS, periode);
    expect(subject).toBe(CAMPAGNE_DEFAULTS.objet);
    expect(text).toContain('Chers Amis,');
    expect(text).toContain('prochain choix (août, septembre et octobre 2026)');
    expect(text).toContain('4 vacations de 1h à 7h au minimum');
    expect(text).toContain('Dr Isabelle RONOT ZOVIGHIAN');
    expect(text).toContain('0491386902');
  });

  it('inclut la date de retour et la réunion quand elles sont renseignées', () => {
    const { text } = buildCampagneEmail(
      { ...CAMPAGNE_DEFAULTS, dateRetour: 'vendredi 10 mai 2026', dateReunion: 'mardi 09 juillet 2026' },
      periode
    );
    expect(text).toContain('Date de retour des tableaux avant le vendredi 10 mai 2026.');
    expect(text).toContain('La réunion concernant ce choix se déroulera le mardi 09 juillet 2026.');
    expect(text).toContain('Le lieu vous sera communiqué ultérieurement.');
  });

  it('utilise le lieu fourni s\'il est renseigné', () => {
    const { text } = buildCampagneEmail(
      { ...CAMPAGNE_DEFAULTS, dateReunion: 'mardi 09 juillet 2026', lieuReunion: 'salle A, APUM' },
      periode
    );
    expect(text).toContain('Le lieu : salle A, APUM.');
    expect(text).not.toContain('communiqué ultérieurement');
  });

  it('omet les sections dont les champs sont vides', () => {
    const { text } = buildCampagneEmail(
      { ...CAMPAGNE_DEFAULTS, dateRetour: '', dateReunion: '' },
      periode
    );
    expect(text).not.toContain('Date de retour');
    expect(text).not.toContain('La réunion concernant');
  });

  it('produit un html échappé avec des sauts de ligne', () => {
    const { html } = buildCampagneEmail(CAMPAGNE_DEFAULTS, periode);
    expect(html).toContain('<br>');
    expect(html).toContain('Chers Amis,');
  });
});
