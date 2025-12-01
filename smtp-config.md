# Configuration SMTP pour Firebase

## Option 1 : Gmail (Recommandé pour les tests)

### Prérequis Gmail :
1. Activez l'authentification à 2 facteurs sur votre compte Gmail
2. Générez un "Mot de passe d'application" :
   - Allez dans Paramètres Google > Sécurité > Authentification à 2 facteurs
   - Générez un mot de passe d'application pour "Mail"

### Configuration Firebase Extension :
- **SMTP Connection URI** : `smtps://username:password@smtp.gmail.com:465`
  - Remplacez `username` par votre email Gmail
  - Remplacez `password` par le mot de passe d'application généré

### Exemple :
```
smtps://votre-email@gmail.com:abcd-efgh-ijkl-mnop@smtp.gmail.com:465
```

## Option 2 : SendGrid (Recommandé pour la production)

### Prérequis SendGrid :
1. Créez un compte sur https://sendgrid.com
2. Générez une clé API
3. Vérifiez votre domaine d'expédition

### Configuration Firebase Extension :
- **SMTP Connection URI** : `smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465`

## Option 3 : Mailgun

### Configuration Firebase Extension :
- **SMTP Connection URI** : `smtps://username:password@smtp.eu.mailgun.org:465`

## Variables d'extension à configurer :

1. **SMTP_CONNECTION_URI** : L'URI de connexion SMTP
2. **DEFAULT_FROM** : Adresse email d'expédition (ex: noreply@apum.com)
3. **DEFAULT_REPLY_TO** : Adresse de réponse (optionnel)
4. **USERS_COLLECTION** : users (optionnel)
5. **TEMPLATES_COLLECTION** : email_templates (optionnel)