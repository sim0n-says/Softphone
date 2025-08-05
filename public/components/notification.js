/**
 * Composant de notification moderne avec Tailwind CSS
 * Version native sans dépendances aux anciennes classes CSS
 */

class CyberNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Créer le conteneur de notifications avec Tailwind
        this.container = document.createElement('div');
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
    }

    /**
     * Afficher une notification
     * @param {string} message - Message à afficher
     * @param {string} type - Type de notification (success, error, warning, info)
     * @param {number} duration - Durée d'affichage en ms (0 = permanent)
     */
    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);

        // Animation d'entrée avec Tailwind
        notification.classList.add('animate-notification-slide');

        // Auto-suppression après la durée spécifiée
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Créer l'élément de notification avec Tailwind
     */
    createNotification(message, type) {
        const notification = document.createElement('div');
        
        // Classes Tailwind de base
        const baseClasses = [
            'flex', 'items-center', 'p-4', 'rounded-lg', 'shadow-lg',
            'backdrop-blur-sm', 'border', 'min-w-80', 'max-w-md',
            'transform', 'transition-all', 'duration-300'
        ];

        // Classes selon le type avec Tailwind
        const typeClasses = this.getTypeClasses(type);
        
        notification.className = [...baseClasses, ...typeClasses].join(' ');

        // Icône selon le type
        const icon = this.getIcon(type);
        
        // Contenu HTML avec Tailwind
        notification.innerHTML = `
            <div class="flex-shrink-0 mr-3">
                <i class="${icon} text-lg"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-mono">${message}</p>
            </div>
            <div class="flex-shrink-0 ml-3">
                <button class="text-cyber-gray hover:text-cyber-light transition-colors duration-200" 
                        onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        return notification;
    }

    /**
     * Obtenir les classes Tailwind selon le type de notification
     */
    getTypeClasses(type) {
        const classes = {
            success: [
                'bg-cyber-success/20', 'border-cyber-success/30', 
                'text-cyber-success', 'shadow-cyber-success/20'
            ],
            error: [
                'bg-cyber-danger/20', 'border-cyber-danger/30', 
                'text-cyber-danger', 'shadow-cyber-danger/20'
            ],
            warning: [
                'bg-cyber-warning/20', 'border-cyber-warning/30', 
                'text-cyber-warning', 'shadow-cyber-warning/20'
            ],
            info: [
                'bg-cyber-blue/20', 'border-cyber-blue/30', 
                'text-cyber-green', 'shadow-cyber-blue/20'
            ]
        };

        return classes[type] || classes.info;
    }

    /**
     * Obtenir l'icône selon le type
     */
    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        return icons[type] || icons.info;
    }

    /**
     * Masquer une notification
     */
    hide(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Masquer toutes les notifications
     */
    hideAll() {
        const notifications = this.container.querySelectorAll('div');
        notifications.forEach(notification => {
            this.hide(notification);
        });
    }

    /**
     * Méthodes de commodité pour différents types
     */
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Instance globale
window.cyberNotification = new CyberNotification();

// Exemples d'utilisation
window.showNotification = {
    success: (msg, duration) => window.cyberNotification.success(msg, duration),
    error: (msg, duration) => window.cyberNotification.error(msg, duration),
    warning: (msg, duration) => window.cyberNotification.warning(msg, duration),
    info: (msg, duration) => window.cyberNotification.info(msg, duration)
};

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CyberNotification;
} 