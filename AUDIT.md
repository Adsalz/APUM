# Audit du projet Planning APUM — juillet 2026

Audit complet (sécurité, code, design/UX, hygiène du dépôt) réalisé sur la base
du code de la branche `main`, suivi d'une première vague de corrections
(branche `claude/project-overview-vr7fr8`). Ce document liste **ce qui a été
trouvé**, **ce qui a été corrigé** et **ce qui reste à faire**.

---

## 🔴 Actions requises côté propriétaire (non automatisables)

1. **Révoquer le mot de passe d'application Gmail** exposé en clair dans
   l'historique git (`extensions/firestore-send-email.env` et
   `extension-config.json`) → https://myaccount.google.com/apppasswords ,
   puis reconfigurer l'extension Trigger Email avec le nouveau mot de passe.
2. **Déployer les nouvelles règles Firestore** (faille d'escalade de
   privilèges corrigée) : `npx firebase deploy --only firestore:rules`.
3. **Purger l'historique git** (optionnel mais recommandé, RGPD + secrets) :
   les fichiers retirés du suivi restent dans les anciens commits. Outil :
   [git-filter-repo](https://github.com/newren/git-filter-repo) ou BFG,
   suivi d'un force-push et d'un re-clone par tous les contributeurs.

---

## 1. Sécurité

| Constat | Gravité | Statut |
|---|---|---|
| `.gitignore` corrompu (UTF-16) → **aucune règle active** : `node_modules/` (75 373 fichiers, ~1 Go), `build/`, `.env`, secrets et données médicales versionnés | Critique | ✅ Corrigé — `.gitignore` réécrit, tout retiré du suivi |
| **Mot de passe d'application Gmail en clair** dans 2 fichiers versionnés | Critique | ✅ Retirés du suivi · 🔴 rotation à faire (voir ci-dessus) |
| **Escalade de privilèges** : `firestore.rules` autorisait chaque utilisateur à écrire son propre document `users`, **y compris `role: 'admin'`** | Critique | ✅ Corrigé — le rôle n'est plus modifiable par son propriétaire ; à déployer |
| Un médecin pouvait **réattribuer ses desiderata** à un autre (`userId` modifiable en update) | Élevée | ✅ Corrigé — `userId` immuable dans les règles |
| Données nominatives de ~12 médecins (JSON, PDF/XLSX scannés, scripts avec noms en dur) versionnées | Élevée (RGPD) | ✅ Retirées du suivi · 🔴 purge historique recommandée |
| Adresse email personnelle codée en dur dans `emailService.js` et `TestEmailModal.js` ; URL de prod en dur dans `RelanceEmailModal.js` | Moyenne | ✅ Externalisées en variables d'env (`REACT_APP_EMAIL_FROM`, `REACT_APP_PUBLIC_URL`) |
| Énumération d'adresses email possible via le formulaire « mot de passe oublié » (réponse différente si le compte existe) | Faible | ✅ Corrigé — réponse identique dans tous les cas |
| Fichier `npm` accidentel exposant le PATH Windows et le nom d'utilisateur | Faible | ✅ Retiré du suivi |

## 2. Fonctionnement / robustesse

| Constat | Statut |
|---|---|
| **Race condition d'authentification** : la plupart des écrans lisaient `auth.currentUser` dans un `useEffect` → redirection à tort vers le login au rechargement de page | ✅ Corrigé — `AuthContext` centralisé sur `onAuthStateChanged` + `ProtectedRoute` par rôle dans `App.js` |
| Aucune protection centralisée des routes (checks dupliqués dans chaque composant) | ✅ Corrigé — routes protégées par rôle, route 404 ajoutée |
| **Jours fériés codés en dur pour 2024 uniquement** → Noël 2025, 1er janvier 2026… non détectés dans les formulaires de desiderata | ✅ Corrigé — calcul pérenne (`src/utils/joursFeries.js`, algorithme de Pâques inclus) |
| `getLatestPlanning` pouvait retourner le document `periode_saisie` au lieu d'un planning (même collection, même champ `startDate`) | ✅ Corrigé |
| **Tailwind jamais compilé** : react-scripts 4 ignorait `postcss.config.js`, le CSS de prod contenait littéralement `@tailwind base;` | ✅ Corrigé — migration react-scripts 5 (supprime aussi le hack `--openssl-legacy-provider`) |
| Dépendances lourdes jamais importées : `xlsx`, `pdf-lib`, `pdfmake` | ✅ Supprimées |
| Code mort : `ChangePassword.js`, `DefinitionPeriode.js` (non routés), `checkUserRole` | ✅ Supprimés |
| Erreurs d'export affichées dans la **bannière verte de succès** (GestionDesiderata) | ✅ Corrigé — bannière d'erreur distincte |
| `deleteObsoleteDesiderata` : batch unique sans gestion de la limite Firestore (500 op.) | ✅ Corrigé — découpage en lots de 450 |
| Plusieurs plannings peuvent être « publiés » simultanément (`publishPlanning` ne dé-publie pas les précédents) | ✅ Corrigé — un seul planning publié à la fois |
| Dates gérées à la main partout (mélange UTC/local, risque de décalage d'un jour) — pas de librairie de dates | ⏳ À faire (date-fns recommandé) |
| Validation d'entrées absente dans les services | ✅ Partiel — `setPeriodeSaisie` valide format et `début <= fin` · ⏳ emails et payloads desiderata |
| Double-submit possible sur les sauvegardes (formulaires desiderata, période) | ✅ Corrigé — états `isSaving` + boutons `loading` |
| Stack datée : React 17, react-router v5, `ReactDOM.render` déprécié | ⏳ À faire (migration React 18 + router v6) |

## 3. Design / UX

| Constat | Statut |
|---|---|
| 3 systèmes de style concurrents (~656 styles inline, CSS global Bootstrap-like ~95 % mort, Tailwind non fonctionnel) | ✅ Socle posé — thème Tailwind (`tailwind.config.js`), `index.css` purgé (749 → ~50 lignes), design system `src/components/ui/` (Button, Card, Modal, Alert, FormField, Spinner, LoadingScreen, ErrorScreen, AppHeader, ActionCard, StatCard) |
| Écrans réécrits/harmonisés avec le design system | ✅ Login, dashboards, GestionUtilisateurs, formulaires desiderata, QuickFill/WeeklyPattern, PlanningVisualisation, GestionPeriodeSaisie, GestionDesiderata, GestionPlanning |
| Spinner statique (le `@keyframes spin` n'existait nulle part) | ✅ Corrigé globalement |
| Accessibilité : zéro `aria-*`, labels non associés, aucun `:focus` visible, contrastes insuffisants sur boutons désactivés | ✅ Sur le socle et les écrans réécrits (labels associés, `role="dialog"`, focus-visible global, contrastes) · ⏳ écrans restants |
| Modales : 5 implémentations divergentes, pas d'Échap ni clic-extérieur ni verrouillage du scroll | ✅ Composant `Modal` unifié, adopté pour les confirmations (suppression utilisateur, import JSON) · ⏳ modales email/export restantes |
| 16 `alert()`/`confirm()` natifs (validation, succès de sauvegarde…) | ✅ Tous remplacés par `Alert`/`Modal` (0 restant) |
| Navbar recopiée 8 fois avec variations | ✅ `AppHeader` adopté sur tous les écrans |
| `FormulaireDesirata` (759 l.) ≈ `FormulaireDesiderataAdmin` (938 l.) : ~430 lignes dupliquées | ⏳ À fusionner |
| Aucune protection contre la perte de saisie non sauvegardée dans les formulaires | ⏳ À faire |
| Responsive : quasi aucune media query ; grands tableaux utilisables uniquement en scroll horizontal | ⏳ À faire |

## 4. Hygiène du dépôt / documentation

| Constat | Statut |
|---|---|
| 75 502 fichiers suivis pour 114 fichiers réels de projet (pack git : 128 Mo) | ✅ Corrigé — 61 fichiers suivis |
| `README.md` = « TEST » (5 octets) | ✅ Réécrit (remplace aussi `PROJECT_INFO.md` et `mode emploi.txt`) |
| `SECURITY_IMPROVEMENTS.md` : affirmations fausses (« .env jamais commité », « 100 % sécurisé ») | ✅ Supprimé — remplacé par ce rapport |
| Docs d'import redondantes + scripts one-shot avec données nominatives | ✅ Retirés du suivi (récupérables dans l'historique : `git checkout main -- <chemin>`) |
| `.eslintrc.js` : règles stylistiques en `error` qui casseraient le build CRA5 ; `no-console: error` incompatible avec `logger.js` | ✅ Assaini |

---

## Récapitulatif des corrections livrées

- **Dépôt** : `.gitignore` fonctionnel, ~75 400 fichiers retirés du suivi
  (node_modules, build, secrets, données médicales, fichiers accidentels).
- **Sécurité Firestore** : règles réécrites (escalade admin bloquée,
  `userId` immuable, granularité create/update/delete, fonctions nommées).
- **Auth** : `AuthContext` (onAuthStateChanged) + `ProtectedRoute` par rôle +
  route 404 + redirection automatique si déjà connecté.
- **Build** : migration react-scripts 4 → 5, Tailwind réellement compilé,
  hack OpenSSL supprimé, 3 dépendances lourdes inutilisées retirées.
- **Design system** : thème Tailwind + 11 composants UI accessibles ;
  Login et les deux dashboards réécrits ; focus clavier et animation de
  spinner globaux.
- **Bugs fonctionnels** : jours fériés 2025+, `getLatestPlanning`,
  erreurs affichées en bannière de succès, états d'erreur séparés du reset
  de mot de passe.
- **Configuration** : email expéditeur et URL publique externalisés,
  `.env.example` complété, README complet.

## Feuille de route suggérée (prochaines itérations)

1. ~~Remplacer les 16 `alert()/confirm()`~~ ✅ Fait.
2. ~~Adopter `AppHeader`/`LoadingScreen`/`ErrorScreen` sur les écrans restants~~ ✅ Fait.
3. Fusionner `FormulaireDesirata` et `FormulaireDesiderataAdmin` (~430 lignes communes).
4. Introduire date-fns et fiabiliser tous les calculs de dates (UTC/local).
5. ~~Dé-publication automatique des anciens plannings~~ ✅ Fait · valider emails et payloads desiderata.
6. ~~Migration React 18~~ ✅ Fait (vague 2) · react-router v6 / code-splitting : ⏳ à faire.
7. Purge de l'historique git + rotation du mot de passe Gmail (🔴 prioritaire).
8. ~~Garde de navigation sur formulaire modifié non sauvegardé~~ ✅ Fait (vague 2) ;
   passe responsive sur les grands tableaux ; moderniser les modales email/export restantes.

---

## Vague 2 — juillet 2026 : professionnalisation

Deuxième passe (« rendre l'app la plus pro possible »). Vérifié à chaque étape :
**lint propre**, **53 tests unitaires verts**, **build de production compilé** (React 18).

### Sécurité (règles + services)
- **Desiderata verrouillés au profil** : `firestore.rules` exige désormais
  `isMedecin() || isAdmin()` (plus seulement `isSignedIn()`) — un compte
  auto-enregistré via la clé API publique ne peut plus écrire dans la base
  médicale. Propriété/`userId` immuable préservés. 🔴 **à déployer** :
  `npx firebase deploy --only firestore:rules`.
- **email_queue validé côté règles** : `create/update` réservés aux admins avec
  contrôle de type sur `from`/`to` (liste ou chaîne non vide) ; `delete` conservé.
- **authService** : erreur Firebase désormais correctement propagée
  (`auth/email-already-in-use`, `auth/invalid-email`, `auth/weak-password`) —
  le message « email déjà utilisé » s'affiche enfin. Mot de passe temporaire
  généré via `crypto.getRandomValues` (au lieu de `Math.random`).
- **userService** : le log de debug ne journalise plus que l'`uid` (pas le profil).
- En-têtes de sécurité HTTP ajoutés à `firebase.json` (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, cache long `/static`).

### Robustesse
- **ErrorBoundary** applicatif (`src/components/ErrorBoundary.js`) autour de
  toute l'app → écran de repli au lieu d'une page blanche en cas de crash.
- **Migration React 18** : `ReactDOM.render` → `createRoot` (`src/index.js`).
- **Garde de saisie non sauvegardée** : hook `useUnsavedChangesWarning`
  (avertissement de fermeture d'onglet) + `<Prompt>` de navigation dans les deux
  formulaires desiderata + confirmation avant de **changer de médecin** (admin)
  ou de **quitter le planning en cours d'édition**.
- Bug corrigé : `App.js` passait `isAdmin` que `GestionPlanning` lisait sous le
  nom `_isAdmin` (prop morte) — prop supprimée.
- Gardes d'annulation (`cancelled`) ajoutées aux `useEffect` de chargement
  (formulaires, planning, visualisation) — évite les mises à jour d'état après
  démontage sous React 18 StrictMode.

### Accessibilité (WCAG 2.1 AA)
- **Noms accessibles** ajoutés à tous les `<select>` de disponibilité/médecin,
  aux champs de date (labels associés) et aux champs de recherche (`aria-label`).
- **Modale** : piège de focus (Tab/Maj+Tab) + restauration du focus sur
  l'élément déclencheur à la fermeture (`src/components/ui/Modal.js`).
- **Combobox** `MedecinSearchSelect` rendu conforme ARIA + navigation clavier
  (flèches/Entrée/Échap).
- **Contraste** : texte d'information passé de `ink-400` (~2.6:1, échec) à
  `ink-500` (≥4.5:1) sur l'ensemble des écrans. Emoji décoratifs `aria-hidden`.

### Qualité / outillage
- **53 tests unitaires** (jours fériés / algorithme de Meeus, générateurs de
  planning, utilitaires) — `src/utils/__tests__/`, aucun test auparavant.
- **CI GitHub Actions** (`.github/workflows/ci.yml`) : lint + tests + build à
  chaque push/PR.
- **5 dépendances inutilisées retirées** (`clsx`, `class-variance-authority`,
  3× `@radix-ui/*`).
- Constante `creneaux` centralisée pour la couche d'affichage
  (`src/constants/creneaux.js`) — formulaires + visualisation.
- `public/index.html` nettoyé (suppression de ~90 lignes de polyfills manuels
  inutiles avec CRA 5) ; **favicon SVG** créé + `manifest.json` corrigé
  (références `favicon.ico`/`logo192.png` inexistantes supprimées).

### Reste à faire (recommandé, non inclus dans la passe sûre)
- 🔴 **Déployer les règles Firestore** (`firebase deploy --only firestore:rules`) — ✅ déployées le 17/07/2026.
- 🔴 Purge de l'historique git + rotation du mot de passe Gmail.
- Effacement définitif d'un compte de connexion (email) : à faire à la demande
  via la console Firebase → Authentication, ou `scripts/supprimer-compte-auth.js`
  (l'accès, lui, est déjà révoqué à la suppression dans l'app — voir vague 5).
- Création d'utilisateur atomique (aujourd'hui non transactionnel côté client).
- ~~Migration react-router v6 + code-splitting~~ ✅ Fait (vague 3) : router v6
  (createBrowserRouter, useNavigate, useBlocker), lazy-loading par route et
  imports dynamiques exceljs/jspdf/ics → **bundle initial 595 kB → 190 kB gzip**.
- Fiabilisation complète des dates (date-fns / UTC).

---

## Vague 4 — juillet 2026 : refactors de fond

Vérifié : **lint OK, 53 tests, build OK, smoke test navigation headless 4/4**.

- ~~**Fusion des 2 formulaires desiderata**~~ ✅ : logique + présentation
  factorisées dans `src/components/desiderata/` (`useDesiderataForm`,
  `DesiderataPreferences`, `DesiderataTable`) ; les deux écrans deviennent des
  coquilles fines (comportements préservés).
- ~~**Réécriture de `GenerateurTrimestre`**~~ ✅ : passage complet au design
  system (43 styles inline supprimés), responsive natif (fin des
  `window.innerWidth` au render), emojis → icônes accessibles.
- ~~**Génération de planning en Web Worker**~~ ✅ : cœur de calcul pur extrait
  dans `planningCore.js` (sans Firebase, dédupliqué), exécuté dans
  `src/workers/planning.worker.js` via `runPlanningWorker` (repli synchrone) →
  l'UI ne gèle plus pendant la génération. Signatures des générateurs
  inchangées.
- ~~**Suppression du compte Auth à la révocation**~~ ✅ (approche adaptée au
  plan gratuit) : la Cloud Function a d'abord été implémentée, mais son
  déploiement exige le plan Blaze — écarté. La révocation d'accès est de toute
  façon déjà assurée par les règles Firestore durcies (un compte sans document
  `users` n'a plus aucun rôle → tout accès refusé). Voir vague 5.

---

## Vague 5 — juillet 2026 : révocation sans Cloud Function (plan gratuit)

Le projet reste sur le plan **Spark** (gratuit) : la Cloud Function de révocation
est écartée (son déploiement exigerait le plan Blaze).

- L'**accès est déjà révoqué** dès la suppression d'un utilisateur dans l'app :
  le document `users/{uid}` est effacé et les règles Firestore refusent tout à un
  compte sans rôle (vérifié par le test des règles, cas « compte sans rôle → DENY »).
- `userService.deleteUser` : suppression directe du document Firestore (retrait de
  tout le câblage Cloud Function : export `functions`, bloc `firebase.json`, dossier
  `functions/`).
- La modale de suppression (GestionUtilisateurs) indique désormais que l'accès est
  révoqué immédiatement et comment supprimer *définitivement* le compte de connexion.
- `scripts/supprimer-compte-auth.js` : script d'administration **local** (SDK Admin,
  gratuit sur Spark) pour effacer un compte Auth (réutilisation d'email / RGPD).
  Alternative sans script : console Firebase → Authentication.

Vérifié : **lint OK, 53 tests, build OK**.
