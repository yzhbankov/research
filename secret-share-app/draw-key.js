/**
 * DrawKey — Derive encryption keys from drawn patterns.
 * Captures stroke data, normalizes it, and hashes into a key.
 */
const DrawKey = (() => {
    const instances = new Map();

    function init(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let drawing = false;
        let strokes = [];
        let currentStroke = [];

        // Style
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            if (e.touches) {
                return {
                    x: (e.touches[0].clientX - rect.left) * scaleX,
                    y: (e.touches[0].clientY - rect.top) * scaleY
                };
            }
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }

        function startDraw(e) {
            e.preventDefault();
            drawing = true;
            currentStroke = [];
            const pos = getPos(e);
            currentStroke.push(pos);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }

        function draw(e) {
            if (!drawing) return;
            e.preventDefault();
            const pos = getPos(e);
            currentStroke.push(pos);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }

        function endDraw(e) {
            if (!drawing) return;
            e.preventDefault();
            drawing = false;
            if (currentStroke.length > 1) {
                strokes.push([...currentStroke]);
            }
            currentStroke = [];
        }

        // Mouse events
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);

        // Touch events
        canvas.addEventListener('touchstart', startDraw);
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', endDraw);

        function clear() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            strokes = [];
        }

        async function getKey() {
            if (strokes.length === 0) return null;

            // Normalize strokes to a grid
            const normalized = normalizeStrokes(strokes, canvas.width, canvas.height);

            // Hash into a key
            const str = JSON.stringify(normalized);
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        const instance = { clear, getKey };
        instances.set(canvasId, instance);
        return instance;
    }

    /**
     * Normalize strokes into a grid of quantized points.
     * This provides some tolerance for slight variations in drawing.
     */
    function normalizeStrokes(strokes, width, height) {
        const gridSize = 10; // 10x10 grid
        const cellW = width / gridSize;
        const cellH = height / gridSize;

        return strokes.map(stroke => {
            // Sample evenly along the stroke
            const sampled = sampleStroke(stroke, 20);
            return sampled.map(p => ({
                x: Math.floor(p.x / cellW),
                y: Math.floor(p.y / cellH)
            }));
        });
    }

    /**
     * Resample a stroke to N evenly-spaced points.
     */
    function sampleStroke(stroke, n) {
        if (stroke.length <= 1) return stroke;

        // Calculate total path length
        let totalLen = 0;
        for (let i = 1; i < stroke.length; i++) {
            const dx = stroke[i].x - stroke[i - 1].x;
            const dy = stroke[i].y - stroke[i - 1].y;
            totalLen += Math.sqrt(dx * dx + dy * dy);
        }

        if (totalLen === 0) return [stroke[0]];

        const step = totalLen / (n - 1);
        const sampled = [{ ...stroke[0] }];
        let accum = 0;
        let j = 1;

        for (let i = 1; i < n - 1; i++) {
            const target = step * i;
            while (j < stroke.length) {
                const dx = stroke[j].x - stroke[j - 1].x;
                const dy = stroke[j].y - stroke[j - 1].y;
                const segLen = Math.sqrt(dx * dx + dy * dy);

                if (accum + segLen >= target) {
                    const t = (target - accum) / segLen;
                    sampled.push({
                        x: stroke[j - 1].x + dx * t,
                        y: stroke[j - 1].y + dy * t
                    });
                    break;
                }
                accum += segLen;
                j++;
            }
        }

        sampled.push({ ...stroke[stroke.length - 1] });
        return sampled;
    }

    function getInstance(canvasId) {
        return instances.get(canvasId);
    }

    return { init, getInstance };
})();
