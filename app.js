/**
 * Hisab Nikash - Secure Digital Money Tracker Ledger
 * Core JS Logic - Login-Free (Taka Add / Taka Out Only)
 */

// --- Default Seeding Transactions ---
const DEFAULT_TRANSACTIONS = [
    { id: 'tx-1', amount: 7650, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-10' },
    { id: 'tx-2', amount: 3081, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-11' },
    { id: 'tx-3', amount: 2550, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-12' },
    { id: 'tx-4', amount: 11100, type: 'expense', desc: 'খরচ (Taka Out)', date: '2026-06-13' },
    { id: 'tx-5', amount: 5000, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-14' },
    { id: 'tx-6', amount: 30, type: 'expense', desc: 'খরচ (Taka Out)', date: '2026-06-15' },
    { id: 'tx-7', amount: 2040, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-16' },
    { id: 'tx-8', amount: 1530, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-17' },
    { id: 'tx-9', amount: 10005, type: 'expense', desc: 'খরচ (Taka Out)', date: '2026-06-18' },
    { id: 'tx-10', amount: 8252, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-19' },
    { id: 'tx-11', amount: 5510, type: 'expense', desc: 'খরচ (Taka Out)', date: '2026-06-20' },
    { id: 'tx-12', amount: 5000, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-21' },
    { id: 'tx-13', amount: 5000, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-21' },
    { id: 'tx-14', amount: 10010, type: 'expense', desc: 'খরচ (Taka Out)', date: '2026-06-21' },
    { id: 'tx-15', amount: 250, type: 'expense', desc: 'খরচ (Taka Out)', date: '2026-06-21' },
    { id: 'tx-16', amount: 22000, type: 'income', desc: 'জমা (Taka Add)', date: '2026-06-21' }
];

// --- App State ---
let state = {
    currentUser: null, // Holds anonymous firebase auth profile in cloud mode
    transactions: [],
    firebaseConfig: null,
    firebaseEnabled: false,
    githubToken: '',
    githubGistId: '',
    githubEnabled: false,
    activeTab: 'dashboard',
    theme: 'light' // 'light' or 'dark'
};

// --- Firebase references ---
let dbRef = null;
let unsubscribeAuth = null;
let firebaseUnsubscribes = [];

// ==========================================
// 1. Initialisation
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadLocalSettings();
    initAppNavigation();
    bindFormEvents();
    
    // Force clear and seed the user's requested transaction list
    if (!localStorage.getItem('hn_data_cleared_v3')) {
        localStorage.setItem('hn_transactions_local', JSON.stringify(DEFAULT_TRANSACTIONS));
        localStorage.setItem('hn_data_cleared_v3', 'true');
    }
    
    // Load settings and route data fetching
    if (state.firebaseEnabled && state.firebaseConfig) {
        initFirebase();
    } else if (state.githubEnabled && state.githubToken) {
        initGitHubSync();
    } else {
        loadLocalData();
    }
});

// Load settings from localStorage
function loadLocalSettings() {
    // Theme
    const savedTheme = localStorage.getItem('hn_theme');
    if (savedTheme) {
        state.theme = savedTheme;
        applyTheme(savedTheme);
    }

    // Firebase configurations
    const fbEnabled = localStorage.getItem('hn_fb_enabled') === 'true';
    state.firebaseEnabled = fbEnabled;
    document.getElementById('settings-firebase-switch').checked = fbEnabled;
    
    const fbConfig = localStorage.getItem('hn_fb_config');
    if (fbConfig) {
        try {
            state.firebaseConfig = JSON.parse(fbConfig);
            populateFirebaseFields(state.firebaseConfig);
        } catch (e) {
            console.error("Error loading Firebase config:", e);
        }
    }
    toggleFirebaseFieldsVisibility(fbEnabled);

    // GitHub configurations
    const ghEnabled = localStorage.getItem('hn_gh_enabled') === 'true';
    state.githubEnabled = ghEnabled;
    document.getElementById('settings-github-switch').checked = ghEnabled;
    
    const ghToken = localStorage.getItem('hn_gh_token') || '';
    state.githubToken = ghToken;
    document.getElementById('gh-token').value = ghToken;
    
    const ghGistId = localStorage.getItem('hn_gh_gist_id') || '';
    state.githubGistId = ghGistId;
    document.getElementById('gh-gist-id').value = ghGistId;
    
    toggleGitHubFieldsVisibility(ghEnabled);
}

// Initialise Theme settings UI
function initTheme() {
    const darkSwitch = document.getElementById('settings-dark-switch');
    darkSwitch.checked = state.theme === 'dark';
    
    darkSwitch.addEventListener('change', (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        state.theme = theme;
        applyTheme(theme);
        localStorage.setItem('hn_theme', theme);
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const currentTheme = state.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        state.theme = newTheme;
        darkSwitch.checked = newTheme === 'dark';
        applyTheme(newTheme);
        localStorage.setItem('hn_theme', newTheme);
    });
}

function applyTheme(theme) {
    const sunIcon = document.getElementById('theme-sun-icon');
    const moonIcon = document.getElementById('theme-moon-icon');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        document.body.classList.remove('dark-theme');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// Setup Tab Navigation
function initAppNavigation() {
    const navItems = document.querySelectorAll('nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    document.getElementById('nav-to-transactions').addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('transactions');
    });
}

function switchTab(tabName) {
    state.activeTab = tabName;
    
    // Update active class in Navigation
    document.querySelectorAll('nav .nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle panels visibility
    document.querySelectorAll('main .panel').forEach(panel => {
        if (panel.getAttribute('id') === `panel-${tabName}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Special renders when navigating tabs
    if (tabName === 'dashboard') {
        renderDashboard();
    } else if (tabName === 'transactions') {
        renderTransactionsList();
    } else if (tabName === 'statements') {
        initStatementFilters();
        renderStatements();
    } else if (tabName === 'settings') {
        renderSettings();
    }
}

// ==========================================
// 2. Firebase Cloud Integration (Silent Auth)
// ==========================================

function initFirebase() {
    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(state.firebaseConfig);
        }
        
        dbRef = firebase.firestore();
        updateConnectionStatus('cloud');

        // Silent anonymous authentication to isolate user documents safely
        firebase.auth().signInAnonymously()
            .then((cred) => {
                state.currentUser = cred.user;
                setupCloudListeners();
            })
            .catch(err => {
                console.error("Anonymous silent login failed:", err);
                updateConnectionStatus('offline');
                showToast("ক্লাউড সংযোগ ব্যর্থ হয়েছে!", "danger");
                loadLocalData();
            });

    } catch (e) {
        console.error("Firebase init failed, switching to local mode:", e);
        updateConnectionStatus('offline');
        showToast("ফায়ারবেস সংযোগ ব্যর্থ হয়েছে!", "danger");
        
        state.firebaseEnabled = false;
        document.getElementById('settings-firebase-switch').checked = false;
        localStorage.setItem('hn_fb_enabled', 'false');
        loadLocalData();
    }
}

function updateConnectionStatus(mode) {
    const badge = document.getElementById('sync-status');
    badge.className = 'connection-badge';
    
    if (mode === 'cloud') {
        badge.classList.add('cloud');
        badge.textContent = 'ক্লাউড সিঙ্ক';
    } else if (mode === 'github') {
        badge.classList.add('github');
        badge.textContent = 'গিটহাব সিঙ্ক';
    } else if (mode === 'github_loading') {
        badge.classList.add('github_loading');
        badge.textContent = 'গিটহাব লোড...';
    } else if (mode === 'offline') {
        badge.classList.add('offline');
        badge.textContent = 'অফলাইন';
    } else {
        badge.classList.add('local');
        badge.textContent = 'স্থানীয় মেমরি';
    }
}

// ==========================================
// 2b. GitHub Gist Data Integration
// ==========================================

function initGitHubSync() {
    if (!state.githubToken) {
        updateConnectionStatus('local');
        loadLocalData();
        return;
    }
    
    updateConnectionStatus('github_loading');
    
    if (state.githubGistId) {
        fetch(`https://api.github.com/gists/${state.githubGistId}`, {
            headers: {
                'Authorization': `token ${state.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        .then(response => {
            if (response.status === 404) {
                throw new Error("Gist not found");
            }
            if (!response.ok) {
                throw new Error("GitHub error: " + response.statusText);
            }
            return response.json();
        })
        .then(gist => {
            const file = gist.files['hisab_nikash_data.json'];
            if (file && file.content) {
                state.transactions = JSON.parse(file.content);
                updateConnectionStatus('github');
                showToast("গিটহাব থেকে ডাটা লোড করা হয়েছে!", "success");
                updateUIState();
            } else {
                saveDataToGitHub();
            }
        })
        .catch(err => {
            console.error("Error loading from Gist:", err);
            showToast("গিটহাব ডাটা লোড করা যায়নি! অফলাইন ডাটা ব্যবহার করা হচ্ছে।", "danger");
            loadLocalData();
        });
    } else {
        createGistAndSync();
    }
}

function createGistAndSync() {
    updateConnectionStatus('github_loading');
    
    if (state.transactions.length === 0) {
        state.transactions = JSON.parse(localStorage.getItem('hn_transactions_local') || '[]');
        if (state.transactions.length === 0) {
            state.transactions = DEFAULT_TRANSACTIONS;
        }
    }
    
    fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `token ${state.githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            description: "Hisab Nikash App Data Sync",
            public: false,
            files: {
                "hisab_nikash_data.json": {
                    "content": JSON.stringify(state.transactions)
                }
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("GitHub error: " + response.statusText);
        }
        return response.json();
    })
    .then(gist => {
        state.githubGistId = gist.id;
        localStorage.setItem('hn_gh_gist_id', gist.id);
        document.getElementById('gh-gist-id').value = gist.id;
        updateConnectionStatus('github');
        showToast("গিটহাবে নতুন ডাটা ব্যাকআপ তৈরি হয়েছে!", "success");
        updateUIState();
    })
    .catch(err => {
        console.error("Error creating Gist:", err);
        showToast("গিটহাবে ব্যাকআপ ফাইল তৈরি করতে ব্যর্থ!", "danger");
        loadLocalData();
    });
}

function saveDataToGitHub() {
    if (!state.githubToken || !state.githubGistId) {
        return;
    }
    
    fetch(`https://api.github.com/gists/${state.githubGistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${state.githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            files: {
                "hisab_nikash_data.json": {
                    "content": JSON.stringify(state.transactions)
                }
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("GitHub error: " + response.statusText);
        }
        updateConnectionStatus('github');
    })
    .catch(err => {
        console.error("Error saving to Gist:", err);
        showToast("গিটহাবে ডাটা ব্যাকআপ করা যায়নি!", "danger");
    });
}

function handleSaveGitHubConfig() {
    const token = document.getElementById('gh-token').value.trim();
    const gistId = document.getElementById('gh-gist-id').value.trim();

    if (!token) {
        showToast("গিটহাব পার্সোনাল অ্যাক্সেস টোকেন দিন!", "danger");
        return;
    }

    state.githubToken = token;
    state.githubGistId = gistId;
    localStorage.setItem('hn_gh_token', token);
    localStorage.setItem('hn_gh_gist_id', gistId);

    showToast("গিটহাব কনফিগারেশন সংরক্ষিত হয়েছে!", "success");

    if (state.githubEnabled) {
        initGitHubSync();
    }
}

function handleGitHubSyncNow() {
    if (!state.githubToken) {
        showToast("গিটহাব টোকেন সেট করা নেই!", "danger");
        return;
    }
    initGitHubSync();
}

function handleGitHubToggle(e) {
    const enabled = e.target.checked;
    state.githubEnabled = enabled;
    localStorage.setItem('hn_gh_enabled', enabled ? 'true' : 'false');
    toggleGitHubFieldsVisibility(enabled);

    if (enabled) {
        state.firebaseEnabled = false;
        document.getElementById('settings-firebase-switch').checked = false;
        localStorage.setItem('hn_fb_enabled', 'false');
        toggleFirebaseFieldsVisibility(false);
        clearCloudListeners();
        
        if (!state.githubToken) {
            showToast("অনুগ্রহ করে গিটহাব টোকেন ইনপুট করুন!", "info");
            updateConnectionStatus('local');
            loadLocalData();
        } else {
            initGitHubSync();
        }
    } else {
        updateConnectionStatus('local');
        showToast("স্থানীয় মেমরি মোড চালু করা হয়েছে", "info");
        loadLocalData();
    }
}

function toggleGitHubFieldsVisibility(visible) {
    const container = document.getElementById('github-config-fields');
    if (visible) {
        container.classList.add('active');
    } else {
        container.classList.remove('active');
    }
}

// Bind events
function bindFormEvents() {
    // Transaction Modal Submit
    document.getElementById('tx-submit-btn').addEventListener('click', handleAddTransaction);

    // Firebase configurations save button
    document.getElementById('fb-save-btn').addEventListener('click', handleSaveFirebaseConfig);

    // Firebase switch toggler
    document.getElementById('settings-firebase-switch').addEventListener('change', handleFirebaseToggle);

    // GitHub configurations save button
    document.getElementById('gh-save-btn').addEventListener('click', handleSaveGitHubConfig);

    // GitHub switch toggler
    document.getElementById('settings-github-switch').addEventListener('change', handleGitHubToggle);

    // GitHub manual sync button
    document.getElementById('gh-sync-now-btn').addEventListener('click', handleGitHubSyncNow);

    // Transaction search
    document.getElementById('tx-search-input').addEventListener('input', renderTransactionsList);

    // Transaction filter tab clicks
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTransactionsList();
        });
    });

    // Print report trigger
    document.getElementById('stmt-print-btn').addEventListener('click', handlePrintPDF);

    // Re-render report when dates change
    document.getElementById('stmt-start-date').addEventListener('change', renderStatements);
    document.getElementById('stmt-end-date').addEventListener('change', renderStatements);
}

// ==========================================
// 3. Database Operations
// ==========================================

function setupCloudListeners() {
    clearCloudListeners();
    const uid = state.currentUser.uid;

    const unsubTx = dbRef.collection('users').doc(uid).collection('transactions')
        .onSnapshot((snapshot) => {
            state.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateUIState();
        }, err => {
            console.error("Cloud listener error:", err);
            showToast("ডাটা লোড করতে সমস্যা হচ্ছে!", "danger");
        });
    firebaseUnsubscribes.push(unsubTx);
}

function clearCloudListeners() {
    firebaseUnsubscribes.forEach(unsub => unsub());
    firebaseUnsubscribes = [];
}

function loadLocalData() {
    state.transactions = JSON.parse(localStorage.getItem('hn_transactions_local') || '[]');
    updateConnectionStatus('local');
    updateUIState();
}

function persistLocalData() {
    if (!state.firebaseEnabled) {
        localStorage.setItem('hn_transactions_local', JSON.stringify(state.transactions));
    }
}

function updateUIState() {
    if (state.activeTab === 'dashboard') renderDashboard();
    else if (state.activeTab === 'transactions') renderTransactionsList();
    else if (state.activeTab === 'statements') renderStatements();
}

// ==========================================
// 4. Panel UI Rendering Components
// ==========================================

function renderDashboard() {
    let totalIn = 0;
    let totalOut = 0;

    state.transactions.forEach(tx => {
        const amt = parseFloat(tx.amount || 0);
        if (tx.type === 'income') totalIn += amt;
        else if (tx.type === 'expense') totalOut += amt;
    });

    const totalBalance = totalIn - totalOut;

    // Set totals
    document.getElementById('dashboard-total-balance').textContent = totalBalance.toLocaleString('bn-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('dashboard-total-in').textContent = totalIn.toLocaleString('bn-BD', { minimumFractionDigits: 2 });
    document.getElementById('dashboard-total-out').textContent = totalOut.toLocaleString('bn-BD', { minimumFractionDigits: 2 });

    // Render Recent Transactions (Limit to 5)
    const recentFeed = document.getElementById('dashboard-recent-transactions');
    recentFeed.innerHTML = '';

    const sortedTx = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sortedTx.slice(0, 5);

    if (recent.length === 0) {
        recentFeed.innerHTML = getEmptyStateHTML("কোনো সাম্প্রতিক লেনদেন পাওয়া যায়নি");
    } else {
        recent.forEach(tx => {
            recentFeed.appendChild(createTransactionDOMElement(tx));
        });
    }
}

function renderTransactionsList() {
    const searchVal = document.getElementById('tx-search-input').value.toLowerCase();
    const filterType = document.querySelector('.filter-btn.active').getAttribute('data-filter');
    const feed = document.getElementById('full-transactions-list');
    feed.innerHTML = '';

    let filtered = state.transactions.filter(tx => {
        const descMatch = tx.desc.toLowerCase().includes(searchVal);
        const typeMatches = filterType === 'all' ? true : tx.type === filterType;
        return descMatch && typeMatches;
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        feed.innerHTML = getEmptyStateHTML("কোনো মিল থাকা লেনদেন পাওয়া যায়নি");
    } else {
        filtered.forEach(tx => {
            feed.appendChild(createTransactionDOMElement(tx));
        });
    }
}

function createTransactionDOMElement(tx) {
    const el = document.createElement('div');
    el.className = `transaction-item ${tx.type}`;
    
    const amt = parseFloat(tx.amount || 0);
    const dateFormatted = formatDateBengali(tx.date);

    el.innerHTML = `
        <div class="tx-info-left">
            <div class="tx-icon-wrapper">
                ${getTransactionSVG(tx.type)}
            </div>
            <div class="tx-details">
                <span class="tx-desc">${tx.desc}</span>
                <span class="tx-meta">${tx.type === 'income' ? 'জমা করা হয়েছে' : 'খরচ করা হয়েছে'}</span>
            </div>
        </div>
        <div class="tx-amount-right">
            <span class="tx-amount">${amt.toLocaleString('bn-BD')}</span>
            <span class="tx-date">${dateFormatted}</span>
        </div>
    `;
    return el;
}

function initStatementFilters() {
    const startInput = document.getElementById('stmt-start-date');
    const endInput = document.getElementById('stmt-end-date');
    
    if (!startInput.value) {
        const d = new Date();
        d.setDate(1);
        startInput.value = d.toISOString().split('T')[0];
    }
    
    if (!endInput.value) {
        endInput.value = new Date().toISOString().split('T')[0];
    }
}

function renderStatements() {
    const startDate = document.getElementById('stmt-start-date').value;
    const endDate = document.getElementById('stmt-end-date').value;

    let filterCount = 0;
    let totalIn = 0;
    let totalOut = 0;

    state.transactions.forEach(tx => {
        const inDateRange = tx.date >= startDate && tx.date <= endDate;
        if (!inDateRange) return;

        filterCount++;
        const amt = parseFloat(tx.amount || 0);

        if (tx.type === 'income') {
            totalIn += amt;
        } else if (tx.type === 'expense') {
            totalOut += amt;
        }
    });

    const netFlow = totalIn - totalOut;
    
    document.getElementById('stmt-summary-count').textContent = `${filterCount}টি`;
    document.getElementById('stmt-summary-in').textContent = `৳${totalIn.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`;
    document.getElementById('stmt-summary-out').textContent = `৳${totalOut.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`;
    
    const netEl = document.getElementById('stmt-summary-net');
    netEl.textContent = `৳${netFlow.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`;
    netEl.className = netFlow >= 0 ? 'receivable' : 'payable';
}

function renderSettings() {
    const fbSwitch = document.getElementById('settings-firebase-switch');
    fbSwitch.checked = state.firebaseEnabled;
    toggleFirebaseFieldsVisibility(state.firebaseEnabled);

    const ghSwitch = document.getElementById('settings-github-switch');
    ghSwitch.checked = state.githubEnabled;
    toggleGitHubFieldsVisibility(state.githubEnabled);
}

// ==========================================
// 5. Actions / Submissions Handling
// ==========================================

function handleAddTransaction() {
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const desc = document.getElementById('tx-desc').value.trim();
    const date = document.getElementById('tx-date').value;
    const type = document.getElementById('tx-type').value;

    if (!amount || amount <= 0 || !desc || !date) {
        showToast("সবগুলো প্রয়োজনীয় তথ্য সঠিকভাবে দিন!", "danger");
        return;
    }

    const txData = {
        amount,
        desc,
        date,
        type
    };

    if (state.firebaseEnabled && state.currentUser) {
        dbRef.collection('users').doc(state.currentUser.uid).collection('transactions').add(txData)
            .then(() => {
                showToast("লেনদেন সফলভাবে সম্পন্ন হয়েছে!", "success");
                closeModal('modal-transaction');
            })
            .catch(err => showToast("ত্রুটি: " + err.message, "danger"));
    } else {
        txData.id = 'tx_' + Date.now();
        state.transactions.push(txData);
        persistLocalData();
        if (state.githubEnabled) {
            saveDataToGitHub();
        }
        showToast("লেনদেন সফলভাবে সম্পন্ন হয়েছে!", "success");
        closeModal('modal-transaction');
        updateUIState();
    }
}

function handleSaveFirebaseConfig() {
    const apiKey = document.getElementById('fb-api-key').value.trim();
    const authDomain = document.getElementById('fb-auth-domain').value.trim();
    const projectId = document.getElementById('fb-project-id').value.trim();
    const storageBucket = document.getElementById('fb-storage-bucket').value.trim();
    const appId = document.getElementById('fb-app-id').value.trim();

    if (!apiKey || !authDomain || !projectId || !storageBucket || !appId) {
        showToast("সবগুলো কনফিগারেশন ইনপুট পূরণ করুন!", "danger");
        return;
    }

    const config = { apiKey, authDomain, projectId, storageBucket, appId };
    state.firebaseConfig = config;
    localStorage.setItem('hn_fb_config', JSON.stringify(config));

    showToast("ফায়ারবেস কনফিগারেশন সংরক্ষিত হয়েছে!", "success");

    if (state.firebaseEnabled) {
        initFirebase();
    }
}

function handleFirebaseToggle(e) {
    const enabled = e.target.checked;
    state.firebaseEnabled = enabled;
    localStorage.setItem('hn_fb_enabled', enabled ? 'true' : 'false');
    toggleFirebaseFieldsVisibility(enabled);

    if (enabled) {
        state.githubEnabled = false;
        document.getElementById('settings-github-switch').checked = false;
        localStorage.setItem('hn_gh_enabled', 'false');
        toggleGitHubFieldsVisibility(false);
        
        if (!state.firebaseConfig) {
            showToast("অনুগ্রহ করে ফায়ারবেস কনফিগারেশন ইনপুট করুন!", "info");
        } else {
            initFirebase();
        }
    } else {
        clearCloudListeners();
        updateConnectionStatus('local');
        showToast("স্থানীয় মেমরি মোড চালু করা হয়েছে", "info");
        loadLocalData();
    }
}

function toggleFirebaseFieldsVisibility(visible) {
    const container = document.getElementById('firebase-config-fields');
    if (visible) {
        container.classList.add('active');
    } else {
        container.classList.remove('active');
    }
}

function populateFirebaseFields(config) {
    document.getElementById('fb-api-key').value = config.apiKey || '';
    document.getElementById('fb-auth-domain').value = config.authDomain || '';
    document.getElementById('fb-project-id').value = config.projectId || '';
    document.getElementById('fb-storage-bucket').value = config.storageBucket || '';
    document.getElementById('fb-app-id').value = config.appId || '';
}

// ==========================================
// 6. PDF Printing Helper
// ==========================================

function handlePrintPDF() {
    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';

    const start = document.getElementById('stmt-start-date').value;
    const end = document.getElementById('stmt-end-date').value;
    
    let printHTML = `
        <div style="font-family:'Hind Siliguri', sans-serif; padding: 30px;">
            <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #2563eb;">হিসাব নিকাশ (Hisab Nikash)</h1>
                <p style="margin: 5px 0 0; color: #64748b;">ডিজিটাল খতিয়ান স্টেটমেন্ট রিপোর্ট</p>
                <p style="margin: 2px 0 0; font-size: 13px;">সীমা: ${formatDateBengali(start)} থেকে ${formatDateBengali(end)}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                        <th style="padding: 12px 10px; text-align: left; font-size:14px; border:1px solid #e2e8f0; width: 120px;">তারিখ</th>
                        <th style="padding: 12px 10px; text-align: left; font-size:14px; border:1px solid #e2e8f0;">খাত / বিবরণ</th>
                        <th style="padding: 12px 10px; text-align: center; font-size:14px; border:1px solid #e2e8f0; width: 100px;">ধরন</th>
                        <th style="padding: 12px 10px; text-align: right; font-size:14px; border:1px solid #e2e8f0; width: 150px;">টাকা</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let totalIn = 0;
    let totalOut = 0;
    
    const sorted = [...state.transactions].sort((a, b) => new Date(a.date) - new Date(a.date));

    sorted.forEach(tx => {
        if (tx.date < start || tx.date > end) return;
        
        const typeStr = tx.type === 'income' ? '<span style="color:#059669;">জমা (In)</span>' : '<span style="color:#dc2626;">খরচ (Out)</span>';

        if (tx.type === 'income') totalIn += tx.amount;
        if (tx.type === 'expense') totalOut += tx.amount;

        printHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 10px; font-size:13px; border:1px solid #e2e8f0;">${formatDateBengali(tx.date)}</td>
                <td style="padding: 12px 10px; font-size:13px; border:1px solid #e2e8f0;">${tx.desc}</td>
                <td style="padding: 12px 10px; font-size:13px; text-align:center; border:1px solid #e2e8f0;">${typeStr}</td>
                <td style="padding: 12px 10px; font-size:13px; text-align:right; font-weight:600; border:1px solid #e2e8f0;">৳${tx.amount.toLocaleString('bn-BD')}</td>
            </tr>
        `;
    });

    printHTML += `
                </tbody>
            </table>
            
            <div style="margin-top: 30px; display:flex; justify-content: flex-end; gap: 40px; font-size: 15px; font-weight:700;">
                <div>মোট জমা (In): <span style="color:#059669;">৳${totalIn.toLocaleString('bn-BD')}</span></div>
                <div>মোট খরচ (Out): <span style="color:#dc2626;">৳${totalOut.toLocaleString('bn-BD')}</span></div>
                <div style="border-left: 2px solid #cbd5e1; padding-left: 20px;">নিট ক্যাশফ্লো (অবশিষ্ট): ৳${(totalIn - totalOut).toLocaleString('bn-BD')}</div>
            </div>
            
            <div style="margin-top: 100px; display:flex; justify-content: space-between; font-size: 12px; color: #64748b;">
                <div>রিপোর্ট প্রস্তুতকারী: হিসাব নিকাশ অ্যাপ</div>
                <div>রিপোর্ট তৈরির তারিখ: ${formatDateBengali(new Date().toISOString().split('T')[0])}</div>
            </div>
        </div>
    `;

    printSection.innerHTML = printHTML;
    window.print();
}

// ==========================================
// 7. Modal & Toast Helper Controls
// ==========================================

function openAddTransactionModal(type) {
    document.getElementById('tx-type').value = type;
    const title = document.getElementById('tx-modal-title');
    
    if (type === 'income') {
        title.textContent = "নতুন জমা (Money In) যোগ করুন";
        title.style.color = "var(--color-success)";
    } else {
        title.textContent = "নতুন খরচ (Money Out) যোগ করুন";
        title.style.color = "var(--color-danger)";
    }

    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-desc').value = '';
    
    openModal('modal-transaction');
}

function openModal(id) {
    const backdrop = document.getElementById(id);
    backdrop.style.display = 'flex';
    setTimeout(() => {
        backdrop.classList.add('active');
    }, 10);
}

function closeModal(id) {
    const backdrop = document.getElementById(id);
    backdrop.classList.remove('active');
    setTimeout(() => {
        backdrop.style.display = 'none';
    }, 300);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgSpan = document.getElementById('toast-message');
    
    msgSpan.textContent = message;
    toast.className = `toast active ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// ==========================================
// 8. Utility Functions
// ==========================================

function getTransactionSVG(type) {
    if (type === 'income') {
        return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`;
    } else {
        return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>`;
    }
}

function getEmptyStateHTML(message) {
    return `
        <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p>${message}</p>
        </div>
    `;
}

function formatDateBengali(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;

    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    const monthsBengali = [
        'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
    ];

    return `${day} ${monthsBengali[monthIndex]}, ${year}`;
}
