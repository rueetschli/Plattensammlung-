/**
 * scanner.js – Optimierter Barcode-Scanner für VinylKids Collector
 * Verwendet @zxing/library@0.18.6 (UMD Build)
 *
 * Optimierungen:
 *  - 1080p Kamera-Auflösung für scharfes Bild aus weiterer Entfernung
 *  - Kontinuierlicher Autofokus via MediaTrackConstraints
 *  - Taschenlampe (Torch) via applyConstraints
 *  - Digitaler Zoom 2.0x (stiller Fallback für iOS Safari)
 *  - Canvas-Crop: ZXing dekodiert nur die zentrale Scan-Box (10 fps) → CPU-schonend
 */

let codeReader   = null;
let scannerActive = false;
let activeStream  = null;
let activeTrack   = null;
let scanInterval  = null;
let torchActive   = false;

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

        if (typeof ZXing === 'undefined') {
            statusEl.textContent = 'Scanner-Bibliothek nicht geladen.';
            return;
        }

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

            // 2. Digitaler Zoom 2.0x versuchen (iOS Safari blockiert das meist – kein Problem)
            try {
                await activeTrack.applyConstraints({ advanced: [{ zoom: 2.0 }] });
            } catch (_) { /* still */ }

            // 3. Video-Element mit Stream verbinden
            video.srcObject = activeStream;
            await video.play();

            // 4. ZXing-Reader mit Barcode-Formaten konfigurieren
            const hints = new Map();
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                ZXing.BarcodeFormat.EAN_13,
                ZXing.BarcodeFormat.UPC_A,
                ZXing.BarcodeFormat.UPC_E,
            ]);
            hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
            codeReader = new ZXing.BrowserMultiFormatReader(hints);

            // UI aktivieren
            scannerActive = true;
            wrapper.classList.add('active');
            btnStart.style.display = 'none';
            btnStop.style.display  = 'inline-flex';
            if (btnTorch) btnTorch.style.display = 'inline-flex';
            statusEl.textContent = 'Bitte Barcode in den Rahmen halten…';

            // 5. Offscreen-Canvas für zentrale Scan-Box
            //    ZXing dekodiert nicht das volle 1080p-Bild, sondern nur
            //    den mittleren Bereich (60 % Breite × 25 % Höhe → qrbox-Äquivalent)
            const scanCanvas = document.createElement('canvas');
            const scanCtx    = scanCanvas.getContext('2d', { willReadFrequently: true });

            // 10 fps: alle 100 ms einen Frame auswerten
            scanInterval = setInterval(() => {
                if (!scannerActive || video.readyState < 2) return;

                const vw = video.videoWidth;
                const vh = video.videoHeight;
                if (!vw || !vh) return;

                // Zentrales Rechteck (ideal für Vinyl-Barcodes: breiter als hoch)
                const cropW = Math.round(vw * 0.60);
                const cropH = Math.round(vh * 0.25);
                const cropX = Math.round((vw - cropW) / 2);
                const cropY = Math.round((vh - cropH) / 2);

                scanCanvas.width  = cropW;
                scanCanvas.height = cropH;
                scanCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                try {
                    const result = codeReader.decodeFromCanvas(scanCanvas);
                    if (result) {
                        const barcode = result.getText();
                        statusEl.textContent = 'Barcode erkannt: ' + barcode;
                        stopScanner();
                        if (typeof onDetected === 'function') onDetected(barcode);
                    }
                } catch (e) {
                    // ZXing.NotFoundException – kein Code im aktuellen Frame → ignorieren
                }
            }, 100);

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
                btnTorch.textContent = torchActive ? '&#9889; Licht aus' : '&#9889; Licht an';
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

    if (codeReader) {
        codeReader.reset();
        codeReader = null;
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
