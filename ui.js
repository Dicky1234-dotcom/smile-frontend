// UI Handler for SMILE Bot
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const log = { timestamp, message, type };
    
    STATE.logs.unshift(log);
    if (STATE.logs.length > 100) {
        STATE.logs = STATE.logs.slice(0, 100);
    }
    
    // Update recent logs
    const recentLogs = document.getElementById('recentLogs');
    if (recentLogs) {
        const logHtml = STATE.logs.slice(0, 20).map(l => 
            `<div class="log-entry ${l.type}"><span class="timestamp">[${l.timestamp}]</span> ${l.message}</div>`
        ).join('');
        recentLogs.innerHTML = logHtml;
        recentLogs.scrollTop = 0;
    }
    
    // Update fund logs
    const fundLogs = document.getElementById('fundLogs');
    if (fundLogs && (type === 'info' || type === 'success' || type === 'error')) {
        const logHtml = STATE.logs.slice(0, 20).map(l => 
            `<div class="log-entry ${l.type}"><span class="timestamp">[${l.timestamp}]</span> ${l.message}</div>`
        ).join('');
        fundLogs.innerHTML = logHtml;
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function updateStats() {
    // Update wallet count
    db.count('wallets').then(count => {
        document.getElementById('walletCount').textContent = count.toLocaleString();
        STATE.wallets = []; // Will be loaded when needed
    });
    
    // Update testnet count
    document.getElementById('testnetCount').textContent = STATE.testnets.length;
    
    // Update completed count
    db.count('completed').then(count => {
        document.getElementById('completedCount').textContent = count.toLocaleString();
    });
    
    // Update VPN status
    checkVPNStatus();
}

function checkVPNStatus() {
    // Simple VPN check (checks if IP is from known datacenter)
    // In real app, you'd check against datacenter IP ranges
    const isVPN = Math.random() > 0.5; // Placeholder
    
    const vpnStatus = document.getElementById('vpnStatus');
    const vpnWarning = document.getElementById('vpnWarning');
    
    if (isVPN) {
        vpnStatus.textContent = 'ACTIVE ✓';
        vpnStatus.className = 'value';
        if (vpnWarning) {
            vpnWarning.className = 'vpn-warning active';
            vpnWarning.querySelector('.title').textContent = '✓ VPN ACTIVE';
        }
    } else {
        vpnStatus.textContent = 'OFFLINE';
        vpnStatus.className = 'value red';
    }
    
    STATE.vpnActive = isVPN;
}

function renderWallets(page = 1) {
    const walletList = document.getElementById('walletList');
    
    db.count('wallets').then(async count => {
        if (count === 0) {
            walletList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">👛</div>
                    <div class="message">No wallets yet. Generate some above!</div>
                </div>
            `;
            return;
        }
        
        const wallets = await db.getPage('wallets', page, CONFIG.walletsPerPage);
        
        walletList.innerHTML = wallets.map(w => `
            <div class="wallet-item">
                <div>
                    <div style="font-size: 10px; color: var(--text-muted);">#${w.index} · ${w.chainType.toUpperCase()}</div>
                    <div class="wallet-address">${w.address}</div>
                    <div class="wallet-balance">${w.balance || '0'} ETH</div>
                </div>
            </div>
        `).join('');
        
        renderPagination(count, page);
    });
}

function renderPagination(totalCount, currentPage) {
    const pagination = document.getElementById('walletPagination');
    const totalPages = Math.ceil(totalCount / CONFIG.walletsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="renderWallets(${currentPage - 1})">◀</button>`;
    
    // Page numbers (show max 5)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="renderWallets(${i})">${i}</button>`;
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="renderWallets(${currentPage + 1})">▶</button>`;
    
    html += `<span style="font-size: 10px; color: var(--text-muted); margin-left: 8px;">${totalCount.toLocaleString()} total</span>`;
    
    pagination.innerHTML = html;
}

function renderTestnets() {
    const testnetList = document.getElementById('testnetList');
    
    if (STATE.testnets.length === 0) {
        testnetList.innerHTML = `
            <div class="empty-state">
                <div class="icon">🌐</div>
                <div class="message">No testnets found. Click refresh to load!</div>
            </div>
        `;
        return;
    }
    
    testnetList.innerHTML = STATE.testnets.map(t => `
        <div class="testnet-item" onclick="selectTestnet('${t.id}')">
            <div class="testnet-name">${t.name}</div>
            <div class="testnet-meta">
                <span>⛓️ ${t.chain}</span>
                <span>📋 ${t.tasks.length} tasks</span>
                <span class="testnet-score">⭐ ${t.score}</span>
            </div>
        </div>
    `).join('');
}

function selectTestnet(id) {
    const testnet = STATE.testnets.find(t => t.id === id);
    if (!testnet) return;
    
    const details = `
        <h3>${testnet.name}</h3>
        <div style="margin: 12px 0;">
            <div><strong>Chain:</strong> ${testnet.chain}</div>
            <div><strong>Score:</strong> ${testnet.score}/100</div>
            <div><strong>Tasks:</strong> ${testnet.tasks.length}</div>
        </div>
        <div><strong>Tasks:</strong></div>
        ${testnet.tasks.map((task, i) => `
            <div style="padding: 8px; margin: 4px 0; background: var(--bg-dark); border: 1px solid var(--border-glow); border-radius: 4px;">
                <div style="font-size: 10px; color: var(--text-muted);">TASK ${i + 1}</div>
                <div>${task.type}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${task.description}</div>
            </div>
        `).join('')}
    `;
    
    showNotification(`Selected: ${testnet.name}`, 'success');
}

function renderParsedTask(parsed) {
    const card = document.getElementById('parsedTaskCard');
    const steps = document.getElementById('parsedTaskSteps');
    
    steps.innerHTML = `
        <div style="margin-bottom: 12px;">
            <div><strong>Network:</strong> ${parsed.network}</div>
            <div><strong>Complexity:</strong> ${parsed.complexity}</div>
            <div><strong>Steps:</strong> ${parsed.steps.length}</div>
        </div>
        ${parsed.steps.map((step, i) => `
            <div style="padding: 12px; margin: 8px 0; background: var(--bg-dark); border: 1px solid ${step.canAutomate ? 'var(--matrix-green)' : 'var(--alert-red)'}; border-radius: 4px;">
                <div style="font-size: 10px; color: var(--text-muted);">STEP ${i + 1}</div>
                <div><strong>${step.action}</strong></div>
                <div style="font-size: 11px; margin: 4px 0;">${step.description}</div>
                <div style="font-size: 10px; color: ${step.canAutomate ? 'var(--matrix-green)' : 'var(--alert-red)'};">
                    ${step.canAutomate ? '✓ Can automate' : '✗ Manual required'}: ${step.reason}
                </div>
            </div>
        `).join('')}
    `;
    
    card.style.display = 'block';
    STATE.parsedTask = parsed;
}

// Matrix background animation
function initMatrix() {
    const canvas = document.getElementById('matrix-bg');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = '01';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);
    
    function draw() {
        ctx.fillStyle = 'rgba(10, 14, 26, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff41';
        ctx.font = `${fontSize}px monospace`;
        
        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(draw, 50);
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}
