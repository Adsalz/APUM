# 📋 Planning APUM - Documentation du Projet

## 🎯 Vue d'ensemble

**Planning APUM** est une application web de gestion de planning médical développée en React qui permet aux médecins de saisir leurs desiderata (disponibilités/souhaits) et aux administrateurs de gérer et générer des plannings automatiquement.

## 🏗️ Architecture Technique

### **Stack Technologique**
- **Frontend** : React 17.0.2 avec React Router 5.2.0
- **Backend** : Firebase (Firestore + Authentication)
- **Styling** : TailwindCSS 3.4.14 + styles inline
- **PDF Generation** : jsPDF, pdf-lib, pdfmake
- **Icons** : Lucide React + Radix UI Icons
- **Email** : Firebase Extension (Trigger Email)
- **Hosting** : Firebase Hosting

### **Structure des Données Firebase**

#### Collections Firestore
1. **`users`** - Profils utilisateurs
   - `email`, `nom`, `prenom`, `role` (admin/medecin)
   - Règles : utilisateurs peuvent lire/écrire leur profil, admins accès total

2. **`desiderata`** - Souhaits de planning des médecins
   - `userId`, `startDate`, `endDate`, `desiderata`, `nombreGardesSouhaitees`, etc.
   - Règles : médecins accès à leurs données, admins accès total

3. **`planning`** - Plannings générés et publiés
   - `startDate`, `endDate`, `assignments`, `publishedAt`
   - Règles : admins écriture, médecins lecture seule

4. **`email_queue`** - Queue d'emails pour relances
   - `to`, `message`, `metadata`, `createdAt`
   - Règles : admins uniquement

## 👥 Gestion des Utilisateurs

### **Rôles**
- **Admin** : Gestion complète (utilisateurs, planning, périodes)
- **Médecin** : Saisie desiderata + consultation planning

### **Authentification**
- Firebase Authentication avec email/password
- Création d'utilisateurs via interface admin
- Réinitialisation mot de passe intégrée
- Vérification des rôles côté client et serveur

## 🗓️ Fonctionnalités Principales

### **Pour les Médecins**
- 🔐 Connexion sécurisée
- 📝 Saisie des desiderata de planning
- 👀 Consultation du planning publié
- 🔑 Changement de mot de passe

### **Pour les Administrateurs**
- 👥 Gestion des utilisateurs (CRUD)
- 📅 Définition des périodes de saisie
- 🎯 Génération automatique de planning
- 📊 Suivi du statut des desiderata
- 📧 Envoi de relances par email
- 📋 Publication des plannings

## 📁 Structure du Code

```
src/
├── components/
│   ├── Login.js                    # Authentification
│   ├── DashboardAdmin.js          # Tableau de bord admin
│   ├── DashboardMedecin.js        # Tableau de bord médecin
│   ├── FormulaireDesirata.js      # Saisie des souhaits
│   ├── GestionUtilisateurs.js     # Gestion utilisateurs
│   ├── GestionDesiderata.js       # Suivi desiderata
│   ├── PlanningVisualisation.js   # Affichage planning
│   ├── RelanceEmailModal.js       # Envoi relances
│   ├── TestEmailModal.js          # Test emails
│   └── planning/
│       ├── GestionPlanning.js     # Interface planning admin
│       ├── PlanningTable.js       # Tableau planning
│       ├── PlanningFilters.js     # Filtres
│       └── modals/                # Modales diverses
├── services/
│   ├── authService.js             # Authentification Firebase
│   ├── userService.js             # Gestion utilisateurs
│   ├── planningService.js         # Logique planning/desiderata
│   └── emailService.js            # Envoi d'emails
└── utils/
    ├── planningGenerator.js       # Algorithme de génération
    └── planningUtils.js           # Utilitaires planning
```

## 🔧 Configuration

### **Firebase**
- Project ID: `apum-8cfa4`
- Hosting URL: `https://apum-8cfa4.web.app`
- API Key intégrée dans `src/firebase.js`

### **Extension Email**
- Trigger Email extension configurée
- SMTP Gmail : `adriensalles@gmail.com`
- Collection : `email_queue`

### **Scripts NPM**
```bash
npm start          # Développement (legacy OpenSSL)
npm run build      # Build production (legacy OpenSSL)
npm test           # Tests Jest
```

## 📋 Flux de Travail Typique

1. **Admin définit une période de saisie** (dates début/fin)
2. **Médecins saisissent leurs desiderata** via formulaire
3. **Admin consulte le statut** et envoie des relances si nécessaire
4. **Admin génère le planning** automatiquement
5. **Admin publie le planning** pour consultation

## 🔍 Points d'Attention

### **Sécurité**
- Clé API Firebase exposée côté client (normal pour Firebase)
- Mot de passe SMTP stocké en configuration (à sécuriser)
- Règles Firestore bien définies par rôle

### **Performance**
- React 17 (ancienne version)
- Utilisation d'OpenSSL legacy (dépendances anciennes)
- Pas de cache côté client pour les données

### **Maintenance**
- Dépendances à jour pour TailwindCSS/Lucide
- React Scripts 4.0.3 (version ancienne)
- Gestion d'erreurs basique

## 🚀 Déploiement

L'application est configurée pour Firebase Hosting avec :
- Build automatique vers `/build`
- Redirection SPA vers `index.html`
- Règles Firestore déployées via `firestore.rules`

## 📝 Notes de Développement

- Le projet utilise des styles inline plutôt que des classes CSS
- Gestion d'état locale (pas de Redux/Context global)
- Interface responsive adaptée aux écrans bureau/mobile
- Formulaires contrôlés React avec validation basique

---

*Dernière mise à jour : Septembre 2024*
*Documentation générée automatiquement par analyse du code*