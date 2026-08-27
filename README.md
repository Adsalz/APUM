# Planning APUM

Application web de gestion des plannings de garde des médecins de l'APUM :
les médecins saisissent leurs **desiderata** (disponibilités et souhaits),
les administrateurs génèrent, ajustent et publient les **plannings**.

**Production** : https://apum-8cfa4.web.app

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 17 · React Router 5 · TailwindCSS 3 |
| Backend | Firebase (Firestore + Authentication) |
| Emails | Extension Firebase « Trigger Email » (collection `email_queue`) |
| Exports | ExcelJS (Excel) · jsPDF (PDF) · ics (calendrier) |
| Hébergement | Firebase Hosting |
| Build | react-scripts 5 (Create React App) |

## Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# puis renseigner les clés Firebase et les variables email

# 3. Lancer en développement
npm start

# 4. Construire pour la production
npm run build

# 5. Déployer (hosting + règles Firestore)
npx firebase deploy
```

> ⚠️ Après toute modification de `firestore.rules`, déployer les règles :
> `npx firebase deploy --only firestore:rules`

## Variables d'environnement

Voir `.env.example`. Les fichiers `.env` et `.env.local` ne sont **jamais**
versionnés.

| Variable | Rôle |
|---|---|
| `REACT_APP_FIREBASE_*` | Configuration du projet Firebase |
| `REACT_APP_EMAIL_FROM` | Adresse expéditeur des emails de relance |
| `REACT_APP_PUBLIC_URL` | URL publique utilisée dans les emails |

## Architecture

```
src/
├── App.js                     # Routing + routes protégées par rôle
├── contexts/
│   └── AuthContext.js         # Session Firebase + profil + rôle partagés
├── components/
│   ├── ProtectedRoute.js      # Garde de route (auth + rôle)
│   ├── ui/                    # Design system (Button, Card, Modal, Alert…)
│   ├── Login.js               # Connexion + réinitialisation mot de passe
│   ├── DashboardAdmin.js      # Tableau de bord administrateur
│   ├── AccueilMedecin.js      # Aiguillage du médecin (saisie ou planning)
│   ├── FormulaireDesirata.js  # Saisie des desiderata (médecin)
│   ├── FormulaireDesiderataAdmin.js # Saisie pour un médecin (admin)
│   ├── GestionUtilisateurs.js # CRUD utilisateurs (admin)
│   ├── GestionDesiderata.js   # Suivi de saisie + relances (admin)
│   ├── GestionPeriodeSaisie.js# Période de saisie (admin)
│   ├── PlanningVisualisation.js # Consultation du planning publié
│   └── planning/              # Génération/édition du planning (admin)
├── services/                  # Accès Firestore (auth, users, planning, email, export)
└── utils/                     # Générateurs de planning, jours fériés, logger
```

### Collections Firestore

| Collection | Contenu | Accès |
|---|---|---|
| `users` | Profils (`nom`, `prenom`, `email`, `role`: admin \| medecin) | lecture : authentifiés · écriture : admin (le rôle n'est **pas** modifiable par son propriétaire) |
| `desiderata` | Souhaits par médecin (`userId`, période, créneaux…) | propriétaire + admin (`userId` immuable) |
| `planning` | Plannings générés/publiés + doc `periode_saisie` | lecture : authentifiés · écriture : admin |
| `email_queue` | File d'envoi des emails (extension Trigger Email) | admin |

## Rôles

- **Médecin** : saisie des desiderata, consultation du planning publié,
  changement de mot de passe.
- **Admin** : gestion des utilisateurs, période de saisie, génération
  (2 algorithmes : standard et par priorité), publication, relances email,
  exports Excel.

## Flux de travail

1. L'admin définit une **période de saisie**
2. Les médecins saisissent leurs **desiderata**
3. L'admin suit l'avancement et envoie des **relances**
4. L'admin **génère** le planning (algorithme standard ou par priorité)
5. L'admin ajuste puis **publie** le planning

## Qualité

```bash
npm run lint       # ESLint
npm run build      # Vérification de compilation
```

Voir [`AUDIT.md`](./AUDIT.md) pour l'état des lieux qualité/sécurité,
les corrections apportées et les chantiers restants.
