```markdown
# Itch.io NSFW Game Finder

A Tampermonkey userscript that lets you search the entire itch.io NSFW catalog using custom keywords.

![Version](https://img.shields.io/badge/version-1.6.3-blue)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Required-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

**[Install Script](https://raw.githubusercontent.com/bruhmomentobama/ItchNSFWGameFinder/main/ItchNSFWGameFinder.user.js)** · 
**[Report Bug](https://github.com/bruhmomentobama/ItchNSFWGameFinder/issues)** · 
**[Releases](https://github.com/bruhmomentobama/ItchNSFWGameFinder/releases)**

---

## Features

**Full Catalog Caching**  
Scrapes and stores the itch.io NSFW games list locally so you don’t have to reload everything every time.

**Custom Keyword Search**  
Search using multiple keywords separated by commas (example: `futa, fat, femboy`).

**Deep Scan**  
Goes beyond the listing page and checks the actual game title and description for better results. Already-scanned games are automatically skipped.

**Resume Support**  
Progress is saved frequently. You can stop and continue later without losing work.

**Update Checker**  
Automatically checks for new versions every 10 minutes and notifies you inside the panel.

**Emergency Stop**  
Large red button that immediately halts any running scrape or deep scan.

**Clean Floating UI**  
Minimal dark-themed panel that stays out of the way until you need it.

---

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Open the raw script file in this repository (or click the install link above).
3. Tampermonkey will prompt you to install the userscript.
4. Navigate to [itch.io/games/nsfw](https://itch.io/games/nsfw) and start using it.

---

## How to Use

1. Open any itch.io NSFW games page.
2. Click the red search button in the bottom-right corner.
3. On first use, click **Refresh Cache** and wait for it to finish.
4. Enter your keywords and press **Search**.
5. For more thorough results, click **Deep Scan**.  
   Note: Deep Scan can take a long time depending on how many games still need to be checked.

### Bottom Buttons

| Button          | Action                              |
|-----------------|-------------------------------------|
| GitHub          | Opens this repository               |
| Report Bug      | Opens the Issues page               |
| Check Updates   | Manually checks for a new version   |

---

## Configuration

These options can be found near the top of the script:

```js
const MAX_PAGES = 200;              // How many listing pages to scrape
const DELAY_MS = 650;               // Delay between listing pages
const DEEP_DELAY_MS = 900;          // Delay between deep scans
const USE_TAXONOMIC_CLOSURE = true; // Development toggle
```

---

## Disclaimer

This tool is intended for searching legal adult content only.  
The author is not responsible for how this script is used.

---

If you find this useful, feel free to star the repository.
```
