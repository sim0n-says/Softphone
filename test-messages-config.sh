#!/bin/bash

# Script de test rapide pour la configuration des messages Twilio
# Usage: ./test-messages-config.sh

echo "🧪 Test rapide de la configuration des messages Twilio"
echo "====================================================="

# Vérifier que le serveur fonctionne
echo "🔍 Vérification du serveur..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Serveur fonctionnel"
else
    echo "❌ Serveur non accessible. Démarrez d'abord le serveur."
    exit 1
fi

# Vérifier la configuration via l'API
echo "🔧 Vérification de la configuration..."
CONFIG=$(curl -s http://localhost:3000/api/config)
if [ $? -eq 0 ]; then
    echo "✅ Configuration accessible"
    echo "📞 Numéro: $(echo $CONFIG | jq -r '.defaultPhoneNumber')"
    echo "🔗 Webhooks configurés:"
    echo "   📱 SMS: $(echo $CONFIG | jq -r '.webhooks.sms')"
    echo "   📷 MMS: $(echo $CONFIG | jq -r '.webhooks.mms')"
    echo "   📊 Statut: $(echo $CONFIG | jq -r '.webhooks.status')"
else
    echo "❌ Impossible d'accéder à la configuration"
fi

# Tester l'envoi d'un SMS via l'API
echo "📤 Test d'envoi de SMS..."
SMS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/send-sms \
    -H "Content-Type: application/json" \
    -d '{
        "to": "+18199754345",
        "body": "🧪 Test SMS - Configuration vérifiée ✅",
        "from": "+18199754345"
    }')

if [ $? -eq 0 ]; then
    echo "✅ SMS envoyé avec succès"
    echo "   SID: $(echo $SMS_RESPONSE | jq -r '.sid')"
    echo "   Statut: $(echo $SMS_RESPONSE | jq -r '.status')"
else
    echo "❌ Erreur lors de l'envoi du SMS"
fi

# Vérifier les logs SMS
echo "📋 Vérification des logs SMS..."
if [ -f "data/sms-logs.json" ]; then
    SMS_COUNT=$(jq length data/sms-logs.json)
    echo "✅ Logs SMS: $SMS_COUNT messages"
else
    echo "⚠️  Fichier de logs SMS non trouvé"
fi

# Vérifier les logs MMS
echo "📋 Vérification des logs MMS..."
if [ -f "data/mms-logs.json" ]; then
    MMS_COUNT=$(jq length data/mms-logs.json)
    echo "✅ Logs MMS: $MMS_COUNT messages"
else
    echo "⚠️  Fichier de logs MMS non trouvé"
fi

# Tester les webhooks
echo "🔗 Test des webhooks..."
NGROK_URL="https://apt-buzzard-leading.ngrok-free.app"

# Test webhook SMS
SMS_WEBHOOK_TEST=$(curl -s -X POST "$NGROK_URL/handle_sms" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "To=+18199754345&From=+1234567890&Body=Test webhook SMS&MessageSid=test_$(date +%s)")

if [ $? -eq 0 ]; then
    echo "✅ Webhook SMS fonctionnel"
else
    echo "❌ Webhook SMS non accessible"
fi

# Test webhook MMS
MMS_WEBHOOK_TEST=$(curl -s -X POST "$NGROK_URL/handle_mms" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "To=+18199754345&From=+1234567890&Body=Test webhook MMS&MessageSid=test_$(date +%s)&NumMedia=0")

if [ $? -eq 0 ]; then
    echo "✅ Webhook MMS fonctionnel"
else
    echo "❌ Webhook MMS non accessible"
fi

echo ""
echo "🎉 Test de configuration terminé !"
echo "=================================="
echo "📱 Interface: http://localhost:3000"
echo "📞 Numéro: +18199754345"
echo "🌍 NGROK: $NGROK_URL"
echo ""
echo "📋 Instructions de test :"
echo "1. Ouvrez http://localhost:3000"
echo "2. Allez dans l'onglet 'MESSAGES'"
echo "3. Testez l'envoi d'un SMS"
echo "4. Envoyez un SMS à +18199754345 pour tester la réception"
echo "5. Vérifiez les logs dans la console du serveur" 