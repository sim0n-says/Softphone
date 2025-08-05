/**
 * Gestionnaire de carnet d'adresses moderne avec Tailwind CSS
 * Basé sur l'ancienne version qui fonctionnait
 */

// Système de carnet d'adresses et liste d'appels
class PhoneBookManager {
    constructor() {
        this.contacts = [];
        this.callList = [];
        this.currentCallIndex = -1;
        this.filteredContacts = [];
        this.searchTerm = '';
        
        this.init();
    }
    
    async init() {
        await this.loadContacts();
        this.setupEventListeners();
        this.renderPhoneBook();
        this.renderCallList();
        this.initializeTabSystem();
        
        // Initialiser l'en-tête dynamique pour l'onglet actif
        this.updateDynamicHeader('phonebook');
    }
    
    // Nouvelle fonction pour initialiser le système d'onglets uniformes
    initializeTabSystem() {
        // S'assurer que tous les panneaux ont les mêmes dimensions
        this.uniformizePanelDimensions();
        
        // Gérer les changements de fenêtre
        window.addEventListener('resize', () => {
            this.uniformizePanelDimensions();
        });
        
        // Observer les changements de contenu pour maintenir les dimensions
        this.setupContentObserver();
    }
    
    // Fonction pour uniformiser les dimensions des panneaux
    uniformizePanelDimensions() {
        const tabContents = document.querySelectorAll('.tab-content');
        const containers = document.querySelectorAll('.phonebook-container, .call-list-container, .data-stream-container');
        
        // Calculer la hauteur minimale basée sur l'écran
        const isMobile = window.innerWidth < 768;
        const minHeight = isMobile ? 400 : 500;
        const containerHeight = minHeight - 120; // moins le header et la zone de navigation
        
        // Appliquer les dimensions uniformes
        tabContents.forEach(content => {
            content.style.minHeight = `${minHeight}px`;
            content.style.height = `${minHeight}px`;
            content.style.width = '100%'; // Largeur fixe
        });
        
        containers.forEach(container => {
            container.style.height = `${containerHeight}px`;
            container.style.minHeight = `${containerHeight}px`;
            container.style.width = '100%'; // Largeur fixe
        });
        
        // S'assurer que la sidebar utilise la largeur complète
        const sidebarContainer = document.querySelector('.sidebar-container');
        if (sidebarContainer) {
            sidebarContainer.style.width = '100%';
        }
        
        console.log(`✅ Dimensions uniformisées: ${minHeight}px (containers: ${containerHeight}px)`);
    }
    
    // Observer les changements de contenu pour maintenir les dimensions
    setupContentObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Réappliquer les dimensions après les changements de contenu
                    setTimeout(() => {
                        this.uniformizePanelDimensions();
                    }, 100);
                }
            });
        });
        
        // Observer les changements dans les conteneurs
        const containersToObserve = document.querySelectorAll('#phonebook-list, #call-list, #logs-container');
        containersToObserve.forEach(container => {
            if (container) {
                observer.observe(container, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class']
                });
            }
        });
    }
    
    async loadContacts() {
        try {
            const response = await fetch('/api/contacts');
            if (response.ok) {
                this.contacts = await response.json();
                this.filteredContacts = [...this.contacts];
                console.log('📖 Contacts chargés:', this.contacts.length);
            } else {
                console.error('Erreur lors du chargement des contacts');
                this.contacts = [];
                this.filteredContacts = [];
            }
        } catch (error) {
            console.error('Erreur réseau:', error);
            // Utiliser des données de test si l'API n'est pas disponible
            this.contacts = [
                { nom_complet: 'John Doe', telephone: '+1234567890', organisation: 'Tech Corp', titre: 'Développeur' },
                { nom_complet: 'Jane Smith', telephone: '+0987654321', organisation: 'Design Inc', titre: 'Designer' },
                { nom_complet: 'Bob Johnson', telephone: '+1122334455', organisation: 'Marketing Ltd', titre: 'Manager' },
                { nom_complet: 'Alice Brown', telephone: '+1555666777', organisation: 'Sales Co', titre: 'Vendeur' },
                { nom_complet: 'Charlie Wilson', telephone: '+1888999000', organisation: 'Support LLC', titre: 'Support' }
            ];
            this.filteredContacts = [...this.contacts];
        }
    }
    
    setupEventListeners() {
        // Recherche dans le carnet d'adresses
        const searchInput = document.getElementById('phonebook-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterContacts();
                this.renderPhoneBook();
            });
        }
        
        // Boutons de navigation de la liste d'appels
        const prevBtn = document.getElementById('call-list-prev');
        const nextBtn = document.getElementById('call-list-next');
        const callBtn = document.getElementById('call-list-call');
        const removeBtn = document.getElementById('call-list-remove');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousCall());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextCall());
        if (callBtn) callBtn.addEventListener('click', () => this.callCurrentContact());
        if (removeBtn) removeBtn.addEventListener('click', () => this.removeCurrentFromList());
        
        // Gestion des onglets avec maintien des dimensions
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // Boutons supplémentaires
        const refreshContactsBtn = document.getElementById('refresh-contacts');
        const clearCallListBtn = document.getElementById('clear-call-list');
        const exportCallListBtn = document.getElementById('export-call-list');
        
        if (refreshContactsBtn) refreshContactsBtn.addEventListener('click', () => this.refreshContacts());
        if (clearCallListBtn) clearCallListBtn.addEventListener('click', () => this.clearCallList());
        if (exportCallListBtn) exportCallListBtn.addEventListener('click', () => this.exportCallList());
    }
    
    filterContacts() {
        if (!this.searchTerm) {
            this.filteredContacts = [...this.contacts];
        } else {
            this.filteredContacts = this.contacts.filter(contact => 
                contact.nom_complet.toLowerCase().includes(this.searchTerm) ||
                contact.telephone.includes(this.searchTerm) ||
                contact.organisation.toLowerCase().includes(this.searchTerm) ||
                contact.titre.toLowerCase().includes(this.searchTerm)
            );
        }
    }
    
    renderPhoneBook() {
        const container = document.getElementById('phonebook-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.filteredContacts.length === 0) {
            container.innerHTML = `
                <div class="text-center text-cyber-gray py-8">
                    <i class="fas fa-address-book text-4xl mb-4"></i>
                    <p>${this.searchTerm ? 'Aucun contact trouvé' : 'Aucun contact disponible'}</p>
                </div>
            `;
            return;
        }
        
        this.filteredContacts.forEach(contact => {
            const contactElement = this.createContactElement(contact);
            container.appendChild(contactElement);
        });
        
        // Maintenir les dimensions après le rendu
        setTimeout(() => {
            this.uniformizePanelDimensions();
        }, 50);
    }
    
    createContactElement(contact) {
        const div = document.createElement('div');
        div.className = 'contact-item bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg p-4 mb-3 hover:bg-cyber-blue/20 transition-all duration-200';
        
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="text-cyber-light font-semibold">${contact.nom_complet}</h4>
                    <p class="text-cyber-green font-mono text-sm">${contact.telephone}</p>
                    <p class="text-cyber-gray text-xs">${contact.organisation} - ${contact.titre}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="cyber-button bg-cyber-success/20 border-cyber-success/30 text-cyber-success hover:bg-cyber-success/30" 
                            onclick="phoneBookManager.callContact('${contact.telephone}')" title="Appeler">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="cyber-button bg-cyber-blue/20 border-cyber-blue/30 text-cyber-green hover:bg-cyber-blue/30" 
                            onclick="phoneBookManager.addToCallList('${contact.nom_complet}', '${contact.telephone}')" title="Ajouter à la liste">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }
    
    renderCallList() {
        const container = document.getElementById('call-list');
        const infoContainer = document.getElementById('call-list-info');
        const prevBtn = document.getElementById('call-list-prev');
        const nextBtn = document.getElementById('call-list-next');
        const callBtn = document.getElementById('call-list-call');
        const removeBtn = document.getElementById('call-list-remove');
        
        if (!container) return;
        
        // Mettre à jour les informations
        if (infoContainer) {
            if (this.callList.length === 0) {
                infoContainer.innerHTML = '<span class="text-cyber-gray">Liste vide</span>';
            } else {
                infoContainer.innerHTML = `
                    <span class="text-cyber-green">${this.callList.length} contact${this.callList.length > 1 ? 's' : ''}</span>
                    <span class="text-cyber-gray ml-2">Position: ${this.currentCallIndex + 1}/${this.callList.length}</span>
                `;
            }
        }
        
        // Afficher le contact courant
        if (this.callList.length === 0) {
            container.innerHTML = `
                <div class="text-center text-cyber-gray py-8">
                    <i class="fas fa-list text-4xl mb-4"></i>
                    <p>Aucun contact dans la liste</p>
                </div>
            `;
        } else if (this.currentCallIndex >= 0 && this.currentCallIndex < this.callList.length) {
            const currentContact = this.callList[this.currentCallIndex];
            container.innerHTML = `
                <div class="contact-item bg-cyber-dark/50 border border-cyber-green/30 rounded-lg p-4">
                    <div class="text-center">
                        <h4 class="text-cyber-light font-semibold text-lg mb-2">${currentContact.nom_complet}</h4>
                        <p class="text-cyber-green font-mono text-xl">${currentContact.telephone}</p>
                        <p class="text-cyber-gray text-sm mt-2">Liste d'appels</p>
                    </div>
                </div>
            `;
        }
        
        // Mettre à jour les boutons
        if (prevBtn) {
            prevBtn.disabled = this.currentCallIndex <= 0 || this.callList.length === 0;
            prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentCallIndex >= this.callList.length - 1 || this.callList.length === 0;
            nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
        }
        if (callBtn) {
            callBtn.disabled = this.callList.length === 0 || this.currentCallIndex < 0;
            callBtn.classList.toggle('opacity-50', callBtn.disabled);
        }
        if (removeBtn) {
            removeBtn.disabled = this.callList.length === 0 || this.currentCallIndex < 0;
            removeBtn.classList.toggle('opacity-50', removeBtn.disabled);
        }
        
        // Maintenir les dimensions après le rendu
        setTimeout(() => {
            this.uniformizePanelDimensions();
        }, 50);
    }
    
    // Fonction améliorée pour changer d'onglet avec structure unifiée
    switchTab(tabName) {
        console.log(`🔄 Changement d'onglet vers: ${tabName}`);
        
        // Désactiver tous les onglets et contenus
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activer le nouvel onglet
        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-content`);
        
        if (activeBtn && activeContent) {
            activeBtn.classList.add('active');
            activeContent.classList.add('active');
            
            // Mettre à jour l'en-tête dynamique
            this.updateDynamicHeader(tabName);
            
            // Forcer les dimensions uniformes immédiatement
            this.uniformizePanelDimensions();
            
            // Actions spécifiques selon l'onglet
            switch (tabName) {
                case 'phonebook':
                    this.renderPhoneBook();
                    break;
                case 'call-list':
                    this.renderCallList();
                    break;
                case 'history':
                    // Recharger les logs si nécessaire
                    if (typeof loadCallLogs === 'function') {
                        setTimeout(() => {
                            loadCallLogs();
                        }, 100);
                    }
                    break;
            }
            
            console.log(`✅ Onglet ${tabName} activé avec dimensions uniformes`);
        } else {
            console.error(`❌ Onglet ${tabName} non trouvé`);
        }
    }

    // Mettre à jour l'en-tête dynamique selon l'onglet
    updateDynamicHeader(tabName) {
        const titleElement = document.getElementById('dynamic-title');
        const controlsElement = document.getElementById('dynamic-controls');
        
        if (!titleElement || !controlsElement) return;
        
        switch (tabName) {
            case 'phonebook':
                titleElement.textContent = '/PHONEBOOK.db.interface';
                controlsElement.innerHTML = `
                    <button id="refresh-contacts" class="p-1.5 bg-cyber-green/10 border border-cyber-green/20 text-cyber-green hover:bg-cyber-green/20 rounded text-xs transition-all duration-200" title="Actualiser">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                `;
                break;
                
            case 'call-list':
                titleElement.textContent = '/CALL_LIST.interface';
                controlsElement.innerHTML = `
                    <button id="clear-call-list" class="p-1.5 bg-cyber-danger/10 border border-cyber-danger/20 text-cyber-danger hover:bg-cyber-danger/20 rounded text-xs transition-all duration-200" title="Vider la liste">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button id="export-call-list" class="p-1.5 bg-cyber-success/10 border border-cyber-success/20 text-cyber-success hover:bg-cyber-success/20 rounded text-xs transition-all duration-200" title="Exporter">
                        <i class="fas fa-download"></i>
                    </button>
                `;
                break;
                
            case 'history':
                titleElement.textContent = '/EXCHANGE.db.interface';
                controlsElement.innerHTML = `
                    <button onclick="forceLoadLogs()" class="p-1.5 bg-cyber-success/10 border border-cyber-success/20 text-cyber-success hover:bg-cyber-success/20 rounded text-xs transition-all duration-200" title="Force Load">
                        <i class="fas fa-download"></i>
                    </button>
                    <button onclick="testAPIDirect()" class="p-1.5 bg-cyber-warning/10 border border-cyber-warning/20 text-cyber-warning hover:bg-cyber-warning/20 rounded text-xs transition-all duration-200" title="Test API Direct">
                        <i class="fas fa-code"></i>
                    </button>
                    <button id="test-log-btn" class="p-1.5 bg-cyber-danger/10 border border-cyber-danger/20 text-cyber-danger hover:bg-cyber-danger/20 rounded text-xs transition-all duration-200" title="Test Log">
                        <i class="fas fa-bug"></i>
                    </button>
                    <button id="refresh-logs" class="p-1.5 bg-cyber-green/10 border border-cyber-green/20 text-cyber-green hover:bg-cyber-green/20 rounded text-xs transition-all duration-200" title="Actualiser">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button id="clear-logs" class="p-1.5 bg-cyber-danger/10 border border-cyber-danger/20 text-cyber-danger hover:bg-cyber-danger/20 rounded text-xs transition-all duration-200" title="Effacer">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                break;
        }
        
        // Réattacher les événements pour les nouveaux boutons
        this.reattachControlEvents();
    }

    // Réattacher les événements pour les contrôles dynamiques
    reattachControlEvents() {
        // Boutons du carnet d'adresses
        const refreshContactsBtn = document.getElementById('refresh-contacts');
        if (refreshContactsBtn) {
            refreshContactsBtn.addEventListener('click', () => this.refreshContacts());
        }
        
        // Boutons de la liste d'appels
        const clearCallListBtn = document.getElementById('clear-call-list');
        const exportCallListBtn = document.getElementById('export-call-list');
        
        if (clearCallListBtn) clearCallListBtn.addEventListener('click', () => this.clearCallList());
        if (exportCallListBtn) exportCallListBtn.addEventListener('click', () => this.exportCallList());
        
        // Les boutons de l'historique sont gérés par app.js
    }
    
    callContact(phone) {
        // Remplir le champ numéro et déclencher l'appel
        const phoneInput = document.getElementById('phone-number');
        if (phoneInput) {
            phoneInput.value = phone;
            phoneInput.setAttribute('data-text', phone);
            
            // Notification
            if (typeof showNotification !== 'undefined') {
                showNotification.success(`Contact sélectionné: ${phone}`, 2000);
            }
            
            // Focus sur l'input
            phoneInput.focus();
        }
    }
    
    addToCallList(name, phone) {
        // Vérifier si le contact n'est pas déjà dans la liste
        const exists = this.callList.some(contact => contact.telephone === phone);
        if (exists) {
            if (typeof showNotification !== 'undefined') {
                showNotification.warning('Contact déjà dans la liste', 2000);
            }
            return;
        }
        
        // Ajouter le contact
        this.callList.push({ nom_complet: name, telephone: phone });
        
        // Si c'est le premier contact, le sélectionner
        if (this.callList.length === 1) {
            this.currentCallIndex = 0;
        }
        
        this.renderCallList();
        
        if (typeof showNotification !== 'undefined') {
            showNotification.success(`${name} ajouté à la liste`, 2000);
        }
        
        // Animer l'ajout
        const item = document.querySelector('.call-list-item');
        if (item) {
            item.classList.add('highlight');
            setTimeout(() => {
                item.classList.remove('highlight');
            }, 500);
        }
    }
    
    previousCall() {
        if (this.currentCallIndex > 0) {
            this.currentCallIndex--;
            this.renderCallList();
        }
    }
    
    nextCall() {
        if (this.currentCallIndex < this.callList.length - 1) {
            this.currentCallIndex++;
            this.renderCallList();
        }
    }
    
    callCurrentContact() {
        if (this.currentCallIndex >= 0 && this.currentCallIndex < this.callList.length) {
            const contact = this.callList[this.currentCallIndex];
            this.callContact(contact.telephone);
        }
    }
    
    removeCurrentFromList() {
        if (this.currentCallIndex >= 0 && this.currentCallIndex < this.callList.length) {
            const removedContact = this.callList.splice(this.currentCallIndex, 1)[0];
            
            // Ajuster l'index
            if (this.currentCallIndex >= this.callList.length) {
                this.currentCallIndex = this.callList.length - 1;
            }
            
            this.renderCallList();
            
            if (typeof showNotification !== 'undefined') {
                showNotification.info(`${removedContact.nom_complet} retiré de la liste`, 2000);
            }
        }
    }
    
    async refreshContacts() {
        if (typeof showNotification !== 'undefined') {
            showNotification.info('Actualisation du carnet...', 2000);
        }
        
        await this.loadContacts();
        this.filterContacts();
        this.renderPhoneBook();
        
        if (typeof showNotification !== 'undefined') {
            showNotification.success(`${this.contacts.length} contacts chargés`, 2000);
        }
    }
    
    clearCallList() {
        if (this.callList.length === 0) return;
        
        if (confirm('Vider la liste d\'appels ?')) {
            this.callList = [];
            this.currentCallIndex = -1;
            this.renderCallList();
            
            if (typeof showNotification !== 'undefined') {
                showNotification.info('Liste d\'appels vidée', 2000);
            }
        }
    }
    
    exportCallList() {
        if (this.callList.length === 0) {
            if (typeof showNotification !== 'undefined') {
                showNotification.warning('Liste d\'appels vide', 2000);
            }
            return;
        }
        
        const data = this.callList.map(contact => `${contact.nom_complet}: ${contact.telephone}`).join('\n');
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-list-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        if (typeof showNotification !== 'undefined') {
            showNotification.success('Liste exportée', 2000);
        }
    }
}

// Initialiser le gestionnaire de carnet d'adresses
let phoneBookManager;

// Attendre le chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu que tous les autres scripts soient chargés
    setTimeout(() => {
        phoneBookManager = new PhoneBookManager();
        console.log('📱 PhoneBookManager initialisé avec système d\'onglets uniformes');
    }, 500);
}); 