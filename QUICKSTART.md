# 🚀 Démarrage Rapide - Softphone Twilio

## Installation en 5 minutes

### 1. Prérequis
- Node.js 14+ installé
- Compte Twilio (gratuit pour commencer)

### 2. Installation
```bash
# Cloner ou télécharger le projet
cd softphone-twilio

# Installer les dépendances
npm install

# Démarrer en mode développement
./start.sh
```

### 3. Configuration Twilio
1. Créez un compte sur [twilio.com](https://www.twilio.com)
2. Obtenez vos identifiants dans le dashboard
3. Créez un fichier `.env` :
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Utilisation
1. Ouvrez `http://localhost:3000`
2. Configurez votre identité et numéro
3. Composez un numéro et appelez !

## Fonctionnalités

✅ **Interface moderne** - Design responsive et intuitif  
✅ **Clavier virtuel** - Composition facile des numéros  
✅ **Appels sortants** - Appelez n'importe quel numéro  
✅ **Historique** - Suivi de vos appels  
✅ **Temps réel** - Mises à jour instantanées  
✅ **Sécurisé** - Authentification Twilio  

## Commandes utiles

```bash
# Démarrage rapide
./start.sh

# Mode production
./start-prod.sh

# Tests
node test-api.js

# Docker
docker-compose up -d

# PM2 (production)
pm2 start ecosystem.config.js
```

## Support

- 📖 Documentation complète : `README.md`
- 🐳 Docker : `DOCKER.md`
- 🧪 Tests : `node test-api.js`
- 🔧 Configuration : `env.example`

## Problèmes courants

**Serveur ne démarre pas ?**
```bash
# Vérifier Node.js
node --version

# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

**Erreur Twilio ?**
- Vérifiez vos identifiants dans `.env`
- Assurez-vous d'avoir des crédits sur votre compte

**Interface ne se charge pas ?**
- Vérifiez que le serveur tourne sur le port 3000
- Consultez les logs : `npm run dev`

---

**🎉 Votre softphone est prêt !**  
Passez des appels depuis votre navigateur web. 