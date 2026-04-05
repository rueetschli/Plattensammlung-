/**
 * scanner.js – Barcode-Scanner für VinylKids Collector
 *
 * Primär:   Native BarcodeDetector API (Chrome 83+, hardware-beschleunigt, ~2ms/Frame)
 * Fallback: @zxing/library@0.18.6 mit MultiFormatReader + HTMLCanvasElementLuminanceSource
 *
 * Optimierungen:
 *  - 1080p Kamera mit kontinuierlichem Autofokus
 *  - Taschenlampe (Torch) via applyConstraints
 *  - Digitaler Zoom 2.0x (stiller Fallback für iOS Safari)
 *  - Canvas-Crop: nur die zentrale Scan-Box wird dekodiert (CPU-schonend)
 */

let zxingReader    = null;
let scannerActive  = false;
let activeStream   = null;
let activeTrack    = null;
let scanInterval   = null;
let torchActive    = false;

/**
 * Initialisiert den Barcode-Scanner.
 * @param {function} onDetected – Callback mit dem erkannten Barcode-String
 */
function initScanner(onDetected) {
    const video    = document.getElementById('scannerVideo');
    const wrapper  = document.getElementById('videoWrapper');
    const btnStart = document.getElementById('btnStartScan');
    const btnStop  = document.getElementById('btnStopScan');
    const btnTorch = document.getElementById('btnTorch');
    const statusEl = document.getElementById('scanStatus');

    if (!btnStart) return;

    // ── Kamera starten ────────────────────────────────────────────────────────
    btnStart.addEventListener('click', async () => {
        statusEl.textContent = 'Kamera wird gestartet…';

        try {
            // 1. Maximale Auflösung + kontinuierlicher Fokus
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width:  { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    advanced: [{ focusMode: 'continuous' }]
                }
            };

            activeStream = await navigator.mediaDevices.getUserMedia(constraints);
            activeTrack  = activeStream.getVideoTracks()[0];

            // 2. Digitaler Zoom 2.0x versuchen (iOS Safari blockiert das – kein Problem)
            try {
                await activeTrack.applyConstraints({ advanced: [{ zoom: 2.0 }] });
            } catch (_) { /* Zoom nicht unterstützt */ }

            // 3. Video-Element mit Stream verbinden
            video.srcObject = activeStream;
            await video.play();

            // UI aktivieren
            scannerActive = true;
            wrapper.classList.add('active');
            btnStart.style.display = 'none';
            btnStop.style.display  = 'inline-flex';
            if (btnTorch) btnTorch.style.display = 'inline-flex';
            statusEl.textContent = 'Bitte Barcode in den Rahmen halten…';

            // 4. Offscreen-Canvas für zentrale Scan-Box
            const scanCanvas = document.createElement('canvas');
            const scanCtx    = scanCanvas.getContext('2d', { willReadFrequently: true });

            // 5. Scanner starten – BarcodeDetector oder ZXing
            if ('BarcodeDetector' in window) {
                await startNativeScanning(video, scanCanvas, scanCtx, statusEl, onDetected);
            } else if (typeof ZXing !== 'undefined') {
                startZxingScanning(video, scanCanvas, scanCtx, statusEl, onDetected);
            } else {
                statusEl.textContent = 'Scanner-Bibliothek nicht geladen.';
            }

        } catch (e) {
            console.error('Scanner-Fehler:', e);
            statusEl.textContent = 'Kamera-Zugriff fehlgeschlagen. Bitte Berechtigung erteilen.';
            stopScanner();
        }
    });

    // ── Kamera stoppen ────────────────────────────────────────────────────────
    btnStop.addEventListener('click', () => {
        stopScanner();
        statusEl.textContent = 'Scanner gestoppt.';
    });

    // ── Taschenlampe ──────────────────────────────────────────────────────────
    if (btnTorch) {
        btnTorch.addEventListener('click', async () => {
            if (!activeTrack) return;
            torchActive = !torchActive;
            try {
                await activeTrack.applyConstraints({ advanced: [{ torch: torchActive }] });
                btnTorch.innerHTML = torchActive ? '&#9889; Licht aus' : '&#9889; Licht an';
                btnTorch.classList.toggle('btn-neon', torchActive);
                btnTorch.classList.toggle('btn-outline', !torchActive);
            } catch (_) {
                const statusEl = document.getElementById('scanStatus');
                if (statusEl) statusEl.textContent = 'Taschenlampe auf diesem Gerät nicht verfügbar.';
                torchActive = false;
            }
        });
    }
}

/**
 * Crop-Bereich aus dem Video extrahieren (60% Breite × 25% Höhe, zentriert).
 * Gibt true zurück, wenn ein gültiger Frame vorliegt.
 */
function cropScanRegion(video, scanCanvas, scanCtx) {
    if (video.readyState < 2) return false;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return false;

    const cropW = Math.round(vw * 0.60);
    const cropH = Math.round(vh * 0.25);
    const cropX = Math.round((vw - cropW) / 2);
    const cropY = Math.round((vh - cropH) / 2);

    scanCanvas.width  = cropW;
    scanCanvas.height = cropH;
    scanCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return true;
}

/**
 * Native BarcodeDetector API – hardware-beschleunigt, ~2ms pro Frame.
 */
async function startNativeScanning(video, scanCanvas, scanCtx, statusEl, onDetected) {
    // Prüfen ob benötigte Formate unterstützt werden
    try {
        const supported = await BarcodeDetector.getSupportedFormats();
        const needed = ['ean_13'];
        if (!needed.some(f => supported.includes(f))) {
            // Formate nicht unterstützt → ZXing Fallback
            if (typeof ZXing !== 'undefined') {
                startZxingScanning(video, scanCanvas, scanCtx, statusEl, onDetected);
                return;
            }
        }
    } catch (_) { /* getSupportedFormats nicht verfügbar */ }

    const detector = new BarcodeDetector({
        formats: ['ean_13', 'upc_a', 'upc_e', 'ean_8']
    });

    // 15 fps für native API (schnell genug)
    scanInterval = setInterval(async () => {
        if (!scannerActive) return;
        if (!cropScanRegion(video, scanCanvas, scanCtx)) return;

        try {
            const barcodes = await detector.detect(scanCanvas);
            if (barcodes.length > 0) {
                const barcode = barcodes[0].rawValue;
                statusEl.textContent = 'Barcode erkannt: ' + barcode;
                stopScanner();
                if (typeof onDetected === 'function') onDetected(barcode);
            }
        } catch (e) {
            // detect() kann bei bestimmten Frames fehlschlagen – ignorieren
        }
    }, 66);
}

/**
 * ZXing-Fallback: MultiFormatReader + HTMLCanvasElementLuminanceSource.
 * Wichtig: BrowserMultiFormatReader hat KEIN decodeFromCanvas()!
 * Deshalb nutzen wir den Low-Level MultiFormatReader direkt.
 */
function startZxingScanning(video, scanCanvas, scanCtx, statusEl, onDetected) {
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.EAN_8,
    ]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    zxingReader = new ZXing.MultiFormatReader();
    zxingReader.setHints(hints);

    // 10 fps: alle 100ms einen Frame auswerten
    scanInterval = setInterval(() => {
        if (!scannerActive) return;
        if (!cropScanRegion(video, scanCanvas, scanCtx)) return;

        try {
            const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(scanCanvas);
            const binaryBitmap    = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
            const result          = zxingReader.decode(binaryBitmap);

            if (result) {
                const barcode = result.getText();
                statusEl.textContent = 'Barcode erkannt: ' + barcode;
                stopScanner();
                if (typeof onDetected === 'function') onDetected(barcode);
            }
        } catch (e) {
            // NotFoundException → kein Barcode im Frame, normal
            if (!(e instanceof ZXing.NotFoundException)) {
                console.warn('ZXing Decode-Fehler:', e);
            }
        }
    }, 100);
}

/**
 * Stoppt den Scanner, gibt Kamera und Intervall frei.
 */
function stopScanner() {
    scannerActive = false;

    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }

    // Kamera-Stream vollständig freigeben
    if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
        activeTrack  = null;
    }

    if (zxingReader) {
        zxingReader = null;
    }

    torchActive = false;

    const video    = document.getElementById('scannerVideo');
    const wrapper  = document.getElementById('videoWrapper');
    const btnStart = document.getElementById('btnStartScan');
    const btnStop  = document.getElementById('btnStopScan');
    const btnTorch = document.getElementById('btnTorch');

    if (video)    video.srcObject = null;
    if (wrapper)  wrapper.classList.remove('active');
    if (btnStart) btnStart.style.display = 'inline-flex';
    if (btnStop)  btnStop.style.display  = 'none';
    if (btnTorch) {
        btnTorch.style.display = 'none';
        btnTorch.innerHTML = '&#9889; Licht an';
        btnTorch.classList.remove('btn-neon');
        btnTorch.classList.add('btn-outline');
    }
}
