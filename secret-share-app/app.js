/**
 * SecretDrop — Main Application Controller
 */
(function () {
    'use strict';

    // === State ===
    let currentKeyMethod = 'text';
    let decryptKeyMethod = 'text';
    let voiceKeyValue = null;
    let decryptVoiceKeyValue = null;

    // === DOM References ===
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Views
    const views = {
        encrypt: $('#view-encrypt'),
        decrypt: $('#view-decrypt'),
        how: $('#view-how')
    };

    // === Navigation ===
    $$('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.view;
            $$('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Object.values(views).forEach(v => v.classList.remove('active'));
            views[target].classList.add('active');
        });
    });

    // === Key Method Selection (Encrypt) ===
    $$('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentKeyMethod = btn.dataset.method;
            $$('.method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.key-input-area').forEach(a => a.classList.remove('active'));
            $(`#key-${currentKeyMethod}`).classList.add('active');
            updateEncryptButton();
        });
    });

    // === Key Method Selection (Decrypt) ===
    $$('.d-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            decryptKeyMethod = btn.dataset.method;
            $$('.d-method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.d-key-input-area').forEach(a => a.classList.remove('active'));
            $(`#d-key-${decryptKeyMethod}`).classList.add('active');
        });
    });

    // === Secret Input ===
    const secretInput = $('#secret-input');
    const charCount = $('#char-count');

    secretInput.addEventListener('input', () => {
        charCount.textContent = secretInput.value.length;
        updateEncryptButton();
    });

    // === Text Key Input ===
    const textKey = $('#text-key');
    const keyStrength = $('#key-strength');

    textKey.addEventListener('input', () => {
        const strength = CryptoEngine.measureStrength(textKey.value);
        keyStrength.className = 'key-strength ' + strength.className;
        keyStrength.setAttribute('data-label', strength.label);
        updateEncryptButton();
    });

    // Toggle key visibility
    $('#toggle-key-vis').addEventListener('click', () => {
        textKey.type = textKey.type === 'password' ? 'text' : 'password';
    });

    // === Voice Recording (Encrypt) ===
    const voiceRecordBtn = $('#voice-record-btn');
    const voiceCanvas = $('#voice-canvas');
    const voiceStatus = $('#voice-status');

    voiceRecordBtn.addEventListener('mousedown', startVoiceRecording);
    voiceRecordBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startVoiceRecording();
    });
    voiceRecordBtn.addEventListener('mouseup', stopVoiceRecording);
    voiceRecordBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopVoiceRecording();
    });
    voiceRecordBtn.addEventListener('mouseleave', () => {
        if (VoiceKey.isRecording) stopVoiceRecording();
    });

    async function startVoiceRecording() {
        try {
            await VoiceKey.startRecording(voiceCanvas);
            voiceRecordBtn.classList.add('recording');
            voiceRecordBtn.querySelector('span').textContent = 'Recording...';
            voiceStatus.textContent = 'Speak your secret phrase...';
        } catch (err) {
            voiceStatus.textContent = 'Microphone access denied. Please allow microphone access.';
        }
    }

    async function stopVoiceRecording() {
        if (!VoiceKey.isRecording) return;
        voiceRecordBtn.classList.remove('recording');
        voiceRecordBtn.querySelector('span').textContent = 'Hold to Record';
        voiceStatus.textContent = 'Processing voice...';

        const key = await VoiceKey.stopRecording();
        if (key) {
            voiceKeyValue = key;
            voiceStatus.textContent = 'Voice key captured! Fingerprint: ' + key.substring(0, 16) + '...';
            updateEncryptButton();
        } else {
            voiceStatus.textContent = 'Recording too short. Try again.';
        }
    }

    // === Voice Recording (Decrypt) ===
    const dVoiceRecordBtn = $('#d-voice-record-btn');
    const dVoiceCanvas = $('#d-voice-canvas');
    const dVoiceStatus = $('#d-voice-status');

    dVoiceRecordBtn.addEventListener('mousedown', startDecryptVoiceRecording);
    dVoiceRecordBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDecryptVoiceRecording();
    });
    dVoiceRecordBtn.addEventListener('mouseup', stopDecryptVoiceRecording);
    dVoiceRecordBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDecryptVoiceRecording();
    });
    dVoiceRecordBtn.addEventListener('mouseleave', () => {
        if (VoiceKey.isRecording) stopDecryptVoiceRecording();
    });

    async function startDecryptVoiceRecording() {
        try {
            await VoiceKey.startRecording(dVoiceCanvas);
            dVoiceRecordBtn.classList.add('recording');
            dVoiceRecordBtn.querySelector('span').textContent = 'Recording...';
            dVoiceStatus.textContent = 'Speak the same phrase...';
        } catch {
            dVoiceStatus.textContent = 'Microphone access denied.';
        }
    }

    async function stopDecryptVoiceRecording() {
        if (!VoiceKey.isRecording) return;
        dVoiceRecordBtn.classList.remove('recording');
        dVoiceRecordBtn.querySelector('span').textContent = 'Hold to Record';
        dVoiceStatus.textContent = 'Processing voice...';

        const key = await VoiceKey.stopRecording();
        if (key) {
            decryptVoiceKeyValue = key;
            dVoiceStatus.textContent = 'Voice key captured! Fingerprint: ' + key.substring(0, 16) + '...';
        } else {
            dVoiceStatus.textContent = 'Recording too short. Try again.';
        }
    }

    // === Draw Pattern ===
    const drawInstance = DrawKey.init('draw-canvas');
    const dDrawInstance = DrawKey.init('d-draw-canvas');

    $('#clear-draw').addEventListener('click', () => {
        drawInstance.clear();
        updateEncryptButton();
    });

    $('#d-clear-draw').addEventListener('click', () => {
        dDrawInstance.clear();
    });

    // === Challenge ===
    const enableChallenge = $('#enable-challenge');
    const challengeArea = $('#challenge-area');

    enableChallenge.addEventListener('change', () => {
        challengeArea.classList.toggle('hidden', !enableChallenge.checked);
    });

    // === Encrypt Button State ===
    const encryptBtn = $('#encrypt-btn');

    function updateEncryptButton() {
        const hasSecret = secretInput.value.trim().length > 0;
        let hasKey = false;

        switch (currentKeyMethod) {
            case 'text':
                hasKey = textKey.value.length > 0;
                break;
            case 'voice':
                hasKey = voiceKeyValue !== null;
                break;
            case 'draw':
                hasKey = true; // Will validate on click
                break;
        }

        encryptBtn.disabled = !(hasSecret && hasKey);
    }

    // === Encrypt Action ===
    encryptBtn.addEventListener('click', async () => {
        const plaintext = secretInput.value;
        let key = '';

        switch (currentKeyMethod) {
            case 'text':
                key = textKey.value;
                break;
            case 'voice':
                key = voiceKeyValue;
                break;
            case 'draw':
                key = await drawInstance.getKey();
                if (!key) {
                    alert('Please draw a pattern first.');
                    return;
                }
                break;
        }

        // Show encryption animation
        encryptBtn.querySelector('.btn-text').style.display = 'none';
        encryptBtn.querySelector('.encryption-anim').classList.remove('hidden');
        encryptBtn.disabled = true;

        try {
            // Build challenge if enabled
            let challenge = null;
            if (enableChallenge.checked) {
                const q = $('#challenge-question').value.trim();
                const a = $('#challenge-answer').value.trim();
                if (q && a) {
                    challenge = { question: q, answer: a };
                }
            }

            // Encrypt
            const encrypted = await CryptoEngine.encryptWithChallenge(plaintext, key, challenge);
            const hash = await CryptoEngine.hashCiphertext(encrypted);

            // Build shareable link (fragment-based — never sent to server)
            const link = window.location.origin + window.location.pathname +
                '#/secret/' + encodeURIComponent(encrypted);

            // Display results
            const resultCard = $('#encrypt-result');
            resultCard.classList.remove('hidden');
            $('#proof-hash').textContent = hash.substring(0, 32) + '...';
            $('#secret-link').value = link;

            // Expiry info
            const expirySelect = $('#expiry-select');
            const expiryText = expirySelect.options[expirySelect.selectedIndex].text;
            $('#result-expiry-info').textContent = expiryText;

            const oneTimeView = $('#one-time-view').checked;
            $('#result-view-info').textContent = oneTimeView ? 'once' : 'until expiry';

            // QR code
            QRGenerator.generate($('#qr-canvas'), link, 180);

            // Scroll to result
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        } catch (err) {
            alert('Encryption failed: ' + err.message);
        } finally {
            encryptBtn.querySelector('.btn-text').style.display = '';
            encryptBtn.querySelector('.encryption-anim').classList.add('hidden');
            encryptBtn.disabled = false;
        }
    });

    // === Copy Link ===
    $('#copy-link-btn').addEventListener('click', async () => {
        const btn = $('#copy-link-btn');
        try {
            await navigator.clipboard.writeText($('#secret-link').value);
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 2000);
        } catch {
            // Fallback: select the input
            $('#secret-link').select();
        }
    });

    // === Decrypt Action ===
    $('#decrypt-btn').addEventListener('click', async () => {
        const encryptedInput = $('#encrypted-input').value.trim();
        let encrypted = encryptedInput;

        // Extract from link if it's a SecretDrop URL
        const linkMatch = encryptedInput.match(/#\/secret\/(.+)$/);
        if (linkMatch) {
            encrypted = decodeURIComponent(linkMatch[1]);
        }

        if (!encrypted) {
            alert('Please paste encrypted data or a SecretDrop link.');
            return;
        }

        let key = '';
        switch (decryptKeyMethod) {
            case 'text':
                key = $('#decrypt-key').value;
                break;
            case 'voice':
                key = decryptVoiceKeyValue;
                break;
            case 'draw':
                key = await dDrawInstance.getKey();
                break;
        }

        if (!key) {
            alert('Please provide a decryption key.');
            return;
        }

        // Show animation
        const btn = $('#decrypt-btn');
        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.encryption-anim').classList.remove('hidden');
        btn.disabled = true;

        try {
            const result = await CryptoEngine.decryptWithChallenge(encrypted, key);

            if (result.hasChallenge) {
                // Show challenge gate
                $('#decrypt-form').style.display = 'none';
                const gate = $('#challenge-gate');
                gate.classList.remove('hidden');
                $('#challenge-display-question').textContent = result.challenge.question;

                // Store result for after verification
                gate._pendingResult = result;
            } else {
                showDecryptedResult(result.content);
            }
        } catch {
            $('#decrypt-error').classList.remove('hidden');
            $('#decrypt-result').classList.add('hidden');
            setTimeout(() => {
                $('#decrypt-error').classList.add('hidden');
            }, 5000);
        } finally {
            btn.querySelector('.btn-text').style.display = '';
            btn.querySelector('.encryption-anim').classList.add('hidden');
            btn.disabled = false;
        }
    });

    // === Challenge Verification ===
    $('#verify-challenge-btn').addEventListener('click', async () => {
        const gate = $('#challenge-gate');
        const result = gate._pendingResult;
        const answer = $('#challenge-answer-input').value;

        const verified = await CryptoEngine.verifyChallenge(
            answer,
            result.challenge.answerHash
        );

        if (verified) {
            gate.classList.add('hidden');
            showDecryptedResult(result.content);
        } else {
            $('#challenge-error').classList.remove('hidden');
            setTimeout(() => {
                $('#challenge-error').classList.add('hidden');
            }, 3000);
        }
    });

    function showDecryptedResult(content) {
        $('#decrypt-result').classList.remove('hidden');
        $('#decrypt-error').classList.add('hidden');
        $('#decrypted-text').textContent = content;
    }

    // === Copy Decrypted Text ===
    $('#copy-decrypted').addEventListener('click', async () => {
        const btn = $('#copy-decrypted');
        try {
            await navigator.clipboard.writeText($('#decrypted-text').textContent);
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Copy to Clipboard';
                btn.classList.remove('copied');
            }, 2000);
        } catch {
            // Fallback
        }
    });

    // === Handle incoming secret links ===
    function checkForSecret() {
        const hash = window.location.hash;
        if (hash.startsWith('#/secret/')) {
            // Switch to decrypt view
            $$('.nav-btn').forEach(b => b.classList.remove('active'));
            $$('.nav-btn')[1].classList.add('active');
            Object.values(views).forEach(v => v.classList.remove('active'));
            views.decrypt.classList.add('active');

            // Fill in the encrypted data
            const encrypted = decodeURIComponent(hash.substring('#/secret/'.length));
            $('#encrypted-input').value = encrypted;
        }
    }

    checkForSecret();
    window.addEventListener('hashchange', checkForSecret);

    // === Clear decrypted data on page leave ===
    window.addEventListener('beforeunload', () => {
        const decryptedText = $('#decrypted-text');
        if (decryptedText) decryptedText.textContent = '';
    });

})();
