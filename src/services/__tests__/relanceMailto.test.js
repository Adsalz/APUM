import {
  construireLotsRelance,
  adressesDesMedecins,
  messageRelanceParDefaut,
  SUJET_RELANCE_DEFAUT
} from '../emailService';

const medecin = (id, email) => ({ id, nom: `Nom${id}`, prenom: `Prenom${id}`, email });

const parametresDuLien = (href) => {
  const params = new URLSearchParams(href.slice('mailto:?'.length));
  return {
    bcc: params.get('bcc'),
    subject: params.get('subject'),
    body: params.get('body')
  };
};

describe('adressesDesMedecins', () => {
  it('nettoie, dédoublonne et écarte les médecins sans email', () => {
    const adresses = adressesDesMedecins([
      medecin(1, ' a@apum.fr '),
      medecin(2, ''),
      medecin(3, undefined),
      medecin(4, 'a@apum.fr'),
      medecin(5, 'b@apum.fr')
    ]);
    expect(adresses).toEqual(['a@apum.fr', 'b@apum.fr']);
  });
});

describe('construireLotsRelance', () => {
  it('place les destinataires en copie cachée, jamais en destinataire visible', () => {
    const [lot] = construireLotsRelance({
      medecins: [medecin(1, 'a@apum.fr'), medecin(2, 'b@apum.fr')]
    });
    expect(lot.href.startsWith('mailto:?bcc=')).toBe(true);
    expect(parametresDuLien(lot.href).bcc).toBe('a@apum.fr,b@apum.fr');
  });

  it('utilise le message par défaut quand le message personnalisé est vide', () => {
    const [lot] = construireLotsRelance({ medecins: [medecin(1, 'a@apum.fr')], message: '   ' });
    expect(parametresDuLien(lot.href).body).toBe(messageRelanceParDefaut());
    expect(parametresDuLien(lot.href).subject).toBe(SUJET_RELANCE_DEFAUT);
  });

  it('reprend le sujet et le message personnalisés', () => {
    const [lot] = construireLotsRelance({
      medecins: [medecin(1, 'a@apum.fr')],
      sujet: 'Desiderata & planning',
      message: 'Bonjour,\nMerci de répondre.'
    });
    const { subject, body } = parametresDuLien(lot.href);
    expect(subject).toBe('Desiderata & planning');
    expect(body).toBe('Bonjour,\nMerci de répondre.');
  });

  it('ne renvoie aucun lot si personne n\'a d\'adresse email', () => {
    expect(construireLotsRelance({ medecins: [medecin(1, ''), medecin(2, null)] })).toEqual([]);
    expect(construireLotsRelance({ medecins: [] })).toEqual([]);
  });

  it('découpe en plusieurs brouillons quand le lien dépasse la limite', () => {
    // Ordre de grandeur réel : une soixantaine de médecins, adresses longues.
    const medecins = Array.from({ length: 60 }, (_, i) =>
      medecin(i, `prenom.nom${i}@messagerie-exemple.fr`)
    );
    const lots = construireLotsRelance({ medecins });

    expect(lots.length).toBeGreaterThan(1);
    lots.forEach(lot => expect(lot.href.length).toBeLessThanOrEqual(1800));

    // Aucune adresse perdue ni dupliquée d'un lot à l'autre.
    const toutes = lots.flatMap(lot => lot.adresses);
    expect(toutes).toEqual(medecins.map(m => m.email));
  });

  it('conserve une adresse seule même si elle dépasse la limite', () => {
    const lots = construireLotsRelance({
      medecins: [medecin(1, 'a@apum.fr'), medecin(2, 'b@apum.fr')],
      longueurMax: 10
    });
    expect(lots.map(lot => lot.adresses)).toEqual([['a@apum.fr'], ['b@apum.fr']]);
  });
});
