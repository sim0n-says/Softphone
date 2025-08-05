# 📱 Configuration des Messages Twilio

Ce document explique comment configurer et utiliser les fonctionnalités SMS et MMS du Softphone Twilio.

## 🎯 Vue d'ensemble

Le Softphone Twilio supporte :
- ✅ **SMS entrants et sortants**
- ✅ **MMS entrants et sortants**
- ✅ **Interface unifiée** pour tous les messages
- ✅ **Webhooks automatiques** pour la réception
- ✅ **Logs locaux** pour l'historique
- ✅ **Notifications en temps réel**

## 🔧 Configuration Automatique

### 1. Démarrage avec Configuration Automatique

```bash
./start-auto.sh
```

Ce script configure automatiquement :
- 📞 Webhook pour les appels entrants
- 📱 Webhook pour les SMS entrants
- 📷 Webhook pour les MMS entrants
- 📊 Webhook pour les statuts de messages

### 2. Configuration Manuelle (si nécessaire)

```bash
# Configuration des webhooks
node configure-webhooks.js [ngrok-url]

# Test de la configuration
node test-messages.js

# Test rapide
./test-messages-config.sh
```

## 📋 Webhooks Configurés

### Endpoints Principaux

| Type | Endpoint | Description |
|------|----------|-------------|
| 📱 SMS | `/handle_sms` | Réception des SMS entrants |
| 📷 MMS | `/handle_mms` | Réception des MMS entrants |
| 📊 Statut | `/message-status` | Mises à jour de statut |
| 📞 Appels | `/handle_calls` | Appels entrants |

### URLs Complètes

```
https://apt-buzzard-leading.ngrok-free.app/handle_sms
https://apt-buzzard-leading.ngrok-free.app/handle_mms
https://apt-buzzard-leading.ngrok-free.app/message-status
https://apt-buzzard-leading.ngrok-free.app/handle_calls
```

## 🚀 API Endpoints

### Envoi de SMS

```bash
POST /api/send-sms
Content-Type: application/json

{
  "to": "+1234567890",
  "body": "Message texte",
  "from": "+18199754345"
}
```

### Envoi de MMS

```bash
POST /api/send-mms
Content-Type: multipart/form-data

{
  "to": "+1234567890",
  "body": "Message avec média",
  "media": [fichier]
}
```

### Récupération des Logs

```bash
GET /api/sms-logs    # Logs SMS
GET /api/mms-logs    # Logs MMS
GET /api/config      # Configuration
```

## 📱 Interface Utilisateur

### Panneau Messages Unifié

L'interface propose un panneau unifié pour tous les types de messages :

#### 🎯 Fonctionnalités
- **Conversations organisées** par numéro de téléphone
- **Recherche globale** dans tous les messages
- **Réponse directe** dans l'interface
- **Indicateurs visuels** pour les messages non lus
- **Actions rapides** : appel, suppression, réponse

#### 🔘 Boutons d'Action
- **📱 SMS** : Composer un nouveau SMS
- **📷 MMS** : Composer un nouveau MMS
- **🔄 SYNC** : Actualiser les messages
- **🗑️ CLEAR** : Effacer tous les messages

## 📊 Logs et Stockage

### Structure des Fichiers

```
data/
├── sms-logs.json     # Historique des SMS
├── mms-logs.json     # Historique des MMS
├── call-logs.json    # Historique des appels
└── contacts.json     # Carnet d'adresses
```

### Format des Logs SMS

```json
{
  "id": "SM1234567890",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "direction": "inbound|outbound",
  "from": "+1234567890",
  "to": "+18199754345",
  "body": "Message texte",
  "status": "delivered",
  "clientIdentity": "softphone-user"
}
```

### Format des Logs MMS

```json
{
  "id": "MM1234567890",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "direction": "inbound|outbound",
  "from": "+1234567890",
  "to": "+18199754345",
  "body": "Message avec média",
  "mediaUrl": "https://...",
  "mediaType": "image/jpeg",
  "fileName": "photo.jpg",
  "status": "delivered",
  "clientIdentity": "softphone-user"
}
```

## 🧪 Tests et Débogage

### 1. Test de Configuration

```bash
# Test complet de la configuration
node test-messages.js
```

### 2. Test Rapide

```bash
# Test rapide des fonctionnalités
./test-messages-config.sh
```

### 3. Test Manuel

1. **Envoi de SMS** :
   - Ouvrez l'interface web
   - Allez dans l'onglet "MESSAGES"
   - Cliquez sur "📱 SMS"
   - Composez et envoyez un message

2. **Réception de SMS** :
   - Envoyez un SMS à `+18199754345`
   - Vérifiez qu'il apparaît dans l'interface
   - Vérifiez les logs dans la console

3. **Test des Webhooks** :
   ```bash
   curl -X POST "https://apt-buzzard-leading.ngrok-free.app/handle_sms" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "To=+18199754345&From=+1234567890&Body=Test&MessageSid=test_123"
   ```

## 🔍 Débogage

### Logs du Serveur

Les logs détaillés sont affichés dans la console :

```
📱 SMS reçu: { To: '+18199754345', From: '+1234567890', Body: 'Test' }
📱 Données extraites: { To: '+18199754345', From: '+1234567890', Body: 'Test' }
📱 SMS data à sauvegarder: { sid: 'SM123...', direction: 'inbound', ... }
📱 SMS traité et notifié aux clients
```

### Vérification des Webhooks

```bash
# Vérifier la configuration Twilio
twilio api:core:incoming-phone-numbers:list --phone-number="+18199754345"
```

### Problèmes Courants

1. **SMS non reçus** :
   - Vérifiez que NGROK fonctionne
   - Vérifiez les webhooks dans la console Twilio
   - Vérifiez les logs du serveur

2. **Erreurs d'envoi** :
   - Vérifiez les variables d'environnement
   - Vérifiez les crédits Twilio
   - Vérifiez les permissions du numéro

3. **Interface non mise à jour** :
   - Vérifiez la connexion Socket.IO
   - Actualisez la page
   - Vérifiez les logs JavaScript

## 📞 Support

Pour toute question ou problème :

1. **Vérifiez les logs** dans la console du serveur
2. **Testez la configuration** avec les scripts fournis
3. **Vérifiez la documentation** Twilio
4. **Consultez les logs** dans `data/`

## 🎯 Fonctionnalités Avancées

### Notifications en Temps Réel

Les nouveaux messages apparaissent instantanément grâce à Socket.IO :
- 📱 Notifications pour nouveaux SMS
- 📷 Notifications pour nouveaux MMS
- 📊 Mises à jour de statut en temps réel

### Gestion des Conversations

- **Regroupement automatique** par numéro
- **Tri chronologique** par dernier message
- **Recherche globale** dans toutes les conversations
- **Actions contextuelles** (appel, suppression)

### Sécurité

- **Validation des données** entrantes
- **Sanitisation** des messages
- **Logs sécurisés** sans données sensibles
- **Gestion d'erreurs** robuste

---

**🎉 Configuration terminée !** Votre Softphone Twilio est maintenant prêt pour les SMS et MMS entrants et sortants. 