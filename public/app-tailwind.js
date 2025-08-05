/**
 * Application Softphone moderne avec Tailwind CSS
 * Version native sans dépendances aux anciennes classes CSS
 */

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
    identity: 'softphone-user',
    fromNumber: localStorage.getItem('fromNumber') || '+18199754345'
};

// Éléments DOM avec Tailwind
let elements = {};

/**
 * Initialisation de l'application
 */
function initializeApp() {
    console.log('🚀 Initialisation de l\'application avec Tailwind CSS');
    
    // Initialiser les éléments DOM
    initializeElements();
    
    // Initialiser les événements
    initializeEvents();
    
    // Initialiser les composants
    initializeComponents();
    
    // Initialiser Twilio
    initializeTwilioClient();
    
    // Initialiser Socket.IO
    initializeSocket();
    
    // Afficher notification de démarrage
    showNotification.info('Application initialisée avec Tailwind CSS', 3000);
    
    // Informer l'utilisateur d'interagir pour activer l'audio
    setTimeout(() => {
        showNotification.info('Cliquez sur le pavé numérique pour activer l\'audio', 5000);
    }, 1000);
}

/**
 * Initialiser les éléments DOM avec Tailwind
 */
function initializeElements() {
    elements = {
        // Inputs
        phoneNumber: document.getElementById('phone-number'),
        
        // Boutons principaux
        callBtn: document.getElementById('call-btn'),
        hangupBtn: document.getElementById('hangup-btn'),
        clearBtn: document.getElementById('clear-btn'),
        
        // Informations d'appel
        callInfo: document.getElementById('call-info'),
        callStatus: document.getElementById('call-status'),
        callDuration: document.getElementById('call-duration'),
        
        // Statut de connexion
        connectionStatus: document.getElementById('connection-status'),
        configStatus: document.getElementById('config-status'),
        
        // Boutons de configuration
        settingsBtn: document.getElementById('settings-btn'),
        
        // Modals
        settingsModal: document.getElementById('settings-modal'),
        incomingCallModal: document.getElementById('incoming-call-modal'),
        
        // Contrôles audio
        muteBtn: document.getElementById('mute-btn'),
        holdBtn: document.getElementById('hold-btn'),
        speakerBtn: document.getElementById('speaker-btn'),
        recordBtn: document.getElementById('record-btn'),
        
        // Sélecteurs d'appareils
        inputDevice: document.getElementById('input-device'),
        outputDevice: document.getElementById('output-device'),
        
        // Formulaires
        settingsForm: document.getElementById('settings-form'),
        identity: document.getElementById('identity'),
        fromNumber: document.getElementById('from-number')
    };
}

/**
 * Initialiser les événements avec Tailwind
 */
function initializeEvents() {
    // Pavé numérique avec Tailwind
    initializeKeypad();
    
    // Boutons d'appel
    if (elements.callBtn) {
        elements.callBtn.addEventListener('click', makeCall);
    }
    
    if (elements.hangupBtn) {
        elements.hangupBtn.addEventListener('click', hangupCall);
    }
    
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', clearPhoneNumber);
    }
    
    // Configuration
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', showSettingsModal);
    }
    
    // Contrôles audio
    if (elements.muteBtn) {
        elements.muteBtn.addEventListener('click', toggleMute);
    }
    
    if (elements.holdBtn) {
        elements.holdBtn.addEventListener('click', toggleHold);
    }
    
    if (elements.speakerBtn) {
        elements.speakerBtn.addEventListener('click', toggleSpeaker);
    }
    
    if (elements.recordBtn) {
        elements.recordBtn.addEventListener('click', toggleRecording);
    }
    
    // Sélecteurs d'appareils
    if (elements.inputDevice) {
        elements.inputDevice.addEventListener('change', changeInputDevice);
    }
    
    if (elements.outputDevice) {
        elements.outputDevice.addEventListener('change', changeOutputDevice);
    }
    
    // Formulaire de configuration
    if (elements.settingsForm) {
        elements.settingsForm.addEventListener('submit', saveSettings);
    }
    
    // Fermeture des modals
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('phreaking-close')) {
            hideSettingsModal();
        }
    });
}

/**
 * Initialiser le pavé numérique avec Tailwind
 */
function initializeKeypad() {
    const keys = document.querySelectorAll('.dial-key');
    let audioInitialized = false;
    
    keys.forEach(key => {
        key.addEventListener('click', (e) => {
            const number = key.getAttribute('data-number');
            if (number) {
                addToPhoneNumber(number);
                highlightDTMFKey(number);
                playDTMFSound(number);
                
                // Initialiser l'audio après le premier clic
                if (!audioInitialized) {
                    initializeAudioContext();
                    requestMicrophoneAccess();
                    audioInitialized = true;
                    console.log('🎵 Audio initialisé après interaction utilisateur');
                }
            }
        });
        
        // Effet visuel au clic avec Tailwind
        key.addEventListener('mousedown', () => {
            key.classList.add('scale-95', 'bg-cyber-green/30', 'border-cyber-green/50');
        });
        
        key.addEventListener('mouseup', () => {
            key.classList.remove('scale-95', 'bg-cyber-green/30', 'border-cyber-green/50');
        });
        
        key.addEventListener('mouseleave', () => {
            key.classList.remove('scale-95', 'bg-cyber-green/30', 'border-cyber-green/50');
        });
    });
}

/**
 * Initialiser les composants avec Tailwind
 */
function initializeComponents() {
    // Initialiser les contrôles audio
    initializeAudioControls();
    
    // Charger les appareils audio
    loadAudioDevices();
    
    // Charger l'historique des appels
    loadCallHistory();
}

/**
 * Initialiser les contrôles audio avec Tailwind
 */
function initializeAudioControls() {
    // Masquer les contrôles audio au démarrage
    updateAudioControls(false);
    
    // Ne pas demander l'accès au microphone automatiquement
    // Il sera demandé après la première interaction utilisateur
    console.log('🎤 Accès au microphone en attente d\'interaction utilisateur');
}

/**
 * Initialiser Socket.IO
 */
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('🔌 Connecté au serveur Socket.IO');
        updateConnectionStatus('online', 'CONNECTED');
        showNotification.success('Connecté au serveur', 2000);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Déconnecté du serveur Socket.IO');
        updateConnectionStatus('offline', 'DISCONNECTED');
        showNotification.error('Déconnecté du serveur', 2000);
    });
    
    socket.on('incoming_call', (data) => {
        handleIncomingCallNotification(data);
    });
    
    socket.on('call_status_update', (data) => {
        handleCallStatusUpdate(data);
    });
}

/**
 * Initialiser le client Twilio
 */
async function initializeTwilioClient() {
    try {
        // Charger le SDK Twilio
        if (typeof Twilio === 'undefined') {
            console.error('SDK Twilio non chargé');
            showNotification.error('SDK Twilio non disponible', 5000);
            return;
        }
        
        // Obtenir un token Twilio
        console.log('🔑 Demande de token Twilio...');
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
        
        // Initialiser le device Twilio avec le token et une configuration optimisée
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
        
        // Événements du device
        device.on('ready', () => {
            console.log('✅ Client Twilio prêt');
            console.log('📱 Identité du client:', settings.identity);
            console.log('📱 État du device:', device.state);
            updateConnectionStatus('online', 'Ligne active');
            showNotification.success('Ligne téléphonique active - Prêt pour les appels', 2000);
            
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
                showNotification.error('Erreur de connexion. Veuillez réessayer.', 5000);
            } else if (error.message.includes('AudioContext')) {
                console.log('🔄 Erreur AudioContext détectée');
                showNotification.error('Erreur audio: ' + error.message, 5000);
            } else {
                showNotification.error(`Erreur Twilio: ${error.message}`, 5000);
            }
        });
        
        device.on('incoming', (connection) => {
            handleIncomingCall(connection);
        });
        
        device.on('connect', (connection) => {
            handleCallConnected(connection);
        });
        
        device.on('disconnect', (connection) => {
            handleCallDisconnected(connection);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation Twilio:', error);
        showNotification.error('Erreur d\'initialisation Twilio', 5000);
    }
}

/**
 * Ajouter un chiffre au numéro de téléphone
 */
function addToPhoneNumber(number) {
    if (elements.phoneNumber) {
        const currentValue = elements.phoneNumber.value;
        if (currentValue.length < 20) {
            elements.phoneNumber.value = currentValue + number;
        }
    }
}

/**
 * Effacer le numéro de téléphone
 */
function clearPhoneNumber() {
    if (elements.phoneNumber) {
        elements.phoneNumber.value = '';
    }
}

/**
 * Mettre à jour le statut de connexion avec Tailwind
 */
function updateConnectionStatus(status, text) {
    if (elements.connectionStatus) {
        // Retirer toutes les classes de statut
        elements.connectionStatus.classList.remove(
            'bg-red-500/20', 'text-red-400', 'border-red-500/30',
            'bg-cyber-success/20', 'text-cyber-success', 'border-cyber-success/30',
            'bg-cyber-warning/20', 'text-cyber-warning', 'border-cyber-warning/30'
        );
        
        // Ajouter les classes selon le statut
        switch (status) {
            case 'online':
                elements.connectionStatus.classList.add(
                    'bg-cyber-success/20', 'text-cyber-success', 'border-cyber-success/30'
                );
                break;
            case 'offline':
                elements.connectionStatus.classList.add(
                    'bg-red-500/20', 'text-red-400', 'border-red-500/30'
                );
                break;
            case 'connecting':
                elements.connectionStatus.classList.add(
                    'bg-cyber-warning/20', 'text-cyber-warning', 'border-cyber-warning/30'
                );
                break;
        }
        
        elements.connectionStatus.textContent = text;
    }
}

/**
 * Mettre en surbrillance une touche DTMF avec Tailwind
 */
function highlightDTMFKey(digit) {
    const key = document.querySelector(`[data-number="${digit}"]`);
    if (key) {
        key.classList.add('bg-cyber-green/30', 'border-cyber-green/50', 'scale-95');
        setTimeout(() => {
            key.classList.remove('bg-cyber-green/30', 'border-cyber-green/50', 'scale-95');
        }, 200);
    }
}

/**
 * Jouer un son DTMF
 */
function playDTMFSound(digit) {
    // Implémentation du son DTMF
    console.log(`🔊 Son DTMF: ${digit}`);
}

/**
 * Passer un appel
 */
async function makeCall() {
    if (!device) {
        showNotification.error('Device Twilio non initialisé', 3000);
        return;
    }
    
    const phoneNumber = elements.phoneNumber?.value;
    if (!phoneNumber) {
        showNotification.warning('Veuillez entrer un numéro de téléphone', 3000);
        return;
    }
    
    // Initialiser l'audio si ce n'est pas déjà fait
    if (!window.audioContext) {
        initializeAudioContext();
        await requestMicrophoneAccess();
    }
    
    try {
        console.log('📞 Tentative d\'appel vers:', phoneNumber);
        updateConnectionStatus('connecting', 'CONNECTING');
        showNotification.info(`Tentative de connexion vers ${phoneNumber}`, 2000);
        
        const params = {
            To: phoneNumber,
            From: settings.fromNumber
        };
        
        currentCall = await device.connect(params);
        console.log('✅ Appel initié avec succès via client Twilio');
        
        updateCallUI('connecting');
        
        // Événements de l'appel
        currentCall.on('connect', () => {
            console.log('✅ Appel connecté:', currentCall);
            console.log('✅ Paramètres de connexion:', currentCall.parameters);
            console.log('✅ État de la connexion:', currentCall.status());
            updateCallUI('connected');
            startCallTimer();
        });
        
        currentCall.on('disconnect', () => {
            console.log('📞 Appel déconnecté');
            handleCallDisconnected(currentCall);
        });
        
        currentCall.on('error', (error) => {
            console.error('❌ Erreur d\'appel:', error);
            showNotification.error('Échec de connexion - Erreur de ligne', 5000);
            handleCallDisconnected(currentCall);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initiation de l\'appel:', error);
        updateConnectionStatus('offline', 'ERROR');
        showNotification.error('Erreur d\'initiation - Vérifiez les paramètres', 5000);
    }
}

/**
 * Raccrocher l'appel
 */
async function hangupCall() {
    if (currentCall) {
        try {
            await currentCall.disconnect();
            currentCall = null;
            updateCallUI('idle');
            showNotification.info('Appel terminé', 2000);
        } catch (error) {
            console.error('❌ Erreur lors du raccrochage:', error);
        }
    }
}

/**
 * Mettre à jour l'interface d'appel avec Tailwind
 */
function updateCallUI(state) {
    const callInfo = elements.callInfo;
    const callBtn = elements.callBtn;
    const hangupBtn = elements.hangupBtn;
    
    switch (state) {
        case 'idle':
            if (callInfo) callInfo.classList.add('hidden');
            if (callBtn) callBtn.classList.remove('hidden');
            if (hangupBtn) hangupBtn.classList.add('hidden');
            break;
            
        case 'connecting':
            if (callInfo) {
                callInfo.classList.remove('hidden');
                if (elements.callStatus) {
                    elements.callStatus.textContent = 'CONNECTING...';
                }
            }
            if (callBtn) callBtn.classList.add('hidden');
            if (hangupBtn) hangupBtn.classList.remove('hidden');
            break;
            
        case 'connected':
            if (callInfo) {
                callInfo.classList.remove('hidden');
                if (elements.callStatus) {
                    elements.callStatus.textContent = 'CONNECTED';
                }
            }
            if (callBtn) callBtn.classList.add('hidden');
            if (hangupBtn) hangupBtn.classList.remove('hidden');
            startCallTimer();
            break;
    }
}

/**
 * Démarrer le timer d'appel
 */
function startCallTimer() {
    callDuration = 0;
    if (callTimer) clearInterval(callTimer);
    
    callTimer = setInterval(() => {
        callDuration++;
        if (elements.callDuration) {
            const minutes = Math.floor(callDuration / 60);
            const seconds = callDuration % 60;
            elements.callDuration.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

/**
 * Gérer un appel entrant
 */
function handleIncomingCall(connection) {
    console.log('📱 Appel entrant reçu:', connection.parameters);
    
    // Stocker l'appel entrant globalement
    window.incomingCall = connection;
    
    // Afficher les informations de l'appel entrant
    const fromNumber = connection.parameters.From || 'Numéro inconnu';
    const callerNumber = document.getElementById('caller-number');
    const callerInfo = document.getElementById('caller-info');
    
    if (callerNumber) callerNumber.textContent = fromNumber;
    if (callerInfo) callerInfo.textContent = 'Appel entrant...';
    
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
        window.incomingCall = null;
    });
    
    connection.on('disconnect', () => {
        console.log('Appel entrant déconnecté');
        hideIncomingCallModal();
        window.incomingCall = null;
    });
    
    if (typeof showNotification !== 'undefined') {
        showNotification.warning('Appel entrant', 0);
    }
}

/**
 * Afficher le modal d'appel entrant
 */
function showIncomingCallModal() {
    const modal = document.getElementById('incoming-call-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Ajouter une animation d'entrée
        modal.classList.add('animate-fade-in');
    }
}

/**
 * Masquer le modal d'appel entrant
 */
function hideIncomingCallModal() {
    const modal = document.getElementById('incoming-call-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('animate-fade-in');
    }
}

/**
 * Accepter un appel entrant
 */
function acceptIncomingCall() {
    if (window.incomingCall) {
        window.incomingCall.accept();
        if (window.socket) {
            window.socket.emit('incoming-call-accepted', window.incomingCall.parameters.CallSid);
        }
        hideIncomingCallModal();
        
        // Mettre à jour l'interface
        currentCall = window.incomingCall;
        startCallTimer();
        updateCallUI('connected');
        
        // Gérer les événements de l'appel
        window.incomingCall.on('disconnect', () => {
            console.log('Appel entrant terminé');
            endCall();
        });
        
        if (typeof showNotification !== 'undefined') {
            showNotification.success('Appel accepté', 2000);
        }
    } else {
        console.log('Aucun appel entrant à accepter');
        hideIncomingCallModal();
    }
}

/**
 * Rejeter un appel entrant
 */
function rejectIncomingCall() {
    if (window.incomingCall && window.incomingCall.parameters) {
        console.log('Appel entrant rejeté');
        window.incomingCall.reject();
        if (window.socket) {
            window.socket.emit('incoming-call-rejected', window.incomingCall.parameters.CallSid);
        }
        hideIncomingCallModal();
        window.incomingCall = null;
        
        if (typeof showNotification !== 'undefined') {
            showNotification.info('Appel rejeté', 2000);
        }
    } else {
        console.log('Aucun appel entrant à rejeter');
        hideIncomingCallModal();
    }
}

/**
 * Afficher le modal de configuration
 */
function showSettingsModal() {
    if (elements.settingsModal) {
        elements.settingsModal.style.display = 'flex';
        if (elements.identity) elements.identity.value = settings.identity;
        if (elements.fromNumber) elements.fromNumber.value = settings.fromNumber;
    }
}

/**
 * Masquer le modal de configuration
 */
function hideSettingsModal() {
    if (elements.settingsModal) {
        elements.settingsModal.style.display = 'none';
    }
}

/**
 * Sauvegarder les paramètres
 */
function saveSettings(event) {
    event.preventDefault();
    
    if (elements.identity && elements.fromNumber) {
        settings.identity = elements.identity.value;
        settings.fromNumber = elements.fromNumber.value;
        
        localStorage.setItem('fromNumber', settings.fromNumber);
        
        hideSettingsModal();
        showNotification.success('Paramètres sauvegardés', 3000);
    }
}

/**
 * Basculer le micro
 */
function toggleMute() {
    if (currentCall) {
        isMuted = !isMuted;
        currentCall.mute(isMuted);
        
        if (elements.muteBtn) {
            const icon = elements.muteBtn.querySelector('i');
            if (icon) {
                icon.className = isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
            }
        }
        
        showNotification.info(isMuted ? 'Micro coupé' : 'Micro activé', 2000);
    }
}

/**
 * Basculer la mise en attente
 */
function toggleHold() {
    if (currentCall) {
        isOnHold = !isOnHold;
        currentCall.hold(isOnHold);
        
        if (elements.holdBtn) {
            const icon = elements.holdBtn.querySelector('i');
            if (icon) {
                icon.className = isOnHold ? 'fas fa-play' : 'fas fa-pause';
            }
        }
        
        showNotification.info(isOnHold ? 'Appel en attente' : 'Appel repris', 2000);
    }
}

/**
 * Basculer le haut-parleur
 */
function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    
    if (elements.speakerBtn) {
        const icon = elements.speakerBtn.querySelector('i');
        if (icon) {
            icon.className = isSpeakerOn ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        }
    }
    
    showNotification.info(isSpeakerOn ? 'Haut-parleur activé' : 'Haut-parleur désactivé', 2000);
}

/**
 * Basculer l'enregistrement
 */
function toggleRecording() {
    isRecording = !isRecording;
    
    if (elements.recordBtn) {
        const icon = elements.recordBtn.querySelector('i');
        if (icon) {
            icon.className = isRecording ? 'fas fa-stop' : 'fas fa-circle';
        }
    }
    
    showNotification.info(isRecording ? 'Enregistrement démarré' : 'Enregistrement arrêté', 2000);
}

/**
 * Mettre à jour les contrôles audio
 */
function updateAudioControls(show) {
    const audioControls = document.getElementById('audio-controls');
    if (audioControls) {
        audioControls.style.display = show ? 'block' : 'none';
    }
}

/**
 * Demander l'accès au microphone
 */
async function requestMicrophoneAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        console.log('🎤 Accès au microphone accordé');
    } catch (error) {
        console.error('❌ Erreur d\'accès au microphone:', error);
        showNotification.error('Accès au microphone refusé', 5000);
    }
}

/**
 * Initialiser l'AudioContext après interaction utilisateur
 */
function initializeAudioContext() {
    // Créer un AudioContext seulement après interaction utilisateur
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioContextClass = AudioContext || webkitAudioContext;
        if (!window.audioContext) {
            window.audioContext = new AudioContextClass();
            console.log('🎵 AudioContext initialisé après interaction utilisateur');
        }
        
        // Résumer l'AudioContext si suspendu
        if (window.audioContext.state === 'suspended') {
            window.audioContext.resume().then(() => {
                console.log('🎵 AudioContext résumé');
            });
        }
    }
}

/**
 * Charger les appareils audio
 */
async function loadAudioDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        audioDevices.inputs = devices.filter(device => device.kind === 'audioinput');
        audioDevices.outputs = devices.filter(device => device.kind === 'audiooutput');
        
        populateDeviceSelect(elements.inputDevice, audioDevices.inputs, 'input');
        populateDeviceSelect(elements.outputDevice, audioDevices.outputs, 'output');
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des appareils audio:', error);
    }
}

/**
 * Peupler un sélecteur d'appareils
 */
function populateDeviceSelect(select, devices, type) {
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner...</option>';
    
    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `${type} ${device.deviceId.slice(0, 8)}`;
        select.appendChild(option);
    });
}

/**
 * Changer l'appareil d'entrée
 */
async function changeInputDevice() {
    if (elements.inputDevice) {
        const deviceId = elements.inputDevice.value;
        console.log('🎤 Changement d\'appareil d\'entrée:', deviceId);
        showNotification.info('Appareil d\'entrée changé', 2000);
    }
}

/**
 * Changer l'appareil de sortie
 */
async function changeOutputDevice() {
    if (elements.outputDevice) {
        const deviceId = elements.outputDevice.value;
        console.log('🔊 Changement d\'appareil de sortie:', deviceId);
        showNotification.info('Appareil de sortie changé', 2000);
    }
}

/**
 * Charger l'historique des appels
 */
async function loadCallHistory() {
    try {
        const response = await fetch('/api/call-logs');
        if (response.ok) {
            const data = await response.json();
            console.log('📋 Données de l\'historique chargées:', data);
            
            // Mettre à jour l'affichage
            displayCallHistory(data.logs || []);
            
            // Mettre à jour les statistiques
            if (data.statistics) {
                updateCallStats(data.statistics);
            }
        } else {
            console.error('❌ Erreur lors du chargement de l\'historique');
        }
    } catch (error) {
        console.error('❌ Erreur réseau lors du chargement de l\'historique:', error);
    }
}

/**
 * Afficher l'historique des appels
 */
function displayCallHistory(history) {
    const container = document.getElementById('logs-container');
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center text-cyber-gray py-8">
                <div class="loading-pulse mb-4">
                    <span class="inline-block w-2 h-2 bg-cyber-green rounded-full mx-1"></span>
                    <span class="inline-block w-2 h-2 bg-cyber-green rounded-full mx-1"></span>
                    <span class="inline-block w-2 h-2 bg-cyber-green rounded-full mx-1"></span>
                </div>
                <p>NO_CALLS_LOGGED</p>
            </div>
        `;
        return;
    }
    
    const logEntries = history.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString('fr-FR');
        const duration = log.duration ? formatDuration(log.duration) : 'N/A';
        
        return `
            <div class="log-entry bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg p-3 mb-2 hover:bg-cyber-blue/20 transition-all duration-200 cursor-pointer" onclick="handleLogEntryClick('${log.to}', '${log.direction}')">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-cyber-green font-mono text-xs">${log.direction.toUpperCase()}</span>
                    <span class="text-cyber-gray text-xs">${timestamp}</span>
                </div>
                <div class="flex items-center justify-center space-x-2 mb-2">
                    <span class="text-cyber-light">${log.from}</span>
                    <span class="text-cyber-green">→</span>
                    <span class="text-cyber-light">${log.to}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-cyber-green text-xs">${log.status.toUpperCase()}</span>
                    <span class="text-cyber-gray text-xs">${duration}</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = logEntries;
}

/**
 * Mettre à jour les statistiques
 */
function updateCallStats(stats) {
    const totalEl = document.getElementById('total-calls');
    const inboundEl = document.getElementById('inbound-calls');
    const outboundEl = document.getElementById('outbound-calls');
    const avgEl = document.getElementById('avg-duration');
    
    if (totalEl) totalEl.textContent = stats.total || 0;
    if (inboundEl) inboundEl.textContent = stats.inbound || 0;
    if (outboundEl) outboundEl.textContent = stats.outbound || 0;
    if (avgEl) avgEl.textContent = `${stats.averageDuration || 0}s`;
}

/**
 * Gérer le clic sur une entrée de log
 */
function handleLogEntryClick(callNumber, direction) {
    console.log('📞 Clic sur log:', callNumber, direction);
    
    // Pré-remplir le numéro de téléphone
    const phoneInput = document.getElementById('phone-number');
    if (phoneInput) {
        phoneInput.value = callNumber;
        phoneInput.setAttribute('data-text', callNumber);
        
        if (typeof showNotification !== 'undefined') {
            showNotification.success(`Numéro ${callNumber} sélectionné`, 2000);
        }
    }
}

/**
 * Formater la durée
 */
function formatDuration(durationMs) {
    if (!durationMs) return 'N/A';
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Effacer les logs d'appels
 */
async function clearCallLogs() {
    console.log('🗑️ Effacement des logs d\'appels...');
    try {
        const response = await fetch('/api/call-logs', {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Logs effacés avec succès');
            
            // Vider l'affichage
            const container = document.getElementById('logs-container');
            const countElement = document.getElementById('logs-count');
            
            if (container) {
                container.innerHTML = `
                    <div class="text-center text-cyber-gray py-8">
                        <div class="loading-pulse mb-4">
                            <span class="inline-block w-2 h-2 bg-cyber-green rounded-full mx-1"></span>
                            <span class="inline-block w-2 h-2 bg-cyber-green rounded-full mx-1"></span>
                            <span class="inline-block w-2 h-2 bg-cyber-green rounded-full mx-1"></span>
                        </div>
                        <p>NO_CALLS_LOGGED</p>
                    </div>
                `;
            }
            
            if (countElement) {
                countElement.textContent = '0 entrées';
            }
            
            // Réinitialiser les statistiques
            updateCallStats({
                total: 0,
                inbound: 0,
                outbound: 0,
                averageDuration: 0
            });
            
            if (typeof showNotification !== 'undefined') {
                showNotification.success('Historique effacé', 2000);
            }
        } else {
            console.error('Erreur lors de l\'effacement des logs:', data.error);
            if (typeof showNotification !== 'undefined') {
                showNotification.error('Impossible d\'effacer l\'historique', 3000);
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'effacement des logs:', error);
        if (typeof showNotification !== 'undefined') {
            showNotification.error('Erreur de connexion', 3000);
        }
    }
}

/**
 * Charger les logs d'appels (comme dans l'ancienne version)
 */
async function loadCallLogs() {
    console.log('📊 Chargement des logs d\'appels...');
    try {
        const response = await fetch('/api/call-logs');
        const data = await response.json();
        
        console.log('📊 Réponse API logs:', data);
        
        if (response.ok) {
            const container = document.getElementById('logs-container');
            const countElement = document.getElementById('logs-count');
            
            if (container && data.logs) {
                // Mettre à jour le compteur
                if (countElement) {
                    countElement.textContent = `${data.logs.length} entrée${data.logs.length !== 1 ? 's' : ''}`;
                }
                
                // Mettre à jour les statistiques
                if (data.statistics) {
                    updateCallStats(data.statistics);
                }
                
                // Afficher les logs
                displayCallHistory(data.logs);
                
                console.log('✅ Logs chargés avec succès');
            } else {
                console.error('❌ Container non trouvé ou données invalides');
            }
        } else {
            console.error('Erreur lors du chargement des logs:', data.error);
            if (typeof showNotification !== 'undefined') {
                showNotification.error('Impossible de charger les logs', 3000);
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des logs:', error);
        if (typeof showNotification !== 'undefined') {
            showNotification.error('Erreur de connexion', 3000);
        }
    }
}

/**
 * Gérer les mises à jour de statut d'appel
 */
function handleCallStatusUpdate(data) {
    console.log('📊 Mise à jour de statut:', data);
    // Implémentation des mises à jour de statut
}

/**
 * Gérer la connexion d'un appel
 */
function handleCallConnected(connection) {
    console.log('✅ Appel connecté');
    updateCallUI('connected');
    showNotification.success('Appel connecté', 2000);
}

/**
 * Gérer la déconnexion d'un appel
 */
function handleCallDisconnected(connection) {
    console.log('❌ Appel déconnecté');
    currentCall = null;
    updateCallUI('idle');
    if (callTimer) clearInterval(callTimer);
    showNotification.info('Appel terminé', 2000);
}

/**
 * Gérer les notifications d'appels entrants
 */
function handleIncomingCallNotification(callData) {
    console.log('📞 Notification d\'appel entrant:', callData);
    
    // Afficher les informations de l'appel entrant
    const fromNumber = callData.from || 'Numéro inconnu';
    const callerNumber = document.getElementById('caller-number');
    const callerInfo = document.getElementById('caller-info');
    
    if (callerNumber) callerNumber.textContent = fromNumber;
    if (callerInfo) callerInfo.textContent = 'Appel entrant...';
    
    // Afficher le modal
    showIncomingCallModal();
    
    // Stocker les données de l'appel pour référence
    window.incomingCallData = callData;
}

// Initialiser l'application au chargement
document.addEventListener('DOMContentLoaded', initializeApp); 