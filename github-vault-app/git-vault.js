/**
 * GitVault — File Encryption Engine
 * Encrypts/decrypts arbitrary files for storage in public Git repositories.
 * Uses AES-256-GCM with raw CryptoKey objects (keys managed by KeyManager).
 * Binary-safe — works with any file type.
 */
const GitVault = (() => {
    const MAGIC = new Uint8Array([0x47, 0x56, 0x61, 0x75, 0x6C, 0x74, 0x30, 0x31]); // "GVault01"
    const IV_LENGTH = 12;
    const CONFIG_FILENAME = '.gitvault';

    async function encryptFile(file, cryptoKey) {
        const buffer = await readFileAsArrayBuffer(file);
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            buffer
        );

        const result = new Uint8Array(MAGIC.length + IV_LENGTH + ciphertext.byteLength);
        result.set(MAGIC, 0);
        result.set(iv, MAGIC.length);
        result.set(new Uint8Array(ciphertext), MAGIC.length + IV_LENGTH);

        return new Blob([result], { type: 'application/octet-stream' });
    }

    async function decryptFile(file, cryptoKey) {
        const buffer = await readFileAsArrayBuffer(file);
        const data = new Uint8Array(buffer);

        if (!isEncryptedBuffer(data)) {
            throw new Error('File is not encrypted with GitVault');
        }

        const iv = data.slice(MAGIC.length, MAGIC.length + IV_LENGTH);
        const ciphertext = data.slice(MAGIC.length + IV_LENGTH);

        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            ciphertext
        );

        return new Blob([plaintext], { type: 'application/octet-stream' });
    }

    async function encryptMultiple(files, cryptoKey, onProgress) {
        const results = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const encrypted = await encryptFile(file, cryptoKey);
            results.push({
                originalName: file.name,
                encryptedName: file.name + '.encrypted',
                blob: encrypted,
                size: encrypted.size
            });
            if (onProgress) onProgress(i + 1, files.length);
        }
        return results;
    }

    async function decryptMultiple(files, cryptoKey, onProgress) {
        const results = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const decrypted = await decryptFile(file, cryptoKey);
                const name = file.name.endsWith('.encrypted')
                    ? file.name.slice(0, -'.encrypted'.length)
                    : file.name;
                results.push({
                    originalName: file.name,
                    decryptedName: name,
                    blob: decrypted,
                    size: decrypted.size,
                    error: null
                });
            } catch (err) {
                results.push({
                    originalName: file.name,
                    decryptedName: file.name,
                    blob: null,
                    size: 0,
                    error: err.message
                });
            }
            if (onProgress) onProgress(i + 1, files.length);
        }
        return results;
    }

    async function isEncrypted(file) {
        const buffer = await readFileAsArrayBuffer(file);
        return isEncryptedBuffer(new Uint8Array(buffer));
    }

    function isEncryptedBuffer(data) {
        if (data.length < MAGIC.length) return false;
        for (let i = 0; i < MAGIC.length; i++) {
            if (data[i] !== MAGIC[i]) return false;
        }
        return true;
    }

    function generateConfig(patterns) {
        const lines = [
            '# GitVault Configuration',
            '# Files matching these patterns should be encrypted before commit',
            '# One pattern per line, .gitignore-style syntax',
            ''
        ];
        patterns.forEach(p => {
            const trimmed = p.trim();
            if (trimmed) lines.push(trimmed);
        });
        return lines.join('\n') + '\n';
    }

    function parseConfig(configText) {
        return configText.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    }

    function matchesPattern(filename, patterns) {
        return patterns.some(pattern => {
            const regex = globToRegex(pattern);
            return regex.test(filename);
        });
    }

    function globToRegex(glob) {
        let regex = '';
        let i = 0;
        while (i < glob.length) {
            const c = glob[i];
            if (c === '*') {
                if (glob[i + 1] === '*') {
                    regex += '.*';
                    i += 2;
                    if (glob[i] === '/') i++;
                    continue;
                }
                regex += '[^/]*';
            } else if (c === '?') {
                regex += '[^/]';
            } else if (c === '.') {
                regex += '\\.';
            } else {
                regex += c;
            }
            i++;
        }
        return new RegExp('^' + regex + '$');
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    return {
        encryptFile,
        decryptFile,
        encryptMultiple,
        decryptMultiple,
        isEncrypted,
        generateConfig,
        parseConfig,
        matchesPattern,
        downloadFile,
        formatFileSize,
        CONFIG_FILENAME
    };
})();
