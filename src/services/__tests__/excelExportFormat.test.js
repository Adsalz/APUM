// Vérifie le FORMAT réel des classeurs Excel générés (demandes admin 07/2026) :
//  - planning : renfort 20h/00h en colonne P, APRÈS le 4ème quart (M-O), comme
//    sur la fiche desiderata ; couleurs des quarts reprises des tableaux de
//    référence (nuances par type de jour) ;
//  - desiderata : bordure épaisse au premier jour de chaque nouveau mois.
// Les classeurs sont écrits puis relus avec ExcelJS (pas de test d'implémentation).
import ExcelJS from 'exceljs';
import {
  exportPlanningToExcel,
  exportDesiderataToExcel,
  exportFicheViergeToExcel,
} from '../excelExportService';

const PINK = 'FFFF99FF';
const BLEU = 'FFB4C6E7';
const JAUNE = 'FFFFE699';
const JAUNE_CLAIR = 'FFFFF2CC';
const VERT = 'FFC6E0B4';
const VERT_CLAIR = 'FFE2EFDA';
const GRIS = 'FFD9D9D9';
const GRIS_CLAIR = 'FFF2F2F2';
const ARGENT = 'FFC0C0C0';

// L'export déclenche un téléchargement navigateur : on capture le Blob produit
// au lieu de naviguer, puis on le relit comme un classeur. Fonctions SIMPLES
// (pas jest.fn) : CRA active `resetMocks`, qui viderait leur implémentation
// entre les tests.
let dernierBlob = null;
beforeAll(() => {
  window.URL.createObjectURL = (blob) => {
    dernierBlob = blob;
    return 'blob:capture';
  };
  window.URL.revokeObjectURL = () => {};
  // jsdom n'implémente pas la navigation déclenchée par a.click()
  HTMLAnchorElement.prototype.click = () => {};
});

const lireClasseurCapture = async () => {
  const buffer = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(dernierBlob);
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
};

const argbDe = (cell) =>
  (cell.fill && cell.fill.pattern === 'solid' && cell.fill.fgColor?.argb) || null;

describe('export Excel du planning (feuille de garde)', () => {
  let feuille;

  beforeAll(async () => {
    const planning = {
      planning: {
        '2026-07-01': { QUART_1: ['m1', null] },   // mercredi
        '2026-07-04': { RENFORT_1: ['m1'] },       // samedi
        '2026-07-05': {},                          // dimanche
        '2026-07-14': {},                          // férié en semaine (= dimanche)
      },
    };
    await exportPlanningToExcel(planning, [{ id: 'm1', nom: 'Durand', prenom: 'Anne' }]);
    const workbook = await lireClasseurCapture();
    feuille = workbook.getWorksheet('JUILLET');
    expect(feuille).toBeTruthy();
  });

  it('place le renfort 20h/00h APRÈS le 4ème quart (ordre de la fiche desiderata)', () => {
    expect(String(feuille.getCell('M2').value)).toContain('4ème QUART');
    expect(String(feuille.getCell('P2').value)).toContain('RENFORT');
    expect(String(feuille.getCell('P2').value)).toContain('20H');
    expect(String(feuille.getCell('Q2').value)).toBe('DATES');
  });

  it('colore les en-têtes comme les tableaux de référence', () => {
    expect(argbDe(feuille.getCell('A2'))).toBe(ARGENT);  // DATES
    expect(argbDe(feuille.getCell('B2'))).toBe(BLEU);    // 1er QUART
    expect(argbDe(feuille.getCell('D2'))).toBe(JAUNE);   // 2ème QUART
    expect(argbDe(feuille.getCell('H2'))).toBe(PINK);    // RENFORT 10h/13h
    expect(argbDe(feuille.getCell('I2'))).toBe(VERT);    // 3ème QUART
    expect(argbDe(feuille.getCell('M2'))).toBe(ARGENT);  // 4ème QUART
    expect(argbDe(feuille.getCell('P2'))).toBe(PINK);    // RENFORT 20h/00h
  });

  it('nuance les places d\'un jour de SEMAINE comme la référence', () => {
    // 2026-07-01 (mercredi) = 1ère ligne de données (ligne 3)
    expect(argbDe(feuille.getCell('B3'))).toBe(BLEU);
    expect(argbDe(feuille.getCell('E3'))).toBe(JAUNE);        // 2ème quart, place 2
    expect(argbDe(feuille.getCell('F3'))).toBe(JAUNE_CLAIR);  // place « en plus »
    expect(argbDe(feuille.getCell('G3'))).toBeNull();         // au-delà de l'effectif
    expect(argbDe(feuille.getCell('K3'))).toBe(VERT_CLAIR);   // 3ème quart, place 3
    expect(argbDe(feuille.getCell('L3'))).toBeNull();
    expect(argbDe(feuille.getCell('M3'))).toBe(GRIS);         // 4ème quart
    expect(argbDe(feuille.getCell('O3'))).toBe(GRIS_CLAIR);
    expect(argbDe(feuille.getCell('P3'))).toBe(PINK);         // renfort du soir
    expect(argbDe(feuille.getCell('H3'))).toBeNull();         // renfort 10h/13h hors samedi
  });

  it('nuance samedi, dimanche et férié comme la référence', () => {
    // 2026-07-04 (samedi) = ligne 4
    expect(argbDe(feuille.getCell('H4'))).toBe(PINK);         // renfort 10h/13h
    expect(argbDe(feuille.getCell('F4'))).toBe(JAUNE);        // 3 places pleines
    expect(argbDe(feuille.getCell('G4'))).toBeNull();
    expect(argbDe(feuille.getCell('L4'))).toBe(VERT_CLAIR);   // 4ème place du 3ème quart
    // 2026-07-05 (dimanche) = ligne 5
    expect(argbDe(feuille.getCell('G5'))).toBe(JAUNE_CLAIR);  // 4ème place ouverte
    // 2026-07-14 (férié) = ligne 6 : suit les effectifs d'un dimanche, date en rouge
    expect(argbDe(feuille.getCell('G6'))).toBe(JAUNE_CLAIR);
    expect(feuille.getCell('A6').font?.color?.argb).toBe('FFFF0000');
  });

  it('écrit la date du BON jour (minuit UTC, pas de décalage de fuseau)', () => {
    // Le sériel Excel doit tomber pile sur le jour : relu par ExcelJS, il
    // redevient minuit UTC du même jour. Un minuit LOCAL écrirait la veille.
    const valeurA3 = feuille.getCell('A3').value;
    expect(valeurA3 instanceof Date).toBe(true);
    expect(valeurA3.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(feuille.getCell('A6').value.toISOString()).toBe('2026-07-14T00:00:00.000Z');
  });
});

describe('export Excel des desiderata', () => {
  it('sépare les mois par une bordure épaisse et garde l\'ordre de la fiche', async () => {
    const periode = { startDate: '2026-07-30', endDate: '2026-08-02' };
    await exportDesiderataToExcel(
      [{ id: 'm1', nom: 'Durand', prenom: 'Anne' }],
      [],
      periode
    );
    const workbook = await lireClasseurCapture();
    const feuille = workbook.getWorksheet('Durand Anne');
    expect(feuille).toBeTruthy();

    // En-têtes : 4ème quart en F, renfort 20h/00h en G (comme la fiche papier)
    expect(String(feuille.getCell('F10').value)).toContain('4ème QUART');
    expect(String(feuille.getCell('G10').value)).toContain('RENFORT 20H / 00H');

    // Lignes 11-12 = 30-31 juillet, ligne 13 = 1er août → bordure haute épaisse
    expect(feuille.getCell('A12').border?.top?.style).toBe('thin');
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      expect(feuille.getCell(`${col}13`).border?.top?.style).toBe('medium');
    });
    expect(feuille.getCell('A14').border?.top?.style).toBe('thin');

    // Toute la ligne d'en-tête est orange, comme le modèle (DATES comprise)
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      expect(argbDe(feuille.getCell(`${col}10`))).toBe('FFED7D31');
    });

    // Fonds du modèle : période jeu 30/07 (l.11) → dim 02/08 (l.14).
    // Renfort samedi : NOIR (condamné) hors samedi, orange foncé le samedi.
    expect(argbDe(feuille.getCell('D11'))).toBe('FF000000');
    expect(argbDe(feuille.getCell('D13'))).toBe('FFC55A11');
    expect(argbDe(feuille.getCell('D14'))).toBe('FF000000');
    // Week-end grisé (B→G hors renfort), semaine sans fond.
    expect(argbDe(feuille.getCell('B11'))).toBeNull();
    expect(argbDe(feuille.getCell('B13'))).toBe('FFD0CECE');
    expect(argbDe(feuille.getCell('G13'))).toBe('FFD0CECE');
    expect(argbDe(feuille.getCell('B14'))).toBe('FFD0CECE');
    // Les cases condamnées n'offrent pas la liste déroulante, les autres si.
    expect(feuille.getCell('B11').dataValidation).toBeTruthy();
    expect(feuille.getCell('D11').dataValidation).toBeFalsy();
  });
});

describe('export Excel de la fiche VIERGE', () => {
  let feuille;

  beforeAll(async () => {
    // jeu 30/07 → dim 02/08 2026 : 4 jours, dont un samedi et un changement de mois.
    await exportFicheViergeToExcel({ startDate: '2026-07-30', endDate: '2026-08-02' });
    const workbook = await lireClasseurCapture();
    feuille = workbook.getWorksheet('Désidératas');
    expect(feuille).toBeTruthy();
  });

  it('laisse le nom et les questions à compléter', () => {
    expect(feuille.getCell('A1').value).toBe('NOM et Prénom : ');
    // Rien entre « souhaité : » et « /mois », et OUI/NON encore à trancher.
    expect(String(feuille.getCell('A4').value)).toMatch(/souhaité :\s+\/mois$/);
    expect(String(feuille.getCell('A5').value)).toMatch(/OUI\s+NON$/);
    expect(String(feuille.getCell('A6').value)).toMatch(/OUI\s+NON$/);
  });

  it('reprend la mise en forme de la fiche avec toutes les cases vides', () => {
    // En-tête et dates au format habituel…
    expect(String(feuille.getCell('A10').value)).toBe('DATES');
    expect(String(feuille.getCell('G10').value)).toContain('RENFORT 20H / 00H');
    expect(feuille.getCell('A11').value.toISOString().slice(0, 10)).toBe('2026-07-30');
    expect(feuille.getCell('A14').value.toISOString().slice(0, 10)).toBe('2026-08-02');
    expect(feuille.getCell('A15').value).toBeFalsy();

    // …mais aucune réponse pré-remplie sur les 4 jours de la période.
    [11, 12, 13, 14].forEach((ligne) => {
      ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
        expect(feuille.getCell(`${col}${ligne}`).value).toBeFalsy();
      });
    });
  });

  it('reproduit les questions du modèle au caractère près', () => {
    expect(feuille.getCell('A4').value).toBe(
      '1 - Nombre de gardes par mois souhaité :                            /mois'
    );
    expect(feuille.getCell('A5').value).toBe(
      '2 - Gardes groupées  dans un même week-end :   OUI  NON'
    );
    expect(feuille.getCell('A6').value).toBe(
      '3 - Les renforts associés  à une garde :  OUI   NON'
    );
    // Le bloc jaune s'arrête à G7 puis ne couvre que B8→G8 : A8 reste blanche.
    expect(argbDe(feuille.getCell('G7'))).toBe('FFFFFF00');
    expect(argbDe(feuille.getCell('B8'))).toBe('FFFFFF00');
    expect(argbDe(feuille.getCell('A8'))).toBeNull();
  });

  it('pose la police du modèle sur les cases VIDES (réponse écrite à la main)', () => {
    // Sans cela, une réponse saisie s'afficherait en Calibri 11 par défaut.
    ['B', 'C', 'E', 'F', 'G'].forEach((col) => {
      const police = feuille.getCell(`${col}11`).font;
      expect(police.name).toBe('Calibri');
      expect(police.size).toBe(18);
      expect(police.bold).toBe(true);
    });
  });

  it('colore la réponse automatiquement (mise en forme conditionnelle du modèle)', () => {
    const cf = feuille.conditionalFormattings.find((c) => c.ref === 'B11:G14');
    expect(cf).toBeTruthy();

    const couleurPour = (texte) => {
      const regle = cf.rules.find((r) => (r.formulae?.[0] || '').includes(`"${texte}"`));
      return regle?.style?.font?.color?.argb;
    };
    expect(couleurPour('oui')).toBe('FF00B050');       // vert
    expect(couleurPour('non')).toBe('FFFF0000');       // rouge
    expect(couleurPour('possible')).toBe('FFFFC000');  // ambre
    cf.rules.forEach((r) => expect(r.type).toBe('containsText'));
  });

  it('reprend la mise en page imprimable du modèle', () => {
    const mep = feuille.pageSetup;
    expect(mep.paperSize).toBe(9);            // A4
    expect(mep.orientation).toBe('portrait');
    expect(mep.fitToHeight).toBe(2);
    expect(Math.round(mep.margins.left * 1e4)).toBe(3150);
  });

  it('garde les listes déroulantes Oui / Possible / Non pour la saisie', () => {
    expect(feuille.getCell('K10').value).toBe('Oui ');
    expect(feuille.getCell('K11').value).toBe('Non');
    expect(feuille.getCell('K12').value).toBe('Possible');
    expect(feuille.getCell('B11').dataValidation?.formulae).toEqual(['$K$10:$K$12']);
    // Renfort samedi : ouvert le samedi (l.13), condamné les autres jours.
    expect(feuille.getCell('D13').dataValidation).toBeTruthy();
    expect(feuille.getCell('D11').dataValidation).toBeFalsy();
  });
});
