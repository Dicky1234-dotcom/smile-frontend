// SMILE Bot Configuration
const CONFIG = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://smile-backend.vercel.app',
    taskDelay: parseInt(localStorage.getItem('taskDelay')) || 5,
    walletDelay: parseInt(localStorage.getItem('walletDelay')) || 45,
    maxWallets: 100000,
    walletsPerPage: 50,
    batchSize: 100, // Generate wallets in batches
    
    // RPC Endpoints for rotation
    rpcEndpoints: {
        scroll: [
            'https://scroll-sepolia.drpc.org',
            'https://sepolia-rpc.scroll.io',
            'https://scroll-testnet.public.blastapi.io'
        ],
        linea: [
            'https://rpc.goerli.linea.build',
            'https://linea-testnet.infura.io'
        ],
        base: [
            'https://sepolia.base.org',
            'https://base-sepolia.public.blastapi.io'
        ],
        optimism: [
            'https://sepolia.optimism.io',
            'https://optimism-sepolia.public.blastapi.io'
        ],
        arbitrum: [
            'https://sepolia-rollup.arbitrum.io/rpc',
            'https://arbitrum-sepolia.public.blastapi.io'
        ]
    },
    
    // Randomization for anti-detection
    randomization: {
        amount: { min: 0.85, max: 1.15 }, // ±15%
        delay: { min: 0.7, max: 1.3 }     // ±30%
    }
};

// Global State
const STATE = {
    wallets: [],
    testnets: [],
    completedTestnets: [],
    claims: [],
    logs: [],
    isRunning: false,
    currentPage: 1,
    parsedTask: null,
    vpnActive: false
};
