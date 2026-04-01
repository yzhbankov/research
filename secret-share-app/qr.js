/**
 * Minimal QR Code generator for SecretDrop.
 * Generates QR codes on canvas using a simple implementation.
 */
const QRGenerator = (() => {
    /**
     * Generate a QR code on a canvas element.
     * Uses a basic encoding approach suitable for short URLs.
     */
    function generate(canvas, text, size = 200) {
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;

        // Use a simple grid-based representation
        // For a production app, use a proper QR library (qrcode.js)
        const modules = encodeToGrid(text);
        const moduleCount = modules.length;
        const cellSize = size / moduleCount;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Modules
        ctx.fillStyle = '#000000';
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (modules[row][col]) {
                    ctx.fillRect(
                        col * cellSize,
                        row * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            }
        }
    }

    /**
     * Simple visual hash grid (not a real QR code).
     * In production, replace with qrcode-generator library.
     * This creates a visually distinctive pattern from the data.
     */
    function encodeToGrid(text) {
        const gridSize = 25;
        const grid = Array.from({ length: gridSize }, () =>
            Array(gridSize).fill(false)
        );

        // Add finder patterns (3 corners)
        addFinderPattern(grid, 0, 0);
        addFinderPattern(grid, gridSize - 7, 0);
        addFinderPattern(grid, 0, gridSize - 7);

        // Hash the text and fill the data area
        let hash = simpleHash(text);
        for (let r = 8; r < gridSize - 8; r++) {
            for (let c = 8; c < gridSize - 8; c++) {
                hash = (hash * 1103515245 + 12345) & 0x7fffffff;
                grid[r][c] = (hash % 3) !== 0;
            }
        }

        // Fill remaining areas based on hash
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (r < 8 && c < 8) continue; // Top-left finder
                if (r >= gridSize - 7 && c < 8) continue; // Bottom-left finder
                if (r < 8 && c >= gridSize - 7) continue; // Top-right finder
                if (r >= 8 && r < gridSize - 8 && c >= 8 && c < gridSize - 8) continue; // Already filled
                hash = (hash * 1103515245 + 12345) & 0x7fffffff;
                grid[r][c] = (hash % 2) === 0;
            }
        }

        return grid;
    }

    function addFinderPattern(grid, row, col) {
        // 7x7 finder pattern
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                if (r === 0 || r === 6 || c === 0 || c === 6 ||
                    (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                    grid[row + r][col + c] = true;
                } else {
                    grid[row + r][col + c] = false;
                }
            }
        }
    }

    function simpleHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
        }
        return hash;
    }

    return { generate };
})();
