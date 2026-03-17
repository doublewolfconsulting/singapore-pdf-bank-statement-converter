// ============================================================
// HSBC parser (shared: Advance, Revolution)
// ============================================================
// Format: single-line transactions
//   DD MMM DD MMM DESCRIPTION AMOUNT(CR)?
//   (post date, tran date, description, amount)
// Credits (cashback, payments) have CR suffix.
// Continuation lines (merchant location, year) are non-matching noise — ignored.
// Year extracted from statement period header: "From DD MMM YYYY to DD MMM YYYY"
// Underscores in OCR output replaced with spaces in descriptions.
// ============================================================
function hsbcExtractYear(text) {
    // "From 08 JUL 2025 to 07 AUG 2025" — use end date year
    const m = text.match(/to\s+\d{1,2}\s+\w{3}\s+(\d{4})/i)
           || text.match(/From\s+\d{1,2}\s+\w{3}\s+(\d{4})/i);
    return m ? m[1] : fallbackYear(text);
}

function parseHSBCTransactions(text, year, cardName) {
    const transactions = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    // Statement period end date gives year and month for cross-year detection
    const periodMatch = text.match(/to\s+\d{1,2}\s+(\w{3})\s+(\d{4})/i);
    const stmtYear     = periodMatch ? periodMatch[2] : year;
    const stmtMonthNum = periodMatch ? (MONTHS[periodMatch[1].toUpperCase()] || 1) : 1;

    const monthRe = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
    // POST DATE  TRAN DATE  DESCRIPTION  AMOUNT(CR)?
    const txnRe = new RegExp(
        `^(\\d{1,2}\\s+${monthRe})\\s+\\d{1,2}\\s+${monthRe}\\s+(.+?)\\s+([\\d,]+\\.\\d{2})(CR)?\\s*$`, 'i'
    );

    for (const line of lines) {
        // Stop before account summary section to avoid false matches
        if (/ACCOUNT SUMMARY/i.test(line)) break;

        const m = line.match(txnRe);
        if (!m) continue;

        const amount = parseFloat(m[3].replace(/,/g, ''));
        if (amount === 0) continue;

        const dateStr     = m[1];
        const description = m[2].trim().replace(/_/g, ' ');
        const isCredit    = !!m[4];

        // Cross-year detection: if tx month is much later than stmt month, it's prior year
        const txMonthNum = MONTHS[dateStr.trim().split(/\s+/)[1].toUpperCase()] || 1;
        const txYear = txMonthNum > stmtMonthNum + 6
            ? String(parseInt(stmtYear) - 1) : stmtYear;

        transactions.push({
            date: formatDate(dateStr, txYear),
            description,
            amount: isCredit ? amount : -amount
        });
    }

    console.log(`[HSBC ${cardName}] ${transactions.length} transactions parsed`);
    return transactions;
}

// ============================================================
// HSBC — Bank Account parser (PREMIER and EVERYDAY GLOBAL ACC)
// ============================================================
// Composite statement — scanned PDF, requires ocrmypdf pre-processing.
// Uses coordinateExtraction: true to reconstruct rows correctly. Without it,
// multi-column pages extract column-by-column (all dates, then all descriptions,
// then all amounts), which breaks the REF-anchored parsing.
// Each transaction is multi-line, anchored by a "REF CODE AMT BALANCE" line.
// Dates are embedded in each transaction block: 24Apr2025 (no spaces).
// OCR artefacts: leading |_=+{}>~, O instead of 0 in dates.
// Sign is inferred from balance delta. prevBalance is initialised from
// BALANCE BROUGHT FORWARD so the first transaction signs correctly.
// Page-spanning transactions: description lines from the previous page are
// preserved across BALANCE CARRIED FORWARD — descLines is NOT reset there.
function hsbcBankExtractYear(text) {
    // "Statement Date O7MAY2025" — extract year from statement date
    const m = text.match(/Statement Date\s+[O0]?\d{1,2}[A-Za-z]{3}(\d{4})/i);
    return m ? m[1] : fallbackYear(text);
}

function parseHSBCBankTransactions(text, _year, accountIdentifier, stopTerms) {
    // Strip leading OCR artefacts from every line before processing
    const lines = text.split(/\r?\n/)
        .map(l => l.replace(/^[\s|_=+{}>«»~\\]+/, '').trim())
        .filter(l => l.length > 0);

    // Pre-scan for page header lines: any pure-alpha line appearing 3+ times is
    // a repeated page header (e.g. account holder name) — filter without hardcoding PII.
    const lineFreq = {};
    for (const l of lines) { lineFreq[l] = (lineFreq[l] || 0) + 1; }
    const pageHeaderLines = new Set(
        Object.entries(lineFreq)
            .filter(([line, count]) => count >= 3 && /^[A-Za-z\s-]+$/.test(line))
            .map(([line]) => line)
    );

    const transactions = [];
    let inSection  = false;
    let currentDate = null;  // [day, monthStr, year]
    let descLines  = [];
    let prevBalance = null;

    const monthRe = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
    // Date: optional leading O (OCR artefact for 0), then DDMonYYYY with no spaces
    const dateRe = new RegExp(`^[O0]?(\\d{1,2})(${monthRe})(\\d{4})`, 'i');
    // REF line: REF [optional |] CODE  AMOUNT  BALANCE
    const refRe  = /^REF\s+\|?([A-Z0-9|-]+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i;
    // Balance carry lines — extract balance to initialise prevBalance
    const balFwdRe = /BALANCE (?:BROUGHT|CARRIED) FORWARD[\s|_]*([\d,]+\.?\d*)/i;

    // Structural / page noise — skip entirely
    // Note: account holder name lines may appear on each page of composite statements.
    // If the customer name leaks into transaction descriptions, add a name-specific
    // pattern to isHSBCBankNoise() — do NOT hardcode names here (PII in source code).
    const skipRe = /^(Date\s+Transaction|Transaction Turnover|Transaction Count|Deposit Insurance|Singapore dollar deposits|currency deposits|dual currency|structured deposits|not insured|Issued by HSBC|Composite Statement|Branch (?:Name|Number)|RAFFLES PLACE|Statement Date|Customer Number|Sequence Number|Fremicr|HSBC$|Premier$|Page \d|SGD$|CCY|Account Number|Your Portfolio|Summary of Your|Details of Your|DEPOSITS AND INV|BORROWINGS|TOTAL DEPOSITS|TOTAL BORROWINGS|ADVANCE VISA|Your Upcoming|CURRENT ACCOUNT|SAVINGS ACCOUNT|SECURITIES & UNIT|NN\s|Se\s|91$)/i;

    for (const line of lines) {
        if (!inSection) {
            if (line.includes(accountIdentifier)) inSection = true;
            continue;
        }

        // Stop at next account or holdings section
        if (stopTerms.some(s => line.includes(s))) break;
        if (/^CLOSING BALANCE/i.test(line)) break;

        // Skip re-occurrence of section header (page continuation)
        if (line.includes(accountIdentifier)) continue;

        // Balance Brought/Carried Forward — initialise/refresh prevBalance, skip line
        // descLines are intentionally NOT reset here — a transaction may have its
        // description on the previous page and its REF line on the next page.
        const bfM = line.match(balFwdRe);
        if (bfM) {
            prevBalance = parseFloat(bfM[1].replace(/,/g, ''));
            continue;
        }

        // Skip structural / page noise
        if (skipRe.test(line)) continue;

        // REF line — finalize current transaction
        const refM = line.match(refRe);
        if (refM) {
            const txnAmount = parseFloat(refM[2].replace(/,/g, ''));
            const balance   = parseFloat(refM[3].replace(/,/g, ''));

            if (txnAmount > 0 && currentDate) {
                const isDeposit = prevBalance !== null
                    ? balance > prevBalance
                    : balance > balance - txnAmount; // fallback: treat as deposit if unknown
                const cleanLines = descLines.filter(l => !isHSBCBankNoise(l));
                const description = (cleanLines[0] || refM[1]).trim();
                // Build memo from remaining clean lines; fall back to type label (PayNow, OTHR, etc.)
                const memoLines = cleanLines.slice(1);
                let memo = memoLines.join(' | ').trim();
                if (!memo) {
                    // Prefer descriptive label > generic code > transfer ref
                    const paymentLabel = descLines.find(l => /^(PayNow Transfer|PayNow payment|GIRO Collection[\s\d]*)$/i.test(l));
                    const typeCode     = descLines.find(l => /^(OTHR|COLL|PAYNOW|NA|Others)$/i.test(l));
                    const transferRef  = descLines.find(l => /^[VW][A-Z0-9]{8,}$/i.test(l));
                    memo = (paymentLabel || typeCode || transferRef || '').trim();
                }
                transactions.push({
                    date: formatDate(`${currentDate[0]} ${currentDate[1]}`, currentDate[2]),
                    description,
                    memo,
                    amount: isDeposit ? txnAmount : -txnAmount
                });
            }

            prevBalance = balance;
            descLines = [];
            continue;
        }

        // Date line — update currentDate, remainder may start description
        const dateM = line.match(dateRe);
        if (dateM) {
            currentDate = [dateM[1], dateM[2], dateM[3]];
            const remainder = line.slice(dateM[0].length).replace(/^[\s|_=+]+/, '').trim();
            descLines = remainder ? [remainder] : [];
            continue;
        }

        // Accumulate as potential description — skip repeated page header lines
        if (!pageHeaderLines.has(line)) descLines.push(line);
    }

    console.log(`[HSBC ${accountIdentifier}] ${transactions.length} transactions parsed`);
    return transactions;
}

function isHSBCBankNoise(line) {
    if (!line || line.length <= 2) return true;
    if (/^(SGL|SGV|SGP)[A-Z0-9]/i.test(line)) return true;    // bank routing refs
    if (/^HIB-/i.test(line)) return true;                      // HIB transfer codes
    if (/^(OTHR|COLL|PAYNOW|NA)$/i.test(line)) return true;   // type codes
    if (/^(Others|PayNow Transfer|PayNow payment|GIRO Collection[\s\d]*)$/i.test(line)) return true;
    if (/^\+65/.test(line)) return true;                        // SG phone numbers
    if (/^[VW][A-Z0-9]{8,}$/i.test(line)) return true;        // VVT/WVT internal codes
    if (/^P(?:NTR|YMT)[A-Z0-9-/]+$/i.test(line)) return true; // PNTR/PYMT ref codes
    if (/^ON\d{10,}$/i.test(line)) return true;                // ON10502505071023 codes
    if (/^\d{9}[A-Z]$/.test(line)) return true;                // UEN/NRIC format
    if (/^\d{5,}[A-Z]\d{5,}$/.test(line)) return true;        // card/account number strings
    if (/^[\d\s,./|-]+$/.test(line)) return true;              // pure number lines
    if (/^\d+\s+[A-Z]+\s+(?:ROAD|STREET|AVE(?:NUE)?|DRIVE|LANE|PLACE|BOULEVARD)/i.test(line)) return true; // street address lines
    if (/SINGAPORE\s+\d{6}/i.test(line)) return true;          // Singapore postal codes
    if (/^#\d+-\d+/i.test(line)) return true;                  // unit numbers e.g. #05-07
    // Also present in skipRe — defence-in-depth: skipRe catches standalone header lines;
    // this catches the same artefact when it leaks into accumulated description lines.
    if (/Fremicr|CED\s+Fremi/i.test(line)) return true;        // OCR artefact for "Premier" branch name
    if (/^CARD\s+CENTRE/i.test(line)) return true;             // card centre lines
    if (/^Statement\s+Details/i.test(line)) return true;       // statement header lines
    // Word-fragment continuation lines: short upper-case fragment + company suffix
    if (/^[A-Z]{1,8}\s+(?:LTD|PTE|CORP|INC|CO)\.?$/i.test(line)) return true;
    return false;
}
