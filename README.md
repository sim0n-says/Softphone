# 📞 Sim0n-Says Comm - Softphone Cyberpunk

Un softphone moderne avec interface cyberpunk, intégrant Twilio pour les appels VoIP et Tailwind CSS pour un design responsive.

## ✨ Fonctionnalités

### 🎯 Interface Principale
- **Terminal de communication** avec pavé numérique cyberpunk
- **Design responsive** optimisé mobile/desktop
- **Thème cyberpunk** avec animations et effets visuels
- **Notifications en temps réel** avec système moderne

### 📞 Fonctionnalités d'Appel
- **Appels sortants** via Twilio
- **Appels entrants** avec modal d'acceptation/rejet
- **Historique des appels** avec statistiques
- **Contrôles audio** (mute, hold, speaker)
- **Sons DTMF** et feedback tactile

### 📖 Carnet d'Adresses
- **Gestion des contacts** avec recherche
- **Liste d'appels** avec navigation
- **Export des données** en format texte
- **Interface à onglets** responsive

### 🔧 Configuration
- **Paramètres Twilio** configurables
- **Appareils audio** sélectionnables
- **Interface d'administration** intégrée

## 🚀 Installation

### Prérequis
- Node.js 16+
- Compte Twilio actif
- Navigateur moderne avec support WebRTC

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd Softphone_v2

# Installer les dépendances
npm install

# Configurer l'environnement
cp env.example .env
# Éditer .env avec vos credentials Twilio

# Construire les styles CSS
npm run build:css

# Démarrer le serveur
npm start
```

## ⚙️ Configuration

### Variables d'Environnement (.env)
```env
# Configuration Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_PHONE_NUMBER=your_twilio_number
TWILIO_TWIML_APP_SID=your_twiml_app_sid
TWILIO_CLIENT_IDENTITY=softphone-user

# Configuration du serveur
PORT=3000
NODE_ENV=development
```

### Configuration Twilio
1. Créer une TwiML App dans la console Twilio
2. Configurer l'URL webhook vers `http://your-domain/handle_calls`
3. Assigner la TwiML App à votre numéro Twilio

## 🎨 Technologies

### Frontend
- **Tailwind CSS** - Framework CSS utilitaire
- **JavaScript ES6+** - Logique client moderne
- **Socket.IO** - Communication temps réel
- **Twilio SDK** - Intégration VoIP

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Socket.IO** - WebSocket server
- **Twilio** - API VoIP

### Build Tools
- **PostCSS** - Traitement CSS
- **Autoprefixer** - Compatibilité navigateurs
- **Tailwind CLI** - Génération CSS

## 📁 Structure du Projet

```
Softphone_v2/
├── public/                    # Fichiers statiques
│   ├── index.html            # Interface principale
│   ├── app-tailwind.js       # Logique principale
│   ├── phonebook-tailwind.js # Gestion carnet d'adresses
│   ├── components/
│   │   └── notification.js   # Système de notifications
│   ├── tailwind.css          # Configuration Tailwind
│   ├── cyberpunk-tailwind.css # Styles cyberpunk
│   └── tailwind-built.css    # CSS généré
├── server.js                 # Serveur Express
├── tailwind.config.js        # Configuration Tailwind
├── postcss.config.js         # Configuration PostCSS
├── package.json              # Dépendances
└── .env                      # Variables d'environnement
```

## 🎮 Utilisation

### Interface Principale
1. **Composer un numéro** avec le pavé numérique
2. **Cliquer sur CONNECT** pour passer l'appel
3. **Utiliser les contrôles audio** pendant l'appel
4. **Cliquer sur HANGUP** pour terminer

### Carnet d'Adresses
1. **Onglet CARNET** : Rechercher et appeler des contacts
2. **Onglet LISTE** : Gérer une liste d'appels
3. **Onglet HISTO** : Consulter l'historique des appels

### Appels Entrants
- **Modal d'appel** s'affiche automatiquement
- **Cliquer ANSWER** pour accepter
- **Cliquer REJECT** pour rejeter

## 🔧 Scripts NPM

```bash
# Développement
npm run dev          # Démarrer avec nodemon
npm run dev:full     # Démarrer avec build CSS automatique
npm run build:css    # Construire les styles CSS
npm run watch:css    # Surveiller les changements CSS

# Production
npm start            # Démarrer le serveur
npm run build        # Construire pour production
```

## 🌐 Déploiement

### Local avec ngrok
```bash
# Installer ngrok
npm install -g ngrok

# Démarrer le serveur
npm start

# Exposer le serveur
ngrok http 3000

# Configurer Twilio avec l'URL ngrok
```

### Docker
```bash
# Construire l'image
docker build -t softphone .

# Démarrer le conteneur
docker run -p 3000:3000 --env-file .env softphone
```

## 🐛 Dépannage

### Problèmes Audio
- Vérifier les permissions microphone
- Cliquer sur le pavé numérique pour activer l'audio
- Vérifier la sélection des appareils audio

### Problèmes Twilio
- Vérifier les credentials dans `.env`
- Configurer correctement la TwiML App
- Vérifier les webhooks Twilio

### Problèmes CSS
- Reconstruire les styles : `npm run build:css`
- Vérifier la configuration Tailwind
- Nettoyer le cache navigateur

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation Twilio
- Vérifier les logs du serveur 