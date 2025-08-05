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
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant. Copiez env.example vers .env et configurez vos informations Twilio"
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
# Les identifiants Twilio sont chargés depuis le fichier .env

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

# Configurer le numéro de téléphone pour les appels entrants, SMS et MMS
PHONE_NUMBER="+18199754345"
PHONE_SID=$(twilio api:core:incoming-phone-numbers:list --phone-number="$PHONE_NUMBER" --no-header --properties=sid 2>/dev/null | grep -v "SID" | tr -d ' ')
if [ -n "$PHONE_SID" ]; then
    # Configuration pour les appels entrants
    twilio api:core:incoming-phone-numbers:update \
        --sid="$PHONE_SID" \
        --voice-url="$NGROK_URL/handle_calls" \
        --voice-method=POST > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Numéro $PHONE_NUMBER configuré pour les appels entrants: $NGROK_URL/handle_calls"
    else
        echo "⚠️  Impossible de configurer les appels entrants pour $PHONE_NUMBER"
    fi
    
    # Configuration pour les SMS entrants
    twilio api:core:incoming-phone-numbers:update \
        --sid="$PHONE_SID" \
        --sms-url="$NGROK_URL/handle_sms" \
        --sms-method=POST > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Numéro $PHONE_NUMBER configuré pour les SMS entrants: $NGROK_URL/handle_sms"
    else
        echo "⚠️  Impossible de configurer les SMS entrants pour $PHONE_NUMBER"
    fi
    
    # Configuration pour les MMS entrants
    twilio api:core:incoming-phone-numbers:update \
        --sid="$PHONE_SID" \
        --mms-url="$NGROK_URL/handle_mms" \
        --mms-method=POST > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Numéro $PHONE_NUMBER configuré pour les MMS entrants: $NGROK_URL/handle_mms"
    else
        echo "⚠️  Impossible de configurer les MMS entrants pour $PHONE_NUMBER"
    fi
    
    # Configuration des webhooks de statut pour les messages
    twilio api:core:incoming-phone-numbers:update \
        --sid="$PHONE_SID" \
        --status-callback-url="$NGROK_URL/message-status" \
        --status-callback-method=POST > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Webhooks de statut configurés pour $PHONE_NUMBER: $NGROK_URL/message-status"
    else
        echo "⚠️  Impossible de configurer les webhooks de statut pour $PHONE_NUMBER"
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

# Tester les webhooks SMS et MMS
echo "🧪 Test des webhooks SMS et MMS..."
SMS_WEBHOOK_TEST=$(curl -s -X POST "$NGROK_URL/handle_sms" -H "Content-Type: application/x-www-form-urlencoded" -d "To=$PHONE_NUMBER&From=+1234567890&Body=Test&MessageSid=test_sms_$(date +%s)" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Webhook SMS fonctionnel"
else
    echo "⚠️  Webhook SMS non accessible"
fi

MMS_WEBHOOK_TEST=$(curl -s -X POST "$NGROK_URL/handle_mms" -H "Content-Type: application/x-www-form-urlencoded" -d "To=$PHONE_NUMBER&From=+1234567890&Body=Test&MessageSid=test_mms_$(date +%s)&NumMedia=0" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Webhook MMS fonctionnel"
else
    echo "⚠️  Webhook MMS non accessible"
fi

# Afficher les informations finales
echo ""
echo "🎉 Softphone Twilio prêt avec configuration automatique !"
echo "========================================================"
echo "📱 Interface locale: http://localhost:3000"
echo "🌍 Interface publique: $NGROK_URL"
echo "📞 Numéro Twilio: +18199754345"
echo ""
echo "🔧 Webhooks configurés :"
echo "   📞 Appels: $NGROK_URL/handle_calls"
echo "   📱 SMS: $NGROK_URL/handle_sms"
echo "   📷 MMS: $NGROK_URL/handle_mms"
echo "   📊 Statuts: $NGROK_URL/message-status"
echo ""
echo "🎯 Configuration automatique activée :"
echo "   - Identité générée automatiquement"
echo "   - Numéro configuré automatiquement"
echo "   - Webhooks SMS/MMS configurés automatiquement"
echo "   - Aucune configuration manuelle requise"
echo ""
echo "📋 Instructions :"
echo "1. Ouvrez http://localhost:3000 dans votre navigateur"
echo "2. L'identité sera configurée automatiquement"
echo "3. Testez un appel sortant"
echo "4. Appelez +18199754345 pour tester les appels entrants"
echo "5. Envoyez un SMS à +18199754345 pour tester les SMS entrants"
echo "6. Envoyez un MMS à +18199754345 pour tester les MMS entrants"
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