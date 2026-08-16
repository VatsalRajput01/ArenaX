// client/js/uiManager.js

// client/js/uiManager.js

const elements = {
    screens: {
        mainMenuPanel: document.getElementById('mainMenuPanel'),
        lobbyPanel: document.getElementById('lobbyPanel'),
        roomPanel: document.getElementById('roomPanel'),
        gamePanel: document.getElementById('gamePanel')
    },
    modals: {
        matchSummaryModal: document.getElementById('matchSummaryModal'),
        editNameModal: document.getElementById('editNameModal'),
        leaveConfirmModal: document.getElementById('leaveConfirmModal')
    },
    header: document.querySelector('.site-header'),
    ping: {
        badge: document.getElementById('pingBadge'),
        text: document.getElementById('pingText')
    }
};

const UIManager = {
    // Manages the visibility of primary application screens and layout headers
    showScreen: function (screenId) {
        Object.values(elements.screens).forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });

        if (elements.screens[screenId]) {
            elements.screens[screenId].classList.remove('hidden');
        }

        if (screenId === 'mainMenuPanel') {
            elements.header.classList.remove('hidden-header');
        } else {
            elements.header.classList.add('hidden-header');
        }
    },

    // Generates and displays transient toast notifications with associated SVG icons
    showToast: function (message, type = 'info', isSilent = false) {
        if (isSilent || !message) {
            console.log(`[Silent ${type.toUpperCase()}] ${message}`);
            return;
        }

        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';

            container.setAttribute('aria-live', 'polite');
            container.setAttribute('role', 'status');

            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const toastIcons = {
            info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
            success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
            warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
        };

        const iconSpan = document.createElement('span');
        iconSpan.className = 'flex-center';
        iconSpan.innerHTML = toastIcons[type] || toastIcons['info'];

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;

        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);
        container.appendChild(toast);

        setTimeout(() => {
            const isDesktop = window.innerWidth >= 768;
            if (isDesktop) {
                toast.classList.add('fade-out-desktop');
            } else {
                toast.classList.add('fade-out-mobile');
            }

            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    // Generates and displays top-level critical system alerts
    showSystemAlert: function (message) {
        let container = document.getElementById('system-alert-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'system-alert-container';

            container.setAttribute('aria-live', 'polite');
            container.setAttribute('role', 'status');

            document.body.appendChild(container);
        }

        container.innerHTML = '';

        const alertEl = document.createElement('div');
        alertEl.className = 'system-alert';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'system-alert-icon';

        const textSpan = document.createElement('span');
        textSpan.textContent = message;

        alertEl.appendChild(iconSpan);
        alertEl.appendChild(textSpan);
        container.appendChild(alertEl);

        requestAnimationFrame(() => {
            alertEl.classList.add('show-alert');
        });

        setTimeout(() => {
            if (alertEl.parentNode) {
                alertEl.classList.remove('show-alert');
                setTimeout(() => {
                    if (alertEl.parentNode) alertEl.remove();
                }, 400);
            }
        }, 3500);
    },

    // Controls visibility state for overlay modals
    showModal: function (modalId) {
        if (elements.modals[modalId]) elements.modals[modalId].classList.remove('hidden');
    },
    hideModal: function (modalId) {
        if (elements.modals[modalId]) elements.modals[modalId].classList.add('hidden');
    },

    // Controls visibility and state for the network latency badge
    togglePingBadge: function (show) {
        if (show) elements.ping.badge.classList.remove('hidden');
        else elements.ping.badge.classList.add('hidden');
    },
    updatePing: function (latency) {
        elements.ping.text.innerText = `${latency}`;
        elements.ping.badge.classList.remove('ping-green', 'ping-yellow', 'ping-red');

        if (latency < 100) elements.ping.badge.classList.add('ping-green');
        else if (latency < 250) elements.ping.badge.classList.add('ping-yellow');
        else elements.ping.badge.classList.add('ping-red');
    }
};

export default UIManager;