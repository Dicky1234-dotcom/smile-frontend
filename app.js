// SMILE Bot - Main Application
// Initialize app
async function init() {
    addLog('🚀 SMILE Bot initializing...', 'info');
    
    // Initialize database
    await db.init();
    addLog('✓ Database ready', 'success');
    
    // Load initial data
    await updateStats();
    await renderWallets(1);
    
    // Initialize matrix background
    initMatrix();
    
    addLog('✓ SMILE Bot ready!', 'success');
    showNotification('SMILE Bot Ready!', 'success');
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        
        // Update tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});

// Generate Wallets
document.getElementById('generateWalletsBtn').addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('walletAmount').value);
    const chainType = document.getElementById('chainType').value;
    
    if (!amount || amount < 1 || amount > CONFIG.maxWallets) {
        showNotification(`Enter 1-${CONFIG.maxWallets.toLocaleString()} wallets`, 'error');
        return;
    }
    
    const btn = document.getElementById('generateWalletsBtn');
    btn.disabled = true;
    btn.textContent = '⏳ GENERATING...';
    
    const progress = document.getElementById('generateProgress');
    const progressFill = document.getElementById('generateProgressFill');
    const progressText = document.getElementById('generateProgressText');
    
    progress.style.display = 'block';
    progressText.style.display = 'block';
    
    try {
        await walletManager.generateWallets(amount, chainType, (current, total, percent) => {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
        });
        
        await updateStats();
        await renderWallets(1);
        showNotification(`Generated ${amount.toLocaleString()} wallets!`, 'success');
        
    } catch (error) {
        addLog(`✗ Error: ${error.message}`, 'error');
        showNotification('Generation failed', 'error');
    }
    
    progress.style.display = 'none';
    progressText.style.display = 'none';
    btn.disabled = false;
    btn.textContent = '🔨 GENERATE WALLETS';
});

// Export Wallets
document.getElementById('exportWalletsBtn').addEventListener('click', () => {
    walletManager.exportWallets();
});

// Clear Wallets
document.getElementById('clearWalletsBtn').addEventListener('click', async () => {
    if (!confirm('Delete ALL wallets? This cannot be undone!')) return;
    
    await db.clear('wallets');
    await updateStats();
    await renderWallets(1);
    showNotification('All wallets cleared', 'warning');
    addLog('🗑️ All wallets deleted', 'warning');
});

// Discover Testnets
document.getElementById('discoverBtn').addEventListener('click', async () => {
    await loadTestnets();
});

document.getElementById('refreshTestnetsBtn').addEventListener('click', async () => {
    await loadTestnets();
});

async function loadTestnets() {
    addLog('🔍 Discovering testnets...', 'info');
    
    const completed = await db.getAll('completed');
    const completedIds = [...new Set(completed.map(c => c.testnetId))];
    
    STATE.testnets = await apiClient.getNewTestnets(completedIds);
    
    renderTestnets();
    updateStats();
    
    if (STATE.testnets.length === 0) {
        showNotification('🎉 All testnets completed!', 'success');
    } else {
        showNotification(`Found ${STATE.testnets.length} testnets`, 'success');
    }
}

// Show New Only
document.getElementById('showNewOnlyBtn').addEventListener('click', async () => {
    await loadTestnets();
});

// Execute All
document.getElementById('executeAllBtn').addEventListener('click', async () => {
    const walletCount = await db.count('wallets');
    
    if (walletCount === 0) {
        showNotification('Generate wallets first!', 'error');
        return;
    }
    
    if (STATE.testnets.length === 0) {
        showNotification('No testnets available!', 'error');
        return;
    }
    
    if (!confirm(`Execute ${STATE.testnets.length} testnets with ${walletCount.toLocaleString()} wallets?`)) {
        return;
    }
    
    STATE.isRunning = true;
    
    const wallets = await db.getAll('wallets');
    
    for (const testnet of STATE.testnets) {
        if (!STATE.isRunning) break;
        
        addLog(`📋 Starting: ${testnet.name}`, 'info');
        
        await executor.executeTasks(testnet, wallets, (current, total, percent) => {
            // Progress updates handled in executor
        });
    }
    
    STATE.isRunning = false;
    showNotification('Execution complete!', 'success');
});

// Check Eligibility
document.getElementById('checkEligibilityBtn').addEventListener('click', async () => {
    const wallets = await db.getAll('wallets');
    
    if (wallets.length === 0) {
        showNotification('No wallets to check!', 'error');
        return;
    }
    
    addLog('🔍 Checking eligibility...', 'info');
    
    const addresses = wallets.map(w => w.address);
    const eligible = await apiClient.checkEligibility(addresses);
    
    STATE.claims = eligible;
    
    if (eligible.length > 0) {
        showNotification(`Found ${eligible.length} eligible wallets!`, 'success');
    } else {
        showNotification('No eligible wallets found', 'warning');
    }
});

// Parse Custom Task
document.getElementById('parseTaskBtn').addEventListener('click', async () => {
    const input = document.getElementById('customTaskInput').value.trim();
    
    if (!input) {
        showNotification('Enter a task description!', 'error');
        return;
    }
    
    addLog('🤖 Parsing task...', 'info');
    
    const parsed = await taskParser.parse(input);
    renderParsedTask(parsed);
    
    showNotification(`Parsed ${parsed.steps.length} steps`, 'success');
});

// Execute Custom Task
document.getElementById('executeCustomBtn').addEventListener('click', async () => {
    if (!STATE.parsedTask) {
        showNotification('Parse a task first!', 'error');
        return;
    }
    
    const wallets = await db.getAll('wallets');
    
    if (wallets.length === 0) {
        showNotification('Generate wallets first!', 'error');
        return;
    }
    
    if (!confirm(`Execute custom task with ${wallets.length.toLocaleString()} wallets?`)) {
        return;
    }
    
    STATE.isRunning = true;
    
    const testnet = {
        id: 'custom-' + Date.now(),
        name: STATE.parsedTask.testnet,
        chain: STATE.parsedTask.network,
        tasks: STATE.parsedTask.steps.map(s => ({
            type: s.action,
            description: s.description,
            ...s
        }))
    };
    
    await executor.executeTasks(testnet, wallets);
    
    STATE.isRunning = false;
    showNotification('Custom task complete!', 'success');
});

// Cascade Forward
document.getElementById('cascadeForwardBtn').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('cascadeAmount').value);
    const wallets = await db.getAll('wallets');
    
    if (!amount || amount <= 0) {
        showNotification('Enter amount to cascade!', 'error');
        return;
    }
    
    if (wallets.length < 2) {
        showNotification('Need at least 2 wallets!', 'error');
        return;
    }
    
    STATE.isRunning = true;
    
    const progress = document.getElementById('fundProgress');
    const progressFill = document.getElementById('fundProgressFill');
    const progressText = document.getElementById('fundProgressText');
    
    progress.style.display = 'block';
    progressText.style.display = 'block';
    
    await cascadeFunding.forward(wallets, amount, (current, total, percent) => {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${current} / ${total} (${percent}%)`;
    });
    
    progress.style.display = 'none';
    progressText.style.display = 'none';
    
    STATE.isRunning = false;
    showNotification('Forward cascade complete!', 'success');
});

// Cascade Reverse
document.getElementById('cascadeReverseBtn').addEventListener('click', async () => {
    const wallets = await db.getAll('wallets');
    
    if (wallets.length < 2) {
        showNotification('Need at least 2 wallets!', 'error');
        return;
    }
    
    const destination = prompt('Enter destination address (leave empty for wallet #1):');
    
    STATE.isRunning = true;
    
    const progress = document.getElementById('fundProgress');
    const progressFill = document.getElementById('fundProgressFill');
    const progressText = document.getElementById('fundProgressText');
    
    progress.style.display = 'block';
    progressText.style.display = 'block';
    
    await cascadeFunding.reverse(wallets, destination, (current, total, percent) => {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${current} / ${total} (${percent}%)`;
    });
    
    progress.style.display = 'none';
    progressText.style.display = 'none';
    
    STATE.isRunning = false;
    showNotification('Reverse cascade complete!', 'success');
});

// Save Settings
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    CONFIG.apiUrl = document.getElementById('apiUrlInput').value;
    CONFIG.taskDelay = parseInt(document.getElementById('taskDelay').value);
    CONFIG.walletDelay = parseInt(document.getElementById('walletDelay').value);
    
    localStorage.setItem('apiUrl', CONFIG.apiUrl);
    localStorage.setItem('taskDelay', CONFIG.taskDelay);
    localStorage.setItem('walletDelay', CONFIG.walletDelay);
    
    showNotification('Settings saved!', 'success');
    addLog('⚙️ Settings updated', 'info');
});

// Export All Data
document.getElementById('exportDataBtn').addEventListener('click', async () => {
    const data = {
        wallets: await db.getAll('wallets'),
        testnets: await db.getAll('testnets'),
        completed: await db.getAll('completed'),
        claims: await db.getAll('claims'),
        exportDate: new Date().toISOString()
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `smile-backup-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Data exported!', 'success');
});

// Clear All Data
document.getElementById('clearAllDataBtn').addEventListener('click', async () => {
    if (!confirm('Delete ALL data? This cannot be undone!')) return;
    if (!confirm('Are you ABSOLUTELY sure?')) return;
    
    await db.clearAll();
    STATE.wallets = [];
    STATE.testnets = [];
    STATE.completedTestnets = [];
    STATE.claims = [];
    STATE.logs = [];
    
    await updateStats();
    await renderWallets(1);
    renderTestnets();
    
    showNotification('All data cleared', 'warning');
    addLog('🗑️ All data deleted', 'warning');
});

// Update button states based on data
async function updateButtonStates() {
    const walletCount = await db.count('wallets');
    
    document.getElementById('executeAllBtn').disabled = walletCount === 0 || STATE.testnets.length === 0;
    document.getElementById('checkEligibilityBtn').disabled = walletCount === 0;
    document.getElementById('cascadeForwardBtn').disabled = walletCount < 2;
    document.getElementById('cascadeReverseBtn').disabled = walletCount < 2;
}

// Periodic updates
setInterval(() => {
    updateButtonStates();
    checkVPNStatus();
}, 5000);

// Initialize on load
init().then(() => {
    updateButtonStates();
    addLog('🎉 SMILE Bot is ready!', 'success');
});
