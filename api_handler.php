<?php
/**
 * api_handler.php – Discogs API, Bild-Download, JSON-Speicherung
 *
 * Aktionen (GET/POST ?action=...):
 *   search        – Barcode- oder Textsuche auf Discogs
 *   fetch_release – Komplette Release-Daten holen
 *   save          – Platte in collection.json speichern
 *   delete        – Platte aus collection.json löschen
 *   get           – Einzelne Platte laden
 *   list          – Alle Platten laden
 *   upload_cover  – Manuelles Cover-Upload
 */
require_once __DIR__ . '/config/config.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

// ---------- Hilfsfunktionen ----------

function json_response(mixed $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function json_error(string $msg, int $code = 400): never
{
    json_response(['error' => $msg], $code);
}

function discogs_request(string $url): array
{
    $opts = [
        'http' => [
            'method'          => 'GET',
            'header'          => implode("\r\n", [
                'Authorization: Discogs token=' . DISCOGS_TOKEN,
                'User-Agent: ' . DISCOGS_USER_AGENT,
                'Accept: application/vnd.discogs.v2.discogs+json',
            ]),
            'timeout'         => 15,
            'ignore_errors'   => true,
        ],
    ];
    $ctx  = stream_context_create($opts);
    $body = @file_get_contents($url, false, $ctx);

    if ($body === false) {
        json_error('Discogs-API nicht erreichbar.', 502);
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        json_error('Ungültige Antwort von Discogs.', 502);
    }
    return $data;
}

function load_collection(): array
{
    if (!file_exists(COLLECTION_FILE)) {
        return [];
    }
    $raw = file_get_contents(COLLECTION_FILE);
    $arr = json_decode($raw, true);
    return is_array($arr) ? $arr : [];
}

function save_collection(array $collection): void
{
    $json = json_encode($collection, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents(COLLECTION_FILE, $json, LOCK_EX);
}

function download_cover(string $url): string
{
    if (empty($url)) {
        return '';
    }

    if (!is_dir(COVERS_DIR)) {
        mkdir(COVERS_DIR, 0755, true);
    }

    $ext  = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
    $name = uniqid('cover_', true) . '.' . $ext;
    $path = COVERS_DIR . $name;

    $opts = [
        'http' => [
            'method'    => 'GET',
            'header'    => 'User-Agent: ' . DISCOGS_USER_AGENT,
            'timeout'   => 20,
        ],
    ];
    $ctx  = stream_context_create($opts);
    $data = @file_get_contents($url, false, $ctx);

    if ($data === false) {
        return '';
    }

    file_put_contents($path, $data, LOCK_EX);
    return 'assets/covers/' . $name;
}

function generate_id(): string
{
    return bin2hex(random_bytes(8));
}

// ---------- Router ----------

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {

    // ======== 1. Suche (Barcode oder Text) ========
    case 'search':
        $barcode = trim($_GET['barcode'] ?? '');
        $query   = trim($_GET['query']   ?? '');

        if ($barcode !== '') {
            $url = DISCOGS_API_BASE . '/database/search?barcode=' . urlencode($barcode)
                 . '&token=' . DISCOGS_TOKEN;
        } elseif ($query !== '') {
            $url = DISCOGS_API_BASE . '/database/search?q=' . urlencode($query)
                 . '&type=release&token=' . DISCOGS_TOKEN;
        } else {
            json_error('Barcode oder Suchbegriff erforderlich.');
        }

        $data = discogs_request($url);

        if (empty($data['results'])) {
            json_response(['results' => [], 'message' => 'Keine Treffer gefunden.']);
        }

        // Alle Ergebnisse zurückgeben (max 20)
        $results = [];
        foreach (array_slice($data['results'], 0, 20) as $r) {
            $results[] = [
                'id'        => $r['id'] ?? 0,
                'title'     => $r['title'] ?? '',
                'year'      => $r['year'] ?? '',
                'thumb'     => $r['thumb'] ?? '',
                'format'    => implode(', ', $r['format'] ?? []),
                'label'     => implode(', ', $r['label'] ?? []),
                'catno'     => $r['catno'] ?? '',
                'country'   => $r['country'] ?? '',
            ];
        }

        json_response(['results' => $results]);
        break;

    // ======== 2. Deep Data (komplettes Release) ========
    case 'fetch_release':
        $releaseId = (int)($_GET['release_id'] ?? 0);
        if ($releaseId <= 0) {
            json_error('Ungültige Release-ID.');
        }

        $url  = DISCOGS_API_BASE . '/releases/' . $releaseId;
        $data = discogs_request($url);

        // Cover-URL ermitteln
        $coverUrl = '';
        if (!empty($data['images'])) {
            foreach ($data['images'] as $img) {
                if (($img['type'] ?? '') === 'primary') {
                    $coverUrl = $img['uri'] ?? $img['resource_url'] ?? '';
                    break;
                }
            }
            if ($coverUrl === '' && !empty($data['images'][0]['uri'])) {
                $coverUrl = $data['images'][0]['uri'];
            }
        }

        // Tracklist aufbereiten
        $tracklist = [];
        foreach ($data['tracklist'] ?? [] as $t) {
            if (($t['type_'] ?? 'track') !== 'track') continue;
            $tracklist[] = [
                'position' => $t['position'] ?? '',
                'title'    => $t['title'] ?? '',
                'duration' => $t['duration'] ?? '',
            ];
        }

        // Barcode aus Identifiers
        $barcode = '';
        foreach ($data['identifiers'] ?? [] as $ident) {
            if (strtolower($ident['type'] ?? '') === 'barcode') {
                $barcode = $ident['value'] ?? '';
                break;
            }
        }

        // Format
        $format = '';
        if (!empty($data['formats'])) {
            $f = $data['formats'][0];
            $format = $f['name'] ?? '';
            if (!empty($f['descriptions'])) {
                $format .= ' (' . implode(', ', $f['descriptions']) . ')';
            }
        }

        $release = [
            'discogs_id'  => $data['id'] ?? $releaseId,
            'artist'      => implode(', ', array_column($data['artists'] ?? [], 'name')),
            'title'       => $data['title'] ?? '',
            'year'        => (string)($data['year'] ?? ''),
            'label'       => !empty($data['labels']) ? ($data['labels'][0]['name'] ?? '') : '',
            'catno'       => !empty($data['labels']) ? ($data['labels'][0]['catno'] ?? '') : '',
            'barcode'     => $barcode,
            'genre'       => $data['genres'] ?? [],
            'styles'      => $data['styles'] ?? [],
            'format'      => $format,
            'notes'       => $data['notes'] ?? '',
            'cover_url'   => $coverUrl,
            'tracklist'   => $tracklist,
        ];

        json_response(['release' => $release]);
        break;

    // ======== 3. Platte speichern ========
    case 'save':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            json_error('Keine Daten empfangen.');
        }

        // Cover herunterladen, falls URL vorhanden
        $localCover = '';
        if (!empty($input['cover_url'])) {
            $localCover = download_cover($input['cover_url']);
        }
        // Falls manuell hochgeladen (Pfad bereits lokal)
        if (empty($localCover) && !empty($input['local_cover_path'])) {
            $localCover = $input['local_cover_path'];
        }

        $record = [
            'id'               => generate_id(),
            'discogs_id'       => (int)($input['discogs_id'] ?? 0),
            'artist'           => trim($input['artist'] ?? ''),
            'title'            => trim($input['title'] ?? ''),
            'year'             => trim($input['year'] ?? ''),
            'label'            => trim($input['label'] ?? ''),
            'catno'            => trim($input['catno'] ?? ''),
            'barcode'          => trim($input['barcode'] ?? ''),
            'genre'            => $input['genre'] ?? [],
            'styles'           => $input['styles'] ?? [],
            'format'           => trim($input['format'] ?? ''),
            'notes'            => trim($input['notes'] ?? ''),
            'local_cover_path' => $localCover,
            'tracklist'        => $input['tracklist'] ?? [],
            'added_date'       => date('Y-m-d H:i:s'),
        ];

        if ($record['artist'] === '' || $record['title'] === '') {
            json_error('Artist und Titel sind Pflichtfelder.');
        }

        $collection   = load_collection();
        $collection[] = $record;
        save_collection($collection);

        json_response(['success' => true, 'record' => $record], 201);
        break;

    // ======== 4. Platte löschen ========
    case 'delete':
        $id = trim($_GET['id'] ?? '');
        if ($id === '') {
            json_error('Keine ID angegeben.');
        }

        $collection = load_collection();
        $found      = false;

        foreach ($collection as $i => $rec) {
            if (($rec['id'] ?? '') === $id) {
                // Cover-Datei löschen
                if (!empty($rec['local_cover_path']) && file_exists(__DIR__ . '/' . $rec['local_cover_path'])) {
                    @unlink(__DIR__ . '/' . $rec['local_cover_path']);
                }
                array_splice($collection, $i, 1);
                $found = true;
                break;
            }
        }

        if (!$found) {
            json_error('Platte nicht gefunden.', 404);
        }

        save_collection($collection);
        json_response(['success' => true]);
        break;

    // ======== 5. Einzelne Platte laden ========
    case 'get':
        $id = trim($_GET['id'] ?? '');
        if ($id === '') {
            json_error('Keine ID angegeben.');
        }

        $collection = load_collection();
        foreach ($collection as $rec) {
            if (($rec['id'] ?? '') === $id) {
                json_response(['record' => $rec]);
            }
        }
        json_error('Platte nicht gefunden.', 404);
        break;

    // ======== 6. Alle Platten laden ========
    case 'list':
        json_response(['records' => load_collection()]);
        break;

    // ======== 7. Cover manuell hochladen ========
    case 'upload_cover':
        if (empty($_FILES['cover']) || $_FILES['cover']['error'] !== UPLOAD_ERR_OK) {
            json_error('Kein Bild hochgeladen.');
        }

        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $mime    = mime_content_type($_FILES['cover']['tmp_name']);

        if (!in_array($mime, $allowed, true)) {
            json_error('Ungültiges Bildformat. Erlaubt: JPG, PNG, WebP, GIF.');
        }

        if (!is_dir(COVERS_DIR)) {
            mkdir(COVERS_DIR, 0755, true);
        }

        $ext  = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
        };
        $name = uniqid('cover_', true) . '.' . $ext;
        $dest = COVERS_DIR . $name;

        if (!move_uploaded_file($_FILES['cover']['tmp_name'], $dest)) {
            json_error('Fehler beim Speichern des Bildes.', 500);
        }

        json_response(['local_cover_path' => 'assets/covers/' . $name]);
        break;

    default:
        json_error('Unbekannte Aktion: ' . $action, 400);
}
