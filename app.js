// API Configuration
const API_URL = 'https://budget-api-iwiz.onrender.com';
// API Key is now retrieved from secure storage

// State
let currentType = 'expense';
let categories = [];
let transactions = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (window.BudgetAuth && !BudgetAuth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    initializeApp();
    setupEventListeners();
    setupActivityMonitoring();
});

async function initializeApp() {
    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();

    // Load data
    await loadCategories();
    await loadTransactions();
    await updateSummary();

    // Auto-refresh summary every 30 seconds to keep indicators updated
    setInterval(async () => {
        await updateSummary();
    }, 30000);
}

function setupEventListeners() {
    // FAB button
    document.getElementById('addTransactionBtn').addEventListener('click', openModal);

    // Close modal
    document.getElementById('closeModal').addEventListener('click', closeModal);

    // Click outside modal to close
    document.getElementById('transactionModal').addEventListener('click', (e) => {
        if (e.target.id === 'transactionModal') {
            closeModal();
        }
    });

    // Type toggle
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            filterCategories();
        });
    });

    // Form submission
    document.getElementById('transactionForm').addEventListener('submit', handleSubmit);
}

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BudgetAuth.getApiKey()
            }
        });
        categories = await response.json();
        filterCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Failed to load categories');
    }
}

// Filter categories based on type
function filterCategories() {
    const select = document.getElementById('category');
    select.innerHTML = '<option value="">Select category...</option>';

    const filtered = categories.filter(cat => {
        if (currentType === 'income') {
            return cat.type === 'income' || cat.type === 'both';
        } else {
            return cat.type === 'expense' || cat.type === 'both';
        }
    });

    filtered.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = `${cat.icon} ${cat.name}`;
        select.appendChild(option);
    });
}

// Load transactions from API
async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/transactions?_sort=date&_order=desc&_limit=10`, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BudgetAuth.getApiKey()
            }
        });
        transactions = await response.json();
        displayTransactions();
        // Update summary after loading transactions
        await updateSummary();
    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('Failed to load transactions');
    }
}

// Display transactions
function displayTransactions() {
    const container = document.getElementById('transactionsList');

    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>No transactions yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = transactions.map(t => {
        const date = new Date(t.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-title">${t.title}</div>
                    <div class="transaction-meta">${t.category} • ${date}</div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}€${Math.abs(t.amount).toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

// Calculate and update summary based on SALARY CYCLE
async function updateSummary() {
    try {
        // Get ALL transactions
        const response = await fetch(`${API_URL}/transactions`, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BudgetAuth.getApiKey()
            }
        });
        const allTransactions = await response.json();

        console.log('=== UPDATE SUMMARY DEBUG ===');
        console.log('Total transactions fetched:', allTransactions.length);

        // Find the most recent main salary to determine cycle
        const salaryTransactions = allTransactions
            .filter(t => t.isMainSalary === true)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('Salary transactions found:', salaryTransactions.length);

        let cycleStart;
        const now = new Date();

        if (salaryTransactions.length > 0) {
            // Use salary cycle - from last salary to NOW (no end date)
            const lastSalary = salaryTransactions[0];
            cycleStart = new Date(lastSalary.date);
            console.log('Last salary date:', lastSalary.date);
            console.log('Cycle start:', cycleStart.toLocaleString());
        } else {
            // Fallback to current month if no salary found
            cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
            console.log('No salary found, using month start:', cycleStart.toLocaleString());
        }

        // Filter transactions from salary cycle start to NOW
        const cycleTransactions = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= cycleStart && tDate <= now;
        });

        console.log('Cycle transactions (from', cycleStart.toLocaleDateString(), 'to now):', cycleTransactions.length);
        console.log('Cycle transactions:', cycleTransactions.map(t => ({
            title: t.title,
            amount: t.amount,
            type: t.type,
            date: new Date(t.date).toLocaleDateString()
        })));

        // Calculate totals
        const income = cycleTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expense = cycleTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const balance = income - expense;

        console.log('TOTALS:');
        console.log('Income:', income.toFixed(2));
        console.log('Expense:', expense.toFixed(2));
        console.log('Balance:', balance.toFixed(2));
        console.log('===========================');

        // Update UI
        document.getElementById('totalIncome').textContent = `€${income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `€${expense.toFixed(2)}`;
        document.getElementById('totalBalance').textContent = `€${balance.toFixed(2)}`;

    } catch (error) {
        console.error('Error updating summary:', error);
    }
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();

    const formData = {
        id: generateId(),
        title: document.getElementById('title').value,
        amount: parseFloat(document.getElementById('amount').value),
        type: currentType,
        category: document.getElementById('category').value,
        // Send simple date string - backend will convert to noon UTC
        date: document.getElementById('date').value, // "2025-11-26"
        isMainSalary: false
    };

    try {
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BudgetAuth.getApiKey()
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showToast('Transaction added successfully!');
            closeModal();
            resetForm();
            await loadTransactions();
            await updateSummary();
        } else {
            throw new Error('Failed to add transaction');
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
        showToast('Failed to add transaction');
    }
}

// Modal functions
function openModal() {
    document.getElementById('transactionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

function resetForm() {
    document.getElementById('transactionForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    currentType = 'expense';
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="expense"]').classList.add('active');
    filterCategories();
}

// Utility functions
function generateId() {
    return Math.random().toString(36).substring(2, 6);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Pull to refresh (optional enhancement)
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', async (e) => {
    touchEndY = e.changedTouches[0].clientY;

    // If pulled down from top
    if (touchEndY - touchStartY > 100 && window.scrollY === 0) {
        await loadTransactions();
        await updateSummary();
        showToast('Refreshed!');
    }
}, { passive: true });

// Activity monitoring for auto-logout
function setupActivityMonitoring() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
        document.addEventListener(event, () => {
            if (window.BudgetAuth) {
                // Update last activity timestamp
                localStorage.setItem('budget_last_activity', Date.now().toString());
            }
        }, { passive: true });
    });

    // Check session validity every minute
    setInterval(() => {
        if (window.BudgetAuth && !BudgetAuth.isAuthenticated()) {
            // Session expired, redirect to login
            window.location.href = 'login.html';
        }
    }, 60000); // Check every minute
}
