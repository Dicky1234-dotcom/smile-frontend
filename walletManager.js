// Wallet Manager - Generates up to 100,000 wallets
class WalletManager {
    async generateWallets(count, chainType, onProgress) {
        if (count < 1 || count > CONFIG.maxWallets) {
            throw new Error(`Wallet count must be between 1 and ${CONFIG.maxWallets.toLocaleString()}`);
        }
        
        addLog(`🔨 Starting generation of ${count.toLocaleString()} ${chainType.toUpperCase()} wallets...`, 'info');
        
        const batchSize = CONFIG.batchSize;
        const totalBatches = Math.ceil(count / batchSize);
        let generated = 0;
        
        for (let batch = 0; batch < totalBatches; batch++) {
            const batchStart = batch * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, count);
            const batchCount = batchEnd - batchStart;
            
            const wallets = [];
            
            for (let i = 0; i < batchCount; i++) {
                const index = batchStart + i + 1;
                let wallet;
                
                switch(chainType) {
                    case 'eth':
                        wallet = this.generateEthWallet(index);
                        break;
                    case 'btc':
                        wallet = this.generateBtcWallet(index);
                        break;
                    case 'sol':
                        wallet = this.generateSolWallet(index);
                        break;
                    default:
                        wallet = this.generateEthWallet(index);
                }
                
                wallets.push(wallet);
            }
            
            // Save batch to IndexedDB
            await db.saveBatch('wallets', wallets);
            
            generated += batchCount;
            
            // Report progress
            const progress = Math.round((generated / count) * 100);
            if (onProgress) {
                onProgress(generated, count, progress);
            }
            
            addLog(`✓ Batch ${batch + 1}/${totalBatches}: ${generated.toLocaleString()}/${count.toLocaleString()} wallets`, 'success');
            
            // Yield to prevent UI freeze
            await new Promise(r => setTimeout(r, 10));
        }
        
        addLog(`🎉 Generated ${count.toLocaleString()} wallets successfully!`, 'success');
        return generated;
    }
    
    generateEthWallet(index) {
        const privateKey = this.generateRandomHex(32);
        const address = this.privateKeyToAddress(privateKey);
        
        return {
            index,
            chainType: 'eth',
            address,
            privateKey: this.encrypt(privateKey),
            mnemonic: this.encrypt(this.generateMnemonic()),
            balance: '0',
            timestamp: Date.now()
        };
    }
    
    generateBtcWallet(index) {
        const privateKey = this.generateRandomHex(32);
        const address = 'bc1' + this.generateRandomString(39);
        
        return {
            index,
            chainType: 'btc',
            address,
            privateKey: this.encrypt(privateKey),
            mnemonic: this.encrypt(this.generateMnemonic()),
            balance: '0',
            timestamp: Date.now()
        };
    }
    
    generateSolWallet(index) {
        const privateKey = this.generateRandomHex(32);
        const address = this.generateRandomString(44);
        
        return {
            index,
            chainType: 'sol',
            address,
            privateKey: this.encrypt(privateKey),
            mnemonic: this.encrypt(this.generateMnemonic()),
            balance: '0',
            timestamp: Date.now()
        };
    }
    
    generateRandomHex(bytes) {
        const arr = new Uint8Array(bytes);
        crypto.getRandomValues(arr);
        return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }
    
    privateKeyToAddress(privateKey) {
        // Simple deterministic address generation
        const hash = this.simpleHash(privateKey);
        return '0x' + hash.substring(0, 40);
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(40, '0');
    }
    
    generateMnemonic() {
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
        ];
        return Array(12).fill(0).map(() => 
            words[Math.floor(Math.random() * words.length)]
        ).join(' ');
    }
    
    encrypt(text) {
        // Simple XOR encryption (use proper encryption in production)
        const key = 'smile-bot-key-2024';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return btoa(result);
    }
    
    decrypt(encrypted) {
        const key = 'smile-bot-key-2024';
        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(
                decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return result;
    }
    
    async exportWallets() {
        addLog('📤 Exporting all wallets...', 'info');
        
        const wallets = await db.getAll('wallets');
        const decrypted = wallets.map(w => ({
            index: w.index,
            chainType: w.chainType,
            address: w.address,
            privateKey: this.decrypt(w.privateKey),
            mnemonic: this.decrypt(w.mnemonic),
            balance: w.balance
        }));
        
        const json = JSON.stringify(decrypted, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `smile-wallets-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        addLog(`✓ Exported ${wallets.length.toLocaleString()} wallets`, 'success');
        showNotification(`Exported ${wallets.length.toLocaleString()} wallets!`, 'success');
    }
}

const walletManager = new WalletManager();
