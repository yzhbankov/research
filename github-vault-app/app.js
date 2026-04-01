/**
 * GitVault — Main Application Controller
 */
(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // === Views ===
    const views = {
        encrypt: $('#view-encrypt'),
        decrypt: $('#view-decrypt'),
        config: $('#view-config'),
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

    // =========================================================
    // Key Management
    // =========================================================
    const keySelect = $('#key-select');
    const exportBtn = $('#btn-export-key');
    const deleteBtn = $('#btn-delete-key');
    const fingerprintArea = $('#key-fingerprint');
    const fingerprintValue = $('#key-fingerprint-value');

    function refreshKeyList() {
        const keys = KeyManager.listKeys();
        const activeId = KeyManager.getActiveKeyId();
        keySelect.innerHTML = '<option value="">-- Select or generate a key --</option>';
        keys.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k.id;
            opt.textContent = k.name + ' (' + new Date(k.createdAt).toLocaleDateString() + ')';
            if (k.id === activeId) opt.selected = true;
            keySelect.appendChild(opt);
        });
        updateKeyUI();
    }

    async function updateKeyUI() {
        const keyId = keySelect.value;
        const hasKey = !!keyId;
        exportBtn.disabled = !hasKey;
        deleteBtn.disabled = !hasKey;
        KeyManager.setActiveKeyId(keyId || null);

        if (hasKey) {
            const fp = await KeyManager.getKeyFingerprint(keyId);
            fingerprintValue.textContent = fp;
            fingerprintArea.classList.remove('hidden');
        } else {
            fingerprintArea.classList.add('hidden');
        }

        updateEncryptBtn();
        updateDecryptBtn();
    }

    keySelect.addEventListener('change', updateKeyUI);

    $('#btn-generate-key').addEventListener('click', async () => {
        const name = prompt('Key name (e.g., "my-project-key"):');
        if (!name) return;
        const entry = await KeyManager.generateKey(name.trim());
        KeyManager.saveKey(entry);
        KeyManager.setActiveKeyId(entry.id);
        refreshKeyList();
    });

    $('#btn-import-key').addEventListener('click', () => {
        $('#import-file-input').click();
    });

    $('#import-file-input').addEventListener('change', async (e) => {
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

    exportBtn.addEventListener('click', () => {
        const keyId = keySelect.value;
        if (keyId) KeyManager.exportKeyToFile(keyId);
    });

    deleteBtn.addEventListener('click', () => {
        const keyId = keySelect.value;
        if (!keyId) return;
        if (!confirm('Delete this key? Files encrypted with it cannot be decrypted without a backup.')) return;
        KeyManager.deleteKey(keyId);
        refreshKeyList();
    });

    // =========================================================
    // Dropzone Setup
    // =========================================================
    function setupDropzone(dropzoneSelector, fileInputSelector, onFiles) {
        const dz = $(dropzoneSelector);
        const fi = $(fileInputSelector);

        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.classList.remove('dragover');
            if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
        });
        fi.addEventListener('change', () => {
            if (fi.files.length) onFiles(Array.from(fi.files));
            fi.value = '';
        });
    }

    // =========================================================
    // Encrypt Flow
    // =========================================================
    let encryptFiles = [];
    let encryptResults = [];

    setupDropzone('#encrypt-dropzone', '#encrypt-file-input', async (files) => {
        encryptFiles = files;
        encryptResults = [];
        const tbody = $('#encrypt-tbody');
        tbody.innerHTML = '';

        for (const file of files) {
            const enc = await GitVault.isEncrypted(file);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="col-check"><input type="checkbox" class="enc-check" checked></td>
                <td class="file-name">${esc(file.name)}</td>
                <td>${GitVault.formatFileSize(file.size)}</td>
                <td><span class="status-badge ${enc ? 'status-encrypted' : 'status-plaintext'}">${enc ? 'Already Encrypted' : 'Plaintext'}</span></td>
                <td class="action-cell">&mdash;</td>
            `;
            tbody.appendChild(tr);
        }

        $('#encrypt-file-list').classList.remove('hidden');
        $('#btn-encrypt-download-all').classList.add('hidden');
        updateEncryptBtn();
    });

    $('#encrypt-select-all').addEventListener('change', (e) => {
        $$('#encrypt-tbody .enc-check').forEach(cb => cb.checked = e.target.checked);
        updateEncryptBtn();
    });
    $('#encrypt-tbody').addEventListener('change', updateEncryptBtn);

    function updateEncryptBtn() {
        const hasKey = !!keySelect.value;
        const checked = $$('#encrypt-tbody .enc-check:checked').length;
        $('#btn-encrypt').disabled = !hasKey || checked === 0;
    }

    $('#btn-encrypt').addEventListener('click', async () => {
        const keyId = keySelect.value;
        if (!keyId) return alert('Select an encryption key first.');

        const checks = $$('#encrypt-tbody .enc-check');
        const selected = encryptFiles.filter((_, i) => checks[i] && checks[i].checked);
        if (!selected.length) return;

        const btn = $('#btn-encrypt');
        btn.disabled = true;
        btn.textContent = 'Encrypting...';
        showProgress('encrypt', true);

        try {
            const key = await KeyManager.loadKey(keyId);
            encryptResults = await GitVault.encryptMultiple(selected, key, (done, total) => {
                setProgress('encrypt', done, total);
            });

            const rows = $$('#encrypt-tbody tr');
            let ri = 0;
            for (let i = 0; i < rows.length; i++) {
                if (checks[i] && checks[i].checked) {
                    const r = encryptResults[ri++];
                    const cell = rows[i].querySelector('.action-cell');
                    cell.innerHTML = '';
                    const dl = document.createElement('button');
                    dl.className = 'btn-small';
                    dl.textContent = 'Download';
                    dl.addEventListener('click', () => GitVault.downloadFile(r.blob, r.encryptedName));
                    cell.appendChild(dl);

                    const badge = rows[i].querySelector('.status-badge');
                    badge.className = 'status-badge status-encrypted';
                    badge.textContent = 'Encrypted';
                }
            }
            $('#btn-encrypt-download-all').classList.remove('hidden');
        } catch (err) {
            alert('Encryption failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Encrypt Selected';
            setTimeout(() => showProgress('encrypt', false), 1200);
        }
    });

    $('#btn-encrypt-download-all').addEventListener('click', () => {
        encryptResults.forEach(r => GitVault.downloadFile(r.blob, r.encryptedName));
    });

    // =========================================================
    // Decrypt Flow
    // =========================================================
    let decryptFiles = [];
    let decryptResults = [];

    setupDropzone('#decrypt-dropzone', '#decrypt-file-input', async (files) => {
        decryptFiles = files;
        decryptResults = [];
        const tbody = $('#decrypt-tbody');
        tbody.innerHTML = '';

        for (const file of files) {
            const enc = await GitVault.isEncrypted(file);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="col-check"><input type="checkbox" class="dec-check" checked></td>
                <td class="file-name">${esc(file.name)}</td>
                <td>${GitVault.formatFileSize(file.size)}</td>
                <td><span class="status-badge ${enc ? 'status-encrypted' : 'status-plaintext'}">${enc ? 'Encrypted' : 'Not Encrypted'}</span></td>
                <td class="action-cell">&mdash;</td>
            `;
            tbody.appendChild(tr);
        }

        $('#decrypt-file-list').classList.remove('hidden');
        $('#btn-decrypt-download-all').classList.add('hidden');
        updateDecryptBtn();
    });

    $('#decrypt-select-all').addEventListener('change', (e) => {
        $$('#decrypt-tbody .dec-check').forEach(cb => cb.checked = e.target.checked);
        updateDecryptBtn();
    });
    $('#decrypt-tbody').addEventListener('change', updateDecryptBtn);

    function updateDecryptBtn() {
        const hasKey = !!keySelect.value;
        const checked = $$('#decrypt-tbody .dec-check:checked').length;
        $('#btn-decrypt').disabled = !hasKey || checked === 0;
    }

    $('#btn-decrypt').addEventListener('click', async () => {
        const keyId = keySelect.value;
        if (!keyId) return alert('Select a decryption key first.');

        const checks = $$('#decrypt-tbody .dec-check');
        const selected = decryptFiles.filter((_, i) => checks[i] && checks[i].checked);
        if (!selected.length) return;

        const btn = $('#btn-decrypt');
        btn.disabled = true;
        btn.textContent = 'Decrypting...';
        showProgress('decrypt', true);

        try {
            const key = await KeyManager.loadKey(keyId);
            decryptResults = await GitVault.decryptMultiple(selected, key, (done, total) => {
                setProgress('decrypt', done, total);
            });

            const rows = $$('#decrypt-tbody tr');
            let ri = 0;
            for (let i = 0; i < rows.length; i++) {
                if (checks[i] && checks[i].checked) {
                    const r = decryptResults[ri++];
                    const cell = rows[i].querySelector('.action-cell');
                    const badge = rows[i].querySelector('.status-badge');

                    if (r.error) {
                        badge.className = 'status-badge status-error';
                        badge.textContent = 'Failed';
                        cell.textContent = r.error;
                    } else {
                        cell.innerHTML = '';
                        const dl = document.createElement('button');
                        dl.className = 'btn-small';
                        dl.textContent = 'Download';
                        dl.addEventListener('click', () => GitVault.downloadFile(r.blob, r.decryptedName));
                        cell.appendChild(dl);
                        badge.className = 'status-badge status-decrypted';
                        badge.textContent = 'Decrypted';
                    }
                }
            }

            if (decryptResults.some(r => !r.error)) {
                $('#btn-decrypt-download-all').classList.remove('hidden');
            }
        } catch (err) {
            alert('Decryption failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Decrypt Selected';
            setTimeout(() => showProgress('decrypt', false), 1200);
        }
    });

    $('#btn-decrypt-download-all').addEventListener('click', () => {
        decryptResults.filter(r => !r.error).forEach(r => GitVault.downloadFile(r.blob, r.decryptedName));
    });

    // =========================================================
    // Config Generator
    // =========================================================
    const configPatterns = $('#config-patterns');
    const configPreview = $('#config-preview');
    const configPreviewArea = $('#config-preview-area');
    const downloadConfigBtn = $('#btn-download-config');

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

    $$('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pattern = btn.dataset.pattern;
            const current = configPatterns.value.trim();
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
        GitVault.downloadFile(blob, '.gitvault');
    });

    // Copy gitignore
    $('#btn-copy-gitignore').addEventListener('click', async () => {
        const btn = $('#btn-copy-gitignore');
        const text = $('.gitignore-preview').textContent;
        try {
            await navigator.clipboard.writeText(text);
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = 'Copy to Clipboard'; btn.classList.remove('copied'); }, 2000);
        } catch {
            // fallback: select text
        }
    });

    // =========================================================
    // Utilities
    // =========================================================
    function esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showProgress(prefix, visible) {
        $(`#${prefix}-progress`).classList.toggle('hidden', !visible);
        if (!visible) {
            $(`#${prefix}-progress-fill`).style.width = '0%';
        }
    }

    function setProgress(prefix, done, total) {
        $(`#${prefix}-progress-fill`).style.width = ((done / total) * 100) + '%';
        $(`#${prefix}-progress-text`).textContent = done + ' / ' + total;
    }

    // Initialize
    refreshKeyList();

})();
