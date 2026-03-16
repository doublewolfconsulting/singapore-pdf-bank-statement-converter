# PDF Statement Converter

A privacy-first, client-side tool that converts bank and credit card PDF statements into QIF format for import into accounting software.

**All processing happens in your browser. No financial data is ever sent to a server or stored anywhere.**

## Supported Statements

### Credit Cards

| Bank | Card | Type | Status | Notes |
| ------ | ------ | ------ | -------- | ----- |
| Citibank | SMRT Platinum | Visa | ✅ Supported | |
| Citibank | Rewards World | Mastercard | ✅ Supported | |
| UOB | Absolute Cashback | AMEX | ✅ Supported | |
| UOB | PRVI Miles | Mastercard | ✅ Supported | |
| UOB | Preferred Platinum | Visa | ✅ Supported | |
| AMEX | KrisFlyer (Singapore Airlines) | AMEX | ✅ Supported | |
| Standard Chartered | Simply Cash | Mastercard | ✅ Supported | |
| Standard Chartered | Priority Banking Visa Infinite | Visa | ✅ Supported | |
| HSBC | Advance | Visa | ✅ Supported | Requires OCR pre-processing — run `preprocess.sh` first |
| HSBC | Revolution | Visa | ✅ Supported | Requires OCR pre-processing — run `preprocess.sh` first |

### Bank Accounts

| Bank | Status | Notes |
| ------ | -------- | ----- |
| Standard Chartered | ✅ Supported | Multiple account types |
| HSBC | ✅ Supported | Multiple account types — requires OCR pre-processing, run `preprocess.sh` first |

## Quick Start

1. Clone or download this repo
2. Open `index.html` in your browser
3. Select your card type, upload your PDF statement(s), and click Convert

That's it — no build step, no server, no dependencies to install.

### Pre-processing scanned PDFs (HSBC)

HSBC statements are scanned images with no embedded text. Run `preprocess.sh` to add an OCR text layer before converting:

```bash
# Install once
brew install ocrmypdf

# Pre-process one or more statements
./preprocess.sh statement.pdf
./preprocess.sh ~/Downloads/hsbc/*.pdf
```

The script outputs `*_ocr.pdf` files alongside the originals. Upload those to the converter.

### Alternative: GitHub Pages

If you fork this repo, you can enable GitHub Pages in your repo settings (Settings → Pages → Source: main branch) to get a hosted version at `https://<your-username>.github.io/pdf-statement-converter/`.

## How It Works

1. **PDF.js** extracts text from your PDF entirely in the browser
2. A **bank-specific parser** identifies transactions based on the statement format
3. Transactions are **auto-categorized** using keyword matching (configurable in `categories.personal.js`)
4. Output is generated in **QIF format** with sequential N-numbers for import

## File Structure

``` text
pdf-statement-converter/
├── index.html                # Main application (open this in your browser)
├── styles.css                # Stylesheet for index.html
├── preprocess.sh             # OCR helper for scanned PDFs (HSBC)
├── categories.default.js     # Default English categories — copy this to get started
├── categories.personal.js    # Personal categories — loaded by default
├── README.md                 # This file
└── ROADMAP.md                # Planned features and development priorities
```

## Customizing Categories

The repo includes two category files:

- **`categories.default.js`** — a clean English starting point with common categories
- **`categories.personal.js`** — the active file loaded by the tool

To set up your own categories:

1. Copy `categories.default.js` and rename it `categories.personal.js`
2. Edit it with your own merchant keywords and category names
3. Open `index.html` — your categories will be used automatically

The format is straightforward:

```javascript
const CATEGORY_RULES = {
    'YourCategory:Subcategory': ['KEYWORD1', 'KEYWORD2'],
    // ...
};
```

- Keywords are **case-insensitive** and use **substring matching**
- First match wins, so put more specific keywords before general ones
- Category names can use any format your accounting software supports

### Credit card payment transfers

When a credit card statement contains a GIRO payment line (e.g. "GIRO PAYMENT" or "THANK YOU"), the tool categorizes it with a bracket-notation transfer account such as `[SG-HSBC-Premier]`. This tells MoneyMoney that the payment is a transfer *from* that bank account, and it creates the matching transfer entry automatically on import.

The corresponding outflow on the bank statement side (e.g. "UOB CARD CENTRE", "AMERICAN EXPRESS") does not need a category — it will be reconciled against the transfer already created by the credit card QIF.

**If you change which account your GIRO payments come from**, update the bracket name in the `Payments & Banking` section of `categories.personal.js` to match your new account name exactly as it appears in your accounting software.

## Privacy & Security

- **Zero server communication** — no APIs, no analytics, no tracking
- **No data storage** — nothing is saved to disk, localStorage, or cookies
- **Client-side only** — PDF.js runs in your browser; the PDF never leaves your machine
- **Open source** — inspect every line of code yourself

## Contributing

Contributions are welcome! See [ROADMAP.md](ROADMAP.md) for planned features. The easiest way to contribute is adding support for new bank/card statement formats or expanding the category keyword list.

### Adding a New Card Parser

1. Study your bank's PDF statement format (use browser console to inspect extracted text)
2. Add a parser function following the pattern in `index.html` (see `parseStandardCitiTransactions` or `parseUOBTransactions`)
3. Register it in the `PARSERS` object
4. Add the card option to the card type dropdown (both the hidden `<select>` and the custom dropdown list in `index.html`)
5. Submit a PR — no real statement data please, just the parser logic

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Free for personal, non-commercial use. For commercial licensing inquiries, please open an issue.
