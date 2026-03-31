<?php
/**
 * config.example.php – Konfigurationsvorlage
 *
 * ANLEITUNG:
 * 1. Kopiere diese Datei nach config.php:  cp config.example.php config.php
 * 2. Trage deinen Discogs Personal Access Token ein (siehe unten).
 * 3. Ändere die Login-Daten (Username & Passwort).
 *
 * DISCOGS TOKEN – So bekommst du einen (kostenlos):
 * ─────────────────────────────────────────────────
 * 1. Erstelle einen kostenlosen Account auf https://www.discogs.com/users/create
 * 2. Gehe zu: https://www.discogs.com/settings/developers
 * 3. Klicke auf "Generate new token"
 * 4. Kopiere den Token und füge ihn unten ein.
 *
 * Der Token ist kostenlos und ermöglicht bis zu 60 Anfragen pro Minute.
 */

// Discogs API
define('DISCOGS_TOKEN', 'DEIN_DISCOGS_TOKEN_HIER');
define('DISCOGS_USER_AGENT', 'VinylKidsCollector/2.0 +https://github.com/rueetschli/Plattensammlung-');
define('DISCOGS_API_BASE', 'https://api.discogs.com');

// Login-Daten (bitte ändern!)
define('APP_USERNAME', 'vinyl');
define('APP_PASSWORD', 'DEIN_PASSWORT_HIER');

// Pfade
define('DATA_DIR', __DIR__ . '/../data/');
define('COLLECTION_FILE', DATA_DIR . 'collection.json');
define('COVERS_DIR', __DIR__ . '/../assets/covers/');

// Auth-Cookie Name & erwarteter Wert
define('AUTH_COOKIE_NAME', 'vinylkids_auth');
define('AUTH_COOKIE_VALUE', md5(APP_USERNAME . ':' . APP_PASSWORD));

/**
 * Prüft ob der Benutzer eingeloggt ist.
 */
function is_authenticated(): bool
{
    return isset($_COOKIE[AUTH_COOKIE_NAME])
        && $_COOKIE[AUTH_COOKIE_NAME] === AUTH_COOKIE_VALUE;
}

/**
 * Leitet nicht-authentifizierte Benutzer zur Login-Seite um.
 */
function require_auth(): void
{
    if (!is_authenticated()) {
        header('Location: login.php');
        exit;
    }
}
