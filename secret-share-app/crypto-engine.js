/**
 * SecretDrop Crypto Engine
 * All encryption/decryption runs client-side using Web Crypto API.
 * The server never sees plaintext or keys.
 */
const CryptoEngine = (() => {
    const PBKDF2_ITERATIONS = 100000;
    const SALT_LENGTH = 16;
    const IV_LENGTH = 12;
    const KEY_LENGTH = 256;

    /**
     * Derive an AES-256-GCM key from a passphrase using PBKDF2.
     */
    async function deriveKey(passphrase, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: KEY_LENGTH },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt plaintext with a passphrase.
     * Returns base64-encoded string: salt(16) + iv(12) + ciphertext
     */
    async function encrypt(plaintext, passphrase) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const key = await deriveKey(passphrase, salt);

        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(plaintext)
        );

        // Combine salt + iv + ciphertext into one array
        const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

        return arrayBufferToBase64(combined);
    }

    /**
     * Decrypt base64-encoded ciphertext with a passphrase.
     * Returns original plaintext string.
     */
    async function decrypt(encryptedBase64, passphrase) {
        const combined = base64ToArrayBuffer(encryptedBase64);
        const salt = combined.slice(0, SALT_LENGTH);
        const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);
        const key = await deriveKey(passphrase, salt);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    }

    /**
     * Generate a SHA-256 hash of the ciphertext for zero-knowledge proof.
     */
    async function hashCiphertext(ciphertextBase64) {
        const encoder = new TextEncoder();
        const data = encoder.encode(ciphertextBase64);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        return Array.from(hashArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Encrypt with challenge-response (wraps challenge metadata into payload).
     */
    async function encryptWithChallenge(plaintext, passphrase, challenge) {
        const payload = JSON.stringify({
            _type: 'secretdrop_v1',
            challenge: challenge ? {
                question: challenge.question,
                answerHash: await hashString(challenge.answer.toLowerCase().trim())
            } : null,
            content: plaintext
        });
        return encrypt(payload, passphrase);
    }

    /**
     * Decrypt and extract challenge info if present.
     */
    async function decryptWithChallenge(encryptedBase64, passphrase) {
        const decrypted = await decrypt(encryptedBase64, passphrase);

        try {
            const parsed = JSON.parse(decrypted);
            if (parsed._type === 'secretdrop_v1') {
                return {
                    hasChallenge: !!parsed.challenge,
                    challenge: parsed.challenge,
                    content: parsed.content
                };
            }
        } catch {
            // Not a structured payload — return raw
        }

        return { hasChallenge: false, challenge: null, content: decrypted };
    }

    /**
     * Verify a challenge answer against the stored hash.
     */
    async function verifyChallenge(answer, expectedHash) {
        const hash = await hashString(answer.toLowerCase().trim());
        return hash === expectedHash;
    }

    async function hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Measure passphrase strength (0-4 scale).
     */
    function measureStrength(passphrase) {
        if (!passphrase) return { score: 0, label: '' };

        let score = 0;
        if (passphrase.length >= 8) score++;
        if (passphrase.length >= 14) score++;
        if (/[a-z]/.test(passphrase) && /[A-Z]/.test(passphrase)) score++;
        if (/\d/.test(passphrase)) score++;
        if (/[^a-zA-Z0-9]/.test(passphrase)) score++;

        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
        const classes = ['', 'weak', 'fair', 'good', 'strong', 'strong'];

        return {
            score: Math.min(score, 4),
            label: labels[score] || 'Weak',
            className: classes[score] || 'weak'
        };
    }

    return {
        encrypt,
        decrypt,
        encryptWithChallenge,
        decryptWithChallenge,
        verifyChallenge,
        hashCiphertext,
        measureStrength
    };
})();
