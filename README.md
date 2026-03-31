# VinylKids Collector

Eine mobile Web-App zum Verwalten deiner Schallplattensammlung – mit Barcode-Scanner, Discogs-Integration und priorisierbarer Wunschliste. Gebaut im epischen 80s-Retro-Neon-Design.

![PHP 8](https://img.shields.io/badge/PHP-8.0+-777BB4?logo=php&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![PWA Ready](https://img.shields.io/badge/PWA-ready-5A0FC8)

## Features

- **Barcode-Scanner** – Scanne den Barcode einer Platte direkt mit der Handy-Kamera (via ZXing)
- **Discogs-Suche** – Finde Platten per Barcode oder Textsuche, inklusive Cover, Tracklist und Metadaten
- **Sammlung & Wunschliste** – Verwalte Platten in deiner Sammlung oder auf einer priorisierbaren Wunschliste (1-3 Sterne)
- **Kein SQL nötig** – Alle Daten werden in einer einzigen `collection.json` gespeichert
- **Cover-Download** – Cover-Bilder werden automatisch von Discogs heruntergeladen und lokal gespeichert
- **Manueller Eintrag** – Platten können auch komplett ohne Discogs erfasst werden
- **Backup** – Erstelle ZIP-Backups mit JSON, CSV-Export und allen Cover-Bildern
- **PWA** – Installierbar als App auf dem Homescreen (Progressive Web App)
- **Retro-Neon-Design** – Dark Mode mit Neon-Akzenten im 80s-Arcade-Stil
- **Responsive** – Optimiert fuer Smartphones, Tablets und Desktop

## Screenshots

| Sammlung | Wunschliste | Hinzufuegen |
|----------|-------------|------------|
| Kachel-Grid mit Cover, Artist, Titel | Neon-Sterne zeigen Prioritaet, "Habe ich bekommen!"-Button | Barcode-Scan, Textsuche, Ziel-Auswahl |

## Voraussetzungen

- **PHP 8.0+** mit aktivierten Extensions: `json`, `zip`, `fileinfo`
- **Webserver** mit PHP-Unterstuetzung (Apache, Nginx, XAMPP, MAMP, Laragon, etc.)
- **Discogs Account** + Personal Access Token (kostenlos, siehe unten)

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/rueetschli/Plattensammlung-.git
cd Plattensammlung-
```

### 2. Konfiguration erstellen

```bash
cp config/config.example.php config/config.php
```

Oeffne `config/config.php` und trage deine Daten ein:

```php
define('DISCOGS_TOKEN', 'dein_token_hier');
define('APP_USERNAME', 'dein_username');
define('APP_PASSWORD', 'dein_passwort');
```

### 3. Discogs Token erstellen (kostenlos)

1. Erstelle einen kostenlosen Account auf [discogs.com](https://www.discogs.com/users/create)
2. Gehe zu **[Settings > Developers](https://www.discogs.com/settings/developers)**
3. Klicke auf **"Generate new token"**
4. Kopiere den Token in deine `config/config.php`

> Der Token ist kostenlos und erlaubt bis zu 60 API-Anfragen pro Minute – mehr als genug fuer die persoenliche Nutzung.

### 4. Verzeichnisse vorbereiten

```bash
mkdir -p data assets/covers
echo '[]' > data/collection.json
chmod 755 data assets/covers
chmod 644 data/collection.json
```

### 5. Webserver starten

**Mit PHP Built-in Server (Entwicklung):**

```bash
php -S localhost:8000
```

Oeffne [http://localhost:8000](http://localhost:8000) im Browser.

**Mit Apache/Nginx:**

Lege das Projektverzeichnis in dein Webroot (z.B. `htdocs` oder `www`) und rufe es im Browser auf.

### 6. Einloggen

Melde dich mit den in `config.php` eingetragenen Login-Daten an.

## Projektstruktur

```
Plattensammlung-/
├── config/
│   ├── config.example.php   ← Vorlage (im Repo)
│   └── config.php           ← Deine Konfiguration (nicht im Repo)
├── data/
│   ├── .htaccess            ← Schutz vor Direktzugriff
│   └── collection.json      ← Deine Sammlung (nicht im Repo)
├── assets/
│   ├── css/style.css        ← Retro-Neon-Stylesheet
│   ├── js/
│   │   ├── app.js           ← Hauptlogik (Sammlung, Wunschliste, Formulare)
│   │   └── scanner.js       ← Barcode-Scanner (ZXing)
│   └── covers/              ← Heruntergeladene Cover (nicht im Repo)
├── index.php                ← Hauptansicht (Sammlung & Wunschliste)
├── add.php                  ← Platte hinzufuegen (Scanner, Suche, Formular)
├── detail.php               ← Detailansicht einer Platte
├── login.php                ← Login-Seite
├── api_handler.php          ← Backend-API (Discogs, JSON-Speicherung)
├── backup_handler.php       ← ZIP-Backup-Generator
├── manifest.json            ← PWA-Manifest
├── .htaccess                ← Apache-Sicherheitsregeln
├── LICENSE                  ← MIT-Lizenz
└── README.md
```

## Datenmodell

Jede Platte wird als JSON-Objekt in `data/collection.json` gespeichert:

```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "discogs_id": 12345,
  "artist": "Daft Punk",
  "title": "Discovery",
  "year": "2001",
  "label": "Virgin",
  "catno": "7243 8 10252 1 8",
  "barcode": "724381025218",
  "genre": ["Electronic"],
  "styles": ["House", "Disco"],
  "format": "Vinyl (2xLP, Album)",
  "notes": "",
  "local_cover_path": "assets/covers/cover_abc123.jpg",
  "tracklist": [
    {"position": "A1", "title": "One More Time", "duration": "5:20"}
  ],
  "added_date": "2026-03-31 10:30:00",
  "status": "owned",
  "priority": null
}
```

| Feld | Beschreibung |
|------|-------------|
| `status` | `"owned"` = in der Sammlung, `"wishlist"` = auf der Wunschliste |
| `priority` | Nur bei Wunschliste: `1` = Waere cool, `2` = Sehr gerne, `3` = Unbedingt! |

## API-Endpunkte

Alle Aktionen laufen ueber `api_handler.php?action=...`:

| Aktion | Methode | Beschreibung |
|--------|---------|-------------|
| `search` | GET | Barcode- oder Textsuche auf Discogs |
| `fetch_release` | GET | Detaillierte Release-Daten von Discogs laden |
| `save` | POST | Platte speichern (Sammlung oder Wunschliste) |
| `delete` | GET | Platte loeschen |
| `get` | GET | Einzelne Platte laden |
| `list` | GET | Alle Platten laden |
| `upload_cover` | POST | Cover-Bild manuell hochladen |
| `move_to_collection` | POST | Platte von Wunschliste in Sammlung verschieben |

## Sicherheitshinweise

- `config/config.php` enthaelt Zugangsdaten und ist per `.gitignore` vom Repo ausgeschlossen
- `data/collection.json` ist per `.htaccess` vor direktem Zugriff geschuetzt
- Die Authentifizierung nutzt HTTP-Only Cookies
- **Fuer den produktiven Einsatz:** Nutze HTTPS und aendere die Standard-Login-Daten

## Credits

- **[Discogs API](https://www.discogs.com/developers/)** – Musikdatenbank und Metadaten
- **[ZXing ("Zebra Crossing")](https://github.com/AK-AK/library)** – Barcode-Scanner-Bibliothek
- **[Google Fonts](https://fonts.google.com)** – [Montserrat](https://fonts.google.com/specimen/Montserrat) & [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)
- **[Claude Code](https://claude.ai/code)** by [Anthropic](https://www.anthropic.com) – KI-gestuetzte Entwicklung

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE). Frei nutzbar, auch kommerziell.
