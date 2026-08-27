# Scripts d'administration APUM

Scripts exécutés **localement** par un administrateur, via le **SDK Admin
Firebase**. Ils fonctionnent sur le **plan gratuit (Spark)** — contrairement au
*déploiement* de Cloud Functions, qui exige le plan Blaze.

## Installation (une fois)

```bash
cd scripts
npm install
```

## Clé de compte de service

1. Console Firebase → **Paramètres du projet** → **Comptes de service** →
   **« Générer une nouvelle clé privée »** → un fichier JSON est téléchargé.
2. Placez ce fichier **hors du dépôt** (par ex. votre dossier personnel).
   Il donne un accès complet au projet : **ne le versionnez jamais**.

## `supprimer-compte-auth.js` — supprimer un compte de connexion

Quand on supprime un utilisateur depuis l'application, son accès est
**révoqué immédiatement** (document Firestore effacé → les règles refusent tout).
Le **compte de connexion** (email) subsiste toutefois dans Firebase Auth et ne
peut être effacé que côté serveur. Ce script réalise cet effacement définitif
(réutilisation d'un email, demande RGPD).

```bash
GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
  node supprimer-compte-auth.js dr.dupont@example.com
```

Options :

- `--supprimer-doc` : supprime aussi le document Firestore `users/{uid}`
  (normalement déjà fait via l'application).

Alternative sans script : Console Firebase → **Authentication** → rechercher
l'email → **Supprimer le compte**.

## `synchroniser-annuaire.js` — peupler l'annuaire de connexion

Reconstruit la collection publique `annuaire` (liste déroulante de connexion des
médecins) à partir des utilisateurs de rôle `medecin`. Équivalent, hors
interface, du bouton **« Synchroniser l'annuaire »**. Sert surtout au
**peuplement initial** des médecins déjà existants (indispensable pour que la
liste déroulante ne soit pas vide après passage au nouveau login).

Idempotent : réécrit chaque entrée `annuaire/{uid} = { label, email }` et
supprime les orphelins (uid qui n'est plus médecin). Réexécutable à volonté.

```bash
# Aperçu sans écrire (recommandé une première fois) :
GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
  node synchroniser-annuaire.js --dry-run

# Synchronisation réelle :
GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
  node synchroniser-annuaire.js
```

Alternative sans script : se connecter en **administrateur** dans l'app →
*Gestion des utilisateurs* → **« Synchroniser l'annuaire »** (nécessite que le
nouveau frontend soit déployé).

## `reinitialiser-comptes-a-reclamer.js` — passage aux codes à 6 chiffres (rollout)

À lancer **une seule fois**, au passage au système « code à 6 chiffres / premier
code = le sien ». Met **tous** les comptes médecin dans l'état « à réclamer » :
leur mot de passe actuel est remplacé par le code de réclamation partagé, puis
chaque médecin définit son code à 6 chiffres à sa première connexion.

⚠️ Invalide les mots de passe actuels : **préviens les médecins avant**, et
n'**ouvre la fenêtre d'inscription** (app → *Gestion des utilisateurs*) que
quand tu es prêt.

```bash
GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
  node reinitialiser-comptes-a-reclamer.js --dry-run   # aperçu
GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
  node reinitialiser-comptes-a-reclamer.js             # réel
```

## `reinitialiser-code.js` — réinitialiser le code d'un médecin (oubli)

Remet **un** médecin dans l'état « à réclamer » (il redéfinira un code à sa
prochaine connexion) **et efface ses desiderata** (réinitialiser le code =
repartir de zéro sur les choix).

```bash
GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
  node reinitialiser-code.js dr.dupont@example.com
```

La **fenêtre d'inscription** doit être ouverte pour qu'il puisse redéfinir son code.

## `importer-ordre-choix.js` — amorcer la chaîne des ordres de choix

L'ordre de choix **ne se recalcule pas de zéro** : il se transmet d'un trimestre
au suivant (les 10 premiers du 1er tour basculent en bas de liste, les nouveaux
s'insèrent juste avant ce bloc, le 2ᵉ tour est l'exact inverse du 1er — cf.
`src/utils/ordreChoix.js`). Il faut donc **un point de départ réel en base** :
une liste officielle « ORDRE DE CHOIX \<PERIODE\>.xlsx ». **Une seule suffit** —
la règle ne lit jamais plus loin que le trimestre précédent. Sans elle,
l'application n'a d'autre choix que de partir d'un ordre alphabétique, sans
rapport avec l'historique.

Le script écrit `planning/ordre_choix_<AAAA-MM>` — le mois de **début** du
trimestre (`2026-08` pour ASO26) — exactement le document que lit l'application.

### Le rapprochement des noms n'est pas cosmétique

Les noms stockés doivent correspondre **caractère pour caractère** à
`${medecin.nom} ${medecin.prenom}` en base : `planningGeneratorPriorite.js`
construit `mapMedecinNomVersId[nomComplet]` et `planningCore.js` y accède par
clé directe. Une orthographe qui diffère d'un accent ou d'un trait d'union ne
lève **aucune erreur** — le médecin est simplement sauté à son tour de choix.
Pire, au trimestre suivant `genererProchainOrdreChoix()` le verrait « parti »
tout en voyant son homologue de la base « nouveau » : la liste se corromprait
d'elle-même, silencieusement.

La feuille de la coordinatrice est saisie à la main. Sur ASO26, **10 noms sur 48**
ne tombaient pas juste : accents (`TOURNEUR Helene` / `Héléne`), casse
(`SALLES` / `Salles`), traits d'union (`Jean Paul` / `Jean-Paul`), espacement
(`M RABET` / `MRABET`), nom composé inversé (`LEROY-STEFANI` / `STEFANI-LEROY`)
ou raccourci en base (`CASTINETTI/BRUN Céline` / `CASTINETTI Céline`). Le script
les rapproche par tolérances successives, **exige une correspondance unique** à
chaque niveau, affiche chaque correction, et n'écrit que des noms existant en
base. Ce qu'il ne sait pas trancher, il refuse de l'inventer :

- `--retirer-inconnus` — retire les noms sans compte (médecins ayant quitté la
  garde). Sans ce drapeau, un nom non rapproché **bloque l'import**.
- `--correspondances <fichier.json>` — table `{"nom de la feuille": "nom en base"}`
  pour les cas qu'aucune règle ne peut trancher.

Authentification par la **session du CLI Firebase**, comme
`basculer-periode-saisie.js`.

```bash
# Aperçu (lit la feuille, rapproche, n'écrit rien) :
node importer-ordre-choix.js "../ORDRE DE CHOIX ASO26.xlsx" 2026-08

# Import réel, en retirant les médecins qui ne régulent plus :
node importer-ordre-choix.js "../ORDRE DE CHOIX ASO26.xlsx" 2026-08 --retirer-inconnus --go
```

Options : `--projet <id>`, `--libelle <texte>`, `--force` (réécrit un trimestre
déjà importé).

Le script signale aussi les médecins **en base mais absents de la liste** : c'est
normal pour des arrivées postérieures, la règle de bascule les insérera au
trimestre suivant.

### Ensuite, l'application prend le relais

Le générateur propose l'ordre du trimestre suivant à partir du dernier trimestre
enregistré, l'admin l'ajuste et le **fige**. Régénérer le tableau relit alors la
liste figée : elle ne rebascule qu'au trimestre suivant.
