<?php
/**
 * backup_handler.php – ZIP-Backup (collection.json + CSV + Covers)
 */
require_once __DIR__ . '/config/config.php';
require_auth();

// Collection laden
$collection = [];
if (file_exists(COLLECTION_FILE)) {
    $raw = file_get_contents(COLLECTION_FILE);
    $collection = json_decode($raw, true) ?: [];
}

// ---- CSV erzeugen ----
$csvHeaders = [
    'id', 'discogs_id', 'artist', 'title', 'year', 'label', 'catno',
    'barcode', 'genre', 'styles', 'format', 'notes', 'local_cover_path',
    'tracklist', 'added_date',
];

$csvFile = tempnam(sys_get_temp_dir(), 'csv_');
$fp = fopen($csvFile, 'w');
// BOM für Excel-UTF-8-Erkennung
fwrite($fp, "\xEF\xBB\xBF");
fputcsv($fp, $csvHeaders, ';');

foreach ($collection as $rec) {
    $genre    = is_array($rec['genre'] ?? null)  ? implode(', ', $rec['genre'])  : ($rec['genre'] ?? '');
    $styles   = is_array($rec['styles'] ?? null) ? implode(', ', $rec['styles']) : ($rec['styles'] ?? '');

    // Tracklist als kompakter String: "A1 Title (3:20), A2 Title2 (4:05)"
    $tracks = '';
    if (!empty($rec['tracklist']) && is_array($rec['tracklist'])) {
        $parts = [];
        foreach ($rec['tracklist'] as $t) {
            $entry = trim(($t['position'] ?? '') . ' ' . ($t['title'] ?? ''));
            if (!empty($t['duration'])) {
                $entry .= ' (' . $t['duration'] . ')';
            }
            $parts[] = $entry;
        }
        $tracks = implode(', ', $parts);
    }

    fputcsv($fp, [
        $rec['id']               ?? '',
        $rec['discogs_id']       ?? '',
        $rec['artist']           ?? '',
        $rec['title']            ?? '',
        $rec['year']             ?? '',
        $rec['label']            ?? '',
        $rec['catno']            ?? '',
        $rec['barcode']          ?? '',
        $genre,
        $styles,
        $rec['format']           ?? '',
        $rec['notes']            ?? '',
        $rec['local_cover_path'] ?? '',
        $tracks,
        $rec['added_date']       ?? '',
    ], ';');
}
fclose($fp);

// ---- ZIP erstellen ----
$zipName = 'backup_' . date('Y-m-d_His') . '.zip';
$zipFile = tempnam(sys_get_temp_dir(), 'zip_');

$zip = new ZipArchive();
if ($zip->open($zipFile, ZipArchive::OVERWRITE) !== true) {
    http_response_code(500);
    echo 'ZIP konnte nicht erstellt werden.';
    @unlink($csvFile);
    exit;
}

// collection.json
if (file_exists(COLLECTION_FILE)) {
    $zip->addFile(COLLECTION_FILE, 'collection.json');
}

// export.csv
$zip->addFile($csvFile, 'export.csv');

// Covers
$coversDir = __DIR__ . '/assets/covers';
if (is_dir($coversDir)) {
    $iterator = new DirectoryIterator($coversDir);
    foreach ($iterator as $file) {
        if ($file->isDot() || !$file->isFile()) continue;
        $zip->addFile($file->getPathname(), 'covers/' . $file->getFilename());
    }
}

$zip->close();

// ---- Download ausliefern ----
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zipName . '"');
header('Content-Length: ' . filesize($zipFile));
header('Cache-Control: no-cache, must-revalidate');

readfile($zipFile);

// Aufräumen
@unlink($zipFile);
@unlink($csvFile);
exit;
