# 📞 Softphone Twilio - Application Web Complète

Un softphone moderne et complet basé sur Twilio Voice API avec support bidirectionnel pour les appels entrants et sortants.

## 🚀 Fonctionnalités

### ✅ **Appels Bidirectionnels**
- **Appels sortants** : Audio bidirectionnel via `Twilio.Device`
- **Appels entrants** : Audio bidirectionnel via `dial.client()`
- **Interface moderne** : Design responsive et intuitif

### 🎛️ **Contrôles Audio Avancés**
- **Mute/Unmute** : Contrôle du microphone
- **Speaker** : Basculement haut-parleur/casque
- **Transfer** : Transfert d'appel
- **Enregistrement** : Enregistrement automatique des appels
- **Pause/Reprendre** : Contrôle de l'appel

### 🔧 **Configuration Automatique**
- **Identité dynamique** : Génération automatique d'identité unique
- **NGROK intégré** : Tunnel automatique avec domaine statique
- **Twilio CLI** : Configuration automatique des webhooks
- **Démarrage unifié** : Script `start-auto.sh` pour tout configurer

## 📋 Prérequis

### **Compte Twilio**
- Compte Twilio actif
- Numéro de téléphone Twilio
- API Key et Secret
- TwiML App configurée

### **Outils Requis**
- Node.js (v14+)
- npm ou yarn
- Twilio CLI
- NGROK (domaine statique recommandé)

## 🛠️ Installation

### **1. Cloner le Repository**
```bash
git clone https://github.com/sim0n-says/Softphone.git
cd Softphone
```

### **2. Installer les Dépendances**
```bash
npm install
```

### **3. Configuration Twilio CLI**
```bash
# Installer Twilio CLI globalement
npm install -g twilio-cli

# Se connecter à votre compte Twilio
twilio login
```

### **4. Configuration des Variables d'Environnement**
```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer avec vos informations Twilio
nano .env
```

**Variables requises dans `.env` :**
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=your_twiml_app_sid
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# NGROK Configuration (optionnel)
NGROK_URL=https://your-static-domain.ngrok-free.app
```

## 🚀 Démarrage Rapide

### **Démarrage Automatique (Recommandé)**
```bash
# Configuration et démarrage automatiques
./start-auto.sh
```

Le script `start-auto.sh` :
- ✅ Démarre le serveur Node.js
- ✅ Configure NGROK avec domaine statique
- ✅ Met à jour la TwiML App pour les appels sortants
- ✅ Configure le numéro de téléphone pour les appels entrants
- ✅ Lance l'interface web

### **Démarrage Manuel**
```bash
# Démarrer le serveur
npm start

# Dans un autre terminal, configurer NGROK
ngrok http 3000

# Configurer Twilio manuellement
twilio api:core:applications:update \
  --sid="YOUR_TWIML_APP_SID" \
  --voice-url="https://your-ngrok-url.ngrok-free.app/twiml/outgoing" \
  --voice-method=POST

twilio api:core:incoming-phone-numbers:update \
  --sid="YOUR_PHONE_SID" \
  --voice-url="https://your-ngrok-url.ngrok-free.app/handle_calls" \
  --voice-method=POST
```

## 🌐 Accès à l'Application

### **URLs d'Accès**
- **Local** : http://localhost:3000
- **Public** : https://your-ngrok-domain.ngrok-free.app

### **Interface Utilisateur**
1. **Page d'accueil** : Configuration automatique de l'identité
2. **Composeur** : Saisie du numéro de destination
3. **Contrôles d'appel** : Mute, Speaker, Transfer, Enregistrement
4. **Modal d'appel entrant** : Acceptation/rejet des appels entrants

## 📞 Utilisation

### **Appels Sortants**
1. Saisir le numéro de destination
2. Cliquer sur "Appeler"
3. L'appel se connecte automatiquement
4. Utiliser les contrôles audio selon besoin

### **Appels Entrants**
1. Un appel arrive sur le numéro Twilio
2. Modal d'appel entrant s'affiche
3. Cliquer "Accepter" pour répondre
4. L'appel se connecte avec audio bidirectionnel

### **Contrôles Audio**
- **🎤 Mute** : Couper le microphone
- **🔊 Speaker** : Basculement haut-parleur
- **📞 Transfer** : Transfert vers un autre numéro
- **⏺️ Record** : Enregistrement de l'appel
- **⏸️ Pause** : Mettre en pause l'appel

## 🔧 Architecture Technique

### **Backend (Node.js/Express)**
```
server.js
├── /api/token          # Génération de tokens Twilio
├── /api/register-identity # Enregistrement identité client
├── /twiml/outgoing     # TwiML pour appels sortants
├── /handle_calls       # TwiML pour appels entrants
└── /api/config         # Configuration client
```

### **Frontend (JavaScript)**
```
public/
├── index.html          # Interface utilisateur
├── app.js             # Logique client Twilio
└── styles.css         # Styles CSS
```

### **Configuration Twilio**
- **TwiML App** : `/twiml/outgoing` (appels sortants)
- **Numéro de Téléphone** : `/handle_calls` (appels entrants)

## 🧪 Tests

### **Test des Appels Sortants**
```bash
curl -s -X POST http://localhost:3000/twiml/outgoing \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=%2B1234567890&From=%2B0987654321&CallSid=test123"
```

### **Test des Appels Entrants**
```bash
curl -s -X POST http://localhost:3000/handle_calls \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=%2B0987654321&From=%2B1234567890&Direction=inbound&CallSid=test123"
```

## 📁 Structure du Projet

```
Softphone/
├── server.js                    # Serveur Express principal
├── package.json                 # Dépendances Node.js
├── start-auto.sh               # Script de démarrage automatique
├── env.example                 # Exemple de variables d'environnement
├── .gitignore                  # Fichiers à ignorer par Git
├── README.md                   # Documentation principale
├── public/                     # Fichiers statiques
│   ├── index.html             # Interface utilisateur
│   ├── app.js                 # Logique client
│   └── styles.css             # Styles CSS
└── archives/                   # Documentation archivée
    ├── CONFIGURATION-*.md      # Guides de configuration
    └── TEST-*.md              # Tests et validations
```

## 🔒 Sécurité

### **Variables d'Environnement**
- ✅ API Keys stockées dans `.env`
- ✅ Fichier `.env` exclu de Git
- ✅ Tokens Twilio générés dynamiquement

### **Content Security Policy**
- ✅ CSP configuré pour Twilio SDK
- ✅ Scripts externes autorisés
- ✅ Ressources sécurisées

## 🐛 Dépannage

### **Problèmes Courants**

#### **Erreur CSP**
```
Content-Security-Policy: Les paramètres de la page ont empêché l'exécution d'un script
```
**Solution** : Vérifier la configuration CSP dans `index.html`

#### **Erreur AudioContext**
```
Un AudioContext n'a pas pu démarrer automatiquement
```
**Solution** : L'initialisation est différée jusqu'à l'interaction utilisateur

#### **Erreur Token 31002**
```
Token does not allow outgoing calls
```
**Solution** : Vérifier la configuration `VoiceGrant` dans `/api/token`

#### **Erreur NGROK**
```
ERR_NGROK_3200 The endpoint is offline
```
**Solution** : Redémarrer NGROK ou vérifier le domaine statique

### **Logs de Débogage**
```bash
# Activer les logs détaillés
DEBUG=* npm start

# Vérifier les logs Twilio
twilio api:core:calls:list
```

## 📚 Documentation Supplémentaire

- **Configuration TwiML** : `CONFIGURATION-TWIML-APPELS-ENTRANTS.md`
- **Configuration Finale** : `CONFIGURATION-FINALE-COMPLETE.md`
- **Tests et Validation** : `archives/TEST-*.md`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Auteur

**Simon Says** - [GitHub](https://github.com/sim0n-says)

## 🙏 Remerciements

- **Twilio** pour l'API Voice
- **NGROK** pour le tunneling
- **Express.js** pour le framework backend
- **Communauté open source** pour les contributions

---

**🎉 Softphone Twilio - Prêt pour la production !** 🚀 