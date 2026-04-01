/**
 * VoiceKey — Derive encryption keys from voice phrases.
 * Uses Web Audio API to extract audio features, then hashes them
 * into a deterministic key.
 *
 * Note: Voice key derivation is approximate. The same phrase spoken
 * by the same person will produce a similar (not identical) fingerprint.
 * We use spectral envelope quantization to allow for natural variation.
 */
const VoiceKey = (() => {
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let animationFrame = null;
    let analyser = null;
    let audioContext = null;
    let stream = null;

    /**
     * Start recording voice input.
     */
    async function startRecording(canvas) {
        audioChunks = [];
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.start(100);
        isRecording = true;

        if (canvas) {
            visualize(canvas);
        }
    }

    /**
     * Stop recording and return a derived key string from the audio.
     */
    async function stopRecording() {
        return new Promise((resolve) => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            mediaRecorder.onstop = async () => {
                isRecording = false;
                cancelAnimationFrame(animationFrame);

                // Stop all tracks
                if (stream) {
                    stream.getTracks().forEach(t => t.stop());
                }

                if (audioChunks.length === 0) {
                    resolve(null);
                    return;
                }

                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const key = await deriveKeyFromAudio(blob);
                resolve(key);
            };

            mediaRecorder.stop();
        });
    }

    /**
     * Extract spectral features from audio and produce a deterministic key.
     */
    async function deriveKeyFromAudio(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = new OfflineAudioContext(1, 44100 * 3, 44100);
        let audioBuffer;
        try {
            audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        } catch {
            // If decoding fails, fall back to raw bytes hash
            const bytes = new Uint8Array(arrayBuffer);
            return hashBytes(bytes);
        }

        const channelData = audioBuffer.getChannelData(0);

        // Extract spectral envelope features using simple FFT-like approach
        const features = extractFeatures(channelData, audioBuffer.sampleRate);

        // Quantize features to allow for natural voice variation
        const quantized = quantizeFeatures(features);

        // Hash the quantized features into a key string
        return hashFeatures(quantized);
    }

    /**
     * Extract audio features: energy, zero-crossing rate, spectral centroid.
     */
    function extractFeatures(samples, sampleRate) {
        const frameSize = 1024;
        const hopSize = 512;
        const features = [];

        for (let i = 0; i + frameSize < samples.length; i += hopSize) {
            const frame = samples.slice(i, i + frameSize);

            // RMS energy
            let energy = 0;
            for (let j = 0; j < frame.length; j++) {
                energy += frame[j] * frame[j];
            }
            energy = Math.sqrt(energy / frame.length);

            // Zero-crossing rate
            let zcr = 0;
            for (let j = 1; j < frame.length; j++) {
                if ((frame[j] >= 0) !== (frame[j - 1] >= 0)) zcr++;
            }
            zcr /= frame.length;

            // Simple spectral centroid approximation
            let centroid = 0;
            let totalMag = 0;
            for (let j = 0; j < frame.length; j++) {
                const mag = Math.abs(frame[j]);
                centroid += j * mag;
                totalMag += mag;
            }
            centroid = totalMag > 0 ? centroid / totalMag : 0;

            features.push({ energy, zcr, centroid });
        }

        return features;
    }

    /**
     * Quantize features to discrete buckets for fuzzy matching.
     */
    function quantizeFeatures(features) {
        if (features.length === 0) return [0];

        // Take a fixed number of evenly-spaced feature snapshots
        const numBuckets = 16;
        const step = Math.max(1, Math.floor(features.length / numBuckets));
        const quantized = [];

        for (let i = 0; i < numBuckets && i * step < features.length; i++) {
            const f = features[i * step];
            // Quantize each feature to 4 bits (16 levels)
            const eQ = Math.min(15, Math.floor(f.energy * 100));
            const zQ = Math.min(15, Math.floor(f.zcr * 30));
            const cQ = Math.min(15, Math.floor(f.centroid / 64));
            quantized.push((eQ << 8) | (zQ << 4) | cQ);
        }

        return quantized;
    }

    /**
     * Hash quantized features into a passphrase string.
     */
    async function hashFeatures(quantized) {
        const str = quantized.join('-');
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        return Array.from(hashArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async function hashBytes(bytes) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Visualize audio input on canvas.
     */
    function visualize(canvas) {
        if (!analyser) return;

        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
            if (!isRecording) return;
            animationFrame = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#0d0d14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, '#6366f1');
                gradient.addColorStop(1, '#ec4899');
                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        }

        draw();
    }

    return {
        startRecording,
        stopRecording,
        get isRecording() { return isRecording; }
    };
})();
