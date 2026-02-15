// API Client for SMILE Bot Backend
class APIClient {
    constructor() {
        this.baseUrl = CONFIG.apiUrl;
        this.rpcIndex = {};
    }
    
    // Get new testnets from backend
    async getNewTestnets(completedIds = []) {
        try {
            const params = new URLSearchParams();
            completedIds.forEach(id => params.append('completed', id));
            
            const url = `${this.baseUrl}/api/testnets/new${params.toString() ? '?' + params.toString() : ''}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const testnets = await response.json();
            addLog(`✓ Fetched ${testnets.length} testnets from backend`, 'success');
            return testnets;
            
        } catch (error) {
            addLog(`✗ Failed to fetch testnets: ${error.message}`, 'error');
            
            // Return mock data as fallback
            return this.getMockTestnets();
        }
    }
    
    // Check eligibility for claims
    async checkEligibility(addresses) {
        try {
            const response = await fetch(`${this.baseUrl}/api/check-eligibility`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addresses })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const eligible = await response.json();
            addLog(`✓ Found ${eligible.length} eligible wallets`, 'success');
            return eligible;
            
        } catch (error) {
            addLog(`✗ Eligibility check failed: ${error.message}`, 'error');
            return [];
        }
    }
    
    // Parse custom task using AI
    async parseCustomTask(text) {
        try {
            const response = await fetch(`${this.baseUrl}/api/parse-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const parsed = await response.json();
            addLog(`✓ Parsed ${parsed.steps.length} steps from task`, 'success');
            return parsed;
            
        } catch (error) {
            addLog(`✗ Task parsing failed: ${error.message}`, 'error');
            // Local fallback parsing
            return this.localParse(text);
        }
    }
    
    // Get RPC endpoint with rotation
    getRPC(network) {
        const endpoints = CONFIG.rpcEndpoints[network] || [];
        if (endpoints.length === 0) return null;
        
        // Initialize index for this network
        if (!this.rpcIndex[network]) {
            this.rpcIndex[network] = 0;
        }
        
        // Rotate to next endpoint
        const rpc = endpoints[this.rpcIndex[network]];
        this.rpcIndex[network] = (this.rpcIndex[network] + 1) % endpoints.length;
        
        return rpc;
    }
    
    // Local task parsing fallback
    localParse(text) {
        const steps = [];
        const lower = text.toLowerCase();
        
        if (lower.includes('claim') || lower.includes('faucet')) {
            steps.push({
                action: 'claim_faucet',
                description: 'Claim tokens from faucet',
                canAutomate: true
            });
        }
        
        if (lower.includes('swap') || lower.includes('exchange')) {
            const amounts = this.extractAmounts(text);
            steps.push({
                action: 'swap_tokens',
                description: `Swap tokens`,
                amountMin: amounts.min,
                amountMax: amounts.max,
                canAutomate: true
            });
        }
        
        if (lower.includes('bridge')) {
            steps.push({
                action: 'bridge',
                description: 'Bridge tokens',
                canAutomate: true
            });
        }
        
        if (lower.includes('stake') || lower.includes('deposit')) {
            steps.push({
                action: 'stake',
                description: 'Stake tokens',
                canAutomate: true
            });
        }
        
        if (lower.includes('mint') && (lower.includes('nft') || lower.includes('token'))) {
            steps.push({
                action: 'mint_nft',
                description: 'Mint NFT',
                canAutomate: true
            });
        }
        
        return {
            testnet: 'Custom Task',
            steps,
            complexity: steps.length > 3 ? 'hard' : steps.length > 1 ? 'medium' : 'simple'
        };
    }
    
    extractAmounts(text) {
        const matches = text.match(/(\d+\.?\d*)/g);
        if (matches && matches.length >= 1) {
            const amount = parseFloat(matches[0]);
            return { min: amount * 0.9, max: amount * 1.1 };
        }
        return { min: 0.01, max: 0.1 };
    }
    
    // Mock testnets for offline mode
    getMockTestnets() {
        return [
            {
                id: 'scroll-sepolia',
                name: 'Scroll Sepolia',
                chain: 'scroll',
                score: 95,
                tasks: [
                    { type: 'claim_faucet', description: 'Claim testnet ETH' },
                    { type: 'swap_tokens', description: 'Swap 0.1 ETH to USDC', amountMin: 0.08, amountMax: 0.12 },
                    { type: 'bridge', description: 'Bridge to Ethereum', amountMin: 0.05, amountMax: 0.1 }
                ],
                status: 'active',
                cost: 0
            },
            {
                id: 'linea-goerli',
                name: 'Linea Goerli',
                chain: 'linea',
                score: 92,
                tasks: [
                    { type: 'claim_faucet', description: 'Claim testnet tokens' },
                    { type: 'swap_tokens', description: 'Swap tokens', amountMin: 0.05, amountMax: 0.15 },
                    { type: 'mint_nft', description: 'Mint test NFT', minCount: 1, maxCount: 3 }
                ],
                status: 'active',
                cost: 0
            },
            {
                id: 'base-sepolia',
                name: 'Base Sepolia',
                chain: 'base',
                score: 90,
                tasks: [
                    { type: 'claim_faucet', description: 'Claim Base ETH' },
                    { type: 'swap_tokens', description: 'Swap on Uniswap', amountMin: 0.01, amountMax: 0.05 }
                ],
                status: 'active',
                cost: 0
            },
            {
                id: 'optimism-sepolia',
                name: 'Optimism Sepolia',
                chain: 'optimism',
                score: 88,
                tasks: [
                    { type: 'claim_faucet', description: 'Claim OP tokens' },
                    { type: 'provide_liquidity', description: 'Add liquidity', amountMin: 0.1, amountMax: 0.3 }
                ],
                status: 'active',
                cost: 0
            },
            {
                id: 'arbitrum-sepolia',
                name: 'Arbitrum Sepolia',
                chain: 'arbitrum',
                score: 85,
                tasks: [
                    { type: 'claim_faucet', description: 'Claim ARB tokens' },
                    { type: 'stake', description: 'Stake tokens', amountMin: 0.1, amountMax: 0.5 }
                ],
                status: 'active',
                cost: 0
            }
        ];
    }
}

const apiClient = new APIClient();
