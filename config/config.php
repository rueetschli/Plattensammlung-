<?php
/**
 * config.php – Konfiguration & Authentifizierung
 */

// Discogs API
define('DISCOGS_TOKEN', 'fzogELerfRZpEqAqkEZZqlPJMvjGfGTMgzdHhywP');
define('DISCOGS_USER_AGENT', 'VinylKidsCollector/2.0 +http://localhost');
define('DISCOGS_API_BASE', 'https://api.discogs.com');

// Login-Daten
define('APP_USERNAME', 'vinyl');
define('APP_PASSWORD', 'platten2026');

// Pfade
define('DATA_DIR', __DIR__ . '/../data/');
define('COLLECTION_FILE', DATA_DIR . 'collection.json');
define('COVERS_DIR', __DIR__ . '/../assets/covers/');

// Auth-Cookie Name & erwarteter Wert
define('AUTH_COOKIE_NAME', 'vinylkids_auth');
define('AUTH_COOKIE_VALUE', md5(APP_USERNAME . ':' . APP_PASSWORD));

/**
 * Prüft ob der Benutzer eingeloggt ist.
 * Gibt true zurück wenn das Auth-Cookie korrekt gesetzt ist.
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
