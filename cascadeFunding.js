// Cascade Funding - Fund wallets to/from
class CascadeFunding {
    async forward(wallets, totalAmount, onProgress) {
        addLog(`💰 Starting forward cascade...`, 'info');
        addLog(`📊 Total amount: ${totalAmount} ETH`, 'info');
        addLog(`👛 Wallets: ${wallets.length.toLocaleString()}`, 'info');
        
        const amountPerWallet = (totalAmount / wallets.length).toFixed(6);
        addLog(`💵 Amount per wallet: ${amountPerWallet} ETH`, 'info');
        
        for (let i = 0; i < wallets.length - 1 && STATE.isRunning; i++) {
            const fromWallet = wallets[i];
            const toWallet = wallets[i + 1];
            
            try {
                addLog(`→ Cascade ${i + 1}/${wallets.length - 1}: ${fromWallet.address.substring(0, 10)}... → ${toWallet.address.substring(0, 10)}...`, 'info');
                
                // Simulate transaction
                await executor.simulateTransaction(2000);
                
                addLog(`✓ Sent ${amountPerWallet} ETH`, 'success');
                
                // Update progress
                if (onProgress) {
                    const progress = Math.round(((i + 1) / (wallets.length - 1)) * 100);
                    onProgress(i + 1, wallets.length - 1, progress);
                }
                
                // Delay between transfers
                await executor.randomDelay(CONFIG.walletDelay);
                
            } catch (error) {
                addLog(`✗ Failed cascade ${i + 1}: ${error.message}`, 'error');
            }
        }
        
        addLog(`🏁 Forward cascade complete!`, 'success');
    }
    
    async reverse(wallets, destinationAddress, onProgress) {
        const destination = destinationAddress || wallets[0].address;
        
        addLog(`💰 Starting reverse cascade...`, 'info');
        addLog(`📍 Destination: ${destination.substring(0, 10)}...`, 'info');
        addLog(`👛 Wallets: ${wallets.length.toLocaleString()}`, 'info');
        
        // Start from last wallet, send to previous
        for (let i = wallets.length - 1; i > 0 && STATE.isRunning; i--) {
            const fromWallet = wallets[i];
            const toWallet = i === 1 ? { address: destination } : wallets[i - 1];
            
            try {
                addLog(`→ Collect ${wallets.length - i}/${wallets.length - 1}: ${fromWallet.address.substring(0, 10)}... → ${toWallet.address.substring(0, 10)}...`, 'info');
                
                // Simulate transaction
                await executor.simulateTransaction(2000);
                
                addLog(`✓ Collected from wallet ${i}`, 'success');
                
                // Update progress
                if (onProgress) {
                    const progress = Math.round(((wallets.length - i) / (wallets.length - 1)) * 100);
                    onProgress(wallets.length - i, wallets.length - 1, progress);
                }
                
                // Delay between transfers
                await executor.randomDelay(CONFIG.walletDelay);
                
            } catch (error) {
                addLog(`✗ Failed collection ${i}: ${error.message}`, 'error');
            }
        }
        
        addLog(`🏁 Reverse cascade complete!`, 'success');
    }
}

const cascadeFunding = new CascadeFunding();
