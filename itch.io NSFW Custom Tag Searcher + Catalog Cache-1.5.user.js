// ==UserScript==
// @name         itch.io NSFW Custom Tag Searcher + Catalog Cache
// @namespace    https://itch.io/
// @version      1.6.1
// @description  Cache NSFW game listings + Deep Scan with proper skip of already checked pages
// @author       you
// @match        https://itch.io/games/nsfw*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      itch.io
// @connect      *.itch.io
// @connect      raw.githubusercontent.com
// @connect      github.com
// @updateURL    https://raw.githubusercontent.com/bruhmomentobama/ItchNSFWGameFinder/main/ItchNSFWGameFinder.user.js
// @downloadURL  https://raw.githubusercontent.com/bruhmomentobama/ItchNSFWGameFinder/main/ItchNSFWGameFinder.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ==================== CONFIG ====================
    const MAX_PAGES = 200;
    const DELAY_MS = 650;
    const DEEP_DELAY_MS = 900;
    const CACHE_KEY = 'itch_nsfw_catalog_v1';
    const CACHE_MAX_AGE_DAYS = 7;
    const GITHUB_REPO = 'https://github.com/bruhmomentobama/ItchNSFWGameFinder';
    const GITHUB_RAW = 'https://raw.githubusercontent.com/bruhmomentobama/ItchNSFWGameFinder/main/ItchNSFWGameFinder.user.js';
    const CURRENT_VERSION = '1.6.1';
    const UPDATE_CHECK_INTERVAL = 10 * 60 * 1000;

    // ============================================================
    // DEVELOPMENT TOGGLE 
    const ENABLE_CONTENT_FILTER = true; 
    // ============================================================

    // Why are you here?
    const _0x4f2a = [
        [0x6c,0x6f,0x6c,0x69], [0x6c,0x6f,0x6c,0x69,0x63,0x6f,0x6e],
        [0x6c,0x6f,0x6c,0x69,0x74,0x61], [0x73,0x68,0x6f,0x74,0x61],
        [0x73,0x68,0x6f,0x74,0x61,0x63,0x6f,0x6e], [0x70,0x65,0x64,0x6f],
        [0x70,0x65,0x64,0x6f,0x70,0x68,0x69,0x6c,0x65], [0x70,0x61,0x65,0x64,0x6f],
        [0x75,0x6e,0x64,0x65,0x72,0x61,0x67,0x65], [0x63,0x68,0x69,0x6c,0x64,0x20,0x70,0x6f,0x72,0x6e],
        [0x63,0x70], [0x70,0x72,0x65,0x74,0x65,0x65,0x6e], [0x6d,0x69,0x6e,0x6f,0x72]
    ];
    const _0x1c8e = (a) => a.map(c => String.fromCharCode(c)).join('');
    const _0x9b3f = () => _0x4f2a.map(_0x1c8e);
    // ============================================================

    let games = [];
    let isScraping = false;
    let isDeepScanning = false;
    let isAborted = false;
    let updateAvailable = false;

    // ---------- UI ----------
    function createUI() {
        if (document.getElementById('itch-tag-searcher')) return;

        const style = document.createElement('style');
        style.textContent = `
            #itch-tag-searcher-toggle {
                position: fixed; bottom: 20px; right: 20px; z-index: 99999;
                background: #fa5c5c; color: white; border: none; border-radius: 50%;
                width: 52px; height: 52px; font-size: 22px; cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            }
            #itch-tag-searcher {
                position: fixed; bottom: 80px; right: 20px; z-index: 99999;
                width: 460px; max-height: 82vh; background: #1a1a1a; color: #eee;
                border: 1px solid #444; border-radius: 10px; padding: 14px;
                font-family: system-ui, sans-serif; font-size: 13px;
                display: none; flex-direction: column; gap: 10px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.5); overflow: hidden;
            }
            #itch-tag-searcher.open { display: flex; }
            #itch-tag-searcher input[type="text"] {
                width: 100%; padding: 8px; background: #2a2a2a; border: 1px solid #555;
                color: #fff; border-radius: 5px; box-sizing: border-box;
            }
            #itch-tag-searcher button {
                padding: 7px 12px; background: #fa5c5c; color: white; border: none;
                border-radius: 5px; cursor: pointer; font-weight: 600;
            }
            #itch-tag-searcher button:disabled { opacity: 0.5; cursor: not-allowed; }
            #itch-emergency-btn {
                background: #ff0000 !important; color: white !important;
                font-size: 15px !important; font-weight: 900 !important;
                padding: 12px !important; letter-spacing: 1px;
                border: 3px solid #ff6666 !important;
                box-shadow: 0 0 12px rgba(255,0,0,0.6); width: 100%;
            }
            #itch-emergency-btn:hover { background: #cc0000 !important; }

            .itch-bottom-row {
                display: flex; gap: 8px; margin-top: 6px;
            }
            .itch-bottom-row a, .itch-bottom-row button {
                flex: 1; text-align: center; padding: 9px 6px;
                border-radius: 6px; font-size: 12px; font-weight: 700;
                text-decoration: none; border: none; cursor: pointer;
                transition: transform 0.15s, box-shadow 0.15s;
            }
            .itch-bottom-row a:hover, .itch-bottom-row button:hover {
                transform: translateY(-2px);
            }

            #itch-github-btn {
                background: linear-gradient(135deg, #238636, #2ea043);
                color: white !important;
                box-shadow: 0 0 10px rgba(46, 160, 67, 0.5);
            }
            #itch-github-btn:hover {
                box-shadow: 0 0 16px rgba(46, 160, 67, 0.8);
            }

            #itch-bug-btn {
                background: #b45309; color: white;
            }
            #itch-bug-btn:hover { background: #d97706; }

            #itch-update-btn {
                background: #1d4ed8; color: white;
            }
            #itch-update-btn:hover { background: #2563eb; }

            #itch-update-badge {
                display: none; background: #22c55e; color: #000; font-size: 11px;
                font-weight: 700; padding: 4px 8px; border-radius: 4px; text-align: center;
            }
            #itch-tag-searcher .status { font-size: 12px; color: #aaa; min-height: 1.2em; }
            #itch-tag-searcher .progress { height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
            #itch-tag-searcher .progress-bar { height: 100%; width: 0%; background: #fa5c5c; transition: width 0.2s; }
            #itch-results { flex: 1; overflow-y: auto; border-top: 1px solid #333; padding-top: 8px; max-height: 38vh; }
            #itch-results a { display: block; color: #7eb8ff; text-decoration: none; padding: 4px 0; border-bottom: 1px solid #2a2a2a; }
            #itch-results a:hover { color: #a0d0ff; }
            #itch-results .meta { font-size: 11px; color: #888; }

            #itch-flashbang {
                position: fixed; inset: 0; z-index: 2147483647;
                background: #ff0000; color: white;
                display: flex; align-items: center; justify-content: center;
                font-size: 42px; font-weight: 900; text-align: center;
                padding: 40px; line-height: 1.3;
                opacity: 0; pointer-events: none; transition: opacity 0.15s;
            }
            #itch-flashbang.show {
                opacity: 1; pointer-events: auto;
            }
        `;
        document.head.appendChild(style);

        const flash = document.createElement('div');
        flash.id = 'itch-flashbang';
        flash.textContent = 'ILLEGAL CONTENT BLOCKED\n\nSeek fucking help.';
        document.body.appendChild(flash);

        const toggle = document.createElement('button');
        toggle.id = 'itch-tag-searcher-toggle';
        toggle.title = 'Custom Tag Searcher';
        toggle.textContent = '🔍';
        toggle.onclick = () => panel.classList.toggle('open');
        document.body.appendChild(toggle);

        const panel = document.createElement('div');
        panel.id = 'itch-tag-searcher';
        panel.innerHTML = `
            <div style="font-weight:700;font-size:14px;">Itch.io NSFW Game Finder v${CURRENT_VERSION}</div>
            <div id="itch-update-badge">⬆ Update available – use the button below</div>

            <button id="itch-emergency-btn">🛑 EMERGENCY STOP 🛑</button>

            <input type="text" id="itch-keywords" placeholder="futa, fat, femboy" />
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button id="itch-search-btn">Search</button>
                <button id="itch-deep-btn" style="background:#8b5cf6;">Deep Scan</button>
                <button id="itch-scrape-btn">Refresh Cache</button>
                <button id="itch-clear-btn" style="background:#555;">Clear Cache</button>
            </div>
            <div class="status" id="itch-status">Ready</div>
            <div class="progress"><div class="progress-bar" id="itch-progress"></div></div>
            <div id="itch-results"></div>

            <div class="itch-bottom-row">
                <a id="itch-github-btn" href="${GITHUB_REPO}" target="_blank" rel="noopener">GitHub</a>
                <button id="itch-bug-btn">Report Bug</button>
                <button id="itch-update-btn">Check Updates</button>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('itch-emergency-btn').onclick = emergencyStop;
        document.getElementById('itch-search-btn').onclick = () => doSearch(false);
        document.getElementById('itch-deep-btn').onclick = () => doSearch(true);
        document.getElementById('itch-scrape-btn').onclick = () => startScrape(true);
        document.getElementById('itch-clear-btn').onclick = clearCache;
        document.getElementById('itch-bug-btn').onclick = () => {
            window.open(GITHUB_REPO + '/issues', '_blank');
        };
        document.getElementById('itch-update-btn').onclick = () => {
            updateStatus('Checking for updates…');
            checkForUpdate(true);
        };
        document.getElementById('itch-keywords').addEventListener('keydown', e => {
            if (e.key === 'Enter' && !isAborted) doSearch(false);
        });
    }

    function triggerFlashbang() {
        const el = document.getElementById('itch-flashbang');
        if (!el) return;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3200);
    }

    function containsBlockedTerm(text) {
        if (!ENABLE_CONTENT_FILTER) return false;
        const _0x2d7 = text.toLowerCase();
        const _0x8a1 = _0x9b3f();
        for (let i = 0; i < _0x8a1.length; i++) {
            if (_0x2d7.indexOf(_0x8a1[i]) !== -1) return true;
        }
        return false;
    }

    function emergencyStop() {
        isAborted = true;
        isScraping = false;
        isDeepScanning = false;
        updateStatus('🛑 SCRIPT EMERGENCY STOPPED – reload page to restart');
        setProgress(0);
        ['itch-scrape-btn', 'itch-deep-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) { btn.disabled = true; btn.textContent = 'STOPPED'; }
        });
        saveCache();
    }

    function updateStatus(msg) {
        const el = document.getElementById('itch-status');
        if (el) el.textContent = msg;
    }

    function setProgress(pct) {
        const bar = document.getElementById('itch-progress');
        if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }

    function showUpdateBadge() {
        const badge = document.getElementById('itch-update-badge');
        if (badge) badge.style.display = 'block';
        updateAvailable = true;
    }

    // ---------- Cache ----------
    function loadCache() {
        const raw = GM_getValue(CACHE_KEY, null);
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            const ageDays = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
            games = data.games || [];
            updateStatus(`Loaded ${games.length} games (${ageDays.toFixed(1)}d old)`);
            return true;
        } catch (e) {
            return false;
        }
    }

    function saveCache() {
        GM_setValue(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), games }));
    }

    function clearCache() {
        if (isAborted) return;
        GM_deleteValue(CACHE_KEY);
        games = [];
        updateStatus('Cache cleared');
        document.getElementById('itch-results').innerHTML = '';
    }

    // ---------- Listing scrape ----------
    function fetchPage(page) {
        return new Promise((resolve, reject) => {
            if (isAborted) return resolve(null);
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://itch.io/games/nsfw?page=${page}&format=json`,
                onload: res => {
                    if (isAborted) return resolve(null);
                    if (res.status === 404) return resolve(null);
                    if (res.status !== 200) return reject(new Error(`HTTP ${res.status}`));
                    try { resolve(JSON.parse(res.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
    }

    function parseGames(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const list = [];
        doc.querySelectorAll('.game_cell').forEach(cell => {
            const titleEl = cell.querySelector('a.title.game_link');
            if (!titleEl) return;
            list.push({
                id: cell.dataset.game_id,
                title: titleEl.textContent.trim(),
                url: titleEl.href,
                author: cell.querySelector('.game_author a')?.textContent.trim() || '',
                genre: cell.querySelector('.game_genre')?.textContent.trim() || '',
                text: cell.querySelector('.game_text')?.textContent.trim() || '',
                deepText: ''
            });
        });
        return list;
    }

    async function startScrape(force = false) {
        if (isAborted || isScraping || isDeepScanning) return;
        if (!force && games.length > 0) {
            updateStatus(`Already have ${games.length} games. Use Refresh Cache to re-scrape.`);
            return;
        }

        isScraping = true;
        games = [];
        document.getElementById('itch-scrape-btn').disabled = true;
        updateStatus('Starting listing scrape…');
        setProgress(0);

        try {
            for (let page = 1; page <= MAX_PAGES; page++) {
                if (isAborted) break;
                updateStatus(`Fetching page ${page} / ${MAX_PAGES}…`);
                const data = await fetchPage(page);
                if (isAborted || !data?.content) {
                    updateStatus(isAborted ? '🛑 Scrape aborted' : `Reached end at page ${page - 1}`);
                    break;
                }
                const batch = parseGames(data.content);
                if (!batch.length) break;
                games.push(...batch);
                setProgress((page / MAX_PAGES) * 100);
                updateStatus(`Page ${page}: +${batch.length} (total ${games.length})`);
                if (page < MAX_PAGES && !isAborted) await sleep(DELAY_MS);
            }

            if (!isAborted) {
                const seen = new Set();
                games = games.filter(g => !seen.has(g.id) && seen.add(g.id));
                saveCache();
                updateStatus(`Done. Cached ${games.length} unique games.`);
            }
        } catch (err) {
            if (!isAborted) updateStatus('Error: ' + err.message);
        } finally {
            isScraping = false;
            if (!isAborted) document.getElementById('itch-scrape-btn').disabled = false;
            setProgress(isAborted ? 0 : 100);
        }
    }

    // ---------- Deep Scan helpers ----------
    function fetchGamePage(url) {
        return new Promise(resolve => {
            if (isAborted) return resolve('');
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: res => resolve((!isAborted && res.status === 200) ? (res.responseText || '') : ''),
                onerror: () => resolve('')
            });
        });
    }

    function extractDeepText(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const parts = [];
        const titleEl = doc.querySelector('h1.game_title, h1[itemprop="name"]');
        if (titleEl) parts.push(titleEl.textContent.trim());
        const descEl = doc.querySelector('div.formatted_description.user_formatted, div.formatted_description');
        if (descEl) parts.push(descEl.innerText || descEl.textContent || '');
        return parts.join(' ').replace(/\s+/g, ' ').trim().substring(0, 9000);
    }

    // ---------- Search + Deep Scan ----------
    async function doSearch(deep = false) {
        if (isAborted || isScraping || isDeepScanning) return;

        const raw = document.getElementById('itch-keywords').value.trim();
        if (!raw) return updateStatus('Enter keywords separated by commas');

        if (containsBlockedTerm(raw)) {
            triggerFlashbang();
            updateStatus('Blocked – illegal search term detected');
            document.getElementById('itch-keywords').value = '';
            return;
        }

        if (!games.length) return updateStatus('No cache yet – click Refresh Cache first');

        const keywords = raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        if (!keywords.length) return;

        let results = games.filter(g => {
            const hay = (g.title + ' ' + g.text + ' ' + g.genre + ' ' + g.author + ' ' + (g.deepText || '')).toLowerCase();
            return keywords.every(kw => hay.includes(kw));
        });

        renderResults(results, keywords, deep ? ' (checking deep…)' : '');
        if (!deep) return;

        isDeepScanning = true;
        document.getElementById('itch-deep-btn').disabled = true;
        document.getElementById('itch-search-btn').disabled = true;

        const alreadyDone = games.filter(g => g.deepText && g.deepText.length > 5).length;
        const toScan = games.filter(g => !g.deepText || g.deepText.length <= 5);
        const total = games.length;
        const remaining = toScan.length;

        if (remaining === 0) {
            updateStatus(`Deep Scan: All ${total} games already checked ✓`);
            setProgress(100);
            isDeepScanning = false;
            document.getElementById('itch-deep-btn').disabled = false;
            document.getElementById('itch-search-btn').disabled = false;
            return;
        }

        updateStatus(`Deep Scan: ${alreadyDone} already done → ${remaining} left`);
        setProgress(0);

        let done = 0, newFinds = 0;

        for (let i = 0; i < toScan.length; i++) {
            if (isAborted) break;
            const g = toScan[i];
            done++;

            updateStatus(`Deep ${alreadyDone + done}/${total} (${remaining - done} left) – ${g.title.substring(0, 35)}…`);

            const html = await fetchGamePage(g.url);
            g.deepText = html ? extractDeepText(html) : ' ';

            const hay = (g.title + ' ' + g.text + ' ' + g.genre + ' ' + g.author + ' ' + g.deepText).toLowerCase();
            if (keywords.every(kw => hay.includes(kw)) && !results.some(r => r.id === g.id)) {
                results.push(g);
                newFinds++;
                renderResults(results, keywords, ` (+${newFinds} new)`);
            }

            setProgress(((alreadyDone + done) / total) * 100);
            if (done % 10 === 0) saveCache();
            if (!isAborted && i < toScan.length - 1) await sleep(DEEP_DELAY_MS);
        }

        saveCache();
        updateStatus(isAborted
            ? '🛑 Deep scan aborted (progress saved)'
            : `Deep scan finished. ${results.length} total matches (${newFinds} new).`);

        isDeepScanning = false;
        if (!isAborted) {
            document.getElementById('itch-deep-btn').disabled = false;
            document.getElementById('itch-search-btn').disabled = false;
        }
        setProgress(isAborted ? 0 : 100);
    }

    function renderResults(results, keywords, extra = '') {
        results.sort((a, b) => {
            const score = g => keywords.reduce((s, kw) => s + ((g.title + g.text + (g.deepText || '')).toLowerCase().includes(kw) ? 1 : 0), 0);
            return score(b) - score(a);
        });

        const container = document.getElementById('itch-results');
        if (!results.length) {
            container.innerHTML = '<div style="color:#888;">No matches yet</div>';
            updateStatus(`0 results${extra}`);
            return;
        }

        container.innerHTML = results.slice(0, 400).map(g => `
            <a href="${g.url}" target="_blank" rel="noopener">
                <strong>${escapeHtml(g.title)}</strong>
                <div class="meta">${escapeHtml(g.author)} · ${escapeHtml(g.genre)}${g.text ? ' · ' + escapeHtml(g.text.substring(0, 70)) : ''}</div>
            </a>
        `).join('');
        updateStatus(`${results.length} match${results.length === 1 ? '' : 'es'}${extra}`);
    }

    function escapeHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ---------- Update checker ----------
    function checkForUpdate(manual = false) {
        if (!manual && (isScraping || isDeepScanning || isAborted)) return;

        GM_xmlhttpRequest({
            method: 'GET',
            url: GITHUB_RAW + '?t=' + Date.now(),
            onload: res => {
                if (res.status !== 200) {
                    if (manual) updateStatus('Could not reach GitHub');
                    return;
                }
                const match = res.responseText.match(/@version\s+(\d+\.\d+(?:\.\d+)?)/);
                if (match) {
                    const remote = match[1];
                    if (remote !== CURRENT_VERSION && parseFloat(remote) > parseFloat(CURRENT_VERSION)) {
                        showUpdateBadge();
                        if (manual) {
                            updateStatus(`Update available: ${CURRENT_VERSION} → ${remote}`);
                            alert(`New version ${remote} is available!\n\nGo to the GitHub page to update.`);
                        }
                    } else if (manual) {
                        updateStatus('You have the latest version.');
                    }
                }
            },
            onerror: () => {
                if (manual) updateStatus('Update check failed');
            }
        });
    }

    // ---------- Init ----------
    createUI();
    if (!loadCache()) updateStatus('No cache found. Click “Refresh Cache” first.');

    setTimeout(() => checkForUpdate(false), 5000);
    setInterval(() => checkForUpdate(false), UPDATE_CHECK_INTERVAL);
})();
