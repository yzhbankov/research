/**
 * SecretDrop Key Manager
 * Generates, stores, exports, and imports AES-256-GCM keys for vault encryption.
 * Keys are stored in localStorage as JWK format.
 */
const KeyManager = (() => {
    const STORAGE_KEY = 'secretdrop_vault_keys';
    const ACTIVE_KEY_STORAGE = 'secretdrop_vault_active_key';

    function generateUUID() {
        if (crypto.randomUUID) return crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }

    async function generateKey(name) {
        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        const jwk = await crypto.subtle.exportKey('jwk', key);
        const entry = {
            id: generateUUID(),
            name: name || 'Untitled Key',
            jwk: jwk,
            createdAt: new Date().toISOString()
        };
        return entry;
    }

    function getStoredKeys() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveKey(entry) {
        const keys = getStoredKeys();
        keys.push(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    }

    function listKeys() {
        return getStoredKeys().map(k => ({
            id: k.id,
            name: k.name,
            createdAt: k.createdAt
        }));
    }

    async function loadKey(keyId) {
        const keys = getStoredKeys();
        const entry = keys.find(k => k.id === keyId);
        if (!entry) throw new Error('Key not found');
        return crypto.subtle.importKey(
            'jwk',
            entry.jwk,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    function deleteKey(keyId) {
        const keys = getStoredKeys().filter(k => k.id !== keyId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
        if (getActiveKeyId() === keyId) {
            localStorage.removeItem(ACTIVE_KEY_STORAGE);
        }
    }

    async function exportKeyToFile(keyId) {
        const keys = getStoredKeys();
        const entry = keys.find(k => k.id === keyId);
        if (!entry) throw new Error('Key not found');

        const exportData = {
            _type: 'secretdrop_vault_key_v1',
            name: entry.name,
            jwk: entry.jwk,
            createdAt: entry.createdAt
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entry.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.secretdrop-key.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function importKeyFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data._type !== 'secretdrop_vault_key_v1') {
                        throw new Error('Invalid key file format');
                    }
                    // Validate the JWK by importing it
                    await crypto.subtle.importKey(
                        'jwk', data.jwk,
                        { name: 'AES-GCM', length: 256 },
                        true, ['encrypt', 'decrypt']
                    );
                    const entry = {
                        id: generateUUID(),
                        name: data.name || 'Imported Key',
                        jwk: data.jwk,
                        createdAt: data.createdAt || new Date().toISOString()
                    };
                    saveKey(entry);
                    resolve(entry);
                } catch (err) {
                    reject(new Error('Invalid key file: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async function getKeyFingerprint(keyId) {
        const keys = getStoredKeys();
        const entry = keys.find(k => k.id === keyId);
        if (!entry) return '';
        const data = new TextEncoder().encode(JSON.stringify(entry.jwk));
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, 16);
    }

    function getActiveKeyId() {
        return localStorage.getItem(ACTIVE_KEY_STORAGE);
    }

    function setActiveKeyId(keyId) {
        if (keyId) {
            localStorage.setItem(ACTIVE_KEY_STORAGE, keyId);
        } else {
            localStorage.removeItem(ACTIVE_KEY_STORAGE);
        }
    }

    return {
        generateKey,
        saveKey,
        listKeys,
        loadKey,
        deleteKey,
        exportKeyToFile,
        importKeyFromFile,
        getKeyFingerprint,
        getActiveKeyId,
        setActiveKeyId
    };
})();
