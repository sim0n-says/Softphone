# 🐳 Déploiement Docker

Ce guide explique comment déployer le Softphone Twilio avec Docker.

## Prérequis

- Docker installé
- Docker Compose installé
- Compte Twilio configuré

## Déploiement rapide

### 1. Cloner le projet
```bash
git clone <repository-url>
cd softphone-twilio
```

### 2. Configurer les variables d'environnement
```bash
cp env.example .env
```

Éditez le fichier `.env` avec vos identifiants Twilio :
```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
SESSION_SECRET=your_session_secret_here
```

### 3. Construire et démarrer
```bash
docker-compose up -d
```

### 4. Accéder à l'application
Ouvrez votre navigateur sur `http://localhost:3000`

## Commandes utiles

### Voir les logs
```bash
docker-compose logs -f softphone
```

### Arrêter l'application
```bash
docker-compose down
```

### Redémarrer l'application
```bash
docker-compose restart
```

### Mettre à jour l'application
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Déploiement en production

### 1. Configuration de production
Créez un fichier `.env.production` :
```env
NODE_ENV=production
TWILIO_ACCOUNT_SID=your_production_sid
TWILIO_AUTH_TOKEN=your_production_token
TWILIO_PHONE_NUMBER=+1234567890
SESSION_SECRET=your_secure_session_secret
```

### 2. Déploiement avec variables d'environnement
```bash
docker-compose --env-file .env.production up -d
```

### 3. Configuration du reverse proxy (optionnel)
Si vous utilisez Nginx ou Apache, configurez le reverse proxy pour pointer vers `localhost:3000`.

## Sécurité

### Variables d'environnement sensibles
- Ne jamais commiter le fichier `.env` dans Git
- Utiliser des secrets Docker ou Kubernetes en production
- Changer régulièrement le `SESSION_SECRET`

### Réseau
- L'application écoute sur le port 3000
- Configurez un firewall approprié
- Utilisez HTTPS en production

## Monitoring

### Health check
L'application inclut un health check automatique :
```bash
curl http://localhost:3000/api/status
```

### Logs
Les logs sont disponibles via :
```bash
docker-compose logs softphone
```

## Dépannage

### Problèmes courants

1. **Port déjà utilisé**
   ```bash
   # Changer le port dans docker-compose.yml
   ports:
     - "3001:3000"
   ```

2. **Variables d'environnement manquantes**
   ```bash
   # Vérifier les variables
   docker-compose config
   ```

3. **Problèmes de permissions**
   ```bash
   # Reconstruire l'image
   docker-compose build --no-cache
   ```

### Logs détaillés
```bash
# Logs en temps réel
docker-compose logs -f --tail=100 softphone

# Logs avec timestamps
docker-compose logs -f --timestamps softphone
```

## Optimisations

### Performance
- L'image utilise Node.js Alpine pour réduire la taille
- Les dépendances sont installées en mode production
- L'utilisateur non-root améliore la sécurité

### Ressources
Vous pouvez limiter les ressources dans `docker-compose.yml` :
```yaml
services:
  softphone:
    # ... autres configurations
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Support

Pour toute question sur le déploiement Docker :
- Consultez la documentation Docker officielle
- Vérifiez les logs de l'application
- Ouvrez une issue sur GitHub 