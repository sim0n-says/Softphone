#!/usr/bin/env node

/**
 * Script de configuration manuelle des webhooks Twilio
 * Usage: node configure-webhooks.js [ngrok-url]
 */

const twilio = require('twilio');
require('dotenv').config();

// Configuration Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
    console.error('❌ Variables d\'environnement Twilio manquantes');
    console.log('Vérifiez votre fichier .env');
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function configureWebhooks(ngrokUrl) {
    console.log('🔧 Configuration des webhooks Twilio');
    console.log('===================================');
    console.log('📞 Numéro:', phoneNumber);
    console.log('🌍 URL NGROK:', ngrokUrl);
    console.log('');
    
    try {
        // 1. Trouver le numéro de téléphone
        console.log('🔍 Recherche du numéro de téléphone...');
        const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
            phoneNumber: phoneNumber
        });
        
        if (incomingPhoneNumbers.length === 0) {
            console.error('❌ Numéro de téléphone non trouvé:', phoneNumber);
            return;
        }
        
        const phoneNumberSid = incomingPhoneNumbers[0].sid;
        console.log('✅ Numéro trouvé, SID:', phoneNumberSid);
        
        // 2. Configurer les webhooks
        console.log('\n🔗 Configuration des webhooks...');
        
        const webhookConfig = {
            voiceUrl: `${ngrokUrl}/handle_calls`,
            voiceMethod: 'POST',
            smsUrl: `${ngrokUrl}/handle_sms`,
            smsMethod: 'POST',
            mmsUrl: `${ngrokUrl}/handle_mms`,
            mmsMethod: 'POST',
            statusCallbackUrl: `${ngrokUrl}/message-status`,
            statusCallbackMethod: 'POST'
        };
        
        console.log('📞 Webhook Appels:', webhookConfig.voiceUrl);
        console.log('📱 Webhook SMS:', webhookConfig.smsUrl);
        console.log('📷 Webhook MMS:', webhookConfig.mmsUrl);
        console.log('📊 Webhook Statut:', webhookConfig.statusCallbackUrl);
        
        // Mettre à jour le numéro
        const updatedNumber = await client.incomingPhoneNumbers(phoneNumberSid)
            .update(webhookConfig);
        
        console.log('\n✅ Configuration terminée !');
        console.log('📞 Numéro mis à jour:', updatedNumber.phoneNumber);
        
        // 3. Vérifier la configuration
        console.log('\n🔍 Vérification de la configuration...');
        const phoneDetails = await client.incomingPhoneNumbers(phoneNumberSid).fetch();
        
        console.log('📱 SMS URL:', phoneDetails.smsUrl);
        console.log('📷 MMS URL:', phoneDetails.mmsUrl);
        console.log('📊 Status Callback URL:', phoneDetails.statusCallbackUrl);
        console.log('📞 Voice URL:', phoneDetails.voiceUrl);
        
        // 4. Tester les webhooks
        console.log('\n🧪 Test des webhooks...');
        
        // Test SMS webhook
        try {
            const smsTest = await fetch(`${ngrokUrl}/handle_sms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: phoneNumber,
                    From: '+1234567890',
                    Body: 'Test webhook SMS',
                    MessageSid: `test_${Date.now()}`
                })
            });
            
            if (smsTest.ok) {
                console.log('✅ Webhook SMS fonctionnel');
            } else {
                console.log('⚠️  Webhook SMS non accessible');
            }
        } catch (error) {
            console.log('❌ Erreur test webhook SMS:', error.message);
        }
        
        // Test MMS webhook
        try {
            const mmsTest = await fetch(`${ngrokUrl}/handle_mms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: phoneNumber,
                    From: '+1234567890',
                    Body: 'Test webhook MMS',
                    MessageSid: `test_${Date.now()}`,
                    NumMedia: '0'
                })
            });
            
            if (mmsTest.ok) {
                console.log('✅ Webhook MMS fonctionnel');
            } else {
                console.log('⚠️  Webhook MMS non accessible');
            }
        } catch (error) {
            console.log('❌ Erreur test webhook MMS:', error.message);
        }
        
        console.log('\n🎉 Configuration des webhooks terminée !');
        console.log('========================================');
        console.log('✅ Webhooks configurés');
        console.log('✅ Tests effectués');
        console.log('✅ Prêt pour les messages entrants/sortants');
        
    } catch (error) {
        console.error('❌ Erreur lors de la configuration:', error.message);
        if (error.code) {
            console.error('   Code d\'erreur:', error.code);
        }
        if (error.moreInfo) {
            console.error('   Plus d\'infos:', error.moreInfo);
        }
    }
}

// Récupérer l'URL NGROK depuis les arguments ou utiliser la valeur par défaut
const ngrokUrl = process.argv[2] || 'https://apt-buzzard-leading.ngrok-free.app';

if (!ngrokUrl.startsWith('http')) {
    console.error('❌ URL NGROK invalide. Utilisez: node configure-webhooks.js [ngrok-url]');
    console.log('Exemple: node configure-webhooks.js https://apt-buzzard-leading.ngrok-free.app');
    process.exit(1);
}

configureWebhooks(ngrokUrl); 