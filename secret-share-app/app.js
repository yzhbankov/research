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
        how: $('#view-how'),
        vault: $('#view-vault')
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

    // =========================================================
    // === GitHub Vault Controller ===
    // =========================================================

    const vaultKeySelect = $('#vault-key-select');
    const vaultExportBtn = $('#vault-export-key');
    const vaultDeleteBtn = $('#vault-delete-key');
    const vaultFingerprintArea = $('#vault-key-fingerprint');
    const vaultFingerprintValue = $('#vault-fingerprint-value');

    // Track files for encrypt/decrypt
    let vaultEncryptFiles = [];
    let vaultDecryptFiles = [];
    let vaultEncryptResults = [];
    let vaultDecryptResults = [];

    // === Key Management ===
    function refreshKeyList() {
        const keys = KeyManager.listKeys();
        const activeId = KeyManager.getActiveKeyId();
        vaultKeySelect.innerHTML = '<option value="">-- Select a key --</option>';
        keys.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k.id;
            opt.textContent = k.name + ' (' + new Date(k.createdAt).toLocaleDateString() + ')';
            if (k.id === activeId) opt.selected = true;
            vaultKeySelect.appendChild(opt);
        });
        updateVaultKeyUI();
    }

    async function updateVaultKeyUI() {
        const keyId = vaultKeySelect.value;
        const hasKey = !!keyId;
        vaultExportBtn.disabled = !hasKey;
        vaultDeleteBtn.disabled = !hasKey;
        KeyManager.setActiveKeyId(keyId || null);

        if (hasKey) {
            const fp = await KeyManager.getKeyFingerprint(keyId);
            vaultFingerprintValue.textContent = fp;
            vaultFingerprintArea.classList.remove('hidden');
        } else {
            vaultFingerprintArea.classList.add('hidden');
        }

        // Update encrypt/decrypt button states
        updateVaultEncryptBtn();
        updateVaultDecryptBtn();
    }

    vaultKeySelect.addEventListener('change', updateVaultKeyUI);

    $('#vault-generate-key').addEventListener('click', async () => {
        const name = prompt('Enter a name for this key (e.g., "my-project-key"):');
        if (!name) return;
        const entry = await KeyManager.generateKey(name.trim());
        KeyManager.saveKey(entry);
        KeyManager.setActiveKeyId(entry.id);
        refreshKeyList();
    });

    $('#vault-import-key').addEventListener('click', () => {
        $('#vault-import-file').click();
    });

    $('#vault-import-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const entry = await KeyManager.importKeyFromFile(file);
            KeyManager.setActiveKeyId(entry.id);
            refreshKeyList();
        } catch (err) {
            alert('Import failed: ' + err.message);
        }
        e.target.value = '';
    });

    vaultExportBtn.addEventListener('click', () => {
        const keyId = vaultKeySelect.value;
        if (keyId) KeyManager.exportKeyToFile(keyId);
    });

    vaultDeleteBtn.addEventListener('click', () => {
        const keyId = vaultKeySelect.value;
        if (!keyId) return;
        if (!confirm('Delete this key? Files encrypted with it cannot be decrypted without a backup.')) return;
        KeyManager.deleteKey(keyId);
        refreshKeyList();
    });

    // === File Encrypt Section ===
    function setupDropzone(dropzoneId, fileInputId, onFilesAdded) {
        const dropzone = $(dropzoneId);
        const fileInput = $(fileInputId);

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) onFilesAdded(Array.from(e.dataTransfer.files));
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) onFilesAdded(Array.from(fileInput.files));
            fileInput.value = '';
        });
    }

    setupDropzone('#vault-encrypt-dropzone', '#vault-encrypt-files', async (files) => {
        vaultEncryptFiles = files;
        vaultEncryptResults = [];
        const tbody = $('#vault-encrypt-tbody');
        tbody.innerHTML = '';

        for (const file of files) {
            const encrypted = await GitVault.isEncrypted(file);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="vault-file-check" checked></td>
                <td class="vault-file-name">${escapeHtml(file.name)}</td>
                <td>${GitVault.formatFileSize(file.size)}</td>
                <td><span class="vault-status ${encrypted ? 'status-encrypted' : 'status-plaintext'}">${encrypted ? 'Encrypted' : 'Plaintext'}</span></td>
                <td class="vault-file-action-cell">—</td>
            `;
            tbody.appendChild(tr);
        }

        $('#vault-encrypt-list').classList.remove('hidden');
        $('#vault-encrypt-download-all').classList.add('hidden');
        updateVaultEncryptBtn();
    });

    setupDropzone('#vault-decrypt-dropzone', '#vault-decrypt-files', async (files) => {
        vaultDecryptFiles = files;
        vaultDecryptResults = [];
        const tbody = $('#vault-decrypt-tbody');
        tbody.innerHTML = '';

        for (const file of files) {
            const encrypted = await GitVault.isEncrypted(file);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="vault-d-file-check" checked></td>
                <td class="vault-file-name">${escapeHtml(file.name)}</td>
                <td>${GitVault.formatFileSize(file.size)}</td>
                <td><span class="vault-status ${encrypted ? 'status-encrypted' : 'status-plaintext'}">${encrypted ? 'Encrypted' : 'Not Encrypted'}</span></td>
                <td class="vault-file-action-cell">—</td>
            `;
            tbody.appendChild(tr);
        }

        $('#vault-decrypt-list').classList.remove('hidden');
        $('#vault-decrypt-download-all').classList.add('hidden');
        updateVaultDecryptBtn();
    });

    // Select-all checkboxes
    $('#vault-encrypt-select-all').addEventListener('change', (e) => {
        $$('#vault-encrypt-tbody .vault-file-check').forEach(cb => cb.checked = e.target.checked);
        updateVaultEncryptBtn();
    });
    $('#vault-decrypt-select-all').addEventListener('change', (e) => {
        $$('#vault-decrypt-tbody .vault-d-file-check').forEach(cb => cb.checked = e.target.checked);
        updateVaultDecryptBtn();
    });

    // Delegate checkbox changes
    $('#vault-encrypt-tbody').addEventListener('change', updateVaultEncryptBtn);
    $('#vault-decrypt-tbody').addEventListener('change', updateVaultDecryptBtn);

    function updateVaultEncryptBtn() {
        const hasKey = !!vaultKeySelect.value;
        const checkedCount = $$('#vault-encrypt-tbody .vault-file-check:checked').length;
        $('#vault-encrypt-btn').disabled = !hasKey || checkedCount === 0;
    }

    function updateVaultDecryptBtn() {
        const hasKey = !!vaultKeySelect.value;
        const checkedCount = $$('#vault-decrypt-tbody .vault-d-file-check:checked').length;
        $('#vault-decrypt-btn').disabled = !hasKey || checkedCount === 0;
    }

    // Encrypt action
    $('#vault-encrypt-btn').addEventListener('click', async () => {
        const keyId = vaultKeySelect.value;
        if (!keyId) return alert('Select an encryption key first.');

        const checks = $$('#vault-encrypt-tbody .vault-file-check');
        const selectedFiles = vaultEncryptFiles.filter((_, i) => checks[i] && checks[i].checked);
        if (!selectedFiles.length) return;

        const btn = $('#vault-encrypt-btn');
        btn.disabled = true;
        btn.textContent = 'Encrypting...';

        const progress = $('#vault-encrypt-progress');
        const progressBar = $('#vault-encrypt-progress-bar');
        const progressText = $('#vault-encrypt-progress-text');
        progress.classList.remove('hidden');

        try {
            const key = await KeyManager.loadKey(keyId);
            vaultEncryptResults = await GitVault.encryptMultiple(selectedFiles, key, (done, total) => {
                progressBar.style.width = ((done / total) * 100) + '%';
                progressText.textContent = done + ' / ' + total;
            });

            // Update table with download links
            const rows = $$('#vault-encrypt-tbody tr');
            let resultIdx = 0;
            for (let i = 0; i < rows.length; i++) {
                if (checks[i] && checks[i].checked) {
                    const r = vaultEncryptResults[resultIdx++];
                    const cell = rows[i].querySelector('.vault-file-action-cell');
                    const dlBtn = document.createElement('button');
                    dlBtn.className = 'btn-small';
                    dlBtn.textContent = 'Download';
                    dlBtn.addEventListener('click', () => GitVault.downloadFile(r.blob, r.encryptedName));
                    cell.textContent = '';
                    cell.appendChild(dlBtn);

                    const statusCell = rows[i].querySelector('.vault-status');
                    statusCell.className = 'vault-status status-encrypted';
                    statusCell.textContent = 'Encrypted';
                }
            }

            $('#vault-encrypt-download-all').classList.remove('hidden');
        } catch (err) {
            alert('Encryption failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Encrypt Selected';
            setTimeout(() => progress.classList.add('hidden'), 1500);
        }
    });

    // Download all encrypted
    $('#vault-encrypt-download-all').addEventListener('click', () => {
        vaultEncryptResults.forEach(r => GitVault.downloadFile(r.blob, r.encryptedName));
    });

    // Decrypt action
    $('#vault-decrypt-btn').addEventListener('click', async () => {
        const keyId = vaultKeySelect.value;
        if (!keyId) return alert('Select a decryption key first.');

        const checks = $$('#vault-decrypt-tbody .vault-d-file-check');
        const selectedFiles = vaultDecryptFiles.filter((_, i) => checks[i] && checks[i].checked);
        if (!selectedFiles.length) return;

        const btn = $('#vault-decrypt-btn');
        btn.disabled = true;
        btn.textContent = 'Decrypting...';

        const progress = $('#vault-decrypt-progress');
        const progressBar = $('#vault-decrypt-progress-bar');
        const progressText = $('#vault-decrypt-progress-text');
        progress.classList.remove('hidden');

        try {
            const key = await KeyManager.loadKey(keyId);
            vaultDecryptResults = await GitVault.decryptMultiple(selectedFiles, key, (done, total) => {
                progressBar.style.width = ((done / total) * 100) + '%';
                progressText.textContent = done + ' / ' + total;
            });

            const rows = $$('#vault-decrypt-tbody tr');
            let resultIdx = 0;
            for (let i = 0; i < rows.length; i++) {
                if (checks[i] && checks[i].checked) {
                    const r = vaultDecryptResults[resultIdx++];
                    const cell = rows[i].querySelector('.vault-file-action-cell');
                    const statusCell = rows[i].querySelector('.vault-status');

                    if (r.error) {
                        statusCell.className = 'vault-status status-error';
                        statusCell.textContent = 'Failed';
                        cell.textContent = r.error;
                    } else {
                        const dlBtn = document.createElement('button');
                        dlBtn.className = 'btn-small';
                        dlBtn.textContent = 'Download';
                        dlBtn.addEventListener('click', () => GitVault.downloadFile(r.blob, r.decryptedName));
                        cell.textContent = '';
                        cell.appendChild(dlBtn);
                        statusCell.className = 'vault-status status-decrypted';
                        statusCell.textContent = 'Decrypted';
                    }
                }
            }

            const successResults = vaultDecryptResults.filter(r => !r.error);
            if (successResults.length > 0) {
                $('#vault-decrypt-download-all').classList.remove('hidden');
            }
        } catch (err) {
            alert('Decryption failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke-dasharray="4"/></svg> Decrypt Selected';
            setTimeout(() => progress.classList.add('hidden'), 1500);
        }
    });

    // Download all decrypted
    $('#vault-decrypt-download-all').addEventListener('click', () => {
        vaultDecryptResults.filter(r => !r.error).forEach(r => GitVault.downloadFile(r.blob, r.decryptedName));
    });

    // === Config Generator ===
    const configPatterns = $('#vault-config-patterns');
    const configPreview = $('#vault-config-preview');
    const configPreviewArea = $('#vault-config-preview-area');
    const downloadConfigBtn = $('#vault-download-config');

    configPatterns.addEventListener('input', updateConfigPreview);

    function updateConfigPreview() {
        const patterns = configPatterns.value.split('\n').filter(l => l.trim());
        if (patterns.length > 0) {
            configPreviewArea.classList.remove('hidden');
            configPreview.textContent = GitVault.generateConfig(patterns);
            downloadConfigBtn.disabled = false;
        } else {
            configPreviewArea.classList.add('hidden');
            downloadConfigBtn.disabled = true;
        }
    }

    $$('.vault-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pattern = btn.dataset.pattern;
            const current = configPatterns.value.trim();
            // Don't add duplicates
            const lines = current.split('\n').map(l => l.trim()).filter(Boolean);
            if (!lines.includes(pattern)) {
                configPatterns.value = current ? current + '\n' + pattern : pattern;
                updateConfigPreview();
            }
        });
    });

    downloadConfigBtn.addEventListener('click', () => {
        const patterns = configPatterns.value.split('\n').filter(l => l.trim());
        const content = GitVault.generateConfig(patterns);
        const blob = new Blob([content], { type: 'text/plain' });
        GitVault.downloadFile(blob, '.secretdrop-vault');
    });

    // === HTML Escape Utility ===
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initialize vault key list on load
    refreshKeyList();

})();
