<?php
/**
 * detail.php – Detailansicht einer Platte
 */
require_once __DIR__ . '/config/config.php';
require_auth();

$id = trim($_GET['id'] ?? '');
if ($id === '') {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Details – VinylKids</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header class="app-header">
        <div class="header-inner">
            <a href="index.php" class="back-link">&larr; Sammlung</a>
            <h1 class="logo-text">&#127926; Details</h1>
        </div>
    </header>

    <main class="detail-page" id="detailPage">
        <!-- Wird via JS befüllt -->
        <div class="loader" id="detailLoader">Lade...</div>
    </main>

    <script src="assets/js/app.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            loadDetail('<?= htmlspecialchars($id, ENT_QUOTES) ?>');
        });
    </script>
</body>
</html>
