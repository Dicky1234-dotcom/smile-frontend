// IndexedDB Manager for SMILE Bot
class DBManager {
    constructor() {
        this.dbName = 'SMILEBot';
        this.version = 1;
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Wallets store (can handle 100K)
                if (!db.objectStoreNames.contains('wallets')) {
                    const walletStore = db.createObjectStore('wallets', { keyPath: 'index' });
                    walletStore.createIndex('address', 'address', { unique: true });
                    walletStore.createIndex('chainType', 'chainType', { unique: false });
                }
                
                // Testnets store
                if (!db.objectStoreNames.contains('testnets')) {
                    db.createObjectStore('testnets', { keyPath: 'id' });
                }
                
                // Completed testnets store
                if (!db.objectStoreNames.contains('completed')) {
                    const completedStore = db.createObjectStore('completed', { keyPath: 'id', autoIncrement: true });
                    completedStore.createIndex('testnetId', 'testnetId', { unique: false });
                    completedStore.createIndex('walletAddress', 'walletAddress', { unique: false });
                }
                
                // Claims store
                if (!db.objectStoreNames.contains('claims')) {
                    db.createObjectStore('claims', { keyPath: 'id', autoIncrement: true });
                }
                
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }
    
    async save(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async saveBatch(storeName, dataArray) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let completed = 0;
            dataArray.forEach(data => {
                const request = store.put(data);
                request.onsuccess = () => {
                    completed++;
                    if (completed === dataArray.length) {
                        resolve();
                    }
                };
            });
            
            transaction.onerror = () => reject(transaction.error);
        });
    }
    
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getPage(storeName, page, pageSize) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.openCursor();
            
            const results = [];
            let skipped = 0;
            let added = 0;
            const skipTo = (page - 1) * pageSize;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    if (skipped < skipTo) {
                        skipped++;
                        cursor.continue();
                    } else if (added < pageSize) {
                        results.push(cursor.value);
                        added++;
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async count(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async clearAll() {
        const stores = ['wallets', 'testnets', 'completed', 'claims'];
        for (const store of stores) {
            await this.clear(store);
        }
    }
}

const db = new DBManager();
