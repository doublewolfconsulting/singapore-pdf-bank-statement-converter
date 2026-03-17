# CLAUDE.md — PDF Statement Converter

## Project Overview

Privacy-first, client-side tool that converts bank/card PDF statements into accounting formats (QIF, with more formats planned). All processing happens in the browser — no financial data is ever sent to a server or stored anywhere.

Copyright (c) 2026 Double Wolf Consulting. All rights reserved.
Licensed under PolyForm Noncommercial License 1.0.0. See LICENSE.

## Tech Stack

- **Frontend:** Vanilla HTML + JavaScript (no framework, no build step)
- **PDF Parsing:** PDF.js — loads from Cloudflare CDN (primary, widely audited); falls back to bundled `assets/pdf.min.js` if offline
- **Hosting:** GitHub Pages (static files) or open `index.html` directly from disk
- **Development:** Claude Code for feature work

## File Structure

```text
pdf-statement-converter/
├── CLAUDE.md                  # This file — project context for Claude Code
├── README.md                  # User-facing documentation
├── ROADMAP.md                 # Planned features and priorities
├── LICENSE                    # PolyForm Noncommercial License 1.0.0
├── .gitignore                 # Blocks *.pdf, *.qif, *.csv, categories.personal.js
├── index.html                 # HTML UI only — no inline JS
├── assets/
│   ├── screenshot.png         # README screenshot
│   ├── pdf.min.js             # PDF.js bundled (v3.11.174) — no CDN dependency
│   └── pdf.worker.min.js      # PDF.js worker (bundled)
├── styles.css                 # Stylesheet
├── categories.default.js      # Default category rules (committed)
├── categories.personal.js     # Personal category overrides (gitignored, local only)
└── js/
    ├── utils.js               # MONTHS, fallbackYear, formatDate, categorizeTransaction
    ├── pdf.js                 # extractTextFromPDF, extractTextFromPDFByCoordinates
    ├── export.js              # generateQIF, generateCSV
    ├── app.js                 # UI bootstrap, parseBankStatement, convert, downloadFile
    └── parsers/
        ├── citi.js            # parseStandardCitiTransactions
        ├── uob.js             # parseUOBTransactions + helpers
        ├── amex.js            # parseAMEXTransactions
        ├── sc.js              # parseSCTransactions, parseSCBankTransactions
        ├── hsbc.js            # parseHSBCTransactions, parseHSBCBankTransactions
        └── registry.js        # PARSERS object (registers all parsers)
```

## Architecture

### How It Works

1. User uploads PDF statement(s) via the browser
2. **PDF.js** extracts text from the PDF entirely client-side
3. A **bank-specific parser** (selected by user) identifies transactions from the extracted text
4. Transactions are **auto-categorized** using keyword substring matching from `categories.default.js` (and `categories.personal.js` if present locally)
5. Output is generated in **QIF or CSV format** with sequential N-numbers (user selects format)
6. User downloads the resulting file — nothing is stored

### Key Design Decisions

- **No server, no database, no API calls.** The only external network request is loading PDF.js from Cloudflare CDN (with a local fallback for offline use). No financial data ever leaves the browser.
- **No build step.** Open `index.html` in a browser and it works. Keep it that way.
- **Categories are external config.** `categories.default.js` is always loaded; `categories.personal.js` overrides it if present locally (gitignored). Users edit the personal file to customize — no code changes needed.
- **One parser per bank/card format.** Each parser is a standalone function registered in the `PARSERS` object. Parsers should never share mutable state.
- **Pre-sorted output.** Transactions are sorted by date after parsing, before export.
- **Dual export formats.** QIF (for accounting software like MoneyMoney) and CSV (for spreadsheets). Both share the same parsed transaction data; `generateQIF()` and `generateCSV()` are separate functions. CSV columns: N, Date, Description, Memo, Amount, Category, Type.
- **P and M QIF fields.** Credit card statements emit `P` (payee/description) only. Bank account statements emit both `P` and `M` (memo/reference) when available — the HSBC bank parser extracts payee and reference separately from multi-line transaction blocks.
- **Memo-aware categorization.** For transactions with a memo field, categorization runs against `description + memo` combined, so a payment reference in the memo can still trigger a category match.

## Supported Statements

### Credit Cards

| Bank | Card | Parser Key | Card Identifier | Notes |
| ---- | ---- | ---------- | --------------- | ----- |
| Citibank | SMRT Platinum Visa | `citi-smrt` | N/A | One card per PDF — no section isolation needed |
| Citibank | Rewards World Mastercard | `citi-rewards` | N/A | One card per PDF — no section isolation needed |
| UOB | Absolute Cashback (AMEX) | `uob-absolute` | `ABSOLUTE CASHBACK AMEX` | Multi-card PDF — identifier isolates this card's section |
| UOB | PRVI Miles (Mastercard) | `uob-privi` | `PRVI MILES MASTERCARD` | Multi-card PDF — identifier isolates this card's section |
| UOB | Preferred Platinum (Visa) | `uob-preferred` | `PREFERRED PLATINUM VISA` | Multi-card PDF — identifier isolates this card's section |
| AMEX | KrisFlyer (Singapore Airlines) | `amex-krisflyer` | N/A | Single card per PDF — amounts and descriptions extracted in separate blocks; paired positionally |
| Standard Chartered | Simply Cash | `sc-simply-cash` | `SIMPLY CASH CREDIT CARD` | Consolidated PDF — coordinate extraction; section isolation |
| Standard Chartered | Priority Banking Visa Infinite | `sc-priority-banking` | `PRIORITY BANKING VISA INFINITE` | Consolidated PDF — coordinate extraction; section isolation |
| HSBC | Advance | `hsbc-advance` | N/A | Scanned PDF — requires `ocrmypdf` pre-processing via `preprocess.sh` |
| HSBC | Revolution | `hsbc-revolution` | N/A | Scanned PDF — requires `ocrmypdf` pre-processing via `preprocess.sh` |

### Bank Accounts

| Bank | Parser Key | Section Identifier | Notes |
| ---- | ---------- | ------------------ | ----- |
| Standard Chartered | `sc-securities-settlement` | `SECURITIES SETTLEMENT ACCOUNT` | Consolidated PDF — coordinate extraction; `!Type:Bank` QIF output |
| Standard Chartered | `sc-bonussaver` | `Bonus$aver` | Consolidated PDF — coordinate extraction; `!Type:Bank` QIF output |
| Standard Chartered | `sc-unlimitedsaver` | `UNLIMITED$AVER` | Consolidated PDF — coordinate extraction; `!Type:Bank` QIF output |
| HSBC | `hsbc-premier` | `PREMIER` | Scanned composite PDF — requires `ocrmypdf`; multi-line transactions anchored by REF line; `!Type:Bank` QIF output |
| HSBC | `hsbc-everyday-global` | `EVERYDAY GLOBAL ACC` | Scanned composite PDF — requires `ocrmypdf`; same parser as HSBC Premier; `!Type:Bank` QIF output |

## Coding Standards

- **JavaScript:** ES6+, no jQuery, no external frameworks
- **No minification.** Code should be readable — users may inspect it for privacy assurance.
- **Console logging** is intentional. Conversion logs card type, transaction counts, date ranges, and category breakdowns to the browser console for debugging.
- **Comments for parsing logic.** Bank statement formats are quirky — document why regex patterns exist, not just what they do.

## Adding a New Parser

1. Study the bank's PDF statement format (upload a PDF, check browser console for extracted text)
2. Create a new file `js/parsers/<bank>.js` following the pattern of `citi.js` (single-line), `uob.js` (multi-line with card section isolation), or `sc.js` (bank account with deposit/withdrawal/balance columns)
3. Handle year detection — watch out for cross-year statements (e.g., January statement with December transactions)
4. Register the parser in `js/parsers/registry.js` with `name`, `extractYear`, `parseTransactions`, and optionally `cardIdentifier`, `coordinateExtraction: true`, and `qifType: 'Bank'`
5. Add a `<script src="js/parsers/<bank>.js">` tag in `index.html` before `registry.js`
6. Add the option to both the hidden `<select id="cardType">` and the `<ul id="cardTypeOptions">` custom dropdown — place under the correct `<optgroup>` / group header (`Credit Cards` or `Bank Accounts`)
7. Add the filename mapping in `updateFilename()` in `js/app.js`
8. Update this file's Supported Statements table

## Category Files

Two category files:

| File | Committed? | Purpose |
| ---- | ---------- | ------- |
| `categories.default.js` | Yes | Clean English starting point — always loaded first |
| `categories.personal.js` | No (gitignored) | Personal overrides — German categories, Singapore-specific merchants. Loaded after default if present locally. |

`categories.personal.js` is in `.gitignore` to keep private merchant/keyword data off GitHub. New users copy `categories.default.js` to `categories.personal.js` and customise it. Both files use `var CATEGORY_RULES` (not `const`) so the personal file can override the default in the same browser context.

Format:

```javascript
'Category:Subcategory': ['KEYWORD1', 'KEYWORD2'],
```

- Keywords are **case-insensitive** and use **substring matching** ("contains")
- First match wins — put specific keywords before generic ones

## Known Parsing Challenges

- **UOB multi-line transactions:** Amount appears on a separate line from description. The parser uses a `currentTransaction` state machine to handle this.
- **UOB multi-card statements:** A single PDF contains sections for multiple cards. Parser uses `cardIdentifier` to isolate the correct section and stops at the next card header.
- **Cross-year transactions:** A January 2026 statement may contain December 2025 transactions. Year detection compares transaction month against statement month.
- **Citibank Rewards year detection:** Falls back to Payment Due Date if Statement Date is missing.
- **Credit vs debit:** Citibank uses parentheses `(amount)` for credits. UOB uses `CR` suffix. Standard Chartered bank accounts use separate Deposit/Withdrawal columns — sign inferred from balance delta.
- **Standard Chartered consolidated PDF:** A single PDF contains all accounts (bank + credit cards). Coordinate-based extraction (`coordinateExtraction: true`) reconstructs rows correctly. Section isolation uses `cardIdentifier` with false-start reset logic to skip the account summary at the top.
- **HSBC scanned PDFs:** No embedded text layer — require `ocrmypdf` pre-processing via `preprocess.sh` before uploading.
- **HSBC composite bank statement format:** Uses `coordinateExtraction: true` — without it, multi-column pages extract column-by-column (all dates, then all descriptions, then all amounts), breaking the REF-anchored parsing. Multi-line transactions anchored by a `REF CODE AMT BALANCE` line. Date (`DDMonYYYY`, no spaces) and description appear in preceding lines. OCR artefacts: leading `|`, `_`, `{`, `>` characters; `O` instead of `0` in dates. `descLines` is intentionally NOT reset at `BALANCE CARRIED FORWARD` — transactions can span page breaks with description on one page and REF line on the next. `prevBalance` is initialised from `BALANCE BROUGHT FORWARD` to correctly sign the first transaction on each page.

## Git Workflow

**Never push directly to `main`.** Use feature branches and PRs.

```bash
git checkout -b feature/your-description
# make changes
git add .
git commit -m "descriptive message"
git push -u origin feature/your-description
gh pr create
```

Branch naming:

- `feature/` — new functionality (new parsers, export formats)
- `fix/` — bug fixes (parsing errors, year detection issues)
- `docs/` — documentation changes

## Versioning & Releases

Tags must be GitHub-signed to show as Verified. The workflow is to create a release (which signs the tag), then immediately delete the release — the verified tag remains.

```bash
gh release create vX.Y --title "vX.Y" --notes "Short description" --target <branch-or-main>
gh release delete vX.Y --yes
```

We are not publishing releases yet — tags only.

## Privacy & Security Rules

These are absolute and apply to all development:

1. **No network requests** beyond loading PDF.js from CDN. No analytics, no tracking, no telemetry.
2. **No localStorage, no cookies, no sessionStorage.** Nothing persists after the tab closes.
3. **Never commit financial data.** The `.gitignore` blocks `*.pdf`, `*.qif`, `*.csv`, `*.ofx`. If you need test data, use fabricated transactions.
4. **No external services.** No Firebase, no Supabase, no "just a small API call." Everything stays client-side.
5. **No PII in source code.** Do not hardcode real names, addresses, account numbers, card numbers, UENs, or any personal identifiers in code or comments — not even as examples.

## Current Roadmap Priority

See ROADMAP.md for full details. Next priorities:

1. More bank parsers (DBS)
2. Transaction preview table before export
