// Variables globales
let socket;
let device;
let currentCall = null;
let callDuration = 0;
let callTimer = null;
let incomingCall = null;
let incomingCallData = null;
let isMuted = false;
let isPaused = false;
let isOnHold = false;
let isRecording = false;
let isSpeakerOn = false;
let audioDevices = {
    inputs: [],
    outputs: []
};
let settings = {
    identity: 'softphone-user', // Identité fixe pour les appels entrants
    fromNumber: localStorage.getItem('fromNumber') || '+18199754345'
};

// Générer une identité automatique basée sur l'heure et un ID aléatoire
function generateIdentity() {
    const timestamp = Date.now().toString(36);
    const randomId = Math.random().toString(36).substring(2, 8);
    const identity = `user_${timestamp}_${randomId}`;
    localStorage.setItem('identity', identity);
    return identity;
}

// Éléments DOM
const phoneNumberInput = document.getElementById('phone-number');
const callBtn = document.getElementById('call-btn');
const hangupBtn = document.getElementById('hangup-btn');
const clearBtn = document.getElementById('clear-btn');
const callInfo = document.getElementById('call-info');
const callStatus = document.getElementById('call-status');
const callDurationSpan = document.getElementById('call-duration');
const connectionStatus = document.getElementById('connection-status');
const callHistory = document.getElementById('call-history');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const closeModal = document.querySelector('.close');

// Éléments du modal d'appel entrant
const incomingCallModal = document.getElementById('incoming-call-modal');
const callerNumber = document.getElementById('caller-number');
const callerInfo = document.getElementById('caller-info');
const btnAcceptCall = document.getElementById('btn-accept-call');
const btnRejectCall = document.getElementById('btn-reject-call');

// Éléments des contrôles audio
const audioControls = document.getElementById('audio-controls');
const muteBtn = document.getElementById('mute-btn');
const pauseBtn = document.getElementById('pause-btn');
const holdBtn = document.getElementById('hold-btn');
const speakerBtn = document.getElementById('speaker-btn');
const transferBtn = document.getElementById('transfer-btn');
const recordBtn = document.getElementById('record-btn');

// Éléments des paramètres audio
const audioSettings = document.getElementById('audio-settings');
const inputDeviceSelect = document.getElementById('input-device');
const outputDeviceSelect = document.getElementById('output-device');

// Élément du bouton d'accès au microphone
const micAccessBtn = document.getElementById('mic-access-btn');

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
    // Demander l'accès au microphone immédiatement
    await requestMicrophoneAccess();
    
    // Récupérer la configuration depuis le serveur
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        // Mettre à jour les paramètres avec la configuration du serveur
        if (!settings.fromNumber && config.defaultPhoneNumber) {
            settings.fromNumber = config.defaultPhoneNumber;
            localStorage.setItem('fromNumber', config.defaultPhoneNumber);
        }
        
        console.log('✅ Configuration récupérée:', config);
    } catch (error) {
        console.log('⚠️  Impossible de récupérer la configuration:', error);
    }
    
    // Initialiser Twilio.Device pour recevoir les appels entrants
    await initializeTwilioClient();
    
    initializeSocket();
    initializeKeypad();
    initializeCallControls();
    initializeSettings();
    initializeIncomingCallModal();
    initializeAudioControls();
    loadAudioDevices();
    loadCallHistory();
    
    // Enregistrer l'identité auprès du serveur pour les appels entrants
    try {
        await fetch('/api/register-identity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identity: settings.identity
            })
        });
        console.log('✅ Identité enregistrée auprès du serveur');
    } catch (error) {
        console.log('⚠️  Impossible d\'enregistrer l\'identité:', error);
    }
    
    // Configuration automatique terminée
    console.log('✅ Configuration automatique:', {
        identity: settings.identity,
        fromNumber: settings.fromNumber
    });
    
    // Afficher les informations de configuration
    showConfigurationInfo();
});

// Initialisation Socket.IO
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        updateConnectionStatus('online', 'Connecté');
    });
    
    socket.on('disconnect', () => {
        updateConnectionStatus('offline', 'Déconnecté');
    });
    
    socket.on('call-status-update', (data) => {
        handleCallStatusUpdate(data);
    });
    
    socket.on('active-calls', (calls) => {
        updateActiveCalls(calls);
    });
    
    socket.on('incoming-call-accepted', (callSid) => {
        console.log('Appel entrant accepté:', callSid);
    });
    
    socket.on('incoming-call-rejected', (callSid) => {
        console.log('Appel entrant rejeté:', callSid);
    });
    
    // Gérer les appels entrants via Socket.IO
    socket.on('incoming-call', (callData) => {
        console.log('📱 Appel entrant reçu via Socket.IO:', callData);
        
        // Si le client Twilio n'est pas encore initialisé, l'initialiser
        if (!device) {
            console.log('🔧 Initialisation du client Twilio pour l\'appel entrant...');
            initializeTwilioClient().then(() => {
                // Une fois initialisé, gérer l'appel entrant
                handleIncomingCallNotification(callData);
            }).catch(error => {
                console.error('❌ Erreur lors de l\'initialisation pour l\'appel entrant:', error);
                showNotification('Impossible de recevoir l\'appel entrant', 'error');
            });
        } else {
            // Client déjà initialisé, gérer directement
            handleIncomingCallNotification(callData);
        }
    });
}

// Initialisation du clavier
function initializeKeypad() {
    const keys = document.querySelectorAll('.key');
    
    keys.forEach(key => {
        key.addEventListener('click', () => {
            const number = key.getAttribute('data-number');
            addToPhoneNumber(number);
        });
    });
}

// Initialisation des contrôles d'appel
function initializeCallControls() {
    callBtn.addEventListener('click', makeCall);
    hangupBtn.addEventListener('click', hangupCall);
    clearBtn.addEventListener('click', clearPhoneNumber);
    
    // Permettre la saisie directe
    phoneNumberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            makeCall();
        }
    });
}

// Initialisation des paramètres
function initializeSettings() {
    settingsBtn.addEventListener('click', showSettingsModal);
    closeModal.addEventListener('click', hideSettingsModal);
    
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });
    
    // Fermer le modal en cliquant à l'extérieur
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            hideSettingsModal();
        }
    });
}

// Initialisation du client Twilio
async function initializeTwilioClient() {
    try {
        console.log('🔧 Initialisation du client Twilio...');
        
        // Obtenir un token Twilio
        const tokenResponse = await fetch('/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identity: settings.identity
            })
        });
        
        if (!tokenResponse.ok) {
            throw new Error('Impossible d\'obtenir le token Twilio');
        }
        
        const { token } = await tokenResponse.json();
        console.log('✅ Token Twilio obtenu');
        
        // Initialiser le client Twilio avec une configuration optimisée
        device = new Twilio.Device(token, {
            closeProtection: true,
            enableRingingState: true,
            // Configuration audio simplifiée pour éviter les erreurs AudioContext
            audioConstraints: {
                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false
            },
            // Éviter les warnings audio
            fakeLocalDTMF: true
        });
        
        // Forcer l'initialisation immédiate
        console.log('🔧 État initial du device:', device.state);
        
        // Événements du client Twilio
        device.on('ready', () => {
            console.log('✅ Client Twilio prêt');
            console.log('📱 Identité du client:', settings.identity);
            console.log('📱 État du device:', device.state);
            console.log('📱 Device object:', device);
            updateConnectionStatus('online', 'Prêt à recevoir des appels');
            
            // Vérifier que l'identité est enregistrée
            fetch('/api/register-identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: settings.identity })
            }).then(() => {
                console.log('✅ Identité enregistrée après initialisation du client');
            }).catch(error => {
                console.log('⚠️ Erreur lors de l\'enregistrement de l\'identité:', error);
            });
        });
        
        device.on('error', (error) => {
            console.error('❌ Erreur client Twilio:', error);
            updateConnectionStatus('offline', 'Erreur Twilio');
            
            // Gestion spécifique des erreurs
            if (error.code === 31000) {
                console.log('🔄 Erreur de connexion - client déconnecté');
                // Ne pas réinitialiser automatiquement pour éviter les boucles
            } else if (error.message.includes('AudioContext')) {
                console.log('🔄 Erreur AudioContext détectée');
                // Ne pas réinitialiser automatiquement
            }
            
            // Afficher un message utilisateur approprié
            if (error.code === 31000) {
                showNotification('Erreur de connexion. Veuillez réessayer.', 'error');
            } else {
                showNotification('Erreur audio: ' + error.message, 'error');
            }
        });
        
        device.on('incoming', (connection) => {
            console.log('📞 Appel entrant reçu:', connection);
            console.log('📞 Paramètres de l\'appel entrant:', connection.parameters);
            console.log('📞 État de l\'appel entrant:', connection.status());
            
            // Stocker l'appel entrant actuel
            incomingCall = connection;
            handleIncomingCall(connection);
        });
        
        device.on('connect', (connection) => {
            console.log('✅ Appel connecté:', connection);
            console.log('✅ Paramètres de connexion:', connection.parameters);
            console.log('✅ État de la connexion:', connection.status());
            currentCall = connection;
            updateCallUI('connected');
            startCallTimer();
        });
        
        device.on('disconnect', (connection) => {
            console.log('📞 Appel terminé:', connection);
            console.log('📞 Raison de la déconnexion:', connection.status());
            console.log('📞 Paramètres de déconnexion:', connection.parameters);
            currentCall = null;
            updateCallUI('idle');
            endCall();
        });
        
        console.log('✅ Client Twilio initialisé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du client Twilio:', error);
        updateConnectionStatus('offline', 'Erreur d\'initialisation');
        throw error; // Re-lancer l'erreur pour la gestion dans makeCall
    }
}

// Initialisation du modal d'appel entrant
function initializeIncomingCallModal() {
    btnAcceptCall.addEventListener('click', acceptIncomingCall);
    btnRejectCall.addEventListener('click', rejectIncomingCall);
    
    // Fermer le modal en cliquant à l'extérieur
    window.addEventListener('click', (e) => {
        if (e.target === incomingCallModal) {
            hideIncomingCallModal();
        }
    });
}

// Ajouter un chiffre au numéro de téléphone
function addToPhoneNumber(number) {
    const currentValue = phoneNumberInput.value;
    phoneNumberInput.value = currentValue + number;
}

// Effacer le numéro de téléphone
function clearPhoneNumber() {
    phoneNumberInput.value = '';
}

// Mettre à jour le statut de connexion
function updateConnectionStatus(status, text) {
    connectionStatus.className = `status ${status}`;
    connectionStatus.textContent = text;
}

// Passer un appel
async function makeCall() {
    const phoneNumber = phoneNumberInput.value.trim();
    
    if (!phoneNumber) {
        showNotification('Veuillez saisir un numéro de téléphone', 'error');
        return;
    }
    
    if (!settings.identity || !settings.fromNumber) {
        showNotification('Veuillez configurer vos paramètres', 'error');
        showSettingsModal();
        return;
    }
    
    // Vérifier que le device est initialisé
    if (!device) {
        try {
            console.log('🔧 Initialisation du client Twilio...');
            await initializeTwilioClient();
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du client Twilio:', error);
            showNotification('Erreur d\'initialisation Twilio. Veuillez réessayer.', 'error');
            return;
        }
    }
    
    try {
        console.log('📞 Début de l\'appel vers:', phoneNumber);
        updateCallUI('calling');
        updateConnectionStatus('connecting', 'Connexion...');
        
        // Vérifier que le device est prêt
        console.log('📞 État du device avant vérification:', device.state);
        
        // Si le device n'est pas prêt, essayer de le forcer
        if (!device.state || device.state !== 'ready') {
            console.log('🔧 Tentative de forcer l\'état ready...');
            
            // Attendre un peu et vérifier à nouveau
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('📞 État du device après attente:', device.state);
            
            // Si toujours pas prêt, essayer de se connecter quand même
            if (!device.state || device.state !== 'ready') {
                console.log('⚠️ Device pas dans l\'état ready, tentative de connexion...');
            }
        }
        
        // Passer l'appel via le client Twilio pour l'audio bidirectionnel
        const params = {
            To: phoneNumber,
            From: settings.fromNumber
        };
        
        console.log('📞 Paramètres d\'appel:', params);
        console.log('📞 État du device avant connexion:', device.state);
        console.log('📞 Device object:', device);
        
        currentCall = device.connect(params);
        
        console.log('✅ Appel initié avec succès via client Twilio');
        console.log('📞 Objet currentCall:', currentCall);
        console.log('📞 Paramètres de l\'appel:', currentCall.parameters);
        
        updateConnectionStatus('online', 'Connecté');
        showNotification('Appel en cours...', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'appel:', error);
        
        // Si l'erreur est liée au client, essayer de le réinitialiser
        if (error.code === 31000 || error.message.includes('disconnected')) {
            console.log('🔄 Tentative de réinitialisation du client Twilio...');
            device = null;
            showNotification('Réinitialisation du client en cours...', 'info');
            
            // Réessayer l'appel après réinitialisation
            setTimeout(() => {
                makeCall();
            }, 2000);
            return;
        }
        
        showNotification('Erreur lors de l\'appel: ' + error.message, 'error');
        updateConnectionStatus('offline', 'Erreur');
        updateCallUI('idle');
    }
}

// Gérer un appel entrant
function handleIncomingCall(connection) {
    console.log('📱 Appel entrant reçu:', connection.parameters);
    
    incomingCall = connection;
    
    // Afficher les informations de l'appel entrant
    const fromNumber = connection.parameters.From || 'Numéro inconnu';
    callerNumber.textContent = fromNumber;
    callerInfo.textContent = 'Appel entrant...';
    
    // Afficher le modal
    showIncomingCallModal();
    
    // Gérer les événements de l'appel
    connection.on('accept', () => {
        console.log('Appel entrant accepté');
        hideIncomingCallModal();
        currentCall = connection;
        startCallTimer();
        updateCallUI('connected');
        
        connection.on('disconnect', () => {
            console.log('Appel entrant terminé');
            endCall();
        });
    });
    
    connection.on('reject', () => {
        console.log('Appel entrant rejeté');
        hideIncomingCallModal();
        incomingCall = null;
    });
    
    connection.on('disconnect', () => {
        console.log('Appel entrant déconnecté');
        hideIncomingCallModal();
        incomingCall = null;
    });
}

// Gérer une notification d'appel entrant via Socket.IO
function handleIncomingCallNotification(callData) {
    console.log('📱 Notification d\'appel entrant:', callData);
    
    // Afficher les informations de l'appel entrant
    const fromNumber = callData.from || 'Numéro inconnu';
    callerNumber.textContent = fromNumber;
    callerInfo.textContent = 'Appel entrant...';
    
    // Afficher le modal
    showIncomingCallModal();
    
    // Stocker les données de l'appel pour référence
    incomingCallData = callData;
}

// Accepter un appel entrant
function acceptIncomingCall() {
    if (incomingCall) {
        incomingCall.accept();
        socket.emit('incoming-call-accepted', incomingCall.parameters.CallSid);
    }
}

// Rejeter un appel entrant
function rejectIncomingCall() {
    if (incomingCall && incomingCall.parameters) {
        console.log('Appel entrant rejeté');
        incomingCall.reject();
        socket.emit('incoming-call-rejected', incomingCall.parameters.CallSid);
        hideIncomingCallModal();
        incomingCall = null;
    } else {
        console.log('Aucun appel entrant à rejeter');
        hideIncomingCallModal();
    }
}

// Afficher le modal d'appel entrant
function showIncomingCallModal() {
    incomingCallModal.style.display = 'block';
    // Jouer un son de sonnerie (optionnel)
    playRingtone();
}

// Masquer le modal d'appel entrant
function hideIncomingCallModal() {
    incomingCallModal.style.display = 'none';
    stopRingtone();
}

// Jouer une sonnerie (fonction simple)
function playRingtone() {
    // Créer un audio context pour générer un son de sonnerie
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
        
        // Répéter la sonnerie
        window.ringtoneInterval = setInterval(() => {
            if (incomingCallModal.style.display === 'block') {
                playRingtone();
            }
        }, 2000);
    } catch (error) {
        console.log('Impossible de jouer la sonnerie:', error);
    }
}

// Arrêter la sonnerie
function stopRingtone() {
    if (window.ringtoneInterval) {
        clearInterval(window.ringtoneInterval);
        window.ringtoneInterval = null;
    }
}

// Terminer un appel
async function hangupCall() {
    if (currentCall) {
        currentCall.disconnect();
    }
    
    if (currentCall && currentCall.parameters && currentCall.parameters.CallSid) {
        try {
            await fetch('/api/hangup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    callSid: currentCall.parameters.CallSid
                })
            });
        } catch (error) {
            console.error('Erreur lors de la fin d\'appel:', error);
        }
    }
    
    endCall();
}

// Terminer l'appel
function endCall() {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    currentCall = null;
    incomingCall = null;
    callDuration = 0;
    updateCallUI('idle');
    loadCallHistory();
}

// Mettre à jour l'interface d'appel
function updateCallUI(state) {
    const callInfoDiv = document.getElementById('call-info');
    
    switch (state) {
        case 'calling':
            callBtn.style.display = 'none';
            hangupBtn.style.display = 'flex';
            callInfoDiv.style.display = 'block';
            callStatus.textContent = 'Appel en cours...';
            callBtn.classList.add('ringing');
            updateAudioControls(true);
            break;
            
        case 'connected':
            callBtn.style.display = 'none';
            hangupBtn.style.display = 'flex';
            callInfoDiv.style.display = 'block';
            callStatus.textContent = 'Connecté';
            callBtn.classList.remove('ringing');
            updateAudioControls(true);
            break;
            
        case 'incoming':
            callBtn.style.display = 'none';
            hangupBtn.style.display = 'flex';
            callInfoDiv.style.display = 'block';
            callStatus.textContent = 'Appel entrant';
            updateAudioControls(true);
            break;
            
        case 'idle':
        default:
            callBtn.style.display = 'flex';
            hangupBtn.style.display = 'none';
            callInfoDiv.style.display = 'none';
            callBtn.classList.remove('ringing');
            updateAudioControls(false);
            break;
    }
}

// Démarrer le minuteur d'appel
function startCallTimer() {
    callDuration = 0;
    callTimer = setInterval(() => {
        callDuration++;
        const minutes = Math.floor(callDuration / 60);
        const seconds = callDuration % 60;
        callDurationSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Gérer les mises à jour de statut d'appel
function handleCallStatusUpdate(data) {
    console.log('📞 Mise à jour statut appel:', data);
    
    if (data.status === 'completed' || data.status === 'failed' || data.status === 'busy' || data.status === 'no-answer') {
        endCall();
    }
    
    // Si c'est un appel entrant qui sonne
    if (data.direction === 'inbound' && data.status === 'ringing' && !incomingCall) {
        // Créer une connexion simulée pour l'affichage
        const simulatedConnection = {
            parameters: {
                From: data.from,
                CallSid: data.callSid
            }
        };
        handleIncomingCall(simulatedConnection);
    }
    
    loadCallHistory();
}

// Mettre à jour les appels actifs
function updateActiveCalls(calls) {
    console.log('📞 Appels actifs:', calls);
}

// Charger l'historique des appels
async function loadCallHistory() {
    try {
        const response = await fetch('/api/call-history');
        const history = await response.json();
        
        displayCallHistory(history);
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
    }
}

// Afficher l'historique des appels
function displayCallHistory(history) {
    const historyContainer = document.getElementById('call-history');
    
    if (history.length === 0) {
        historyContainer.innerHTML = '<div class="no-calls">Aucun appel récent</div>';
        return;
    }
    
    const historyHTML = history.slice(-10).reverse().map(call => {
        const startTime = new Date(call.startTime).toLocaleString('fr-FR');
        const duration = call.duration ? Math.floor(call.duration / 1000) : 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationText = duration > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '--';
        
        const directionIcon = call.direction === 'inbound' ? '📱' : '📤';
        const directionText = call.direction === 'inbound' ? 'Entrant' : 'Sortant';
        
        return `
            <div class="call-item">
                <div class="call-number">
                    ${directionIcon} ${call.direction === 'inbound' ? call.from : call.to}
                    <span class="call-direction">${directionText}</span>
                </div>
                <div class="call-details">
                    <span>${startTime}</span>
                    <span class="call-status ${call.status} ${call.direction}">${getStatusText(call.status)}</span>
                    <span>${durationText}</span>
                </div>
            </div>
        `;
    }).join('');
    
    historyContainer.innerHTML = historyHTML;
}

// Obtenir le texte du statut
function getStatusText(status) {
    const statusMap = {
        'initiated': 'Initiated',
        'ringing': 'Sonnerie',
        'answered': 'Répondu',
        'completed': 'Terminé',
        'failed': 'Échoué',
        'busy': 'Occupé',
        'no-answer': 'Pas de réponse'
    };
    
    return statusMap[status] || status;
}

// Afficher le modal des paramètres
function showSettingsModal() {
    document.getElementById('identity').value = settings.identity;
    document.getElementById('from-number').value = settings.fromNumber;
    settingsModal.style.display = 'block';
}

// Masquer le modal des paramètres
function hideSettingsModal() {
    settingsModal.style.display = 'none';
}

// Sauvegarder les paramètres
function saveSettings() {
    const identity = document.getElementById('identity').value.trim();
    const fromNumber = document.getElementById('from-number').value.trim();
    
    if (!identity || !fromNumber) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    settings.identity = identity;
    settings.fromNumber = fromNumber;
    
    localStorage.setItem('identity', identity);
    localStorage.setItem('fromNumber', fromNumber);
    
    hideSettingsModal();
    showNotification('Paramètres sauvegardés', 'success');
}

// Afficher les informations de configuration automatique
function showConfigurationInfo() {
    // Afficher le badge de configuration
    const configBadge = document.getElementById('config-status');
    if (configBadge) {
        configBadge.style.display = 'flex';
    }
    
    const notification = document.createElement('div');
    notification.className = 'config-info';
    notification.innerHTML = `
        <div class="config-info-content">
            <h3>🎉 Configuration automatique terminée !</h3>
            <p><strong>Identité:</strong> ${settings.identity}</p>
            <p><strong>Numéro:</strong> ${settings.fromNumber}</p>
            <p>Vous pouvez maintenant passer et recevoir des appels !</p>
            <button class="close-config-btn">Fermer</button>
        </div>
    `;
    
    // Ajouter l'event listener pour fermer la notification
    const closeBtn = notification.querySelector('.close-config-btn');
    closeBtn.addEventListener('click', () => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    });
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #48bb78, #38a169);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(72, 187, 120, 0.3);
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Supprimer automatiquement après 10 secondes
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }
    }, 10000);
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${type === 'error' ? '#e53e3e' : type === 'success' ? '#48bb78' : '#667eea'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Ajouter les styles d'animation pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .call-direction {
        font-size: 0.8rem;
        color: #718096;
        margin-left: 8px;
        padding: 2px 6px;
        border-radius: 8px;
        background: #f7fafc;
    }
`;
document.head.appendChild(style);

// ===== FONCTIONS AUDIO =====

// Initialiser les contrôles audio
function initializeAudioControls() {
    // Bouton Mute
    muteBtn.addEventListener('click', toggleMute);
    
    // Bouton Pause
    pauseBtn.addEventListener('click', togglePause);
    
    // Bouton Hold
    holdBtn.addEventListener('click', toggleHold);
    
    // Bouton Speaker
    speakerBtn.addEventListener('click', toggleSpeaker);
    
    // Bouton Transfer
    transferBtn.addEventListener('click', showTransferDialog);
    
    // Bouton Record
    recordBtn.addEventListener('click', toggleRecording);
    
    // Changement de périphériques audio
    inputDeviceSelect.addEventListener('change', changeInputDevice);
    outputDeviceSelect.addEventListener('change', changeOutputDevice);
    
    // Bouton d'accès au microphone
    micAccessBtn.addEventListener('click', async () => {
        const success = await requestMicrophoneAccess();
        if (success) {
            micAccessBtn.style.display = 'none';
            loadAudioDevices();
        }
    });
}

// Demander l'accès au microphone automatiquement
async function requestMicrophoneAccess() {
    try {
        console.log('🎤 Demande d\'accès au microphone...');
        
        // Demander les permissions audio avec des contraintes spécifiques
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000
            },
            video: false
        });
        
        // Arrêter le stream immédiatement (on voulait juste les permissions)
        stream.getTracks().forEach(track => track.stop());
        
        console.log('✅ Accès au microphone accordé');
        showNotification('Microphone activé avec succès', 'success');
        
        // Mettre à jour le statut de connexion
        updateConnectionStatus('online', 'Microphone activé');
        
        // Masquer le bouton d'accès au microphone
        micAccessBtn.style.display = 'none';
        
        return true;
    } catch (error) {
        console.error('❌ Erreur d\'accès au microphone:', error);
        
        let errorMessage = 'Impossible d\'accéder au microphone';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Accès au microphone refusé. Cliquez sur le bouton rouge pour réessayer.';
            // Afficher le bouton d'accès au microphone
            micAccessBtn.style.display = 'flex';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'Aucun microphone détecté. Veuillez connecter un microphone.';
            micAccessBtn.style.display = 'flex';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Microphone déjà utilisé par une autre application.';
            micAccessBtn.style.display = 'flex';
        }
        
        showNotification(errorMessage, 'error');
        updateConnectionStatus('offline', 'Microphone non disponible');
        
        return false;
    }
}

// Charger les périphériques audio disponibles
async function loadAudioDevices() {
    try {
        // Énumérer les périphériques (les permissions sont déjà demandées)
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Filtrer les périphériques audio
        audioDevices.inputs = devices.filter(device => device.kind === 'audioinput');
        audioDevices.outputs = devices.filter(device => device.kind === 'audiooutput');
        
        // Remplir les sélecteurs
        populateDeviceSelect(inputDeviceSelect, audioDevices.inputs, 'input');
        populateDeviceSelect(outputDeviceSelect, audioDevices.outputs, 'output');
        
        console.log('✅ Périphériques audio chargés:', {
            inputs: audioDevices.inputs.length,
            outputs: audioDevices.outputs.length
        });
        
        // Afficher un message si aucun périphérique n'est trouvé
        if (audioDevices.inputs.length === 0) {
            showNotification('Aucun microphone détecté', 'warning');
        }
        
        if (audioDevices.outputs.length === 0) {
            showNotification('Aucun haut-parleur détecté', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des périphériques audio:', error);
        showNotification('Impossible de charger les périphériques audio', 'error');
    }
}

// Remplir les sélecteurs de périphériques
function populateDeviceSelect(select, devices, type) {
    select.innerHTML = '';
    
    if (devices.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = `Aucun ${type === 'input' ? 'microphone' : 'haut-parleur'} détecté`;
        select.appendChild(option);
        return;
    }
    
    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `${type === 'input' ? 'Microphone' : 'Haut-parleur'} ${device.deviceId.slice(0, 8)}`;
        select.appendChild(option);
    });
}

// Changer le périphérique d'entrée
async function changeInputDevice() {
    const deviceId = inputDeviceSelect.value;
    if (!deviceId) return;
    
    try {
        if (currentCall) {
            // Changer le microphone pendant l'appel
            await currentCall.setInputDevice(deviceId);
            showNotification('Microphone changé', 'success');
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de microphone:', error);
        showNotification('Impossible de changer le microphone', 'error');
    }
}

// Changer le périphérique de sortie
async function changeOutputDevice() {
    const deviceId = outputDeviceSelect.value;
    if (!deviceId) return;
    
    try {
        if (currentCall) {
            // Changer le haut-parleur pendant l'appel
            await currentCall.setOutputDevice(deviceId);
            showNotification('Haut-parleur changé', 'success');
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de haut-parleur:', error);
        showNotification('Impossible de changer le haut-parleur', 'error');
    }
}

// Basculer le mode muet
function toggleMute() {
    if (!currentCall) return;
    
    try {
        isMuted = !isMuted;
        currentCall.mute(isMuted);
        
        // Mettre à jour l'interface
        if (isMuted) {
            muteBtn.classList.add('muted');
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            showNotification('Microphone coupé', 'info');
        } else {
            muteBtn.classList.remove('muted');
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            showNotification('Microphone activé', 'info');
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de muet:', error);
        showNotification('Impossible de changer le muet', 'error');
    }
}

// Basculer la pause
function togglePause() {
    if (!currentCall) return;
    
    try {
        isPaused = !isPaused;
        
        if (isPaused) {
            currentCall.disconnect();
            pauseBtn.classList.add('active');
            pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            showNotification('Appel mis en pause', 'info');
        } else {
            // Reconnecter l'appel
            makeCall();
            pauseBtn.classList.remove('active');
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            showNotification('Appel repris', 'info');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la pause:', error);
        showNotification('Impossible de mettre en pause', 'error');
    }
}

// Basculer la mise en attente
function toggleHold() {
    if (!currentCall) return;
    
    try {
        isOnHold = !isOnHold;
        
        if (isOnHold) {
            currentCall.hold();
            holdBtn.classList.add('active');
            showNotification('Appel mis en attente', 'info');
        } else {
            currentCall.unhold();
            holdBtn.classList.remove('active');
            showNotification('Appel repris', 'info');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la mise en attente:', error);
        showNotification('Impossible de mettre en attente', 'error');
    }
}

// Basculer le haut-parleur
function toggleSpeaker() {
    if (!currentCall) return;
    
    try {
        isSpeakerOn = !isSpeakerOn;
        
        if (isSpeakerOn) {
            speakerBtn.classList.add('active');
            showNotification('Haut-parleur activé', 'info');
        } else {
            speakerBtn.classList.remove('active');
            showNotification('Haut-parleur désactivé', 'info');
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de haut-parleur:', error);
        showNotification('Impossible de changer le haut-parleur', 'error');
    }
}

// Afficher le dialogue de transfert
function showTransferDialog() {
    if (!currentCall) return;
    
    const number = prompt('Entrez le numéro de transfert:');
    if (number) {
        transferCall(number);
    }
}

// Transférer l'appel
async function transferCall(number) {
    if (!currentCall) return;
    
    try {
        // Envoyer la demande de transfert au serveur
        const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                callSid: currentCall.parameters.CallSid,
                to: number
            })
        });
        
        if (response.ok) {
            showNotification('Appel transféré', 'success');
            endCall();
        } else {
            throw new Error('Erreur lors du transfert');
        }
    } catch (error) {
        console.error('❌ Erreur lors du transfert:', error);
        showNotification('Impossible de transférer l\'appel', 'error');
    }
}

// Basculer l'enregistrement
function toggleRecording() {
    if (!currentCall) return;
    
    try {
        isRecording = !isRecording;
        
        if (isRecording) {
            recordBtn.classList.add('recording');
            showNotification('Enregistrement démarré', 'info');
        } else {
            recordBtn.classList.remove('recording');
            showNotification('Enregistrement arrêté', 'info');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement:', error);
        showNotification('Impossible de démarrer l\'enregistrement', 'error');
    }
}

// Mettre à jour l'interface des contrôles audio
function updateAudioControls(show) {
    if (show) {
        audioControls.style.display = 'block';
        audioSettings.style.display = 'block';
    } else {
        audioControls.style.display = 'none';
        audioSettings.style.display = 'none';
        
        // Réinitialiser les états
        isMuted = false;
        isPaused = false;
        isOnHold = false;
        isRecording = false;
        isSpeakerOn = false;
        
        // Réinitialiser les boutons
        muteBtn.classList.remove('muted');
        pauseBtn.classList.remove('active');
        holdBtn.classList.remove('active');
        speakerBtn.classList.remove('active');
        recordBtn.classList.remove('recording');
        
        muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
} 