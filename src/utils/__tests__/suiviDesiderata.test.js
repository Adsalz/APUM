import {
  construireLignes,
  trierLignes,
  triSuivant,
  colonneParCle,
  statutDeLaFiche,
} from '../suiviDesiderata';

const medecin = (id, nom, prenom, email) => ({ id, nom, prenom, email });

const MEDECINS = [
  medecin('1', 'Dupont', 'Jean', 'jean.dupont@exemple.fr'),
  medecin('2', 'Bernard', 'Claire', 'claire.bernard@exemple.fr'),
  medecin('3', 'Évrard', 'Alice', 'alice.evrard@exemple.fr'),
  medecin('4', 'Bernard', 'Alain', 'alain.bernard@exemple.fr'),
];

const FICHES = [
  // Dupont : saisie, modifiée le plus récemment.
  { userId: '1', desiderata: { '2026-10-01': { QUART_1: 'Oui' } }, modifieLe: '2026-10-05T08:00:00.000Z' },
  // Bernard Claire : document créé mais aucune réponse → incomplet.
  { userId: '2', desiderata: {}, modifieLe: '2026-10-01T08:00:00.000Z' },
  // Évrard : saisie, plus ancienne.
  { userId: '3', desiderata: { '2026-10-02': { QUART_2: 'Non' } }, modifieLe: '2026-09-28T08:00:00.000Z' },
  // Bernard Alain : pas de fiche du tout → non saisi, sans date.
];

const noms = (lignes) => lignes.map(ligne => `${ligne.medecin.nom} ${ligne.medecin.prenom}`);
const trier = (cle, sens) => trierLignes(construireLignes(MEDECINS, FICHES), colonneParCle(cle), sens);

describe('statutDeLaFiche', () => {
  it('distingue non saisi, incomplet et complet', () => {
    expect(statutDeLaFiche(undefined)).toBe('non_saisi');
    expect(statutDeLaFiche({ desiderata: {} })).toBe('incomplet');
    expect(statutDeLaFiche({ desiderata: { '2026-10-01': { QUART_1: 'Oui' } } })).toBe('complet');
  });
});

describe('construireLignes', () => {
  it('rattache chaque fiche à son médecin, même sans fiche', () => {
    const lignes = construireLignes(MEDECINS, FICHES);
    expect(lignes).toHaveLength(4);

    const sansFiche = lignes.find(ligne => ligne.medecin.id === '4');
    expect(sansFiche.statut).toBe('non_saisi');
    expect(sansFiche.modification).toBeNull();
    expect(sansFiche.modifieLe).toBe(-Infinity);
  });
});

describe('trierLignes', () => {
  it('trie par nom puis prénom, accents ignorés', () => {
    expect(noms(trier('medecin', 'asc'))).toEqual([
      'Bernard Alain', 'Bernard Claire', 'Dupont Jean', 'Évrard Alice'
    ]);
    expect(noms(trier('medecin', 'desc'))).toEqual([
      'Évrard Alice', 'Dupont Jean', 'Bernard Claire', 'Bernard Alain'
    ]);
  });

  it('remonte les fiches à relancer au tri croissant sur le statut', () => {
    const statuts = trier('statut', 'asc').map(ligne => ligne.statut);
    expect(statuts).toEqual(['non_saisi', 'incomplet', 'complet', 'complet']);
  });

  it('départage toujours par ordre alphabétique, même au tri décroissant', () => {
    // Les deux « complet » arrivent en tête, dans l'ordre des noms et non inversés.
    expect(noms(trier('statut', 'desc'))).toEqual([
      'Dupont Jean', 'Évrard Alice', 'Bernard Claire', 'Bernard Alain'
    ]);
  });

  it('trie par date de modification, la plus récente d\'abord en décroissant', () => {
    expect(noms(trier('modification', 'desc'))).toEqual([
      'Dupont Jean', 'Bernard Claire', 'Évrard Alice', 'Bernard Alain'
    ]);
  });

  it('laisse les fiches sans date en bas dans les deux sens', () => {
    expect(noms(trier('modification', 'asc')).pop()).toBe('Bernard Alain');
    expect(noms(trier('modification', 'desc')).pop()).toBe('Bernard Alain');
  });

  it('trie par email', () => {
    expect(trier('email', 'asc').map(ligne => ligne.medecin.email)).toEqual([
      'alain.bernard@exemple.fr',
      'alice.evrard@exemple.fr',
      'claire.bernard@exemple.fr',
      'jean.dupont@exemple.fr',
    ]);
  });

  it('ne modifie pas la liste reçue', () => {
    const lignes = construireLignes(MEDECINS, FICHES);
    const avant = noms(lignes);
    trierLignes(lignes, colonneParCle('statut'), 'desc');
    expect(noms(lignes)).toEqual(avant);
  });
});

describe('triSuivant', () => {
  it('inverse le sens quand on reclique la même colonne', () => {
    const statut = colonneParCle('statut');
    expect(triSuivant({ cle: 'statut', sens: 'asc' }, statut)).toEqual({ cle: 'statut', sens: 'desc' });
    expect(triSuivant({ cle: 'statut', sens: 'desc' }, statut)).toEqual({ cle: 'statut', sens: 'asc' });
  });

  it('applique le sens par défaut de la colonne au premier clic', () => {
    expect(triSuivant({ cle: 'medecin', sens: 'desc' }, colonneParCle('modification')))
      .toEqual({ cle: 'modification', sens: 'desc' });
    expect(triSuivant({ cle: 'modification', sens: 'desc' }, colonneParCle('medecin')))
      .toEqual({ cle: 'medecin', sens: 'asc' });
  });
});
