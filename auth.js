// Authentication System for Budget Mobile App
// Handles PIN-based login with optional biometric authentication

const AUTH_CONFIG = {
    PIN_LENGTH: 4,
    LOCKOUT_DURATION: 30 * 1000, // 30 seconds
    MAX_ATTEMPTS: 3,
    STORAGE_KEYS: {
        PIN_HASH: 'budget_pin_hash',
        PIN_SALT: 'budget_pin_salt',
        SESSION: 'budget_session',
        BIOMETRIC_ENABLED: 'budget_biometric',
        LAST_ACTIVITY: 'budget_last_activity',
        FAILED_ATTEMPTS: 'budget_failed_attempts',
        LOCKOUT_UNTIL: 'budget_lockout_until',
        API_KEY: 'budget_api_key'
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

function initializeAuth() {
    // Check for legacy PIN (no salt)
    if (localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.PIN_HASH) && !localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.PIN_SALT)) {
        console.log('Legacy PIN detected, resetting...');
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.PIN_HASH);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.SESSION);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
    }

    const isSetup = checkIfPinExists();

    if (isSetup) {
        showLoginSection();
        checkBiometricSupport();
    } else {
        showSetupSection();
    }

    setupEventListeners();
}

// Check if PIN is already set
function checkIfPinExists() {
    return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.PIN_HASH) !== null;
}

// Show login section
function showLoginSection() {
    // Check lockout status
    if (isLockedOut()) {
        showLockoutMessage();
        return;
    }

    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('setupSection').classList.remove('active');
    document.getElementById('loginSubtitle').textContent = 'Enter your PIN to continue';

    // Focus first PIN input
    setTimeout(() => {
        document.getElementById('pin1').focus();
    }, 100);
}

// Check if user is locked out
function isLockedOut() {
    const lockoutUntil = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL);
    if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) {
        return true;
    }
    // Clear lockout if expired
    if (lockoutUntil) {
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS);
    }
    return false;
}

// Show lockout message
function showLockoutMessage() {
    const lockoutUntil = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL));
    const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);

    showError(`Too many failed attempts. Try again in ${remainingSeconds}s`);
    document.getElementById('loginSection').style.display = 'none';

    // Retry after lockout
    setTimeout(() => {
        showLoginSection();
    }, remainingSeconds * 1000);
}

// Show setup section
function showSetupSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('setupSection').classList.add('active');
    document.getElementById('loginSubtitle').textContent = 'Welcome! Set up your PIN';

    // Focus first setup PIN input
    setTimeout(() => {
        document.getElementById('setupPin1').focus();
    }, 100);
}

// Setup event listeners
function setupEventListeners() {
    // Login PIN inputs
    setupPinInputs(['pin1', 'pin2', 'pin3', 'pin4'], handleLogin);

    // Setup PIN inputs
    setupPinInputs(['setupPin1', 'setupPin2', 'setupPin3', 'setupPin4'], null, handleSetupPinComplete);

    // Biometric button
    document.getElementById('biometricBtn')?.addEventListener('click', handleBiometricLogin);

    // Setup button
    document.getElementById('setupBtn').addEventListener('click', handleSetupComplete);

    // Reset PIN
    document.getElementById('resetPin').addEventListener('click', (e) => {
        e.preventDefault();
        handleResetPin();
    });
}

// Setup PIN input behavior
function setupPinInputs(inputIds, onComplete, onChange) {
    inputIds.forEach((id, index) => {
        const input = document.getElementById(id);

        input.addEventListener('input', (e) => {
            const value = e.target.value;

            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }

            // Add filled class
            if (value) {
                e.target.classList.add('filled');

                // Move to next input
                if (index < inputIds.length - 1) {
                    document.getElementById(inputIds[index + 1]).focus();
                } else if (onComplete) {
                    // All digits entered
                    const pin = inputIds.map(id => document.getElementById(id).value).join('');
                    onComplete(pin);
                }
            } else {
                e.target.classList.remove('filled');
            }

            // Call onChange if provided
            if (onChange) {
                const pin = inputIds.map(id => document.getElementById(id).value).join('');
                onChange(pin);
            }
        });

        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                document.getElementById(inputIds[index - 1]).focus();
            }
        });

        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const digits = pastedData.replace(/\D/g, '').split('').slice(0, AUTH_CONFIG.PIN_LENGTH);

            digits.forEach((digit, i) => {
                if (inputIds[i]) {
                    document.getElementById(inputIds[i]).value = digit;
                    document.getElementById(inputIds[i]).classList.add('filled');
                }
            });

            if (digits.length === AUTH_CONFIG.PIN_LENGTH && onComplete) {
                onComplete(digits.join(''));
            }
        });
    });
}

// Handle setup PIN completion
function handleSetupPinComplete(pin) {
    const setupBtn = document.getElementById('setupBtn');
    if (pin.length === AUTH_CONFIG.PIN_LENGTH) {
        setupBtn.disabled = false;
    } else {
        setupBtn.disabled = true;
    }
}

// Handle setup completion
async function handleSetupComplete() {
    const pin = ['setupPin1', 'setupPin2', 'setupPin3', 'setupPin4']
        .map(id => document.getElementById(id).value)
        .join('');

    const apiKey = document.getElementById('setupApiKey').value.trim();

    if (pin.length !== AUTH_CONFIG.PIN_LENGTH) {
        showError('Please enter a 4-digit PIN');
        return;
    }

    if (!apiKey) {
        showError('Please enter your API Key');
        return;
    }

    // Generate random salt
    const salt = generateSalt();
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.PIN_SALT, salt);

    // Hash and store PIN
    const pinHash = await hashPin(pin, salt);
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.PIN_HASH, pinHash);

    // Store API Key
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.API_KEY, apiKey);

    // Ask about biometric
    if (await isBiometricAvailable()) {
        const enableBiometric = confirm('Would you like to enable fingerprint login for faster access?');
        if (enableBiometric) {
            await enableBiometric();
        }
    }

    // Login automatically after setup
    createSession();
    redirectToApp();
}

// Handle login
async function handleLogin(pin) {
    if (isLockedOut()) {
        showLockoutMessage();
        clearPinInputs(['pin1', 'pin2', 'pin3', 'pin4']);
        return;
    }

    const storedHash = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.PIN_HASH);
    const storedSalt = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.PIN_SALT);
    const enteredHash = await hashPin(pin, storedSalt);

    if (enteredHash === storedHash) {
        // Successful login
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS);
        createSession();
        redirectToApp();
    } else {
        // Failed login
        handleFailedAttempt();
        clearPinInputs(['pin1', 'pin2', 'pin3', 'pin4']);
        document.getElementById('pin1').focus();
    }
}

// Handle failed attempt
function handleFailedAttempt() {
    let attempts = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS) || '0');
    attempts++;
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS, attempts.toString());

    if (attempts >= AUTH_CONFIG.MAX_ATTEMPTS) {
        const lockoutUntil = Date.now() + AUTH_CONFIG.LOCKOUT_DURATION;
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString());
        showLockoutMessage();
    } else {
        showError(`Incorrect PIN. ${AUTH_CONFIG.MAX_ATTEMPTS - attempts} attempts remaining.`);
    }
}

// Generate random salt
function generateSalt() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Hash PIN using SHA-256 with salt
async function hashPin(pin, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create session
function createSession() {
    const sessionToken = generateSessionToken();
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SESSION, sessionToken);
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

// Generate session token
function generateSessionToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Redirect to app
function redirectToApp() {
    window.location.href = 'index.html';
}

// Clear PIN inputs
function clearPinInputs(inputIds) {
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        input.value = '';
        input.classList.remove('filled');
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');

    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 3000);
}

// Check biometric support
async function checkBiometricSupport() {
    const available = await isBiometricAvailable();
    const enabled = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.BIOMETRIC_ENABLED) === 'true';

    if (available && enabled) {
        document.getElementById('biometricSection').style.display = 'block';
    }
}

// Check if biometric is available
async function isBiometricAvailable() {
    // Check for Web Authentication API
    if (window.PublicKeyCredential) {
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            return available;
        } catch (error) {
            console.log('Biometric not available:', error);
            return false;
        }
    }
    return false;
}

// Enable biometric
async function enableBiometric() {
    try {
        // This is a simplified version - full implementation would use WebAuthn
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
        return true;
    } catch (error) {
        console.error('Failed to enable biometric:', error);
        return false;
    }
}

// Handle biometric login
async function handleBiometricLogin() {
    try {
        // Simplified biometric check - in production, use WebAuthn
        const biometricBtn = document.getElementById('biometricBtn');
        biometricBtn.textContent = '🔄 Authenticating...';

        // Simulate biometric authentication
        // In production, implement proper WebAuthn flow
        await new Promise(resolve => setTimeout(resolve, 1000));

        // For demo purposes, auto-login with biometric
        createSession();
        redirectToApp();
    } catch (error) {
        showError('Biometric authentication failed');
        document.getElementById('biometricBtn').textContent = '👆 Use Fingerprint';
    }
}

// Handle reset PIN
function handleResetPin() {
    const confirmed = confirm('Are you sure you want to reset your PIN? This will clear all authentication data.');

    if (confirmed) {
        // Clear all auth data
        Object.values(AUTH_CONFIG.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });

        // Reload to show setup
        location.reload();
    }
}

// Export functions for use in main app
window.BudgetAuth = {
    isAuthenticated: function () {
        const session = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION);
        const lastActivity = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);

        if (!session || !lastActivity) {
            return false;
        }

        // Check session timeout
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceActivity > AUTH_CONFIG.SESSION_TIMEOUT) {
            this.logout();
            return false;
        }

        // Update last activity
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
        return true;
    },

    getApiKey: function () {
        return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.API_KEY);
    },

    logout: function () {
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.SESSION);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
        window.location.href = 'login.html';
    },

    requireAuth: function () {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    }
};
