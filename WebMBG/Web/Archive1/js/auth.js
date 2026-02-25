// Authentication System for Gas Monitoring Web App
const AuthSystem = {
    // Configuration
    config: {
        loginPassword: 'brinmbg123',
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        sessionKey: 'gas_monitor_auth_session',
        loginRedirectKey: 'gas_monitor_login_redirect'
    },

    // Check if user is authenticated
    isAuthenticated() {
        const sessionData = this.getSessionData();
        if (!sessionData) return false;
        
        // Check if session has expired
        const now = new Date().getTime();
        if (now > sessionData.expiresAt) {
            this.clearSession();
            return false;
        }
        
        return true;
    },

    // Get session data
    getSessionData() {
        try {
            const sessionJson = sessionStorage.getItem(this.config.sessionKey);
            return sessionJson ? JSON.parse(sessionJson) : null;
        } catch (error) {
            console.error('Error parsing session data:', error);
            return null;
        }
    },

    // Set session data
    setSessionData() {
        const now = new Date().getTime();
        const sessionData = {
            authenticated: true,
            loginTime: now,
            expiresAt: now + this.config.sessionTimeout
        };
        
        try {
            sessionStorage.setItem(this.config.sessionKey, JSON.stringify(sessionData));
            return true;
        } catch (error) {
            console.error('Error setting session data:', error);
            return false;
        }
    },

    // Clear session data
    clearSession() {
        try {
            sessionStorage.removeItem(this.config.sessionKey);
            sessionStorage.removeItem(this.config.loginRedirectKey);
        } catch (error) {
            console.error('Error clearing session data:', error);
        }
    },

    // Login with password
    login(password) {
        if (password === this.config.loginPassword) {
            if (this.setSessionData()) {
                return { success: true, message: 'Login successful' };
            } else {
                return { success: false, message: 'Failed to create session' };
            }
        } else {
            return { success: false, message: 'Invalid password' };
        }
    },

    // Logout
    logout() {
        this.clearSession();
        return { success: true, message: 'Logged out successfully' };
    },

    // Extend session
    extendSession() {
        if (this.isAuthenticated()) {
            return this.setSessionData();
        }
        return false;
    },

    // Get remaining session time in minutes
    getSessionTimeRemaining() {
        const sessionData = this.getSessionData();
        if (!sessionData) return 0;
        
        const now = new Date().getTime();
        const remaining = sessionData.expiresAt - now;
        return Math.max(0, Math.floor(remaining / (60 * 1000))); // Convert to minutes
    },

    // Save current page for redirect after login
    saveCurrentPage() {
        try {
            sessionStorage.setItem(this.config.loginRedirectKey, window.location.hash || '#dashboard');
        } catch (error) {
            console.error('Error saving current page:', error);
        }
    },

    // Get saved page for redirect
    getSavedPage() {
        try {
            return sessionStorage.getItem(this.config.loginRedirectKey) || '#dashboard';
        } catch (error) {
            console.error('Error getting saved page:', error);
            return '#dashboard';
        }
    }
};

// Auto-logout when session expires
let sessionCheckInterval;
function startSessionMonitor() {
    // Clear any existing interval
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    
    // Check session every minute
    sessionCheckInterval = setInterval(() => {
        if (!AuthSystem.isAuthenticated()) {
            // Session expired, redirect to login
            clearInterval(sessionCheckInterval);
            AuthSystem.saveCurrentPage();
            window.location.reload();
        } else {
            // Update session time remaining display
            updateSessionTimeRemaining();
        }
    }, 60 * 1000); // Check every minute
}

// Update session time remaining display
function updateSessionTimeRemaining() {
    const timeRemainingElement = document.getElementById('session-time-remaining');
    if (timeRemainingElement && AuthSystem.isAuthenticated()) {
        const minutesRemaining = AuthSystem.getSessionTimeRemaining();
        const hours = Math.floor(minutesRemaining / 60);
        const minutes = minutesRemaining % 60;
        
        let timeText = '';
        if (hours > 0) {
            timeText = `${hours}j ${minutes}m`;
        } else {
            timeText = `${minutes}m`;
        }
        
        timeRemainingElement.textContent = timeText;
    }
}

// Initialize authentication system
function initializeAuth() {
    // Check if user is authenticated
    if (!AuthSystem.isAuthenticated()) {
        // Show login screen
        showLoginScreen();
        return false;
    } else {
        // User is authenticated, hide login screen and show main app
        hideLoginScreen();
        startSessionMonitor();
        updateSessionTimeRemaining();
        return true;
    }
}

// Show login screen
function showLoginScreen() {
    // Create login overlay if it doesn't exist
    let loginOverlay = document.getElementById('login-overlay');
    if (!loginOverlay) {
        loginOverlay = document.createElement('div');
        loginOverlay.id = 'login-overlay';
        loginOverlay.className = 'login-overlay';
        document.body.appendChild(loginOverlay);
    }
    
    // Update login overlay content
    loginOverlay.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo">
                        <img src="BRIN.png" alt="BRIN Logo">
                        <h2>TestKitMBG BRIN</h2>
                        <p class="text-muted">Gas Monitoring System</p>
                    </div>
                </div>
                <div class="login-body">
                    <form id="login-form">
                        <div class="mb-3">
                            <label for="login-password" class="form-label">Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="login-password" placeholder="Masukkan password" required>
                                <button class="btn btn-outline-secondary" type="button" id="toggle-password">
                                    <i class="bi bi-eye" id="password-icon"></i>
                                </button>
                            </div>
                        </div>
                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary btn-lg">
                                <span class="login-spinner spinner-border spinner-border-sm d-none me-2" role="status"></span>
                                Login
                            </button>
                        </div>
                    </form>
                    <div id="login-error" class="alert alert-danger mt-3 d-none"></div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');
    const passwordIcon = document.getElementById('password-icon');
    
    // Handle form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Handle password visibility toggle
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Update icon
        if (type === 'password') {
            passwordIcon.className = 'bi bi-eye';
        } else {
            passwordIcon.className = 'bi bi-eye-slash';
        }
    });
    
    // Focus on password input
    setTimeout(() => {
        passwordInput.focus();
    }, 100);
}

// Hide login screen
function hideLoginScreen() {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) {
        loginOverlay.remove();
    }
}

// Handle login process
function handleLogin() {
    const passwordInput = document.getElementById('login-password');
    const loginSpinner = document.querySelector('.login-spinner');
    const loginError = document.getElementById('login-error');
    const submitButton = document.querySelector('#login-form button[type="submit"]');
    
    const password = passwordInput.value.trim();
    
    // Show loading state
    loginSpinner.classList.remove('d-none');
    submitButton.disabled = true;
    loginError.classList.add('d-none');
    
    // Simulate network delay for better UX
    setTimeout(() => {
        const result = AuthSystem.login(password);
        
        // Hide loading state
        loginSpinner.classList.add('d-none');
        submitButton.disabled = false;
        
        if (result.success) {
            // Login successful, redirect to saved page or dashboard
            const savedPage = AuthSystem.getSavedPage();
            window.location.hash = savedPage;
            window.location.reload();
        } else {
            // Login failed, show error
            loginError.textContent = result.message;
            loginError.classList.remove('d-none');
            passwordInput.focus();
            passwordInput.select();
        }
    }, 500);
}

// Handle logout process
function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        const result = AuthSystem.logout();
        if (result.success) {
            window.location.reload();
        }
    }
}

// Extend session when user is active
function extendSessionOnActivity() {
    let lastActivity = new Date().getTime();
    
    // Update last activity time
    function updateLastActivity() {
        lastActivity = new Date().getTime();
        
        // Extend session if authenticated
        if (AuthSystem.isAuthenticated()) {
            AuthSystem.extendSession();
            updateSessionTimeRemaining();
        }
    }
    
    // Add event listeners for user activity
    document.addEventListener('click', updateLastActivity);
    document.addEventListener('keypress', updateLastActivity);
    document.addEventListener('scroll', updateLastActivity);
    document.addEventListener('mousemove', updateLastActivity);
    
    // Check for inactivity every 5 minutes
    setInterval(() => {
        const now = new Date().getTime();
        const inactiveTime = now - lastActivity;
        
        // If inactive for more than 30 minutes, show warning
        if (inactiveTime > 30 * 60 * 1000 && AuthSystem.isAuthenticated()) {
            showInactivityWarning();
        }
    }, 60 * 1000); // Check every minute
}

// Show inactivity warning
function showInactivityWarning() {
    // Check if warning already exists
    let warningModal = document.getElementById('inactivity-warning-modal');
    if (warningModal) return;
    
    // Create warning modal
    warningModal = document.createElement('div');
    warningModal.id = 'inactivity-warning-modal';
    warningModal.className = 'modal fade';
    warningModal.setAttribute('tabindex', '-1');
    warningModal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Peringatan Inaktivitas</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Anda telah tidak aktif untuk beberapa waktu. Sesi akan berakhir dalam <span id="inactivity-countdown">5</span> menit.</p>
                    <p>Klik "Tetap Aktif" untuk melanjutkan sesi.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tetap Aktif</button>
                    <button type="button" class="btn btn-primary" id="extend-session-btn">Perpanjang Sesi</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(warningModal);
    
    // Show modal
    const modal = new bootstrap.Modal(warningModal);
    modal.show();
    
    // Start countdown
    let countdown = 5;
    const countdownElement = document.getElementById('inactivity-countdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            modal.hide();
            AuthSystem.logout();
            window.location.reload();
        }
    }, 60 * 1000); // Countdown every minute
    
    // Handle extend session button
    const extendSessionBtn = document.getElementById('extend-session-btn');
    if (extendSessionBtn) {
        extendSessionBtn.addEventListener('click', () => {
            clearInterval(countdownInterval);
            AuthSystem.extendSession();
            updateSessionTimeRemaining();
            modal.hide();
        });
    }
    
    // Handle modal close
    warningModal.addEventListener('hidden.bs.modal', () => {
        clearInterval(countdownInterval);
        warningModal.remove();
    });
}

// Export functions for use in other files
window.AuthSystem = AuthSystem;
window.initializeAuth = initializeAuth;
window.handleLogout = handleLogout;
window.extendSessionOnActivity = extendSessionOnActivity;