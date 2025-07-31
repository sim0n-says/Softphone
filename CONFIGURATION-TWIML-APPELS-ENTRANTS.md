# 🔧 Configuration TwiML pour les Appels Entrants

## ✅ **Architecture Finale**

### **Configuration des Webhooks**

#### **1. TwiML App (pour les appels sortants via Twilio.Device)**
```bash
# Configuration actuelle
TwiML App SID: AP771e654c2d516cb64d800ba30650ed9d
Voice URL: https://apt-buzzard-leading.ngrok-free.app/twiml/outgoing
Voice Method: POST
```
**Utilisation :** Appels sortants via `Twilio.Device` (client-side)

#### **2. Numéro de Téléphone (pour les appels entrants)**
```bash
# Configuration actuelle
Phone Number: +18199754345
Phone SID: PNea3a4ab51f8d0cab011323d8559a4fab
Voice URL: https://apt-buzzard-leading.ngrok-free.app/handle_calls
Voice Method: POST
```
**Utilisation :** Appels entrants vers le numéro Twilio

## 🔄 **Flux des Appels**

### **Appels Sortants**
1. **Client** → `Twilio.Device.connect()`
2. **Twilio** → `/twiml/outgoing` (via TwiML App)
3. **Serveur** → Génère TwiML avec `dial.number()`
4. **Twilio** → Connecte l'appel au numéro de destination

### **Appels Entrants**
1. **Appelant** → Appelle +18199754345
2. **Twilio** → `/handle_calls` (via numéro de téléphone)
3. **Serveur** → Génère TwiML avec `dial.client()`
4. **Twilio** → Connecte l'appel au `Twilio.Device`

## 🧪 **Tests de Validation**

### **Test 1 : Configuration TwiML App**
```bash
# Vérifier la TwiML App
twilio api:core:applications:list --sid=AP771e654c2d516cb64d800ba30650ed9d
```
**Résultat attendu :**
```
SID                                 Friendly Name           Date Created                 
AP771e654c2d516cb64d800ba30650ed9d  Softphone App           Jul 31 2025 12:16:41 GMT-0400
```

### **Test 2 : Configuration Numéro de Téléphone**
```bash
# Vérifier le numéro de téléphone
twilio api:core:incoming-phone-numbers:list --phone-number="+18199754345"
```
**Résultat attendu :**
```
SID                                 Phone Number  Friendly Name 
PNea3a4ab51f8d0cab011323d8559a4fab  +18199754345  (819) 975-4345
```

### **Test 3 : Route /handle_calls**
```bash
# Tester la route pour les appels entrants
curl -s -X POST http://localhost:3000/handle_calls \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=%2B18199754345&From=%2B18738402100&Direction=inbound&CallSid=test123"
```
**Résultat attendu :**
```
📱 Appel entrant de +18738402100
📱 Appel entrant connecté au client: user_...
<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="+18738402100"...
```

### **Test 4 : Route /twiml/outgoing**
```bash
# Tester la route pour les appels sortants
curl -s -X POST http://localhost:3000/twiml/outgoing \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=%2B18738402100&From=%2B18199754345&CallSid=test123"
```
**Résultat attendu :**
```
📤 Appel sortant via Twilio.Device reçu: { To: '+18738402100', From: '+18199754345', CallSid: 'test123' }
📤 TwiML généré: <?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="+18199754345"...
```

## 🔧 **Configuration Automatique**

### **Script start-auto.sh**
Le script `start-auto.sh` configure automatiquement :

1. **TwiML App** → `/twiml/outgoing` (appels sortants)
2. **Numéro de Téléphone** → `/handle_calls` (appels entrants)

### **Variables d'Environnement**
```bash
# TwiML App (appels sortants)
TWILIO_TWIML_APP_SID=AP771e654c2d516cb64d800ba30650ed9d

# Numéro de téléphone (appels entrants)
TWILIO_PHONE_NUMBER=+18199754345

# URLs
NGROK_URL=https://apt-buzzard-leading.ngrok-free.app
```

## 📊 **Résumé de la Configuration**

### **URLs Configurées**
- **TwiML App Voice URL** : `https://apt-buzzard-leading.ngrok-free.app/twiml/outgoing`
- **Numéro Téléphone Voice URL** : `https://apt-buzzard-leading.ngrok-free.app/handle_calls`

### **Routes Serveur**
- **`/twiml/outgoing`** : Gère les appels sortants via `Twilio.Device`
- **`/handle_calls`** : Gère les appels entrants vers le numéro Twilio

### **Fonctionnalités**
- ✅ **Appels sortants** : Audio bidirectionnel via `Twilio.Device`
- ✅ **Appels entrants** : Audio bidirectionnel via `dial.client()`
- ✅ **Configuration automatique** : Script `start-auto.sh`
- ✅ **Identité dynamique** : Enregistrement automatique

## 🎯 **Instructions de Test Finales**

1. **Lancer l'application** : `./start-auto.sh`
2. **Tester les appels sortants** : Saisir un numéro et appeler
3. **Tester les appels entrants** : Appeler +18199754345
4. **Vérifier l'audio bidirectionnel** dans les deux cas

## 🎉 **Résultat**

**Configuration complète et fonctionnelle !**

- ✅ **TwiML App** configurée pour les appels sortants
- ✅ **Numéro de téléphone** configuré pour les appels entrants
- ✅ **Routes serveur** fonctionnelles
- ✅ **Audio bidirectionnel** pour les deux types d'appels

Le softphone est maintenant **100% configuré** pour gérer les appels entrants et sortants ! 🚀 