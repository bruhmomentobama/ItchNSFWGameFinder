# Itch.io NSFW Game Finder

**A powerful Tampermonkey userscript that lets you search the entire itch.io NSFW catalog with custom keywords.**

![Version](https://img.shields.io/badge/version-1.6.3-blue)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-required-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Full Catalog Caching**  
  Scrapes and stores the itch.io NSFW games list locally so you don't have to reload everything every time.

- **Custom Keyword Search**  
  Search using multiple keywords separated by commas (e.g. `futa, fat, femboy`).

- **Deep Scan**  
  Goes beyond the listing page and checks the actual game title + description for better results.  
  Already-scanned games are skipped automatically.

- **Resume Support**  
  Progress is saved frequently. You can stop and continue later without losing work.

- **Update Checker**  
  Automatically checks for new versions every 10 minutes and notifies you inside the panel.

- **Emergency Stop**  
  Big red button to immediately halt any running scrape or deep scan.

- **Clean Floating UI**  
  Minimal, dark-themed panel that stays out of the way until you need it.

---

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Click the raw script file in this repository (or copy the code).
3. Tampermonkey should open and ask you to install the userscript.
4. Go to [https://itch.io/games/nsfw](https://itch.io/games/nsfw) and enjoy.

---

## How to Use

1. Open any itch.io NSFW games page.
2. Click the red 🔍 button in the bottom-right corner.
3. First time? Click **Refresh Cache** and wait for it to finish.
4. Type your keywords and press **Search**.
5. Want deeper results? Click **Deep Scan**. (Please note that this takes a LONG time)

### Bottom Buttons

| Button          | Action                              |
|-----------------|-------------------------------------|
| **GitHub**      | Opens this repository               |
| **Report Bug**  | Opens the Issues page               |
| **Check Updates** | Manually checks for a new version |

---

## Configuration

At the top of the script you will find these settings:

```js
const MAX_PAGES = 200;           // How many listing pages to scrape
const DELAY_MS = 650;            // Delay between listing pages
const DEEP_DELAY_MS = 900;       // Delay between deep scans
