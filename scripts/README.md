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
