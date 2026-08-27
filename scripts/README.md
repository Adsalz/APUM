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

## `rapprocher-annuaire.js` — comparer la liste papier et les comptes réels

Rapproche la **liste papier des régulateurs** (« MEDECINS REGULATEURS LIBERAUX
DU CENTRE 15 », transcrite en JSON **hors dépôt**, RGPD) et les comptes du
projet Firebase. Sert à chaque mise à jour de la liste : qui manque, qui est
parti, quels emails ont changé.

Authentification par la **session du CLI Firebase** — aucune clé de compte de
service (`npx firebase-tools login` une fois si besoin), comme
`basculer-periode-saisie.js`.

Le rapport distingue :

- **à créer** — sur la liste, absent de la base ;
- **à retirer** — compte médecin absent de la liste ;
- **email divergent** — même personne, adresse différente ;
- **orthographe divergente** — casse et accents ignorés, seules les vraies
  différences ressortent ;
- **autre rôle** — régulateur déjà en base comme `admin` (à ne pas dupliquer) ;
- **ne régule plus** — ligne `"actif": false` de la transcription, ignorée.

Le rapprochement se fait par email d'abord (identifiant de connexion), puis par
nom normalisé pour les restants.

```bash
node rapprocher-annuaire.js          # rapport seul, aucune écriture
node rapprocher-annuaire.js --go     # corrige les emails divergents
```

Options : `--liste <fichier>` (autre transcription que
`../annuaire-medecins-2026-2027.json`), `--projet <id>`.

`--go` ne corrige **que les emails**, et met à jour **Auth *et* Firestore** — les
deux doivent rester alignés, la connexion médecin résolvant l'adresse via
l'annuaire. Il ne touche pas aux noms (le papier les écrit en capitales : les
recopier passerait tout l'affichage en majuscules) et ne **crée ni ne supprime**
jamais de compte.

⚠️ Après un `--go`, relance **`synchroniser-annuaire.js`** : sans cela l'annuaire
public garde l'ancien email et la liste déroulante de connexion pointe sur une
adresse qui n'existe plus.

### La transcription de la liste papier

Fichier **nominatif**, donc **gitignoré** : `annuaire-medecins-2026-2027.json`
à la racine du dépôt.

```json
{
  "medecins": [
    { "nom": "DUPONT", "prenom": "Marie", "email": "marie.dupont@example.fr" },
    { "nom": "MARTIN", "prenom": "Paul", "email": "paul.martin@example.fr",
      "actif": false, "motif": "Ne régule plus depuis ..." }
  ]
}
```

`"actif": false` = ne régule plus : la ligne reste dans la transcription (trace
de ce que dit le papier) mais est **ignorée** par les deux scripts. Sans ça,
chaque exécution reproposerait indéfiniment de recréer un compte supprimé
volontairement.

## `creer-comptes-medecins.js` — créer en lot les médecins manquants

Crée les comptes des régulateurs présents sur la liste papier mais absents de la
base — l'équivalent en lot de *Gestion des utilisateurs → Ajouter un
utilisateur*. Les manquants sont déterminés par la **même logique** que
`rapprocher-annuaire.js` (lancez-le d'abord). Même authentification : session du
CLI Firebase.

Pour chacun, à l'identique du parcours de l'app : compte Firebase Auth avec le
**code de réclamation** partagé (compte « à réclamer », le médecin choisira son
code à 6 chiffres à sa première connexion) puis document
`users/{uid} = { nom, prenom, email, role: 'medecin' }`. **Aucun email n'est envoyé.**

```bash
node creer-comptes-medecins.js         # aperçu, aucune écriture
node creer-comptes-medecins.js --go    # création réelle
```

Options : `--liste <fichier>`, `--projet <id>`.

**Réexécutable sans risque.** Un compte Auth qui existe déjà pour l'adresse
(essai interrompu, ou compte supprimé depuis l'app — qui efface le document
Firestore mais **pas** le compte de connexion) voit son **uid réutilisé** :
seul le document est réécrit. Le mot de passe d'un compte existant n'est
**jamais** réinitialisé — un médecin ayant déjà choisi son code le conserve.

⚠️ Un compte Auth orphelin appartient souvent à quelqu'un qui est **parti**
(c'est pour ça que son document avait été supprimé). Le raccrocher le
**réactive** : marquez `"actif": false` ceux qui ne régulent plus avant de lancer
la création.

Ensuite, impérativement :

1. `node synchroniser-annuaire.js` — sans quoi les nouveaux **n'apparaissent
   pas** dans la liste déroulante de connexion ;
2. **ouvrir la fenêtre d'inscription** (app → *Gestion des utilisateurs*), sinon
   ils ne peuvent pas définir leur code. Le script affiche son état courant.

## `nouveaux-choix.js` — lancer un nouveau trimestre de choix

**Le geste de rentrée**, à chaque nouveau tour de choix. Il n'a pas d'équivalent
dans l'application : effacer le code des autres médecins exige les droits
projet, hors de portée d'un navigateur, et une Cloud Function demanderait le
plan Blaze que le projet n'a pas.

Une commande, trois effets, dans cet ordre :

1. écrit la **période de saisie** (aucun desiderata supprimé — ceux des
   trimestres passés restent consultables) ;
2. **efface le code de tous les médecins** : chacun fixe le sien à sa première
   connexion, et ce code vaut pour tout le trimestre ;
3. **ouvre la fenêtre d'inscription** — sans elle, un code effacé ne peut pas
   être redéfini, donc personne ne se connecte. Ouverte en dernier, quand tout
   le reste est en place.

Authentification par la **session du CLI Firebase** — aucune clé de compte de
service (`npx firebase-tools login` une fois si besoin).

```bash
node nouveaux-choix.js                              # état actuel, rien écrit
node nouveaux-choix.js 2026-11-01 2027-01-31        # aperçu du lancement
node nouveaux-choix.js 2026-11-01 2027-01-31 --go   # exécution réelle
node nouveaux-choix.js --codes-seuls --go           # période déjà définie dans
                                                    # l'app : codes + fenêtre
```

Options : `--go`, `--codes-seuls`, `--projet <id>`, `--sauvegarde <fichier>`.

⚠️ **Irréversible** : Firebase ne stocke que des empreintes, les codes en cours
ne sont pas récupérables. La sauvegarde écrite par le script contient la période
et la liste des médecins, pas les codes.

En revanche, **ce n'est pas un verrouillage et il n'y a rien à annoncer** : tant
que la fenêtre d'inscription est ouverte, un médecin qui retape son code
habituel se reconnecte sans rien remarquer (l'app échoue, réessaie avec le code
partagé, puis adopte le code tapé). Seul celui qui a **oublié** son code en
choisit un nouveau — c'est tout l'intérêt.

⚠️ Corollaire : le premier code tapé après la remise à zéro est adopté **sans
confirmation**. Une faute de frappe devient le code du médecin, sans message
d'erreur ; il faudra le débloquer à la main (`reinitialiser-code.js`).

⚠️ Tant que la fenêtre d'inscription reste ouverte, un compte dont le code n'a
pas encore été redéfini peut être pris par un tiers connaissant la valeur
partagée (publique, embarquée dans le bundle — risque assumé, cf. `AUDIT.md`).
**Referme-la** (app → *Gestion des utilisateurs*) une fois que tout le monde
s'est connecté.

Pourquoi un script et pas un bouton : le SDK client Firebase ne peut changer que
le mot de passe de l'utilisateur **connecté**. Effacer celui des autres exige
les droits projet, donc un outil hors application.

## `reinitialiser-comptes-a-reclamer.js` — passage aux codes à 6 chiffres (rollout)

*Historique* : le rollout initial du passage aux codes à 6 chiffres. Pour la
remise à zéro **récurrente**, à chaque nouveau tour de choix, utilise
`nouveaux-choix.js` ci-dessus (pas de clé de compte de service, et il enchaîne
période + codes + fenêtre d'inscription).

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

## `basculer-periode-saisie.js` — afficher une autre période (sans rien supprimer)

Change la **période de saisie** affichée dans l'application, pour consulter ou
comparer une période passée dont les desiderata sont toujours en base.

**Pourquoi un script plutôt que le bouton de l'app** : dans l'interface,
définir la période appelle `setPeriodeSaisie()`, qui enchaîne sur
`deleteObsoleteDesiderata()` — tout desiderata entièrement hors de la nouvelle
période est **supprimé**. Revenir sur une période passée depuis l'app effacerait
donc les saisies en cours. Ce script écrit `planning/periode_saisie` seul : les
jeux cohabitent, l'app n'affiche que ceux qui chevauchent la période.

Authentification par la **session du CLI Firebase** — aucune clé de compte de
service (`npx firebase-tools login` une fois si besoin). Une sauvegarde de la
période et de l'inventaire complet des desiderata est écrite avant toute
écriture, y compris en mode aperçu.

```bash
# État actuel, n'écrit rien :
node basculer-periode-saisie.js

# Aperçu de la bascule :
node basculer-periode-saisie.js 2026-08-01 2026-10-31

# Application réelle :
node basculer-periode-saisie.js 2026-08-01 2026-10-31 --go

# Retour à la période précédente :
node basculer-periode-saisie.js --restaurer ~/apum-periode-....json --go
```

Options : `--projet <id>`, `--sauvegarde <fichier>`, `--restaurer <fichier>`.

⚠️ Pendant la bascule, un médecin qui se connecte voit le formulaire de la
période affichée, **pas** celui de la période en cours. À rebasculer après usage.

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

## `migrer-ordre-choix-ids.js` — passer les ordres de choix aux identifiants

Un ordre de choix conservé sous forme de **noms** se rompt au premier
renommage : le médecin renommé sort de la liste comme « parti » et y rentre
comme « nouveau », **sans la moindre erreur**. C'est arrivé en production le
26 août 2026 — ZWANEVELD Nicole et BENOIT Grégoire s'étaient retrouvés parmi les
arrivants après correction de leur fiche, et la liste les avait renvoyés en bas.

Les documents `ordre_choix_<AAAA-MM>` stockent donc `premierTourIds` /
`deuxiemeTourIds` (des identifiants Firebase, qui ne bougent jamais). Les champs
`premierTour` / `deuxiemeTour` gardent les noms **pour la relecture humaine
uniquement** — plus rien ne s'en sert pour retrouver un médecin.

Ce script convertit les documents restés en noms.

⚠️ **Il ne fonctionne que tant que les noms correspondent encore.** Le
rapprochement est fait à l'identique contre l'annuaire courant : chaque
renommage effectué avant la migration est une correspondance perdue. Le script
**refuse d'écrire** s'il ne résout pas la totalité d'une liste — une liste
amputée serait pire que pas de migration du tout.

```bash
node migrer-ordre-choix-ids.js         # aperçu de tous les trimestres
node migrer-ordre-choix-ids.js --go    # écrit
```

Options : `--projet <id>`, `--periode <AAAA-MM>` (un seul trimestre).

Les documents déjà en identifiants sont détectés et laissés tels quels : le
script est rejouable sans risque.
