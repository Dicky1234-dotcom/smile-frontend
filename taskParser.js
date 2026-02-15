// Task Parser - Parse custom task inputs
class TaskParser {
    async parse(input) {
        addLog('🤖 Parsing custom task...', 'info');
        
        // Try backend AI parsing first
        try {
            const parsed = await apiClient.parseCustomTask(input);
            addLog(`✓ Parsed ${parsed.steps.length} steps`, 'success');
            return parsed;
        } catch (error) {
            addLog('⚠️ Using local parser (backend unavailable)', 'warning');
            return this.localParse(input);
        }
    }
    
    localParse(text) {
        const steps = [];
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            const parsed = this.parseLine(line);
            if (parsed) {
                steps.push(parsed);
            }
        }
        
        if (steps.length === 0) {
            // Try to parse entire text as one task
            const single = this.parseText(text);
            if (single) steps.push(single);
        }
        
        return {
            testnet: 'Custom Task',
            network: this.detectNetwork(text),
            steps,
            complexity: this.calculateComplexity(steps),
            canAutomate: steps.every(s => s.canAutomate)
        };
    }
    
    parseLine(line) {
        const lower = line.toLowerCase();
        
        // Claim faucet
        if (lower.includes('claim') || lower.includes('faucet')) {
            return {
                action: 'claim_faucet',
                description: line.trim(),
                url: this.extractURL(line),
                canAutomate: true,
                reason: 'Can claim automatically'
            };
        }
        
        // Swap tokens
        if (lower.includes('swap') || lower.includes('exchange')) {
            const amounts = this.extractAmounts(line);
            return {
                action: 'swap_tokens',
                description: line.trim(),
                amountMin: amounts.min,
                amountMax: amounts.max,
                tokens: this.extractTokens(line),
                canAutomate: true,
                reason: 'Can swap automatically'
            };
        }
        
        // Bridge
        if (lower.includes('bridge')) {
            const amounts = this.extractAmounts(line);
            return {
                action: 'bridge',
                description: line.trim(),
                amountMin: amounts.min,
                amountMax: amounts.max,
                fromChain: this.extractChain(line, 'from'),
                toChain: this.extractChain(line, 'to'),
                canAutomate: true,
                reason: 'Can bridge automatically'
            };
        }
        
        // Mint NFT
        if (lower.includes('mint') && (lower.includes('nft') || lower.includes('token'))) {
            const count = this.extractNumber(line);
            return {
                action: 'mint_nft',
                description: line.trim(),
                minCount: count.min,
                maxCount: count.max,
                canAutomate: true,
                reason: 'Can mint automatically'
            };
        }
        
        // Stake
        if (lower.includes('stake') || lower.includes('deposit')) {
            const amounts = this.extractAmounts(line);
            return {
                action: 'stake',
                description: line.trim(),
                amountMin: amounts.min,
                amountMax: amounts.max,
                canAutomate: true,
                reason: 'Can stake automatically'
            };
        }
        
        // Provide liquidity
        if (lower.includes('liquidity') || lower.includes('pool')) {
            const amounts = this.extractAmounts(line);
            return {
                action: 'provide_liquidity',
                description: line.trim(),
                amountMin: amounts.min,
                amountMax: amounts.max,
                canAutomate: true,
                reason: 'Can provide liquidity automatically'
            };
        }
        
        // Generic step
        if (lower.includes('step') || lower.includes('task')) {
            return {
                action: 'custom_tx',
                description: line.trim(),
                url: this.extractURL(line),
                canAutomate: !lower.includes('manually') && !lower.includes('manual'),
                reason: lower.includes('manually') ? 'Requires manual action' : 'Can execute automatically'
            };
        }
        
        return null;
    }
    
    parseText(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('swap') && lower.includes('bridge')) {
            return {
                action: 'multi_step',
                description: 'Multi-step task (swap + bridge)',
                steps: ['swap_tokens', 'bridge'],
                canAutomate: true
            };
        }
        
        return null;
    }
    
    extractAmounts(text) {
        const matches = text.match(/(\d+\.?\d*)/g);
        if (matches && matches.length >= 1) {
            const amount = parseFloat(matches[0]);
            return {
                min: amount * 0.9,
                max: amount * 1.1
            };
        }
        return { min: 0.01, max: 0.1 };
    }
    
    extractNumber(text) {
        const match = text.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            return { min: num, max: num };
        }
        return { min: 1, max: 3 };
    }
    
    extractTokens(text) {
        const tokens = text.match(/\b[A-Z]{2,6}\b/g);
        return tokens || ['ETH', 'USDC'];
    }
    
    extractChain(text, type) {
        const chains = ['ethereum', 'scroll', 'linea', 'base', 'optimism', 'arbitrum', 'polygon', 'avalanche'];
        const lower = text.toLowerCase();
        
        for (const chain of chains) {
            if (lower.includes(chain)) {
                return chain;
            }
        }
        
        return type === 'from' ? 'scroll' : 'ethereum';
    }
    
    extractURL(text) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    detectNetwork(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('scroll')) return 'scroll';
        if (lower.includes('linea')) return 'linea';
        if (lower.includes('base')) return 'base';
        if (lower.includes('optimism') || lower.includes('op')) return 'optimism';
        if (lower.includes('arbitrum') || lower.includes('arb')) return 'arbitrum';
        if (lower.includes('polygon')) return 'polygon';
        
        return 'ethereum';
    }
    
    calculateComplexity(steps) {
        if (steps.length === 0) return 'unknown';
        if (steps.length === 1) return 'simple';
        if (steps.length <= 3) return 'medium';
        return 'hard';
    }
}

const taskParser = new TaskParser();
