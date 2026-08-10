// ==UserScript==
// @name         itch.io NSFW Custom Tag Searcher + Catalog Cache
// @namespace    https://itch.io/
// @version      1.5
// @description  Cache NSFW game listings + Deep Scan with proper skip of already checked pages
// @author       you
// @match        https://itch.io/games/nsfw*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      itch.io
// @connect      *.itch.io
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ========== CONFIG ==========
    const MAX_PAGES = 200;
    const DELAY_MS = 650;                  // between listing pages
    const DEEP_DELAY_MS = 900;             // only applies when actually fetching
    const CACHE_KEY = 'itch_nsfw_catalog_v1';
    const CACHE_MAX_AGE_DAYS = 7;
    // ============================

    let games = [];
    let isScraping = false;
    let isDeepScanning = false;
    let isAborted = false;

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
                width: 440px; max-height: 80vh; background: #1a1a1a; color: #eee;
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
                background: #ff0000 !important;
                color: white !important;
                font-size: 15px !important;
                font-weight: 900 !important;
                padding: 12px !important;
                letter-spacing: 1px;
                border: 3px solid #ff6666 !important;
                box-shadow: 0 0 12px rgba(255,0,0,0.6);
                width: 100%;
            }
            #itch-emergency-btn:hover { background: #cc0000 !important; }
            #itch-tag-searcher .status { font-size: 12px; color: #aaa; min-height: 1.2em; }
            #itch-tag-searcher .progress {
                height: 6px; background: #333; border-radius: 3px; overflow: hidden;
            }
            #itch-tag-searcher .progress-bar {
                height: 100%; width: 0%; background: #fa5c5c; transition: width 0.2s;
            }
            #itch-results {
                flex: 1; overflow-y: auto; border-top: 1px solid #333; padding-top: 8px;
                max-height: 42vh;
            }
            #itch-results a {
                display: block; color: #7eb8ff; text-decoration: none; padding: 4px 0;
                border-bottom: 1px solid #2a2a2a;
            }
            #itch-results a:hover { color: #a0d0ff; }
            #itch-results .meta { font-size: 11px; color: #888; }
        `;
        document.head.appendChild(style);

        const toggle = document.createElement('button');
        toggle.id = 'itch-tag-searcher-toggle';
        toggle.title = 'Custom Tag Searcher';
        toggle.textContent = '🔍';
        toggle.onclick = () => panel.classList.toggle('open');
        document.body.appendChild(toggle);

        const panel = document.createElement('div');
        panel.id = 'itch-tag-searcher';
        panel.innerHTML = `
            <div style="font-weight:700;font-size:15px;">Itch.io NSFW Game Finder Version 1.5 by Redline the 4chan /k/ommando</div>

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
        `;
        document.body.appendChild(panel);

        // Emergency stop
        document.getElementById('itch-emergency-btn').onclick = () => {
            isAborted = true;
            isScraping = false;
            isDeepScanning = false;
            updateStatus('🛑 SCRIPT EMERGENCY STOPPED – reload page to restart');
            setProgress(0);
            const scrapeBtn = document.getElementById('itch-scrape-btn');
            const deepBtn = document.getElementById('itch-deep-btn');
            if (scrapeBtn) { scrapeBtn.disabled = true; scrapeBtn.textContent = 'STOPPED'; }
            if (deepBtn) { deepBtn.disabled = true; deepBtn.textContent = 'STOPPED'; }
            saveCache(); // save whatever we have
        };

        document.getElementById('itch-search-btn').onclick = () => doSearch(false);
        document.getElementById('itch-deep-btn').onclick = () => doSearch(true);
        document.getElementById('itch-scrape-btn').onclick = () => startScrape(true);
        document.getElementById('itch-clear-btn').onclick = () => {
            if (isAborted) return;
            GM_deleteValue(CACHE_KEY);
            games = [];
            updateStatus('Cache cleared');
            document.getElementById('itch-results').innerHTML = '';
        };
        document.getElementById('itch-keywords').addEventListener('keydown', e => {
            if (e.key === 'Enter' && !isAborted) doSearch(false);
        });
    }

    function updateStatus(msg) {
        const el = document.getElementById('itch-status');
        if (el) el.textContent = msg;
    }

    function setProgress(pct) {
        const bar = document.getElementById('itch-progress');
        if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }

    // ---------- Cache ----------
    function loadCache() {
        const raw = GM_getValue(CACHE_KEY, null);
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            const ageDays = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
            if (ageDays > CACHE_MAX_AGE_DAYS) {
                updateStatus(`Cache is ${ageDays.toFixed(1)} days old – consider refreshing`);
            }
            games = data.games || [];
            updateStatus(`Loaded ${games.length} games from cache (${ageDays.toFixed(1)}d old)`);
            return true;
        } catch (e) {
            return false;
        }
    }

    function saveCache() {
        const payload = { timestamp: Date.now(), games: games };
        GM_setValue(CACHE_KEY, JSON.stringify(payload));
    }

    // ---------- Listing scrape ----------
    function fetchPage(page) {
        return new Promise((resolve, reject) => {
            if (isAborted) { resolve(null); return; }
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://itch.io/games/nsfw?page=${page}&format=json`,
                onload: function (res) {
                    if (isAborted) { resolve(null); return; }
                    if (res.status === 404) { resolve(null); return; }
                    if (res.status !== 200) { reject(new Error(`HTTP ${res.status}`)); return; }
                    try { resolve(JSON.parse(res.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
    }

    function parseGames(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const cells = doc.querySelectorAll('.game_cell');
        const list = [];
        cells.forEach(cell => {
            const id = cell.dataset.game_id;
            const titleEl = cell.querySelector('a.title.game_link');
            if (!titleEl) return;
            list.push({
                id,
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
        if (isAborted) { updateStatus('Script is stopped. Reload the page to use again.'); return; }
        if (isScraping || isDeepScanning) return;
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
                if (isAborted) { updateStatus('🛑 Scrape aborted'); break; }
                updateStatus(`Fetching page ${page} / ${MAX_PAGES}…`);
                const data = await fetchPage(page);
                if (isAborted || !data || !data.content) {
                    updateStatus(isAborted ? '🛑 Scrape aborted' : `Reached end at page ${page - 1}`);
                    break;
                }
                const batch = parseGames(data.content);
                if (batch.length === 0) break;
                games.push(...batch);
                setProgress((page / MAX_PAGES) * 100);
                updateStatus(`Page ${page}: +${batch.length} (total ${games.length})`);
                if (page < MAX_PAGES && !isAborted) await new Promise(r => setTimeout(r, DELAY_MS));
            }

            if (!isAborted) {
                const seen = new Set();
                games = games.filter(g => {
                    if (seen.has(g.id)) return false;
                    seen.add(g.id);
                    return true;
                });
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

    // ---------- Deep page fetch ----------
    function fetchGamePage(url) {
        return new Promise((resolve) => {
            if (isAborted) { resolve(''); return; }
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function (res) {
                    if (isAborted || res.status !== 200) { resolve(''); return; }
                    resolve(res.responseText || '');
                },
                onerror: () => resolve('')
            });
        });
    }

    function extractDeepText(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const parts = [];

        // 1. Game title
        const titleEl = doc.querySelector('h1.game_title, h1[itemprop="name"]');
        if (titleEl) {
            parts.push(titleEl.textContent.trim());
        }

        // 2. Formatted description only
        const descEl = doc.querySelector('div.formatted_description.user_formatted, div.formatted_description');
        if (descEl) {
            parts.push(descEl.innerText || descEl.textContent || '');
        }

        return parts.join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 9000);
    }

    // ---------- Search + Deep Scan ----------
    async function doSearch(deep = false) {
        if (isAborted) {
            updateStatus('Script is stopped. Reload the page to use again.');
            return;
        }
        if (isScraping || isDeepScanning) return;

        const raw = document.getElementById('itch-keywords').value.trim();
        if (!raw) {
            updateStatus('Enter keywords separated by commas');
            return;
        }
        if (games.length === 0) {
            updateStatus('No cache yet – click Refresh Cache first');
            return;
        }

        const keywords = raw.split(',')
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);
        if (keywords.length === 0) return;

        // Fast pass on listing data + already deep-scanned text
        let results = games.filter(g => {
            const haystack = (g.title + ' ' + g.text + ' ' + g.genre + ' ' + g.author + ' ' + (g.deepText || '')).toLowerCase();
            return keywords.every(kw => haystack.includes(kw));
        });

        renderResults(results, keywords, deep ? ' (checking deep…)' : '');

        if (!deep) return;

        // ===== Deep Scan (proper skip) =====
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

        updateStatus(`Deep Scan: ${alreadyDone} already done → ${remaining} left to check`);
        setProgress(0);

        let done = 0;
        let newFinds = 0;

        for (let i = 0; i < toScan.length; i++) {
            if (isAborted) break;

            const g = toScan[i];
            done++;

            updateStatus(`Deep ${alreadyDone + done}/${total} (${remaining - done} left) – ${g.title.substring(0, 35)}…`);

            const html = await fetchGamePage(g.url);
            if (html) {
                g.deepText = extractDeepText(html);
            } else {
                g.deepText = " "; // mark as attempted
            }

            // Check if it now matches
            const haystack = (g.title + ' ' + g.text + ' ' + g.genre + ' ' + g.author + ' ' + (g.deepText || '')).toLowerCase();
            if (keywords.every(kw => haystack.includes(kw)) && !results.some(r => r.id === g.id)) {
                results.push(g);
                newFinds++;
                renderResults(results, keywords, ` (+${newFinds} new)`);
            }

            setProgress(((alreadyDone + done) / total) * 100);

            // Save every 10 games
            if (done % 10 === 0) saveCache();

            // Only delay when we actually fetched something
            if (!isAborted && i < toScan.length - 1) {
                await new Promise(r => setTimeout(r, DEEP_DELAY_MS));
            }
        }

        if (!isAborted) {
            saveCache();
            updateStatus(`Deep scan finished. ${results.length} total matches (${newFinds} new).`);
        } else {
            updateStatus('🛑 Deep scan aborted (progress saved)');
            saveCache();
        }

        isDeepScanning = false;
        if (!isAborted) {
            document.getElementById('itch-deep-btn').disabled = false;
            document.getElementById('itch-search-btn').disabled = false;
        }
        setProgress(isAborted ? 0 : 100);
    }

    function renderResults(results, keywords, extra = '') {
        results.sort((a, b) => {
            const score = (g) => keywords.reduce((s, kw) => s + ((g.title + g.text + (g.deepText || '')).toLowerCase().includes(kw) ? 1 : 0), 0);
            return score(b) - score(a);
        });

        const container = document.getElementById('itch-results');
        if (results.length === 0) {
            container.innerHTML = '<div style="color:#888;">No matches yet</div>';
            updateStatus(`0 results for [${keywords.join(', ')}]${extra}`);
            return;
        }

        container.innerHTML = results.slice(0, 400).map(g => `
            <a href="${g.url}" target="_blank" rel="noopener">
                <strong>${escapeHtml(g.title)}</strong>
                <div class="meta">${escapeHtml(g.author)} · ${escapeHtml(g.genre)}${g.text ? ' · ' + escapeHtml(g.text.substring(0, 70)) : ''}</div>
            </a>
        `).join('');

        updateStatus(`${results.length} match${results.length === 1 ? '' : 'es'} (showing up to 400)${extra}`);
    }

    function escapeHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------- Init ----------
    createUI();
    const hasCache = loadCache();
    if (!hasCache) {
        updateStatus('No cache found. Click “Refresh Cache” first.');
    }
})();