// Relecture d'une fiche de desiderata Excel. Le test central est un
// ALLER-RETOUR : on exporte une fiche remplie, on la relit, et on doit
// retrouver exactement ce qu'on avait écrit. C'est la garantie que les deux
// services ne divergeront pas.
import ExcelJS from 'exceljs';
import { exportMedecinDesiderataToExcel, exportFicheViergeToExcel } from '../excelExportService';
import { importDesiderataFromExcel } from '../excelImportService';

// L'export déclenche un téléchargement navigateur : on capture le Blob produit.
// Fonctions SIMPLES (pas jest.fn) : CRA active `resetMocks`.
let dernierBlob = null;
beforeAll(() => {
  window.URL.createObjectURL = (blob) => {
    dernierBlob = blob;
    return 'blob:capture';
  };
  window.URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = () => {};
});

const arrayBufferCapture = () =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(dernierBlob);
  });

// importDesiderataFromExcel n'utilise du File que `arrayBuffer()` : jsdom ne
// l'implémente pas sur Blob, on fournit donc l'équivalent minimal.
const fichierDepuisBuffer = (buffer, nom = 'fiche.xlsx') => ({
  name: nom,
  arrayBuffer: () => Promise.resolve(buffer),
});

const MEDECIN = { id: 'm1', nom: 'Durand', prenom: 'Anne' };
const PERIODE = { startDate: '2026-07-30', endDate: '2026-08-02' };

// jeu 30/07 → dim 02/08. Le samedi 01/08 est le seul jour où RENFORT_1 existe.
const DESIDERATA = {
  desiderata: {
    '2026-07-30': { QUART_1: 'Oui', QUART_2: 'Non', QUART_4: 'Possible' },
    '2026-08-01': { RENFORT_1: 'Oui', QUART_3: 'Non' },
    '2026-08-02': { QUART_2: 'Possible', RENFORT_2: 'Oui' },
  },
  nombreGardesSouhaitees: 7,
  gardesGroupees: true,
  renfortsAssocies: false,
};

describe('aller-retour export → import', () => {
  let relu;

  beforeAll(async () => {
    await exportMedecinDesiderataToExcel(MEDECIN, DESIDERATA, PERIODE);
    relu = await importDesiderataFromExcel(fichierDepuisBuffer(await arrayBufferCapture()));
  });

  it('retrouve exactement les disponibilités écrites', () => {
    expect(relu.desiderata).toEqual(DESIDERATA.desiderata);
  });

  it('retrouve les trois réponses du bloc jaune', () => {
    expect(relu.nombreGardesSouhaitees).toBe(7);
    expect(relu.gardesGroupees).toBe(true);
    expect(relu.renfortsAssocies).toBe(false);
  });

  it('lit le nom du médecin et compte ce qu\'il a trouvé', () => {
    expect(relu.nomLu).toBe('Anne DURAND');
    expect(relu.stats.joursLus).toBe(4);        // 4 jours dans la période
    expect(relu.stats.casesRemplies).toBe(7);   // 3 + 2 + 2 réponses
    expect(relu.stats.casesIllisibles).toBe(0);
  });

  it('n\'invente pas de jour pour les dates laissées vides', () => {
    // Le 31/07 n'a aucune réponse : il ne doit pas apparaître.
    expect(relu.desiderata['2026-07-31']).toBeUndefined();
  });
});

describe('fiche vierge relue', () => {
  it('ne rend aucune disponibilité et aucune préférence tranchée', async () => {
    await exportFicheViergeToExcel(PERIODE);
    const relu = await importDesiderataFromExcel(fichierDepuisBuffer(await arrayBufferCapture()));

    expect(relu.desiderata).toEqual({});
    expect(relu.stats.joursLus).toBe(4);
    expect(relu.stats.casesRemplies).toBe(0);
    // « OUI  NON » encore côte à côte = question non tranchée.
    expect(relu.gardesGroupees).toBeUndefined();
    expect(relu.renfortsAssocies).toBeUndefined();
    expect(relu.nombreGardesSouhaitees).toBeUndefined();
    expect(relu.nomLu).toBe('');
  });
});

describe('tolérance sur ce qu\'un médecin a pu saisir', () => {
  // Réécrit quelques cases de la fiche exportée, puis relit.
  const relireAvec = async (modifier) => {
    await exportFicheViergeToExcel(PERIODE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await arrayBufferCapture());
    modifier(workbook.getWorksheet('Désidératas'));
    const buffer = await workbook.xlsx.writeBuffer();
    return importDesiderataFromExcel(fichierDepuisBuffer(buffer));
  };

  it('accepte la casse et les espaces de la liste déroulante', async () => {
    const relu = await relireAvec((ws) => {
      ws.getCell('B11').value = 'Oui ';      // valeur exacte de la légende K10
      ws.getCell('C11').value = 'NON';       // saisi en majuscules
      ws.getCell('E11').value = '  possible ';
    });
    expect(relu.desiderata['2026-07-30']).toEqual({
      QUART_1: 'Oui', QUART_2: 'Non', QUART_3: 'Possible',
    });
    expect(relu.stats.casesIllisibles).toBe(0);
  });

  it('compte comme illisible ce qui n\'est pas un des trois choix', async () => {
    const relu = await relireAvec((ws) => {
      ws.getCell('B11').value = 'Oui';
      ws.getCell('C11').value = 'peut-être';  // hors liste
    });
    expect(relu.desiderata['2026-07-30']).toEqual({ QUART_1: 'Oui' });
    expect(relu.stats.casesIllisibles).toBe(1);
  });

  it('retrouve les questions même si des lignes ont été ajoutées au-dessus', async () => {
    const relu = await relireAvec((ws) => {
      ws.getCell('B11').value = 'Oui';
      ws.spliceRows(1, 0, ['Note du médecin : je suis absent en août']);
    });
    // Les questions sont repérées par leur « 1 - » / « 2 - », pas par l'adresse,
    // et les dates par leur contenu : le décalage ne casse rien.
    expect(relu.desiderata['2026-07-30']).toEqual({ QUART_1: 'Oui' });
    expect(relu.stats.joursLus).toBe(4);
  });

  it('refuse un classeur qui ne contient aucune date', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Feuille1').getCell('A1').value = 'rien à voir';
    const buffer = await workbook.xlsx.writeBuffer();
    await expect(
      importDesiderataFromExcel(fichierDepuisBuffer(buffer))
    ).rejects.toThrow(/Aucune date/);
  });
});
