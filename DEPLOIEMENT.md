# Déploiement sur https://apum-8cfa4.web.app

Le déploiement se fait depuis un poste où `firebase login` a déjà été effectué
(le poste habituel). Un seul `firebase deploy` publie **le site** (hosting)
**et les règles Firestore** (`firestore.rules`).

## Étapes (PowerShell ou invite de commandes, dans le dossier du projet)

```powershell
# 1. Récupérer la branche
git fetch origin
git checkout claude/project-overview-vr7fr8
git pull origin claude/project-overview-vr7fr8

# 2. Restaurer la configuration locale
#    (.env n'est plus versionné : il disparaît du dossier au checkout,
#    on le récupère depuis l'ancienne branche main)
git restore --source=main -- .env

# ⚠️ Ne PAS recréer .env avec « echo ... > .env » sous PowerShell :
#    la redirection écrit de l'UTF-16 illisible (c'est ce qui avait
#    corrompu le .gitignore). Éditer le fichier avec le Bloc-notes.

# 3. (Recommandé) Ajouter à la fin de .env, via le Bloc-notes :
#    REACT_APP_EMAIL_FROM=<adresse Gmail configurée dans l'extension Trigger Email>
#    REACT_APP_PUBLIC_URL=https://apum-8cfa4.web.app

# 4. Réinstaller les dépendances (react-scripts a changé de version majeure)
npm install

# 5. Construire
npm run build

# 6. Déployer (site + règles Firestore)
npx firebase-tools@latest deploy
```

> `npx firebase deploy` échoue si `firebase-tools` n'est pas installé sur le
> poste (« could not determine executable to run ») : utiliser
> `npx firebase-tools@latest deploy`, ou installer l'outil une fois
> (`npm i -g firebase-tools`).

## Vérifications après déploiement

1. Ouvrir https://apum-8cfa4.web.app — nouvelle page de connexion.
2. Se connecter en médecin **et** en admin, recharger la page (F5) sur un
   dashboard : on doit **rester connecté** (plus de retour au login).
3. Console Firebase → Firestore → Règles : vérifier que les nouvelles règles
   sont actives (elles bloquent la modification du champ `role` par
   l'utilisateur lui-même).

## Notes

- Les anciens fichiers de travail (desiderata JSON/PDF/XLSX, scripts d'import)
  ne sont plus versionnés : ils disparaissent du dossier au checkout de cette
  branche. Pour en récupérer un : `git restore --source=main -- "chemin/du/fichier"`.
- 🔴 Rappel sécurité : révoquer le mot de passe d'application Gmail exposé
  dans l'historique git (https://myaccount.google.com/apppasswords) et
  reconfigurer l'extension Trigger Email avec le nouveau.
