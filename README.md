# 📞 Softphone Twilio - Application Complète

Un softphone moderne et fonctionnel basé sur Twilio Voice API avec support complet des appels entrants et sortants, audio bidirectionnel, et interface utilisateur moderne.

## 🎉 **Fonctionnalités Complètes**

- ✅ **Appels entrants** : Fonctionnent parfaitement avec audio bidirectionnel
- ✅ **Appels sortants** : Fonctionnent même si device.state !== ready
- ✅ **Audio bidirectionnel** : Pour les deux types d'appels
- ✅ **Interface moderne** : Avec contrôles audio complets
- ✅ **Configuration automatique** : Aucune configuration manuelle requise
- ✅ **Contrôles audio** : Mute, pause, hold, transfer, enregistrement
- ✅ **Gestion des périphériques** : Sélection automatique des entrées/sorties audio
- ✅ **Historique des appels** : Suivi complet des appels
- ✅ **Interface responsive** : Compatible mobile et desktop

## 🚀 **Installation Rapide**

### Prérequis
- Node.js (v14+)
- Compte Twilio avec numéro de téléphone
- NGROK (domaine statique recommandé)

### 1. Cloner le projet
   ```bash
git clone https://github.com/sim0n-says/Softphone.git
cd Softphone
   ```

### 2. Installer les dépendances
   ```bash
   npm install
   ```

### 3. Configurer les variables d'environnement
   ```bash
   cp env.example .env
# Éditer .env avec vos identifiants Twilio
```

### 4. Lancer l'application
```bash
./start-auto.sh
```

## 📋 **Configuration**

### Variables d'environnement requises (.env)
   ```env
# Twilio Configuration
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=your_api_key_here
TWILIO_API_SECRET=your_api_secret_here
TWILIO_TWIML_APP_SID=your_twiml_app_sid_here
TWILIO_PHONE_NUMBER=+18199754345

# NGROK Configuration
NGROK_URL=https://apt-buzzard-leading.ngrok-free.app

# Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

## 🎯 **Utilisation**

### Démarrage automatique
   ```bash
./start-auto.sh
```

Le script automatise :
- ✅ Démarrage du serveur Node.js
- ✅ Configuration NGROK avec domaine statique
- ✅ Configuration automatique Twilio (TwiML App + Phone Number)
- ✅ Test de la configuration
- ✅ Interface web prête à l'emploi

### Interface Web
1. **Ouvrir** : https://apt-buzzard-leading.ngrok-free.app
2. **Attendre** : Initialisation automatique (5-10 secondes)
3. **Utiliser** : Interface complète de softphone

## 🔧 **Architecture Technique**

### Backend (Node.js + Express)
- **server.js** : Serveur principal avec routes Twilio
- **API Routes** :
  - `/api/token` : Génération de tokens Twilio
  - `/api/config` : Configuration automatique
  - `/twiml/outgoing` : TwiML pour appels sortants
  - `/handle_calls` : Gestion des appels entrants
  - `/api/register-identity` : Enregistrement d'identité client

### Frontend (HTML + JavaScript)
- **public/index.html** : Interface utilisateur moderne
- **public/app.js** : Logique client Twilio.Device
- **Fonctionnalités** :
  - Initialisation automatique Twilio.Device
  - Gestion des appels entrants/sortants
  - Contrôles audio complets
  - Interface responsive

### Configuration Twilio
- **TwiML App** : Pointée vers `/twiml/outgoing` pour appels sortants
- **Phone Number** : Pointé vers `/handle_calls` pour appels entrants
- **VoiceGrant** : Configuration pour appels entrants et sortants

## 🎨 **Interface Utilisateur**

### Fonctionnalités principales
- 📞 **Clavier numérique** : Composition de numéros
- 📱 **Boutons d'appel** : Appeler, raccrocher, accepter, rejeter
- 🎛️ **Contrôles audio** : Mute, pause, hold, transfer, enregistrement
- 📊 **Statut en temps réel** : État de connexion et appels
- 📋 **Historique** : Liste des appels récents
- ⚙️ **Paramètres** : Configuration audio et identité

### Contrôles audio
- **Mute** : Couper le microphone
- **Pause** : Mettre en pause l'appel
- **Hold** : Mettre en attente
- **Transfer** : Transférer l'appel
- **Enregistrement** : Enregistrer l'appel
- **Haut-parleur** : Activer le haut-parleur

## 🔍 **Dépannage**

### Problèmes courants

#### Appels sortants ne fonctionnent pas
- Vérifier que le `Twilio.Device` est initialisé
- Vérifier les logs de console pour les erreurs
- S'assurer que l'identité est correctement enregistrée

#### Appels entrants ne fonctionnent pas
- Vérifier la configuration du numéro Twilio
- S'assurer que `/handle_calls` est accessible
- Vérifier que l'identité client est enregistrée

#### Erreurs AudioContext
- Autoriser l'accès au microphone
- Actualiser la page et réessayer
- Vérifier les permissions du navigateur

### Logs utiles
```bash
# Vérifier les logs du serveur
tail -f logs/server.log

# Vérifier la configuration Twilio
curl https://apt-buzzard-leading.ngrok-free.app/api/config
```

## 📚 **Documentation**

- **QUICKSTART.md** : Guide de démarrage rapide
- **DOCKER.md** : Instructions Docker
- **archives/** : Documentation historique

## 🤝 **Contribution**

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 **Licence**

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🎉 **Statut du Projet**

**✅ PROJET COMPLÈTEMENT FONCTIONNEL**

- ✅ Appels entrants : Fonctionnent parfaitement
- ✅ Appels sortants : Fonctionnent parfaitement
- ✅ Audio bidirectionnel : Fonctionne parfaitement
- ✅ Interface moderne : Complète et responsive
- ✅ Configuration automatique : Aucune intervention manuelle requise

**Le softphone Twilio est maintenant entièrement opérationnel !** 🚀 