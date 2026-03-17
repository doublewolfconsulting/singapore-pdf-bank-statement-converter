# Security Policy

## Supported Versions

This project is a client-side static web tool. Only the latest version on `main` is actively maintained.

## Security Model

All PDF processing happens entirely in your browser. No financial data is transmitted to any server. The only outbound network request is loading PDF.js from the Cloudflare CDN — a bundled local fallback is included for offline use.

- No server, no database, no API
- No localStorage, cookies, or sessionStorage
- Nothing persists after the tab closes
- Open source — every line is inspectable

## Reporting a Vulnerability

If you discover a security issue — particularly one that could cause financial data to leak outside the browser, introduce XSS, or compromise user privacy — please report it responsibly:

1. **Do not open a public issue.** Open a [GitHub Security Advisory](../../security/advisories/new) instead (private by default).
2. Describe the vulnerability, steps to reproduce, and potential impact.
3. We will acknowledge receipt and work with you on a fix before any public disclosure.

## Out of Scope

- Vulnerabilities in PDF.js itself — report those upstream to the [PDF.js project](https://github.com/mozilla/pdf.js)
- Issues requiring the attacker to already have access to the user's local filesystem or browser session
- Parsing inaccuracies (wrong amounts, missed transactions) — these are bugs, not security issues; open a regular issue

## Privacy Reminder

When reporting, never include real bank statements, account numbers, transaction data, or any personal financial information. Use fabricated data to demonstrate the issue.
