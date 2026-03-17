# Contributing

Contributions are welcome. This is a privacy-first tool — please read the rules below before submitting anything.

## Privacy Rules (Non-Negotiable)

- **Never include real financial data.** No real bank statements, transaction histories, account numbers, card numbers, or any PII in issues, PRs, code, or comments.
- Use fabricated transactions when demonstrating parser behavior (e.g. `15 Jan    SOME MERCHANT    12.34`).
- The `.gitignore` blocks `*.pdf`, `*.qif`, `*.csv` — do not force-add these.

## What We Welcome

- **New bank/card parsers** — see the roadmap for what's missing (DBS, YouTrip, Revolut)
- **Bug fixes** for existing parsers (wrong amounts, missed transactions, year detection errors)
- **UX improvements** from the roadmap
- **Documentation fixes**

## Getting Started

```bash
git clone https://github.com/<your-fork>/singapore-pdf-bank-statement-converter
# Open index.html in a browser — no build step, no install
```

Use the browser console to inspect extracted PDF text when developing a parser.

## Adding a New Parser

1. Study your bank's PDF format — upload a statement, check the console for extracted text output
2. Create `js/parsers/<bank>.js` following the pattern of an existing parser (`citi.js` for single-line, `uob.js` for multi-card, `sc.js` for bank accounts with coordinate extraction)
3. Register the parser in `js/parsers/registry.js`
4. Add a `<script>` tag in `index.html` (before `registry.js`) and the dropdown option + filename mapping in `js/app.js`
5. Update the Supported Statements table in `README.md`

See `CLAUDE.md` for full architecture details.

## Branch and PR Workflow

```bash
git checkout -b feature/your-description   # or fix/ or docs/
# make changes
git add <specific files>
git commit -m "short descriptive message"
git push -u origin feature/your-description
gh pr create
```

- Branch off `main`; target `main` in your PR
- Keep PRs focused — one parser or one fix per PR
- PRs that include real financial data will be closed immediately

## Code Style

- Vanilla JS (ES6+), no frameworks, no build step
- No minification — code should be readable for privacy inspection
- Add comments explaining *why* regex patterns exist, not just what they match
- Do not add `console.log` noise; the existing logging convention is intentional
