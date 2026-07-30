// Vérifie le FORMAT réel des classeurs Excel générés (demandes admin 07/2026) :
//  - planning : renfort 20h/00h en colonne P, APRÈS le 4ème quart (M-O), comme
//    sur la fiche desiderata ; couleurs des quarts reprises des tableaux de
//    référence (nuances par type de jour) ;
//  - desiderata : bordure épaisse au premier jour de chaque nouveau mois.
// Les classeurs sont écrits puis relus avec ExcelJS (pas de test d'implémentation).
import ExcelJS from 'exceljs';
import { exportPlanningToExcel, exportDesiderataToExcel } from '../excelExportService';

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
  });
});
