<?php
/**
 * add.php – Scanner, Suche & manuelles Hinzufügen
 */
require_once __DIR__ . '/config/config.php';
require_auth();
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platte hinzufügen – VinylKids</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header class="app-header">
        <div class="header-inner">
            <a href="index.php" class="back-link">&larr; Zurück</a>
            <h1 class="logo-text">&#127926; Hinzufügen</h1>
        </div>
    </header>

    <main class="add-page">

        <!-- ===== Scanner-Bereich ===== -->
        <section class="scanner-section" id="scannerSection">
            <h2 class="section-title neon-pink">Barcode scannen</h2>
            <div class="video-wrapper" id="videoWrapper">
                <video id="scannerVideo" playsinline autoplay muted></video>
                <div class="scan-overlay">
                    <div class="scan-line"></div>
                </div>
            </div>
            <div class="scanner-controls">
                <button class="btn btn-neon" id="btnStartScan">&#128247; Kamera starten</button>
                <button class="btn btn-outline" id="btnStopScan" style="display:none;">Kamera stoppen</button>
            </div>
            <p class="scan-status" id="scanStatus"></p>
        </section>

        <!-- ===== Textsuche ===== -->
        <section class="search-section">
            <h2 class="section-title neon-cyan">Titel suchen</h2>
            <div class="search-bar">
                <input type="text" id="textSearchInput" class="input-full" placeholder="Artist, Album oder Barcode...">
                <button class="btn btn-neon" id="btnTextSearch">Suchen</button>
            </div>
        </section>

        <!-- ===== Suchergebnisse ===== -->
        <section class="results-section" id="resultsSection" style="display:none;">
            <h2 class="section-title neon-green">Ergebnisse</h2>
            <div class="results-list" id="resultsList"></div>
        </section>

        <!-- ===== Formular ===== -->
        <section class="form-section" id="formSection" style="display:none;">
            <h2 class="section-title neon-pink">Platte erfassen</h2>
            <form id="recordForm" class="record-form">
                <input type="hidden" id="fDiscogs" name="discogs_id" value="0">
                <input type="hidden" id="fCoverUrl" name="cover_url" value="">
                <input type="hidden" id="fLocalCover" name="local_cover_path" value="">

                <div class="form-cover-preview" id="coverPreview"></div>

                <!-- Ziel: Sammlung oder Wunschliste -->
                <div class="form-group destination-group">
                    <label>Wo soll die Platte hin?</label>
                    <div class="destination-toggle">
                        <label class="radio-card active" id="radioOwned">
                            <input type="radio" name="status" value="owned" checked>
                            <span class="radio-card-icon">&#127925;</span>
                            <span class="radio-card-label">In meine Sammlung</span>
                        </label>
                        <label class="radio-card" id="radioWishlist">
                            <input type="radio" name="status" value="wishlist">
                            <span class="radio-card-icon">&#11088;</span>
                            <span class="radio-card-label">Auf die Wunschliste</span>
                        </label>
                    </div>
                </div>

                <!-- Priorität (nur bei Wunschliste sichtbar) -->
                <div class="form-group priority-group" id="priorityGroup" style="display:none;">
                    <label>Wie sehr wünschst du dir diese Platte?</label>
                    <div class="priority-selector">
                        <label class="priority-option">
                            <input type="radio" name="priority" value="1">
                            <span class="priority-stars">&#11088;</span>
                            <span class="priority-label">Wäre cool</span>
                        </label>
                        <label class="priority-option">
                            <input type="radio" name="priority" value="2" checked>
                            <span class="priority-stars">&#11088;&#11088;</span>
                            <span class="priority-label">Sehr gerne</span>
                        </label>
                        <label class="priority-option active">
                            <input type="radio" name="priority" value="3">
                            <span class="priority-stars">&#11088;&#11088;&#11088;</span>
                            <span class="priority-label">Unbedingt!</span>
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label>Artist *</label>
                    <input type="text" id="fArtist" name="artist" required class="input-full">
                </div>
                <div class="form-group">
                    <label>Titel *</label>
                    <input type="text" id="fTitle" name="title" required class="input-full">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Jahr</label>
                        <input type="text" id="fYear" name="year" class="input-full">
                    </div>
                    <div class="form-group">
                        <label>Format</label>
                        <input type="text" id="fFormat" name="format" class="input-full">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Label</label>
                        <input type="text" id="fLabel" name="label" class="input-full">
                    </div>
                    <div class="form-group">
                        <label>Katalognummer</label>
                        <input type="text" id="fCatno" name="catno" class="input-full">
                    </div>
                </div>
                <div class="form-group">
                    <label>Barcode</label>
                    <input type="text" id="fBarcode" name="barcode" class="input-full">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Genre</label>
                        <input type="text" id="fGenre" name="genre" class="input-full" placeholder="Kommagetrennt">
                    </div>
                    <div class="form-group">
                        <label>Styles</label>
                        <input type="text" id="fStyles" name="styles" class="input-full" placeholder="Kommagetrennt">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notizen</label>
                    <textarea id="fNotes" name="notes" class="input-full" rows="3"></textarea>
                </div>

                <!-- Tracklist -->
                <div class="form-group">
                    <label>Tracklist</label>
                    <div id="tracklistContainer" class="tracklist-edit"></div>
                    <button type="button" class="btn btn-small btn-outline" id="btnAddTrack">+ Track</button>
                </div>

                <!-- Manueller Cover-Upload -->
                <div class="form-group">
                    <label>Cover-Bild (manuell)</label>
                    <input type="file" id="fCoverFile" accept="image/*" class="input-file">
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-neon btn-large">&#128190; Speichern</button>
                    <button type="button" class="btn btn-outline" id="btnCancel">Abbrechen</button>
                </div>
            </form>
        </section>

        <!-- Button: Komplett manuell -->
        <section class="manual-section">
            <button class="btn btn-outline btn-full" id="btnManual">&#9998; Komplett manuell eingeben</button>
        </section>

    </main>

    <script src="https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js"></script>
    <script src="assets/js/scanner.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            initAddPage();
        });
    </script>
</body>
</html>
