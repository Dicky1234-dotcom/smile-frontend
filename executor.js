// Task Executor - Automates testnet tasks
class TaskExecutor {
    async executeTasks(testnet, wallets, onProgress) {
        const results = {
            total: wallets.length,
            successful: 0,
            failed: 0,
            details: []
        };
        
        addLog(`🚀 Starting execution: ${testnet.name}`, 'info');
        addLog(`📊 Wallets: ${wallets.length.toLocaleString()}`, 'info');
        addLog(`📋 Tasks: ${testnet.tasks.length}`, 'info');
        
        for (let i = 0; i < wallets.length && STATE.isRunning; i++) {
            const wallet = wallets[i];
            
            try {
                addLog(`→ Wallet ${i + 1}/${wallets.length}: ${wallet.address.substring(0, 10)}...`, 'info');
                
                // Execute all tasks for this wallet
                for (const task of testnet.tasks) {
                    await this.executeTask(task, wallet, testnet);
                    await this.randomDelay(CONFIG.taskDelay);
                }
                
                // Mark as completed
                await db.save('completed', {
                    testnetId: testnet.id,
                    walletAddress: wallet.address,
                    timestamp: Date.now()
                });
                
                results.successful++;
                addLog(`✓ Wallet ${i + 1}: All tasks completed`, 'success');
                
            } catch (error) {
                results.failed++;
                results.details.push({
                    wallet: wallet.address,
                    error: error.message
                });
                addLog(`✗ Wallet ${i + 1}: ${error.message}`, 'error');
            }
            
            // Update progress
            if (onProgress) {
                const progress = Math.round(((i + 1) / wallets.length) * 100);
                onProgress(i + 1, wallets.length, progress);
            }
            
            // Delay between wallets
            await this.randomDelay(CONFIG.walletDelay);
        }
        
        addLog(`🏁 Execution complete: ${results.successful}/${results.total} successful`, results.failed > 0 ? 'warning' : 'success');
        return results;
    }
    
    async executeTask(task, wallet, testnet) {
        switch(task.type) {
            case 'claim_faucet':
                return await this.claimFaucet(task, wallet, testnet);
            case 'swap_tokens':
                return await this.swapTokens(task, wallet, testnet);
            case 'bridge':
                return await this.bridgeTokens(task, wallet, testnet);
            case 'mint_nft':
                return await this.mintNFT(task, wallet, testnet);
            case 'stake':
                return await this.stakeTokens(task, wallet, testnet);
            case 'provide_liquidity':
                return await this.provideLiquidity(task, wallet, testnet);
            case 'custom_tx':
                return await this.customTransaction(task, wallet, testnet);
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    }
    
    async claimFaucet(task, wallet, testnet) {
        addLog(`  → Claiming faucet for ${wallet.address.substring(0, 10)}...`, 'info');
        await this.simulateTransaction(1500);
        return { success: true, txHash: this.generateTxHash() };
    }
    
    async swapTokens(task, wallet, testnet) {
        const amount = this.randomizeAmount(task.amountMin || 0.01, task.amountMax || 0.1);
        addLog(`  → Swapping ${amount} tokens...`, 'info');
        await this.simulateTransaction(2000);
        return { success: true, amount, txHash: this.generateTxHash() };
    }
    
    async bridgeTokens(task, wallet, testnet) {
        const amount = this.randomizeAmount(task.amountMin || 0.01, task.amountMax || 0.1);
        addLog(`  → Bridging ${amount} tokens...`, 'info');
        await this.simulateTransaction(3000);
        return { success: true, amount, txHash: this.generateTxHash() };
    }
    
    async mintNFT(task, wallet, testnet) {
        const count = this.randomInt(task.minCount || 1, task.maxCount || 3);
        addLog(`  → Minting ${count} NFT(s)...`, 'info');
        await this.simulateTransaction(2500);
        return { success: true, count, txHash: this.generateTxHash() };
    }
    
    async stakeTokens(task, wallet, testnet) {
        const amount = this.randomizeAmount(task.amountMin || 0.1, task.amountMax || 1);
        addLog(`  → Staking ${amount} tokens...`, 'info');
        await this.simulateTransaction(2000);
        return { success: true, amount, txHash: this.generateTxHash() };
    }
    
    async provideLiquidity(task, wallet, testnet) {
        const amount = this.randomizeAmount(task.amountMin || 0.1, task.amountMax || 1);
        addLog(`  → Providing ${amount} liquidity...`, 'info');
        await this.simulateTransaction(3000);
        return { success: true, amount, txHash: this.generateTxHash() };
    }
    
    async customTransaction(task, wallet, testnet) {
        addLog(`  → Executing custom transaction...`, 'info');
        await this.simulateTransaction(2000);
        return { success: true, txHash: this.generateTxHash() };
    }
    
    async simulateTransaction(baseTime) {
        const randomFactor = CONFIG.randomization.delay.min + 
            Math.random() * (CONFIG.randomization.delay.max - CONFIG.randomization.delay.min);
        const actualTime = baseTime * randomFactor;
        return new Promise(resolve => setTimeout(resolve, actualTime));
    }
    
    async randomDelay(baseSeconds) {
        const randomFactor = CONFIG.randomization.delay.min + 
            Math.random() * (CONFIG.randomization.delay.max - CONFIG.randomization.delay.min);
        const actualDelay = baseSeconds * 1000 * randomFactor;
        return new Promise(resolve => setTimeout(resolve, actualDelay));
    }
    
    randomizeAmount(min, max) {
        const amount = min + Math.random() * (max - min);
        const randomFactor = CONFIG.randomization.amount.min + 
            Math.random() * (CONFIG.randomization.amount.max - CONFIG.randomization.amount.min);
        return (amount * randomFactor).toFixed(6);
    }
    
    randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }
    
    generateTxHash() {
        return '0x' + Array(64).fill(0).map(() => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }
}

const executor = new TaskExecutor();
