/**
 * app.js – VinylKids Collector Hauptlogik
 */

const API = 'api_handler.php';

// ============================================================
//  Hilfsfunktionen
// ============================================================

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

// ============================================================
//  INDEX – Sammlung laden & anzeigen
// ============================================================

let allRecords = [];
let currentTab = 'owned'; // 'owned' oder 'wishlist'

async function loadCollection() {
    const grid     = document.getElementById('collectionGrid');
    const empty    = document.getElementById('emptyState');
    const countEl  = document.getElementById('recordCount');
    if (!grid) return;

    try {
        const res  = await fetch(API + '?action=list');
        const data = await res.json();
        allRecords = data.records || [];
    } catch (e) {
        grid.innerHTML = '<p style="padding:20px;color:#ff6b6b;">Fehler beim Laden.</p>';
        return;
    }

    // Tab-Navigation initialisieren
    initTabs();

    renderCollection();

    // Filter & Sort Events
    const filterInput = document.getElementById('filterInput');
    const sortSelect  = document.getElementById('sortSelect');
    if (filterInput) filterInput.addEventListener('input', renderCollection);
    if (sortSelect)  sortSelect.addEventListener('change', renderCollection);
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderCollection();
        });
    });
}

function renderCollection() {
    const grid    = document.getElementById('collectionGrid');
    const empty   = document.getElementById('emptyState');
    const countEl = document.getElementById('recordCount');
    const emptyText = document.getElementById('emptyText');
    const filter  = (document.getElementById('filterInput')?.value || '').toLowerCase();
    const sort    = document.getElementById('sortSelect')?.value || 'added_desc';

    // Nach aktuellem Tab filtern (Abwärtskompatibilität: fehlender Status = "owned")
    let records = allRecords.filter(r => (r.status || 'owned') === currentTab);

    // Textfilter
    if (filter) {
        records = records.filter(r =>
            (r.artist || '').toLowerCase().includes(filter) ||
            (r.title || '').toLowerCase().includes(filter) ||
            (r.year || '').includes(filter) ||
            (r.label || '').toLowerCase().includes(filter) ||
            (r.genre || []).join(' ').toLowerCase().includes(filter)
        );
    }

    // Sortierung
    if (currentTab === 'wishlist') {
        // Wunschliste: primär nach Priorität absteigend, dann nach gewählter Sortierung
        records.sort((a, b) => {
            const prioA = a.priority || 1;
            const prioB = b.priority || 1;
            if (prioB !== prioA) return prioB - prioA;
            return secondarySort(a, b, sort);
        });
    } else {
        records.sort((a, b) => secondarySort(a, b, sort));
    }

    const totalForTab = allRecords.filter(r => (r.status || 'owned') === currentTab).length;

    if (records.length === 0 && totalForTab === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        if (emptyText) {
            emptyText.innerHTML = currentTab === 'wishlist'
                ? 'Deine Wunschliste ist leer.<br>Füge Platten hinzu, die du dir wünschst!'
                : 'Noch keine Platten in deiner Sammlung.<br>Scanne deine erste Platte!';
        }
        countEl.textContent = '';
        return;
    }

    empty.style.display = 'none';

    if (currentTab === 'wishlist') {
        countEl.textContent = records.length + ' Platte' + (records.length !== 1 ? 'n' : '') +
            (filter ? ' gefunden' : ' auf der Wunschliste');
    } else {
        countEl.textContent = records.length + ' Platte' + (records.length !== 1 ? 'n' : '') +
            (filter ? ' gefunden' : ' in der Sammlung');
    }

    grid.innerHTML = records.map(r => {
        const cover = r.local_cover_path
            ? `<img class="card-cover" src="${escHtml(r.local_cover_path)}" alt="Cover" loading="lazy">`
            : `<div class="card-cover-placeholder">&#127926;</div>`;

        // Priorität-Sterne für Wunschliste
        let priorityHtml = '';
        if (currentTab === 'wishlist') {
            const prio = r.priority || 1;
            const stars = '&#11088;'.repeat(prio);
            priorityHtml = `<div class="card-priority" data-priority="${prio}">${stars}</div>`;
        }

        // "In Sammlung verschieben"-Button für Wunschliste
        let moveBtn = '';
        if (currentTab === 'wishlist') {
            moveBtn = `<button class="btn btn-move-to-collection" onclick="event.stopPropagation(); moveToCollection('${escHtml(r.id)}')">&#10004; Habe ich bekommen!</button>`;
        }

        return `
            <div class="record-card ${currentTab === 'wishlist' ? 'wishlist-card' : ''}" onclick="location.href='detail.php?id=${escHtml(r.id)}'">
                ${priorityHtml}
                ${cover}
                <div class="card-info">
                    <div class="card-artist">${escHtml(r.artist)}</div>
                    <div class="card-title">${escHtml(r.title)}</div>
                    <div class="card-year">${escHtml(r.year)}${r.format ? ' &middot; ' + escHtml(r.format) : ''}</div>
                    ${moveBtn}
                </div>
            </div>`;
    }).join('');
}

function secondarySort(a, b, sort) {
    switch (sort) {
        case 'added_asc':   return (a.added_date || '').localeCompare(b.added_date || '');
        case 'added_desc':  return (b.added_date || '').localeCompare(a.added_date || '');
        case 'artist_asc':  return (a.artist || '').localeCompare(b.artist || '');
        case 'artist_desc': return (b.artist || '').localeCompare(a.artist || '');
        case 'year_asc':    return (a.year || '0').localeCompare(b.year || '0');
        case 'year_desc':   return (b.year || '0').localeCompare(a.year || '0');
        default: return 0;
    }
}

// ============================================================
//  Platte von Wunschliste in Sammlung verschieben
// ============================================================

async function moveToCollection(id) {
    if (!confirm('Diese Platte in deine Sammlung verschieben?')) return;

    try {
        const res = await fetch(API + '?action=move_to_collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id }),
        });
        const data = await res.json();
        if (data.success) {
            showToast('Platte in die Sammlung verschoben!');
            // Lokalen Datensatz aktualisieren
            const rec = allRecords.find(r => r.id === id);
            if (rec) {
                rec.status = 'owned';
                delete rec.priority;
            }
            renderCollection();
        } else {
            alert(data.error || 'Fehler beim Verschieben.');
        }
    } catch (e) {
        alert('Netzwerkfehler beim Verschieben.');
    }
}

// ============================================================
//  DETAIL – Einzelne Platte
// ============================================================

async function loadDetail(id) {
    const page = document.getElementById('detailPage');
    if (!page) return;

    try {
        const res  = await fetch(API + '?action=get&id=' + encodeURIComponent(id));
        const data = await res.json();

        if (data.error) {
            page.innerHTML = `<div class="loader" style="color:#ff6b6b;">${escHtml(data.error)}</div>`;
            return;
        }

        const r = data.record;
        renderDetail(r, page);
    } catch (e) {
        page.innerHTML = '<div class="loader" style="color:#ff6b6b;">Fehler beim Laden.</div>';
    }
}

function renderDetail(r, page) {
    const cover = r.local_cover_path
        ? `<img class="detail-cover" src="${escHtml(r.local_cover_path)}" alt="Cover">`
        : `<div class="detail-cover-placeholder">&#127926;</div>`;

    const genres = (r.genre || []).map(g => `<span class="badge badge-pink">${escHtml(g)}</span>`).join('');
    const styles = (r.styles || []).map(s => `<span class="badge badge-dark">${escHtml(s)}</span>`).join('');

    // Status-Badge
    const status = r.status || 'owned';
    let statusBadge = '';
    if (status === 'wishlist') {
        const prio = r.priority || 1;
        const stars = '\u2B50'.repeat(prio);
        statusBadge = `<span class="badge badge-wishlist">${stars} Wunschliste</span>`;
    }

    let tracklistHtml = '';
    if (r.tracklist && r.tracklist.length > 0) {
        const tracks = r.tracklist.map(t => `
            <div class="tracklist-item">
                <span class="track-pos">${escHtml(t.position)}</span>
                <span class="track-title">${escHtml(t.title)}</span>
                <span class="track-duration">${escHtml(t.duration)}</span>
            </div>`).join('');

        tracklistHtml = `
            <div class="tracklist-section">
                <div class="tracklist-header">&#9835; Tracklist</div>
                ${tracks}
            </div>`;
    }

    const notesHtml = r.notes
        ? `<div class="detail-notes">${escHtml(r.notes)}</div>`
        : '';

    // "In Sammlung verschieben"-Button für Wunschliste
    const moveButton = status === 'wishlist'
        ? `<button class="btn btn-neon" onclick="moveToCollection('${escHtml(r.id)}')">&#10004; In die Sammlung verschieben</button>`
        : '';

    page.innerHTML = `
        ${cover}
        <div class="detail-meta">
            <div class="detail-artist">${escHtml(r.artist)}</div>
            <h2 class="detail-title">${escHtml(r.title)}</h2>
            <div class="detail-badges">
                ${statusBadge}
                ${r.year ? `<span class="badge badge-cyan">${escHtml(r.year)}</span>` : ''}
                ${r.format ? `<span class="badge badge-green">${escHtml(r.format)}</span>` : ''}
                ${genres}${styles}
            </div>
            <div class="detail-info-grid">
                <div class="info-item"><label>Label</label><span>${escHtml(r.label || '—')}</span></div>
                <div class="info-item"><label>Katalognr.</label><span>${escHtml(r.catno || '—')}</span></div>
                <div class="info-item"><label>Barcode</label><span>${escHtml(r.barcode || '—')}</span></div>
                <div class="info-item"><label>Hinzugefügt</label><span>${escHtml(r.added_date || '—')}</span></div>
            </div>
            ${tracklistHtml}
            ${notesHtml}
        </div>
        <div class="detail-actions">
            <a href="index.php" class="btn btn-outline">&larr; Zurück</a>
            ${moveButton}
            <button class="btn btn-danger" onclick="deleteRecord('${escHtml(r.id)}')">&#128465; Löschen</button>
        </div>`;
}

async function deleteRecord(id) {
    if (!confirm('Diese Platte wirklich löschen?')) return;

    try {
        const res  = await fetch(API + '?action=delete&id=' + encodeURIComponent(id));
        const data = await res.json();
        if (data.success) {
            showToast('Platte gelöscht');
            setTimeout(() => location.href = 'index.php', 500);
        } else {
            alert(data.error || 'Fehler beim Löschen.');
        }
    } catch (e) {
        alert('Netzwerkfehler beim Löschen.');
    }
}

// ============================================================
//  ADD PAGE – Scanner, Suche, Formular
// ============================================================

function initAddPage() {
    // Scanner initialisieren
    if (typeof initScanner === 'function') {
        initScanner(onBarcodeDetected);
    }

    // Textsuche
    const btnSearch   = document.getElementById('btnTextSearch');
    const searchInput = document.getElementById('textSearchInput');
    if (btnSearch) {
        btnSearch.addEventListener('click', () => doTextSearch());
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); doTextSearch(); }
        });
    }

    // Manuell-Button
    const btnManual = document.getElementById('btnManual');
    if (btnManual) {
        btnManual.addEventListener('click', () => {
            showForm();
            clearForm();
        });
    }

    // Track hinzufügen
    const btnAddTrack = document.getElementById('btnAddTrack');
    if (btnAddTrack) btnAddTrack.addEventListener('click', () => addTrackRow());

    // Formular absenden
    const form = document.getElementById('recordForm');
    if (form) form.addEventListener('submit', onFormSubmit);

    // Abbrechen
    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) btnCancel.addEventListener('click', () => {
        document.getElementById('formSection').style.display = 'none';
    });

    // Cover-Upload
    const coverFile = document.getElementById('fCoverFile');
    if (coverFile) coverFile.addEventListener('change', onCoverFileSelect);

    // Ziel-Auswahl (Sammlung / Wunschliste) - Toggle-Logik
    initDestinationToggle();
}

function initDestinationToggle() {
    const radioCards = document.querySelectorAll('.destination-toggle .radio-card input');
    const priorityGroup = document.getElementById('priorityGroup');

    radioCards.forEach(input => {
        input.addEventListener('change', () => {
            // Active-Klasse wechseln
            document.querySelectorAll('.destination-toggle .radio-card').forEach(card => {
                card.classList.toggle('active', card.querySelector('input').checked);
            });

            // Prioritätsfeld ein-/ausblenden
            if (input.value === 'wishlist') {
                priorityGroup.style.display = 'block';
            } else {
                priorityGroup.style.display = 'none';
            }
        });
    });

    // Priorität: Active-Klasse auf Optionen
    const priorityOptions = document.querySelectorAll('.priority-option input');
    priorityOptions.forEach(input => {
        input.addEventListener('change', () => {
            document.querySelectorAll('.priority-option').forEach(opt => {
                opt.classList.toggle('active', opt.querySelector('input').checked);
            });
        });
    });
}

// --- Barcode erkannt ---
function onBarcodeDetected(barcode) {
    document.getElementById('textSearchInput').value = barcode;
    searchByBarcode(barcode);
}

// --- Suche ---
async function searchByBarcode(barcode) {
    showStatus('Suche nach Barcode: ' + barcode + '...');
    try {
        const res  = await fetch(API + '?action=search&barcode=' + encodeURIComponent(barcode));
        const data = await res.json();
        handleSearchResults(data);
    } catch (e) {
        showStatus('Netzwerkfehler bei der Suche.');
    }
}

async function doTextSearch() {
    const query = document.getElementById('textSearchInput').value.trim();
    if (!query) return;

    showStatus('Suche nach "' + query + '"...');

    // Prüfe ob es eine Zahl ist (Barcode)
    const isBarcode = /^\d{8,14}$/.test(query);
    const param = isBarcode ? 'barcode' : 'query';

    try {
        const res  = await fetch(API + '?action=search&' + param + '=' + encodeURIComponent(query));
        const data = await res.json();
        handleSearchResults(data);
    } catch (e) {
        showStatus('Netzwerkfehler bei der Suche.');
    }
}

function handleSearchResults(data) {
    const section = document.getElementById('resultsSection');
    const list    = document.getElementById('resultsList');

    if (!data.results || data.results.length === 0) {
        showStatus('Keine Treffer gefunden.');
        section.style.display = 'none';
        return;
    }

    showStatus(data.results.length + ' Treffer gefunden.');
    section.style.display = 'block';

    list.innerHTML = data.results.map(r => `
        <div class="result-item" onclick="selectRelease(${r.id})">
            ${r.thumb ? `<img class="result-thumb" src="${escHtml(r.thumb)}" alt="">` : `<div class="result-thumb" style="display:flex;align-items:center;justify-content:center;">&#127926;</div>`}
            <div class="result-info">
                <strong>${escHtml(r.title)}</strong>
                <small>${escHtml(r.year || '')} &middot; ${escHtml(r.format)} &middot; ${escHtml(r.label)}</small>
            </div>
        </div>`).join('');
}

// --- Release auswählen (Deep Data) ---
async function selectRelease(releaseId) {
    showStatus('Lade Details...');

    try {
        const res  = await fetch(API + '?action=fetch_release&release_id=' + releaseId);
        const data = await res.json();

        if (data.error) {
            showStatus(data.error);
            return;
        }

        fillForm(data.release);
        showForm();
        showStatus('');
    } catch (e) {
        showStatus('Fehler beim Laden der Details.');
    }
}

// --- Formular befüllen ---
function fillForm(r) {
    document.getElementById('fDiscogs').value   = r.discogs_id || 0;
    document.getElementById('fArtist').value    = r.artist || '';
    document.getElementById('fTitle').value     = r.title || '';
    document.getElementById('fYear').value      = r.year || '';
    document.getElementById('fFormat').value    = r.format || '';
    document.getElementById('fLabel').value     = r.label || '';
    document.getElementById('fCatno').value     = r.catno || '';
    document.getElementById('fBarcode').value   = r.barcode || '';
    document.getElementById('fGenre').value     = (r.genre || []).join(', ');
    document.getElementById('fStyles').value    = (r.styles || []).join(', ');
    document.getElementById('fNotes').value     = r.notes || '';
    document.getElementById('fCoverUrl').value  = r.cover_url || '';
    document.getElementById('fLocalCover').value = '';

    // Cover-Preview
    const preview = document.getElementById('coverPreview');
    if (r.cover_url) {
        preview.innerHTML = `<img src="${escHtml(r.cover_url)}" alt="Cover">`;
    } else {
        preview.innerHTML = '';
    }

    // Tracklist
    const container = document.getElementById('tracklistContainer');
    container.innerHTML = '';
    if (r.tracklist && r.tracklist.length > 0) {
        r.tracklist.forEach(t => addTrackRow(t.position, t.title, t.duration));
    }

    // Ziel auf Standard zurücksetzen
    const ownedRadio = document.querySelector('input[name="status"][value="owned"]');
    if (ownedRadio) {
        ownedRadio.checked = true;
        ownedRadio.dispatchEvent(new Event('change'));
    }
}

function clearForm() {
    document.getElementById('recordForm').reset();
    document.getElementById('fDiscogs').value  = '0';
    document.getElementById('fCoverUrl').value = '';
    document.getElementById('fLocalCover').value = '';
    document.getElementById('coverPreview').innerHTML = '';
    document.getElementById('tracklistContainer').innerHTML = '';

    // Ziel auf Standard zurücksetzen
    const ownedRadio = document.querySelector('input[name="status"][value="owned"]');
    if (ownedRadio) {
        ownedRadio.checked = true;
        ownedRadio.dispatchEvent(new Event('change'));
    }
}

function showForm() {
    document.getElementById('formSection').style.display = 'block';
    document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
}

function showStatus(msg) {
    const el = document.getElementById('scanStatus');
    if (el) el.textContent = msg;
}

// --- Tracklist bearbeiten ---
function addTrackRow(pos = '', title = '', dur = '') {
    const container = document.getElementById('tracklistContainer');
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
        <input type="text" placeholder="Pos" value="${escHtml(pos)}" class="trk-pos">
        <input type="text" placeholder="Titel" value="${escHtml(title)}" class="trk-title">
        <input type="text" placeholder="Dauer" value="${escHtml(dur)}" class="trk-dur">
        <button type="button" class="btn-remove-track" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(row);
}

// --- Cover manuell hochladen ---
async function onCoverFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('cover', file);
    fd.append('action', 'upload_cover');

    try {
        const res  = await fetch(API + '?action=upload_cover', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.local_cover_path) {
            document.getElementById('fLocalCover').value = data.local_cover_path;
            document.getElementById('fCoverUrl').value   = '';
            document.getElementById('coverPreview').innerHTML =
                `<img src="${escHtml(data.local_cover_path)}" alt="Cover">`;
            showToast('Cover hochgeladen');
        } else if (data.error) {
            alert(data.error);
        }
    } catch (e) {
        alert('Fehler beim Hochladen des Covers.');
    }
}

// --- Formular absenden ---
async function onFormSubmit(e) {
    e.preventDefault();

    // Tracklist zusammenbauen
    const trackRows = document.querySelectorAll('#tracklistContainer .track-row');
    const tracklist = [];
    trackRows.forEach(row => {
        const pos   = row.querySelector('.trk-pos').value.trim();
        const title = row.querySelector('.trk-title').value.trim();
        const dur   = row.querySelector('.trk-dur').value.trim();
        if (title) {
            tracklist.push({ position: pos, title: title, duration: dur });
        }
    });

    // Genre & Styles als Array
    const genreStr  = document.getElementById('fGenre').value;
    const stylesStr = document.getElementById('fStyles').value;
    const genre  = genreStr  ? genreStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const styles = stylesStr ? stylesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Status und Priorität
    const statusEl = document.querySelector('input[name="status"]:checked');
    const status   = statusEl ? statusEl.value : 'owned';
    const prioEl   = document.querySelector('input[name="priority"]:checked');
    const priority = prioEl ? parseInt(prioEl.value) : 2;

    const payload = {
        discogs_id:       parseInt(document.getElementById('fDiscogs').value) || 0,
        artist:           document.getElementById('fArtist').value.trim(),
        title:            document.getElementById('fTitle').value.trim(),
        year:             document.getElementById('fYear').value.trim(),
        format:           document.getElementById('fFormat').value.trim(),
        label:            document.getElementById('fLabel').value.trim(),
        catno:            document.getElementById('fCatno').value.trim(),
        barcode:          document.getElementById('fBarcode').value.trim(),
        genre:            genre,
        styles:           styles,
        notes:            document.getElementById('fNotes').value.trim(),
        cover_url:        document.getElementById('fCoverUrl').value.trim(),
        local_cover_path: document.getElementById('fLocalCover').value.trim(),
        tracklist:        tracklist,
        status:           status,
    };

    // Priorität nur bei Wunschliste mitsenden
    if (status === 'wishlist') {
        payload.priority = priority;
    }

    if (!payload.artist || !payload.title) {
        alert('Artist und Titel sind Pflichtfelder.');
        return;
    }

    try {
        const res = await fetch(API + '?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
            showToast(status === 'wishlist' ? 'Auf die Wunschliste gesetzt!' : 'Platte gespeichert!');
            setTimeout(() => location.href = 'index.php', 800);
        } else {
            alert(data.error || 'Fehler beim Speichern.');
        }
    } catch (e) {
        alert('Netzwerkfehler beim Speichern.');
    }
}
