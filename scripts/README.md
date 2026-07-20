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
