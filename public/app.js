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

// Système de notifications cyberpunk phreaking
const NotificationSystem = {
    container: null,
    notifications: new Map(),
    
    init() {
        this.container = document.getElementById('phreaking-notifications');
    },
    
    show(type, title, message, options = {}) {
        const id = Date.now() + Math.random();
        const notification = this.createNotification(id, type, title, message, options);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-suppression après délai
        const duration = options.duration || this.getDefaultDuration(type);
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
        
        return id;
    },
    
    createNotification(id, type, title, message, options) {
        const notification = document.createElement('div');
        notification.className = `phreaking-notification ${type}`;
        if (options.critical) notification.classList.add('critical');
        
        const icon = this.getIcon(type);
        const timestamp = new Date().toLocaleTimeString('fr-FR', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${icon}</span>
                <span class="notification-title">${title}</span>
            </div>
            <div class="notification-body">${message}</div>
            <div class="notification-timestamp">[${timestamp}]</div>
            <button class="notification-close" onclick="NotificationSystem.remove(${id})">&times;</button>
        `;
        
        return notification;
    },
    
    getIcon(type) {
        const icons = {
            success: '✓',
            warning: '⚠',
            error: '✗',
            info: 'ⓘ',
            system: '●'
        };
        return icons[type] || icons.info;
    },
    
    getDefaultDuration(type) {
        const durations = {
            success: 4000,
            warning: 6000,
            error: 8000,
            info: 5000,
            system: 7000
        };
        return durations[type] || 5000;
    },
    
    remove(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 400);
        }
    },
    
    clear() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    },
    
    // Méthodes de convenance
    success(title, message, options = {}) {
        return this.show('success', title, message, options);
    },
    
    warning(title, message, options = {}) {
        return this.show('warning', title, message, options);
    },
    
    error(title, message, options = {}) {
        return this.show('error', title, message, options);
    },
    
    info(title, message, options = {}) {
        return this.show('info', title, message, options);
    },
    
    system(title, message, options = {}) {
        return this.show('system', title, message, options);
    }
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
const closeModal = document.querySelector('.phreaking-close');

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
    // Initialiser le système de notifications
    NotificationSystem.init();
    
    // Notification de démarrage du système
    NotificationSystem.system('SYS_INIT', 'Terminal de communication initialisé', { duration: 3000 });
    
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
    // loadAudioDevices() sera appelé automatiquement après requestMicrophoneAccess()
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
                NotificationSystem.error('CALL_ERROR', 'Impossible de recevoir l\'appel entrant', { duration: 5000 });
            });
        } else {
            // Client déjà initialisé, gérer directement
            handleIncomingCallNotification(callData);
        }
    });
}

// Initialisation du clavier
function initializeKeypad() {
    const keys = document.querySelectorAll('.dial-key');
    
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
            updateConnectionStatus('online', 'Ligne active - Surveillance en cours');
            
            // Notification de connexion réussie
            NotificationSystem.success('COMM_READY', 'Ligne téléphonique active - Prêt pour les appels');
            
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
                NotificationSystem.error('CONNECTION_ERROR', 'Erreur de connexion. Veuillez réessayer.', { duration: 5000 });
            } else {
                NotificationSystem.error('AUDIO_ERROR', 'Erreur audio: ' + error.message, { duration: 5000 });
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
            // Jouer le son de connexion cyberpunk
            playConnectionSound();
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
        NotificationSystem.warning('CALL_INVALID', 'Numéro de cible invalide - Spécifiez une ligne', { duration: 3000 });
        return;
    }
    
    if (!device) {
        NotificationSystem.error('DEVICE_OFFLINE', 'Terminal hors ligne - Vérifiez la connexion', { duration: 5000 });
        return;
    }
    
    try {
        console.log('📞 Tentative d\'appel vers:', phoneNumber);
        NotificationSystem.info('CALL_ATTEMPT', `Tentative de connexion vers ${phoneNumber}`, { duration: 2000 });
        
        const params = {
            To: phoneNumber,
            From: settings.fromNumber
        };
        
        currentCall = await device.connect(params);
        console.log('✅ Appel initié avec succès via client Twilio');
        
        updateCallUI('calling');
        
        // Événements de l'appel
        currentCall.on('connect', () => {
            console.log('✅ Appel connecté:', currentCall);
            console.log('✅ Paramètres de connexion:', currentCall.parameters);
            console.log('✅ État de la connexion:', currentCall.status());
            updateCallUI('connected');
            startCallTimer();
            // Jouer le son de connexion cyberpunk
            playConnectionSound();
        });
        
        currentCall.on('disconnect', () => {
            console.log('📞 Appel déconnecté');
            endCall();
        });
        
        currentCall.on('error', (error) => {
            console.error('❌ Erreur d\'appel:', error);
            NotificationSystem.error('CALL_FAILED', 'Échec de connexion - Erreur de ligne', { duration: 5000 });
            endCall();
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initiation de l\'appel:', error);
        NotificationSystem.error('CALL_ERROR', 'Erreur d\'initiation - Vérifiez les paramètres', { duration: 5000 });
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
    // Jouer le son de modem 56k classique
    try {
        // Créer un élément audio pour le son de modem
        if (!window.modemAudio) {
            window.modemAudio = new Audio('/modem-56k.mp3');
            window.modemAudio.volume = 0.3; // Volume modéré
            window.modemAudio.loop = true; // Boucle continue
        }
        
        // Jouer le son de modem
        window.modemAudio.play().catch(error => {
            console.log('Impossible de jouer le son de modem:', error);
            // Fallback vers la synthèse sonore cyberpunk si le fichier audio échoue
            playCyberpunkRingtone();
        });
        
        // Notification cyberpunk pour le son de modem
        NotificationSystem.info('MODEM_SOUND', 'Son de modem 56k activé - Connexion en cours...', { duration: 2000 });
        
        // Répéter la sonnerie
        window.ringtoneInterval = setInterval(() => {
            if (incomingCallModal.style.display === 'block') {
                if (window.modemAudio && window.modemAudio.paused) {
                    window.modemAudio.play().catch(() => {
                        playCyberpunkRingtone();
                    });
                }
            }
        }, 2000);
    } catch (error) {
        console.log('Impossible de jouer la sonnerie modem:', error);
        // Fallback vers la synthèse sonore cyberpunk
        playCyberpunkRingtone();
    }
}

// Fonction de fallback avec synthèse sonore cyberpunk
function playCyberpunkRingtone() {
    // Créer un audio context pour générer un son cyberpunk de fallback
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const oscillator3 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        // Configuration des oscillateurs
        oscillator1.type = 'sawtooth';
        oscillator2.type = 'square';
        oscillator3.type = 'sine';
        
        // Fréquences cyberpunk (harmoniques)
        oscillator1.frequency.setValueAtTime(440, audioContext.currentTime); // La
        oscillator2.frequency.setValueAtTime(880, audioContext.currentTime); // La octave
        oscillator3.frequency.setValueAtTime(220, audioContext.currentTime); // La basse
        
        // Filtre pour un son plus "électronique"
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioContext.currentTime);
        filter.Q.setValueAtTime(8, audioContext.currentTime);
        
        // Modulation de fréquence pour effet glitch
        oscillator1.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.1);
        oscillator2.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1);
        oscillator3.frequency.exponentialRampToValueAtTime(330, audioContext.currentTime + 0.1);
        
        // Retour aux fréquences originales
        oscillator1.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.2);
        oscillator2.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
        oscillator3.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.2);
        
        // Gain avec enveloppe cyberpunk
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        
        // Connexions
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        oscillator3.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Démarrer les oscillateurs
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator3.start(audioContext.currentTime);
        
        // Arrêter après 0.8 secondes
        oscillator1.stop(audioContext.currentTime + 0.8);
        oscillator2.stop(audioContext.currentTime + 0.8);
        oscillator3.stop(audioContext.currentTime + 0.8);
        
    } catch (error) {
        console.log('Impossible de jouer la sonnerie cyberpunk de fallback:', error);
    }
}

// Arrêter la sonnerie
function stopRingtone() {
    if (window.ringtoneInterval) {
        clearInterval(window.ringtoneInterval);
        window.ringtoneInterval = null;
    }
    
    // Arrêter le son de modem
    if (window.modemAudio) {
        window.modemAudio.pause();
        window.modemAudio.currentTime = 0;
    }
}

// Jouer un son de connexion cyberpunk
function playConnectionSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Créer un son de "connexion établie" cyberpunk
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        // Configuration
        oscillator1.type = 'sine';
        oscillator2.type = 'triangle';
        
        // Fréquences ascendantes (connexion réussie)
        oscillator1.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
        
        oscillator2.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.3);
        
        // Filtre pour un son "digital"
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(150, audioContext.currentTime);
        
        // Enveloppe de gain
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        // Connexions
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Démarrer et arrêter
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.5);
        oscillator2.stop(audioContext.currentTime + 0.5);
        
    } catch (error) {
        console.log('Impossible de jouer le son de connexion cyberpunk:', error);
    }
}

// Terminer un appel
async function hangupCall() {
    if (currentCall) {
        try {
            await currentCall.disconnect();
            console.log('✅ Appel déconnecté avec succès');
            NotificationSystem.info('CALL_HANGUP', 'Déconnexion manuelle - Ligne fermée', { duration: 3000 });
        } catch (error) {
            console.error('❌ Erreur lors de la déconnexion:', error);
            NotificationSystem.error('CALL_ERROR', 'Erreur de déconnexion - Tentative de récupération', { duration: 5000 });
        }
    }
    
    if (incomingCall) {
        try {
            await incomingCall.reject();
            console.log('✅ Appel entrant rejeté');
            NotificationSystem.info('CALL_REJECT', 'Appel entrant rejeté - Ligne protégée', { duration: 3000 });
        } catch (error) {
            console.error('❌ Erreur lors du rejet:', error);
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
    
    // Notification de fin d'appel
    if (currentCall) {
        NotificationSystem.info('CALL_END', 'Connexion terminée - Ligne libérée', { duration: 3000 });
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
            callStatus.textContent = 'CONNECTING...';
            callBtn.classList.add('ringing');
            updateAudioControls(true);
            // Notification cyberpunk pour l'appel en cours
            NotificationSystem.info('CALL_INIT', 'Appel en cours - Connexion en cours...', { duration: 0 });
            break;
            
        case 'connected':
            callBtn.style.display = 'none';
            hangupBtn.style.display = 'flex';
            callInfoDiv.style.display = 'block';
            callStatus.textContent = 'CONNECTED';
            callBtn.classList.remove('ringing');
            updateAudioControls(true);
            // Notification cyberpunk pour la connexion réussie
            NotificationSystem.success('CALL_ACTIVE', 'Ligne connectée - Communication active', { duration: 4000 });
            break;
            
        case 'incoming':
            callBtn.style.display = 'none';
            hangupBtn.style.display = 'flex';
            callInfoDiv.style.display = 'block';
            callStatus.textContent = 'INCOMING_CALL';
            updateAudioControls(true);
            // Notification cyberpunk pour l'appel entrant
            NotificationSystem.warning('CALL_INCOMING', 'Appel entrant détecté - Ligne sollicitée', { duration: 0 });
            break;
            
        case 'idle':
        default:
            callBtn.style.display = 'flex';
            hangupBtn.style.display = 'none';
            callInfoDiv.style.display = 'none';
            callBtn.classList.remove('ringing');
            updateAudioControls(false);
            // Nettoyer les notifications d'appel persistantes
            NotificationSystem.clear();
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
        NotificationSystem.error('SETTINGS_ERROR', 'Veuillez remplir tous les champs', { duration: 3000 });
        return;
    }
    
    settings.identity = identity;
    settings.fromNumber = fromNumber;
    
    localStorage.setItem('identity', identity);
    localStorage.setItem('fromNumber', fromNumber);
    
    hideSettingsModal();
    NotificationSystem.success('SETTINGS_SAVED', 'Paramètres sauvegardés', { duration: 3000 });
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
        NotificationSystem.success('MIC_ACCESS', 'Accès microphone accordé - Audio système opérationnel');
        
        // Mettre à jour le statut de connexion
        updateConnectionStatus('online', 'Microphone activé');
        
        // Masquer le bouton d'accès au microphone
        micAccessBtn.style.display = 'none';
        
        // Charger automatiquement les périphériques audio
        await loadAudioDevices();
        
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
        
        NotificationSystem.error('MIC_ERROR', errorMessage, { duration: 5000 });
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
            NotificationSystem.warning('DEVICE_WARNING', 'Aucun microphone détecté', { duration: 4000 });
        }
        
        if (audioDevices.outputs.length === 0) {
            NotificationSystem.warning('DEVICE_WARNING', 'Aucun haut-parleur détecté', { duration: 4000 });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des périphériques audio:', error);
        NotificationSystem.error('DEVICE_ERROR', 'Impossible de charger les périphériques audio', { duration: 5000 });
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
            NotificationSystem.success('DEVICE_CHANGE', 'Microphone changé', { duration: 2000 });
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de microphone:', error);
        NotificationSystem.error('DEVICE_ERROR', 'Impossible de changer le microphone', { duration: 3000 });
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
            NotificationSystem.success('DEVICE_CHANGE', 'Haut-parleur changé', { duration: 2000 });
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de haut-parleur:', error);
        NotificationSystem.error('DEVICE_ERROR', 'Impossible de changer le haut-parleur', { duration: 3000 });
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
            NotificationSystem.info('AUDIO_CONTROL', 'Microphone coupé', { duration: 2000 });
        } else {
            muteBtn.classList.remove('muted');
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            NotificationSystem.info('AUDIO_CONTROL', 'Microphone activé', { duration: 2000 });
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de muet:', error);
        NotificationSystem.error('AUDIO_ERROR', 'Impossible de changer le muet', { duration: 3000 });
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
            NotificationSystem.info('CALL_CONTROL', 'Appel mis en pause', { duration: 2000 });
        } else {
            // Reconnecter l'appel
            makeCall();
            pauseBtn.classList.remove('active');
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            NotificationSystem.info('CALL_CONTROL', 'Appel repris', { duration: 2000 });
        }
    } catch (error) {
        console.error('❌ Erreur lors de la pause:', error);
        NotificationSystem.error('CALL_ERROR', 'Impossible de mettre en pause', { duration: 3000 });
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
            NotificationSystem.info('CALL_CONTROL', 'Appel mis en attente', { duration: 2000 });
        } else {
            currentCall.unhold();
            holdBtn.classList.remove('active');
            NotificationSystem.info('CALL_CONTROL', 'Appel repris', { duration: 2000 });
        }
    } catch (error) {
        console.error('❌ Erreur lors de la mise en attente:', error);
        NotificationSystem.error('CALL_ERROR', 'Impossible de mettre en attente', { duration: 3000 });
    }
}

// Basculer le haut-parleur
function toggleSpeaker() {
    if (!currentCall) return;
    
    try {
        isSpeakerOn = !isSpeakerOn;
        
        if (isSpeakerOn) {
            speakerBtn.classList.add('active');
            NotificationSystem.info('AUDIO_CONTROL', 'Haut-parleur activé', { duration: 2000 });
        } else {
            speakerBtn.classList.remove('active');
            NotificationSystem.info('AUDIO_CONTROL', 'Haut-parleur désactivé', { duration: 2000 });
        }
    } catch (error) {
        console.error('❌ Erreur lors du changement de haut-parleur:', error);
        NotificationSystem.error('AUDIO_ERROR', 'Impossible de changer le haut-parleur', { duration: 3000 });
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
            NotificationSystem.success('CALL_TRANSFER', 'Appel transféré', { duration: 3000 });
            endCall();
        } else {
            throw new Error('Erreur lors du transfert');
        }
    } catch (error) {
        console.error('❌ Erreur lors du transfert:', error);
        NotificationSystem.error('CALL_ERROR', 'Impossible de transférer l\'appel', { duration: 5000 });
    }
}

// Basculer l'enregistrement
function toggleRecording() {
    if (!currentCall) return;
    
    try {
        isRecording = !isRecording;
        
        if (isRecording) {
            recordBtn.classList.add('recording');
            NotificationSystem.info('RECORDING', 'Enregistrement démarré', { duration: 2000 });
        } else {
            recordBtn.classList.remove('recording');
            NotificationSystem.info('RECORDING', 'Enregistrement arrêté', { duration: 2000 });
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement:', error);
        NotificationSystem.error('RECORDING_ERROR', 'Impossible de démarrer l\'enregistrement', { duration: 3000 });
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