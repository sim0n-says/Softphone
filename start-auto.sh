#!/bin/bash

# Script de démarrage automatique du Softphone Twilio
# Usage: ./start-auto.sh

echo "🚀 Démarrage automatique du Softphone Twilio"
echo "============================================="

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier que NGROK est installé
if ! command -v ngrok &> /dev/null; then
    echo "❌ NGROK n'est pas installé"
    echo "Téléchargez-le depuis: https://ngrok.com/download"
    exit 1
fi

# Vérifier la configuration
echo "🔍 Vérification de la configuration..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Configuration invalide. Vérifiez votre fichier .env"
    exit 1
fi

echo "✅ Configuration valide"

# Arrêter les processus existants
echo "🛑 Arrêt des processus existants..."
pkill -f "node server.js" 2>/dev/null
pkill -f ngrok 2>/dev/null
sleep 2

# Démarrer le serveur
echo "🌐 Démarrage du serveur..."
node server.js &
SERVER_PID=$!

# Attendre que le serveur démarre
sleep 3

# Vérifier que le serveur fonctionne
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Le serveur n'a pas démarré correctement"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Serveur démarré sur http://localhost:3000"

# Démarrer NGROK avec domaine statique
echo "🌍 Démarrage de NGROK avec domaine statique..."
ngrok http --domain=apt-buzzard-leading.ngrok-free.app 3000 > /dev/null 2>&1 &
NGROK_PID=$!

# Attendre que NGROK démarre
sleep 5

# Utiliser le domaine statique
NGROK_URL="https://apt-buzzard-leading.ngrok-free.app"

# Vérifier que le domaine fonctionne
if ! curl -s "$NGROK_URL" > /dev/null 2>&1; then
    echo "❌ Impossible d'accéder au domaine NGROK statique"
    kill $SERVER_PID $NGROK_PID 2>/dev/null
    exit 1
fi

echo "✅ NGROK démarré avec domaine statique: $NGROK_URL"

# Configuration Twilio
echo "🔧 Configuration Twilio..."
export TWILIO_ACCOUNT_SID=your_account_sid_here
export TWILIO_AUTH_TOKEN=your_auth_token_here

# Mettre à jour la TwiML App pour les appels sortants via Twilio.Device
TWIML_APP_SID=$(grep TWILIO_TWIML_APP_SID .env | cut -d'=' -f2)
if [ -n "$TWIML_APP_SID" ]; then
    twilio api:core:applications:update \
        --sid="$TWIML_APP_SID" \
        --voice-url="$NGROK_URL/twiml/outgoing" \
        --voice-method=POST > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ TwiML App mise à jour avec l'URL: $NGROK_URL/twiml/outgoing"
    else
        echo "⚠️  Impossible de mettre à jour la TwiML App"
    fi
fi

# Configurer le numéro de téléphone pour les appels entrants
PHONE_NUMBER="+18199754345"
PHONE_SID=$(twilio api:core:incoming-phone-numbers:list --phone-number="$PHONE_NUMBER" --no-header --properties=sid 2>/dev/null | grep -v "SID" | tr -d ' ')
if [ -n "$PHONE_SID" ]; then
    twilio api:core:incoming-phone-numbers:update \
        --sid="$PHONE_SID" \
        --voice-url="$NGROK_URL/handle_calls" \
        --voice-method=POST > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Numéro $PHONE_NUMBER configuré pour les appels entrants: $NGROK_URL/handle_calls"
    else
        echo "⚠️  Impossible de configurer le numéro $PHONE_NUMBER"
    fi
else
    echo "⚠️  Numéro $PHONE_NUMBER non trouvé"
fi

# Tester la configuration automatique
echo "🧪 Test de la configuration automatique..."
CONFIG_RESPONSE=$(curl -s http://localhost:3000/api/config)
if [ $? -eq 0 ]; then
    echo "✅ API de configuration fonctionnelle"
    echo "📋 Configuration: $CONFIG_RESPONSE"
else
    echo "⚠️  API de configuration non accessible"
fi

# Afficher les informations finales
echo ""
echo "🎉 Softphone Twilio prêt avec configuration automatique !"
echo "========================================================"
echo "📱 Interface locale: http://localhost:3000"
echo "🌍 Interface publique: $NGROK_URL"
echo "📞 Numéro Twilio: +18199754345"
echo "🔧 Webhook: $NGROK_URL/handle_calls"
echo ""
echo "🎯 Configuration automatique activée :"
echo "   - Identité générée automatiquement"
echo "   - Numéro configuré automatiquement"
echo "   - Aucune configuration manuelle requise"
echo ""
echo "📋 Instructions :"
echo "1. Ouvrez http://localhost:3000 dans votre navigateur"
echo "2. L'identité sera configurée automatiquement"
echo "3. Testez un appel sortant"
echo "4. Appelez +18199754345 pour tester les appels entrants"
echo ""
echo "🛑 Pour arrêter: Ctrl+C"

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🛑 Arrêt du Softphone..."
    kill $SERVER_PID $NGROK_PID 2>/dev/null
    echo "✅ Softphone arrêté"
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

# Attendre indéfiniment
while true; do
    sleep 1
done 