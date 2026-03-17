// ============================================================
// AMEX KrisFlyer parser (Singapore Airlines KrisFlyer credit card)
//
// AMEX PDFs have a two-column layout that PDF.js extracts separately:
// descriptions come out in one block, amounts in another — they cannot
// be read as single lines. Strategy is a two-pass positional pairing:
//
//   Pass 1: collect transaction description lines (DD.MM.YY + description text)
//   Pass 2: collect amounts from each page's pre-page-marker block
//           (card header "XXXX-XXXXXX-DIGITS" marks the start,
//            "Page N / N" marks the end of each page's amounts block)
//   Pass 3: pair descriptions with amounts positionally
//
// Dates use DD.MM.YY format (year embedded — no external year needed).
// Credits are followed by a standalone "CR" line.
// ============================================================
function parseAMEXTransactions(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/).map(l => l.trim());

    // Convert DD.MM.YY → M/D/YY for QIF
    function amexFormatDate(ddmmyy) {
        const [dd, mm, yy] = ddmmyy.split('.');
        return `${parseInt(mm)}/${parseInt(dd)}/${yy}`;
    }

    // ── Pass 1: collect transaction description lines ──────────────
    const descriptions = [];
    const txLineRe = /^(\d{2}\.\d{2}\.\d{2})\s+(.+)$/;

    for (const line of lines) {
        const m = line.match(txLineRe);
        if (!m) continue;
        const desc = m[2].trim();
        // Skip column headers, totals, statement-period dates, "at DD.MM.YYYY" rows
        if (/^(Details|Total of|From \d|at \d|Prepared)/i.test(desc)) continue;
        // Skip if "description" starts with a full 4-digit-year date
        if (/^\d{2}\.\d{2}\.\d{4}/.test(desc)) continue;
        descriptions.push({ date: m[1], description: desc });
    }

    // ── Pass 2: collect amounts from the pre-page-marker sections ──
    const amounts = [];
    let sectionAmounts = [];
    let inAmountsBlock = false;
    let leadingCRDone = false;

    for (const line of lines) {
        // Card header line (e.g. "NAME XXXX-XXXXXX-11000 14.11.2024")
        // marks the start of this page's amounts block
        if (/XXXX-XXXXXX-\d+/.test(line)) {
            sectionAmounts = [];
            inAmountsBlock = true;
            leadingCRDone = false;
            continue;
        }

        if (/^Page \d+ \/ \d+$/.test(line)) {
            // End of amounts block — flush to main list
            for (const a of sectionAmounts) amounts.push(a);
            sectionAmounts = [];
            inAmountsBlock = false;
            leadingCRDone = false;
            continue;
        }

        if (!inAmountsBlock) continue;

        if (/^\d+\.\d{2}$/.test(line)) {
            // Isolated decimal amount (no comma — rules out 15,000.00 etc.)
            sectionAmounts.push({ value: parseFloat(line), isCredit: false });
        } else if (line === 'CR') {
            if (sectionAmounts.length === 0 && !leadingCRDone) {
                // Leading CR artifact — skip
                leadingCRDone = true;
            } else if (sectionAmounts.length > 0) {
                // CR is a suffix for the preceding amount → mark as credit
                sectionAmounts[sectionAmounts.length - 1].isCredit = true;
            }
        }
    }

    // ── Pass 3: pair descriptions with amounts positionally ────────
    if (descriptions.length !== amounts.length) {
        console.warn(`AMEX: ${descriptions.length} descriptions but ${amounts.length} amounts — pairing by position up to min`);
    }

    const count = Math.min(descriptions.length, amounts.length);
    for (let i = 0; i < count; i++) {
        const { date, description } = descriptions[i];
        const { value, isCredit } = amounts[i];
        transactions.push({
            date: amexFormatDate(date),
            description,
            // Credits (refunds/cashbacks) are positive; purchases are negative
            amount: isCredit ? value : -value
        });
    }

    return transactions;
}
