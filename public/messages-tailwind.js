// Gestionnaire de messages SMS et MMS
class MessageManager {
    constructor() {
        this.smsLogs = [];
        this.mmsLogs = [];
        this.currentTab = 'sms';
    }

    async init() {
        console.log('📱 Initialisation du gestionnaire de messages');
        
        // Charger les messages
        await this.loadSMSLogs();
        await this.loadMMSLogs();
        
        // Configurer les événements
        this.setupEventListeners();
        
        // Afficher les messages
        this.renderSMSList();
        this.renderMMSList();
        
        // Configurer les événements Socket.IO
        this.setupSocketIO();
        
        console.log('📱 Gestionnaire de messages initialisé');
    }

    setupSocketIO() {
        // Écouter les nouveaux SMS entrants
        socket.on('incoming-sms', (smsData) => {
            console.log('📱 Nouveau SMS reçu:', smsData);
            this.smsLogs.unshift(smsData);
            this.renderSMSList();
            
            if (typeof showNotification !== 'undefined') {
                showNotification.info(`Nouveau SMS de ${smsData.from}`, 3000);
            }
        });

        // Écouter les nouveaux MMS entrants
        socket.on('incoming-mms', (mmsData) => {
            console.log('📷 Nouveau MMS reçu:', mmsData);
            this.mmsLogs.unshift(mmsData);
            this.renderMMSList();
            
            if (typeof showNotification !== 'undefined') {
                showNotification.info(`Nouveau MMS de ${mmsData.from}`, 3000);
            }
        });

        // Écouter les mises à jour de statut
        socket.on('sms-status-update', (data) => {
            this.updateSMSStatus(data.messageSid, data.status);
        });

        socket.on('mms-status-update', (data) => {
            this.updateMMSStatus(data.messageSid, data.status);
        });
    }

    setupEventListeners() {
        // Boutons SMS
        const newSMSBtn = document.getElementById('new-sms-btn');
        const refreshSMSBtn = document.getElementById('refresh-sms-btn');
        const clearSMSBtn = document.getElementById('clear-sms-btn');

        if (newSMSBtn) newSMSBtn.addEventListener('click', () => this.showComposeSMSModal());
        if (refreshSMSBtn) refreshSMSBtn.addEventListener('click', () => this.loadSMSLogs());
        if (clearSMSBtn) clearSMSBtn.addEventListener('click', () => this.clearSMSLogs());

        // Boutons MMS
        const newMMSBtn = document.getElementById('new-mms-btn');
        const refreshMMSBtn = document.getElementById('refresh-mms-btn');
        const clearMMSBtn = document.getElementById('clear-mms-btn');

        if (newMMSBtn) newMMSBtn.addEventListener('click', () => this.showComposeMMSModal());
        if (refreshMMSBtn) refreshMMSBtn.addEventListener('click', () => this.loadMMSLogs());
        if (clearMMSBtn) clearMMSBtn.addEventListener('click', () => this.clearMMSLogs());

        // Événements des modals
        this.setupModalEvents();
    }

    setupModalEvents() {
        // Compteur de caractères SMS
        const smsBody = document.getElementById('sms-body');
        if (smsBody) {
            smsBody.addEventListener('input', () => {
                const count = smsBody.value.length;
                const countElement = document.getElementById('sms-char-count');
                if (countElement) {
                    countElement.textContent = count;
                    countElement.className = count > 160 ? 'text-cyber-danger' : 'text-cyber-gray';
                }
            });
        }

        // Prévisualisation MMS
        const mmsMedia = document.getElementById('mms-media');
        if (mmsMedia) {
            mmsMedia.addEventListener('change', (e) => {
                this.handleMMSPreview(e.target.files[0]);
            });
        }
    }

    async loadSMSLogs() {
        try {
            const response = await fetch('/api/sms-logs');
            if (response.ok) {
                const data = await response.json();
                this.smsLogs = data.logs || [];
                console.log('📱 SMS chargés:', this.smsLogs.length);
                this.renderSMSList();
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des SMS:', error);
        }
    }

    async loadMMSLogs() {
        try {
            const response = await fetch('/api/mms-logs');
            if (response.ok) {
                const data = await response.json();
                this.mmsLogs = data.logs || [];
                console.log('📷 MMS chargés:', this.mmsLogs.length);
                this.renderMMSList();
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des MMS:', error);
        }
    }

    renderSMSList() {
        const container = document.getElementById('sms-list');
        if (!container) return;

        if (this.smsLogs.length === 0) {
            container.innerHTML = `
                <div class="text-center text-cyber-gray py-8">
                    <i class="fas fa-comment text-4xl mb-4"></i>
                    <p>Aucun SMS</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.smsLogs.map(sms => this.createSMSElement(sms)).join('');
    }

    renderMMSList() {
        const container = document.getElementById('mms-list');
        if (!container) return;

        if (this.mmsLogs.length === 0) {
            container.innerHTML = `
                <div class="text-center text-cyber-gray py-8">
                    <i class="fas fa-image text-4xl mb-4"></i>
                    <p>Aucun MMS</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.mmsLogs.map(mms => this.createMMSElement(mms)).join('');
    }

    createSMSElement(sms) {
        const direction = sms.direction === 'inbound' ? 'inbound' : 'outbound';
        const directionIcon = direction === 'inbound' ? 'fa-arrow-down' : 'fa-arrow-up';
        const directionColor = direction === 'inbound' ? 'text-cyber-green' : 'text-cyber-blue';
        const statusColor = this.getStatusColor(sms.status);
        
        return `
            <div class="sms-item bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg p-4 mb-3 hover:bg-cyber-blue/20 transition-all duration-200">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <i class="fas ${directionIcon} ${directionColor}"></i>
                        <span class="text-cyber-light font-mono text-sm">${sms.from}</span>
                        <span class="text-cyber-gray text-xs">→</span>
                        <span class="text-cyber-light font-mono text-sm">${sms.to}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-cyber-gray text-xs">${this.formatTimestamp(sms.timestamp)}</span>
                        <span class="px-2 py-1 rounded text-xs ${statusColor}">${sms.status}</span>
                    </div>
                </div>
                <div class="text-cyber-light text-sm mb-2">${sms.body}</div>
                <div class="flex justify-end space-x-2">
                    <button onclick="messageManager.replyToSMS('${sms.from}')" class="cyber-button bg-cyber-success/20 border-cyber-success/30 text-cyber-success hover:bg-cyber-success/30" title="Répondre">
                        <i class="fas fa-reply"></i>
                    </button>
                    <button onclick="messageManager.deleteSMS('${sms.id}')" class="cyber-button bg-cyber-danger/20 border-cyber-danger/30 text-cyber-danger hover:bg-cyber-danger/30" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    createMMSElement(mms) {
        const direction = mms.direction === 'inbound' ? 'inbound' : 'outbound';
        const directionIcon = direction === 'inbound' ? 'fa-arrow-down' : 'fa-arrow-up';
        const directionColor = direction === 'inbound' ? 'text-cyber-green' : 'text-cyber-blue';
        const statusColor = this.getStatusColor(mms.status);
        
        let mediaPreview = '';
        if (mms.mediaUrl) {
            if (mms.mediaType.startsWith('image/')) {
                mediaPreview = `<img src="${mms.mediaUrl}" class="w-16 h-16 object-cover rounded border border-cyber-blue/30" alt="Image">`;
            } else if (mms.mediaType.startsWith('video/')) {
                mediaPreview = `<div class="w-16 h-16 bg-cyber-dark/50 border border-cyber-blue/30 rounded flex items-center justify-center"><i class="fas fa-video text-cyber-blue"></i></div>`;
            } else if (mms.mediaType.startsWith('audio/')) {
                mediaPreview = `<div class="w-16 h-16 bg-cyber-dark/50 border border-cyber-blue/30 rounded flex items-center justify-center"><i class="fas fa-music text-cyber-blue"></i></div>`;
            } else {
                mediaPreview = `<div class="w-16 h-16 bg-cyber-dark/50 border border-cyber-blue/30 rounded flex items-center justify-center"><i class="fas fa-file text-cyber-blue"></i></div>`;
            }
        }
        
        return `
            <div class="mms-item bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg p-4 mb-3 hover:bg-cyber-blue/20 transition-all duration-200">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <i class="fas ${directionIcon} ${directionColor}"></i>
                        <span class="text-cyber-light font-mono text-sm">${mms.from}</span>
                        <span class="text-cyber-gray text-xs">→</span>
                        <span class="text-cyber-light font-mono text-sm">${mms.to}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-cyber-gray text-xs">${this.formatTimestamp(mms.timestamp)}</span>
                        <span class="px-2 py-1 rounded text-xs ${statusColor}">${mms.status}</span>
                    </div>
                </div>
                <div class="flex space-x-3">
                    ${mediaPreview}
                    <div class="flex-1">
                        ${mms.body ? `<div class="text-cyber-light text-sm mb-2">${mms.body}</div>` : ''}
                        <div class="text-cyber-gray text-xs">${mms.fileName || 'Fichier média'}</div>
                    </div>
                </div>
                <div class="flex justify-end space-x-2 mt-2">
                    <button onclick="messageManager.viewMMS('${mms.mediaUrl}')" class="cyber-button bg-cyber-blue/20 border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/30" title="Voir">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="messageManager.replyToMMS('${mms.from}')" class="cyber-button bg-cyber-success/20 border-cyber-success/30 text-cyber-success hover:bg-cyber-success/30" title="Répondre">
                        <i class="fas fa-reply"></i>
                    </button>
                    <button onclick="messageManager.deleteMMS('${mms.id}')" class="cyber-button bg-cyber-danger/20 border-cyber-danger/30 text-cyber-danger hover:bg-cyber-danger/30" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // === MODALS ===

    showComposeSMSModal() {
        const modal = document.getElementById('compose-sms-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Réinitialiser le formulaire
            const form = modal.querySelector('form');
            if (form) form.reset();
            document.getElementById('sms-char-count').textContent = '0';
        }
    }

    hideComposeSMSModal() {
        const modal = document.getElementById('compose-sms-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showComposeMMSModal() {
        const modal = document.getElementById('compose-mms-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Réinitialiser le formulaire
            const form = modal.querySelector('form');
            if (form) form.reset();
            document.getElementById('mms-preview').classList.add('hidden');
        }
    }

    hideComposeMMSModal() {
        const modal = document.getElementById('compose-mms-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // === ENVOI DE MESSAGES ===

    async sendSMS() {
        const to = document.getElementById('sms-to').value;
        const body = document.getElementById('sms-body').value;

        if (!to || !body) {
            if (typeof showNotification !== 'undefined') {
                showNotification.error('Tous les champs sont requis', 3000);
            }
            return;
        }

        try {
            const response = await fetch('/api/send-sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ to, body })
            });

            const result = await response.json();
            
            if (response.ok) {
                // Ajouter à la liste locale
                const smsData = {
                    id: result.sid,
                    direction: 'outbound',
                    from: 'softphone-user',
                    to: to,
                    body: body,
                    status: result.status,
                    timestamp: new Date().toISOString()
                };
                
                this.smsLogs.unshift(smsData);
                this.renderSMSList();
                
                this.hideComposeSMSModal();
                
                if (typeof showNotification !== 'undefined') {
                    showNotification.success('SMS envoyé avec succès', 2000);
                }
            } else {
                throw new Error(result.error || 'Erreur lors de l\'envoi');
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi du SMS:', error);
            if (typeof showNotification !== 'undefined') {
                showNotification.error(error.message, 3000);
            }
        }
    }

    async sendMMS() {
        const to = document.getElementById('mms-to').value;
        const body = document.getElementById('mms-body').value;
        const mediaFile = document.getElementById('mms-media').files[0];

        if (!to || !mediaFile) {
            if (typeof showNotification !== 'undefined') {
                showNotification.error('Destinataire et fichier média requis', 3000);
            }
            return;
        }

        try {
            const formData = new FormData();
            formData.append('to', to);
            formData.append('body', body || '');
            formData.append('media', mediaFile);

            const response = await fetch('/api/send-mms', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                // Ajouter à la liste locale
                const mmsData = {
                    id: result.sid,
                    direction: 'outbound',
                    from: 'softphone-user',
                    to: to,
                    body: body || '',
                    mediaUrl: result.mediaUrl,
                    mediaType: mediaFile.type,
                    fileName: mediaFile.name,
                    status: result.status,
                    timestamp: new Date().toISOString()
                };
                
                this.mmsLogs.unshift(mmsData);
                this.renderMMSList();
                
                this.hideComposeMMSModal();
                
                if (typeof showNotification !== 'undefined') {
                    showNotification.success('MMS envoyé avec succès', 2000);
                }
            } else {
                throw new Error(result.error || 'Erreur lors de l\'envoi');
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi du MMS:', error);
            if (typeof showNotification !== 'undefined') {
                showNotification.error(error.message, 3000);
            }
        }
    }

    // === UTILITAIRES ===

    handleMMSPreview(file) {
        const preview = document.getElementById('mms-preview');
        const previewImg = document.getElementById('mms-preview-img');
        const previewVideo = document.getElementById('mms-preview-video');
        const previewAudio = document.getElementById('mms-preview-audio');
        const previewFile = document.getElementById('mms-preview-file');
        const fileName = document.getElementById('mms-file-name');

        if (!file) {
            preview.classList.add('hidden');
            return;
        }

        preview.classList.remove('hidden');
        previewImg.style.display = 'none';
        previewVideo.style.display = 'none';
        previewAudio.style.display = 'none';
        previewFile.style.display = 'none';

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewVideo.src = e.target.result;
                previewVideo.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('audio/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewAudio.src = e.target.result;
                previewAudio.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            fileName.textContent = file.name;
            previewFile.style.display = 'block';
        }
    }

    replyToSMS(phoneNumber) {
        this.showComposeSMSModal();
        document.getElementById('sms-to').value = phoneNumber;
    }

    replyToMMS(phoneNumber) {
        this.showComposeMMSModal();
        document.getElementById('mms-to').value = phoneNumber;
    }

    viewMMS(mediaUrl) {
        window.open(mediaUrl, '_blank');
    }

    async deleteSMS(smsId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce SMS ?')) {
            return;
        }

        this.smsLogs = this.smsLogs.filter(sms => sms.id !== smsId);
        this.renderSMSList();
        
        if (typeof showNotification !== 'undefined') {
            showNotification.success('SMS supprimé', 2000);
        }
    }

    async deleteMMS(mmsId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce MMS ?')) {
            return;
        }

        this.mmsLogs = this.mmsLogs.filter(mms => mms.id !== mmsId);
        this.renderMMSList();
        
        if (typeof showNotification !== 'undefined') {
            showNotification.success('MMS supprimé', 2000);
        }
    }

    async clearSMSLogs() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer tous les SMS ?')) {
            return;
        }

        try {
            const response = await fetch('/api/sms-logs', {
                method: 'DELETE'
            });

            if (response.ok) {
                this.smsLogs = [];
                this.renderSMSList();
                
                if (typeof showNotification !== 'undefined') {
                    showNotification.success('Tous les SMS ont été supprimés', 2000);
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la suppression des SMS:', error);
        }
    }

    async clearMMSLogs() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer tous les MMS ?')) {
            return;
        }

        try {
            const response = await fetch('/api/mms-logs', {
                method: 'DELETE'
            });

            if (response.ok) {
                this.mmsLogs = [];
                this.renderMMSList();
                
                if (typeof showNotification !== 'undefined') {
                    showNotification.success('Tous les MMS ont été supprimés', 2000);
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la suppression des MMS:', error);
        }
    }

    updateSMSStatus(messageSid, status) {
        const sms = this.smsLogs.find(s => s.id === messageSid);
        if (sms) {
            sms.status = status;
            this.renderSMSList();
        }
    }

    updateMMSStatus(messageSid, status) {
        const mms = this.mmsLogs.find(m => m.id === messageSid);
        if (mms) {
            mms.status = status;
            this.renderMMSList();
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'delivered':
                return 'bg-cyber-success/20 text-cyber-success';
            case 'failed':
                return 'bg-cyber-danger/20 text-cyber-danger';
            case 'sent':
                return 'bg-cyber-blue/20 text-cyber-blue';
            default:
                return 'bg-cyber-gray/20 text-cyber-gray';
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialiser le gestionnaire de messages
let messageManager;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        messageManager = new MessageManager();
        await messageManager.init();
        
        // Rendre l'objet global
        window.messageManager = messageManager;
        
        console.log('📱 MessageManager initialisé');
    }, 1000);
}); 