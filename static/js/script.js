// API Configuration
const API_BASE_URL = window.location.origin; // This will use your current domain;

// Stripe configuration
let stripe;
let elements;
let cardElement;

// Global State
let currentUser = null;
let paymentIntentId = null;

// DOM Elements
const elements_dom = {
    // Navigation
    navbar: document.getElementById('navbar'),
    navAuth: document.getElementById('nav-auth'),
    navUser: document.getElementById('nav-user'),
    userGreeting: document.getElementById('user-greeting'),
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Pages
    landingPage: document.getElementById('landing-page'),
    dashboard: document.getElementById('dashboard'),
    dashboardTitle: document.getElementById('dashboard-title'),
    
    // Dashboard sections
    donorDashboard: document.getElementById('donor-dashboard'),
    receiverDashboard: document.getElementById('receiver-dashboard'),
    
    // Lists
    myDonationsList: document.getElementById('my-donations-list'),
    availableDonationsList: document.getElementById('available-donations-list'),
    myClaimsList: document.getElementById('my-claims-list'),
    myPaymentsList: document.getElementById('my-payments-list'),
    
    // Buttons
    getStartedBtn: document.getElementById('get-started-btn'),
    learnMoreBtn: document.getElementById('learn-more-btn'),
    addDonationBtn: document.getElementById('add-donation-btn'),
    makePaymentBtn: document.getElementById('make-payment-btn'),
    
    // Modals
    loginModal: document.getElementById('login-modal'),
    registerModal: document.getElementById('register-modal'),
    addDonationModal: document.getElementById('add-donation-modal'),
    paymentModal: document.getElementById('payment-modal'),
    
    // Forms
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    addDonationForm: document.getElementById('add-donation-form'),
    
    // Payment elements
    donationAmount: document.getElementById('donation-amount'),
    summaryAmount: document.getElementById('summary-amount'),
    summaryTotal: document.getElementById('summary-total'),
    cardElement: document.getElementById('card-element'),
    cardErrors: document.getElementById('card-errors'),
    submitPayment: document.getElementById('submit-payment'),
    buttonText: document.getElementById('button-text'),
    paymentSpinner: document.getElementById('payment-spinner'),
    paymentFormContainer: document.getElementById('payment-form-container'),
    paymentSuccess: document.getElementById('payment-success'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeStripe();
    checkAuthStatus();
});

window.addEventListener('beforeunload', () => {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
});
// Initialize Stripe
async function initializeStripe() {
    try {
        const response = await fetch(`${API_BASE_URL}/payments/config`);
        const { publishable_key } = await response.json();
        
        stripe = Stripe(publishable_key);
        elements = stripe.elements();
        
        // Create card element
        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
                invalid: {
                    color: '#9e2146',
                },
            },
        });
        
    } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        showToast('Payment system initialization failed', 'error');
    }
}

// Event Listeners
function initializeEventListeners() {
    // Navigation
    elements_dom.loginBtn.addEventListener('click', () => showModal('login-modal'));
    elements_dom.registerBtn.addEventListener('click', () => showModal('register-modal'));
    elements_dom.logoutBtn.addEventListener('click', logout);
    
    // Hero buttons
    elements_dom.getStartedBtn.addEventListener('click', () => showModal('register-modal'));
    elements_dom.learnMoreBtn.addEventListener('click', scrollToDashboard);
    
    // Dashboard
    elements_dom.addDonationBtn.addEventListener('click', () => showModal('add-donation-modal'));
    elements_dom.makePaymentBtn.addEventListener('click', () => showModal('payment-modal'));
    
    // Forms
    elements_dom.loginForm.addEventListener('submit', handleLogin);
    elements_dom.registerForm.addEventListener('submit', handleRegister);
    elements_dom.addDonationForm.addEventListener('submit', handleAddDonation);
    
    // Payment form
    elements_dom.donationAmount.addEventListener('input', updatePaymentSummary);
    elements_dom.submitPayment.addEventListener('click', handlePayment);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.closest('.modal-close').dataset.modal;
            hideModal(modalId);
        });
    });
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideModal(overlay.id);
            }
        });
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = {
                id: data.user_id,
                role: data.role,
                email: email
            };
            
            // Get user details
            const userResponse = await fetch(`${API_BASE_URL}/users/${data.user_id}`);
            const userData = await userResponse.json();
            currentUser.name = userData.name;
            
            // Save to localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Login successful!', 'success');
            hideModal('login-modal');
            showDashboard();
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            hideModal('register-modal');
            showModal('login-modal');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    // Remove from localStorage
    localStorage.removeItem('currentUser');
    showLandingPage();
    showToast('Logged out successfully', 'success');
}

function checkAuthStatus() {
    // Check if user data exists in localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showLandingPage();
    }
}

// Donation Functions
async function handleAddDonation(e) {
    e.preventDefault();
    
    if (!currentUser || currentUser.role !== 'donor') {
        showToast('Only donors can add donations', 'error');
        return;
    }
    
    const itemName = document.getElementById('donation-item').value;
    const quantity = document.getElementById('donation-quantity').value;
    const expiryDate = document.getElementById('donation-expiry').value;
    const location = document.getElementById('donation-location').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/donations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                donor_id: currentUser.id,
                item_name: itemName,
                quantity: quantity,
                expiry_date: expiryDate,
                location: location
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Donation added successfully!', 'success');
            hideModal('add-donation-modal');
            elements_dom.addDonationForm.reset();
            loadMyDonations();
        } else {
            showToast(data.error || 'Failed to add donation', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

async function claimDonation(donationId) {
    if (!currentUser || currentUser.role !== 'receiver') {
        showToast('Only receivers can claim donations', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/donations/${donationId}/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                receiver_id: currentUser.id
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Donation claimed successfully!', 'success');
            loadAvailableDonations();
            loadMyClaims();
        } else {
            showToast(data.error || 'Failed to claim donation', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

// Payment Functions
function updatePaymentSummary() {
    const amount = parseFloat(elements_dom.donationAmount.value) || 0;
    elements_dom.summaryAmount.textContent = `$${amount.toFixed(2)}`;
    elements_dom.summaryTotal.textContent = `$${amount.toFixed(2)}`;
}

async function handlePayment(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please login to make a payment', 'error');
        return;
    }
    
    const amount = parseFloat(elements_dom.donationAmount.value);
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid donation amount', 'error');
        return;
    }
    
    setLoading(true);
    elements_dom.cardErrors.textContent = ''; // Clear previous errors
    
    try {
        // Create payment intent
        const response = await fetch(`${API_BASE_URL}/payments/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                donor_id: currentUser.id
            })
        });
        
        const { client_secret, payment_id } = await response.json();
        paymentIntentId = client_secret;
        
        if (!response.ok) {
            throw new Error('Failed to create payment intent');
        }
        
        // Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: currentUser.name,
                    email: currentUser.email,
                }
            }
        });
        
        if (error) {
            showPaymentError(error.message);
            setLoading(false);
            // Reset payment state
            paymentIntentId = null;
        } else if (paymentIntent.status === 'succeeded') {
            // Notify backend of successful payment
            await fetch(`${API_BASE_URL}/payments/success`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_intent_id: paymentIntent.id
                })
            });
            
            showPaymentSuccess();
            loadMyPayments();
            paymentIntentId = null; // Reset payment state
        }
        
    } catch (error) {
        showPaymentError('Payment failed. Please try again.');
        setLoading(false);
        paymentIntentId = null; // Reset payment state
    }
}

function showPaymentError(message) {
    elements_dom.cardErrors.textContent = message;
    showToast(message, 'error');
}

function showPaymentSuccess() {
    elements_dom.paymentFormContainer.classList.add('hidden');
    elements_dom.paymentSuccess.classList.remove('hidden');
}

function setLoading(isLoading) {
    elements_dom.submitPayment.disabled = isLoading;
    
    if (isLoading) {
        elements_dom.buttonText.classList.add('hidden');
        elements_dom.paymentSpinner.classList.remove('hidden');
    } else {
        elements_dom.buttonText.classList.remove('hidden');
        elements_dom.paymentSpinner.classList.add('hidden');
    }
}

function closePaymentModal() {
    hideModal('payment-modal');
    // Reset the modal
    elements_dom.paymentFormContainer.classList.remove('hidden');
    elements_dom.paymentSuccess.classList.add('hidden');
    elements_dom.donationAmount.value = '';
    elements_dom.cardErrors.textContent = '';
    updatePaymentSummary();
    paymentIntentId = null; // Reset payment state
    
    if (cardElement) {
        cardElement.clear();
    }
}

// Data Loading Functions
async function loadMyDonations() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/donations`);
        const donations = await response.json();
        
        if (donations.length === 0) {
            elements_dom.myDonationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h4>No donations yet</h4>
                    <p>Start sharing food with your community</p>
                </div>
            `;
        } else {
            elements_dom.myDonationsList.innerHTML = donations.map(donation => `
                <div class="donation-item">
                    <div class="donation-header">
                        <div class="donation-title">${donation.item_name}</div>
                        <span class="donation-status status-${donation.status}">${donation.status}</span>
                    </div>
                    <div class="donation-details">
                        <div class="donation-detail">
                            <i class="fas fa-calendar"></i>
                            <span>Added ${new Date(donation.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        elements_dom.myDonationsList.innerHTML = '<div class="loading">Failed to load donations</div>';
    }
}

async function loadAvailableDonations() {
    try {
        const response = await fetch(`${API_BASE_URL}/donations`);
        const donations = await response.json();
        
        if (donations.length === 0) {
            elements_dom.availableDonationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h4>No donations available</h4>
                    <p>Check back later for new donations</p>
                </div>
            `;
        } else {
            elements_dom.availableDonationsList.innerHTML = donations.map(donation => `
                <div class="donation-item">
                    <div class="donation-header">
                        <div class="donation-title">${donation.item_name}</div>
                        <span class="donation-status status-available">Available</span>
                    </div>
                    <div class="donation-details">
                        ${donation.quantity ? `
                            <div class="donation-detail">
                                <i class="fas fa-weight"></i>
                                <span>${donation.quantity}</span>
                            </div>
                        ` : ''}
                        ${donation.expiry_date ? `
                            <div class="donation-detail">
                                <i class="fas fa-clock"></i>
                                <span>Expires ${new Date(donation.expiry_date).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                        ${donation.location ? `
                            <div class="donation-detail">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${donation.location}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="donation-actions">
                        <button class="btn btn-success" onclick="claimDonation(${donation.id})">
                            <i class="fas fa-hand-holding-heart"></i>
                            Claim
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        elements_dom.availableDonationsList.innerHTML = '<div class="loading">Failed to load donations</div>';
    }
}

async function loadMyClaims() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/claims`);
        const claims = await response.json();
        
        if (claims.length === 0) {
            elements_dom.myClaimsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h4>No claims yet</h4>
                    <p>Browse available donations to get started</p>
                </div>
            `;
        } else {
            elements_dom.myClaimsList.innerHTML = claims.map(claim => `
                <div class="donation-item">
                    <div class="donation-header">
                        <div class="donation-title">Donation #${claim.donation_id}</div>
                        <span class="donation-status status-claimed">Claimed</span>
                    </div>
                    <div class="donation-details">
                        <div class="donation-detail">
                            <i class="fas fa-calendar"></i>
                            <span>Claimed ${new Date(claim.claim_time).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        elements_dom.myClaimsList.innerHTML = '<div class="loading">Failed to load claims</div>';
    }
}

async function loadMyPayments() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/payments`);
        const payments = await response.json();
        
        if (payments.length === 0) {
            elements_dom.myPaymentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <h4>No payments yet</h4>
                    <p>Make your first monetary donation to support the cause</p>
                </div>
            `;
        } else {
            elements_dom.myPaymentsList.innerHTML = payments.map(payment => `
                <div class="payment-item">
                    <div class="payment-header">
                        <div class="payment-amount">$${payment.amount.toFixed(2)}</div>
                        <span class="payment-status status-${payment.status}">${payment.status}</span>
                    </div>
                    <div class="payment-details">
                        <div class="payment-detail">
                            <i class="fas fa-calendar"></i>
                            <span>Made ${new Date(payment.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        elements_dom.myPaymentsList.innerHTML = '<div class="loading">Failed to load payment history</div>';
    }
}

// UI Functions
function showLandingPage() {
    elements_dom.landingPage.classList.remove('hidden');
    elements_dom.dashboard.classList.add('hidden');
    elements_dom.navAuth.classList.remove('hidden');
    elements_dom.navUser.classList.add('hidden');
}

function showDashboard() {
    elements_dom.landingPage.classList.add('hidden');
    elements_dom.dashboard.classList.remove('hidden');
    elements_dom.navAuth.classList.add('hidden');
    elements_dom.navUser.classList.remove('hidden');
    
    if (currentUser) {
        elements_dom.userGreeting.textContent = `Welcome, ${currentUser.name}`;
        elements_dom.dashboardTitle.textContent = `${currentUser.role === 'donor' ? 'Donor' : 'Receiver'} Dashboard`;
        
        if (currentUser.role === 'donor') {
            elements_dom.donorDashboard.classList.remove('hidden');
            elements_dom.receiverDashboard.classList.add('hidden');
            elements_dom.addDonationBtn.classList.remove('hidden');
            elements_dom.makePaymentBtn.classList.remove('hidden');
            loadMyDonations();
            loadMyPayments();
        } else {
            elements_dom.donorDashboard.classList.add('hidden');
            elements_dom.receiverDashboard.classList.remove('hidden');
            elements_dom.addDonationBtn.classList.add('hidden');
            elements_dom.makePaymentBtn.classList.add('hidden');
            loadAvailableDonations();
            loadMyClaims();
        }
    }
}

function scrollToDashboard() {
    if (currentUser) {
        showDashboard();
    } else {
        showModal('register-modal');
    }
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
    
    // Initialize Stripe elements for payment modal
    if (modalId === 'payment-modal' && cardElement) {
        setTimeout(() => {
            cardElement.mount('#card-element');
            updatePaymentSummary();
        }, 100);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Clean up payment modal
        if (modalId === 'payment-modal') {
            closePaymentModal();
        }
    }, 300);
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 
                 'fas fa-info-circle';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon ${icon}"></i>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    elements_dom.toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Smooth scrolling for better UX
function smoothScroll(target) {
    document.querySelector(target).scrollIntoView({
        behavior: 'smooth'
    });
}

// Add some interactive animations
function addInteractiveEffects() {
    // Add ripple effect to buttons
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Initialize interactive effects
setTimeout(addInteractiveEffects, 100);

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);