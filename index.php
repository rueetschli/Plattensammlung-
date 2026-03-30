<?php
/**
 * index.php – Hauptansicht: Sammlung als Kachel-Grid
 */
require_once __DIR__ . '/config/config.php';
require_auth();
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VinylKids Collector</title>
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#0d0d0d">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header class="app-header">
        <div class="header-inner">
            <h1 class="logo-text" onclick="location.href='index.php'">&#127926; VinylKids</h1>
            <div class="header-actions">
                <input type="text" id="filterInput" class="filter-input" placeholder="Suchen...">
                <select id="sortSelect" class="sort-select">
                    <option value="added_desc">Neueste zuerst</option>
                    <option value="added_asc">Älteste zuerst</option>
                    <option value="artist_asc">Artist A-Z</option>
                    <option value="artist_desc">Artist Z-A</option>
                    <option value="year_desc">Jahr absteigend</option>
                    <option value="year_asc">Jahr aufsteigend</option>
                </select>
                <a href="backup_handler.php" class="btn btn-small btn-outline" title="Backup herunterladen">&#128190; Backup</a>
            </div>
        </div>
    </header>

    <main class="collection-grid" id="collectionGrid">
        <!-- Kacheln werden via JS geladen -->
    </main>

    <div class="empty-state" id="emptyState" style="display:none;">
        <span class="empty-icon">&#127925;</span>
        <p>Noch keine Platten in deiner Sammlung.<br>Scanne deine erste Platte!</p>
    </div>

    <div class="record-count" id="recordCount"></div>

    <!-- Floating Action Button -->
    <a href="add.php" class="fab" title="Platte hinzufügen">&#43;</a>

    <script src="assets/js/app.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            loadCollection();
        });
    </script>
</body>
</html>
