/**
 * scanner.js – ZXing Barcode-Scanner via getUserMedia
 * Verwendet @zxing/library@0.18.6 (UMD Build)
 */

let codeReader = null;
let scannerActive = false;

/**
 * Initialisiert den Barcode-Scanner.
 * @param {function} onDetected – Callback mit dem erkannten Barcode-String
 */
function initScanner(onDetected) {
    const video    = document.getElementById('scannerVideo');
    const wrapper  = document.getElementById('videoWrapper');
    const btnStart = document.getElementById('btnStartScan');
    const btnStop  = document.getElementById('btnStopScan');
    const statusEl = document.getElementById('scanStatus');

    if (!btnStart) return;

    btnStart.addEventListener('click', async () => {
        statusEl.textContent = 'Kamera wird gestartet...';

        // Prüfe ob ZXing geladen ist
        if (typeof ZXing === 'undefined') {
            statusEl.textContent = 'Scanner-Bibliothek nicht geladen.';
            return;
        }

        try {
            const hints = new Map();
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                ZXing.BarcodeFormat.EAN_13,
                ZXing.BarcodeFormat.UPC_A,
                ZXing.BarcodeFormat.UPC_E,
            ]);
            hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

            codeReader = new ZXing.BrowserMultiFormatReader(hints);
            scannerActive = true;

            wrapper.classList.add('active');
            btnStart.style.display = 'none';
            btnStop.style.display = 'inline-flex';
            statusEl.textContent = 'Scanne...';

            // Rückkamera suchen
            const devices = await codeReader.listVideoInputDevices();
            let selectedId = undefined;

            if (devices.length > 0) {
                // Bevorzuge Rückkamera (enthält oft "back" oder "environment")
                const backCam = devices.find(d =>
                    /back|rear|environment/i.test(d.label)
                );
                selectedId = backCam ? backCam.deviceId : devices[devices.length - 1].deviceId;
            }

            // Kontinuierliches Scannen starten
            codeReader.decodeFromVideoDevice(selectedId, video, (result, err) => {
                if (result) {
                    const barcode = result.getText();
                    statusEl.textContent = 'Barcode erkannt: ' + barcode;
                    stopScanner();
                    if (typeof onDetected === 'function') {
                        onDetected(barcode);
                    }
                }
                // NotFoundException wird ignoriert (kein Code im Frame)
            });

        } catch (e) {
            console.error('Scanner-Fehler:', e);
            statusEl.textContent = 'Kamera-Zugriff fehlgeschlagen. Bitte Berechtigung erteilen.';
            stopScanner();
        }
    });

    btnStop.addEventListener('click', () => {
        stopScanner();
        statusEl.textContent = 'Scanner gestoppt.';
    });
}

/**
 * Stoppt den Scanner und gibt die Kamera frei.
 */
function stopScanner() {
    scannerActive = false;
    const wrapper  = document.getElementById('videoWrapper');
    const btnStart = document.getElementById('btnStartScan');
    const btnStop  = document.getElementById('btnStopScan');

    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }

    if (wrapper)  wrapper.classList.remove('active');
    if (btnStart) btnStart.style.display = 'inline-flex';
    if (btnStop)  btnStop.style.display = 'none';
}
