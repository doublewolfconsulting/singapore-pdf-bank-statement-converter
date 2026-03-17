// ============================================================
// Standard Chartered Simply Cash parser
//
// SC PDFs have a 4-column table (Trans Date | Post Date | Description | Amount).
// PDF.js extracts the Description column separately from the date/amount columns,
// and in reverse order relative to them. Structure per page:
//   [description lines — reverse order]
//   [column header noise]
//   [DD Mon  DD Mon  AMOUNT[CR] rows — forward order]
//
// Strategy: state machine collects descriptions then date/amount rows per page.
// On each page boundary, reverse descriptions and pair positionally with date/amounts.
//
// Description formats:
//   Standard:  Transaction Ref DIGITS MERCHANT CITY SG
//   Alternate: MERCHANT CITY SG Transaction Ref DIGITS  (some PDF versions)
//   No ref:    GIRO PAYMENT, CASHBACK
// ============================================================
// Known SC card identifiers — used to detect section boundaries
const ALL_SC_CARDS = ['SIMPLY CASH CREDIT CARD', 'PRIORITY BANKING VISA INFINITE'];
const ALL_SC_BANK_ACCOUNTS = ['SECURITIES SETTLEMENT ACCOUNT', 'Bonus$aver', 'UNLIMITED$AVER'];

function scExtractYear(text) {
    // Coordinate extraction gives clean line: "Statement Date: 15 Mar 2025"
    const m = text.match(/Statement\s+Date\s*:?\s*\d{1,2}\s+\w{3}\s+(\d{4})/i)
           // Fallback for old-style concatenated: "16 Oct 2024Statement Date:"
           || text.match(/\d{1,2}\s+\w{3}\s+(\d{4})\s*Statement\s+Date/i);
    return m ? m[1] : fallbackYear(text);
}

function parseSCTransactions(text, year, cardIdentifier) {
    const transactions = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    let inCardSection = false;
    const otherSCCards = ALL_SC_CARDS.filter(c => c !== cardIdentifier);

    const monthRe = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
    // Coordinate extraction puts each row on one line:
    //   DD Mon  DD Mon  DESCRIPTION  AMOUNT[CR]
    const txnRe = new RegExp(
        `^(\\d{1,2}\\s+${monthRe})\\s+\\d{1,2}\\s+${monthRe}\\s+(.+?)\\s+([\\d,]+\\.\\d{2})(CR)?\\s*$`, 'i'
    );

    const stmtMatch = text.match(/Statement\s+Date:\s*(\d{1,2})\s+(\w{3})\s+(\d{4})/i)
                   || text.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})\s*Statement\s+Date/i);
    const statementYear = stmtMatch ? stmtMatch[3] : year;
    const stmtMonthNum  = stmtMatch ? (MONTHS[stmtMatch[2].toUpperCase()] || 1) : 1;

    for (const line of lines) {
        if (!inCardSection) {
            if (line.includes(cardIdentifier)) inCardSection = true;
            continue;
        }

        // Another SC card encountered — if no transactions yet it's a false start
        // in the account summary; reset and keep looking for the real section.
        if (otherSCCards.some(other => line.includes(other))) {
            if (transactions.length > 0) break;
            inCardSection = false;
            continue;
        }

        const m = line.match(txnRe);
        if (!m) continue;

        const amount = parseFloat(m[3].replace(/,/g, ''));
        if (amount === 0) continue;

        let description = m[2].trim();
        // Strip "Transaction Ref DIGITS" suffix — present on most SC transactions
        const txRefIdx = description.search(/Transaction\s+Ref/i);
        if (txRefIdx >= 0) description = description.substring(0, txRefIdx).trim();
        // Strip trailing merchant location "WORD SG" (e.g. "SINGAPORE SG")
        description = description.replace(/\s+\S+\s+SG\s*$/i, '').trim();
        if (!description) continue;

        const isCredit = !!m[4];
        const txMonthNum = MONTHS[m[1].trim().split(/\s+/)[1].toUpperCase()] || 1;
        const txYear = txMonthNum > stmtMonthNum + 6
            ? String(parseInt(statementYear) - 1) : statementYear;

        transactions.push({
            date: formatDate(m[1], txYear),
            description,
            amount: isCredit ? amount : -amount
        });
    }

    console.log(`[SC ${cardIdentifier}] ${transactions.length} transactions parsed`);
    return transactions;
}

// ============================================================
// Standard Chartered — Bank Account parser
// ============================================================
// Row format (coordinate extraction): DD Mon YYYY  DESCRIPTION  [DEPOSIT]  [WITHDRAWAL]  BALANCE
// Sign is inferred from balance delta: balance up → deposit (+), balance down → withdrawal (-)
function parseSCBankTransactions(text, _year, accountIdentifier) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const transactions = [];
    let inSection = false;
    let prevBalance = null;

    const monthRe = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
    const dateRe = new RegExp(`^(\\d{1,2}\\s+${monthRe}\\s+\\d{4})\\s+(.+)$`, 'i');
    const skipRe = /BALANCE FROM PREVIOUS STATEMENT|CLOSING BALANCE|^Date\s+Description/i;
    // Standalone reference numbers that appear on their own line (e.g. 217838301)
    const refNumRe = /^\d{6,}$/;
    // Account number pattern e.g. 71-0-996310-2 — used to detect section boundaries
    const acctHeaderRe = /\d{2}-\d-\d{6}-\d/;

    for (const line of lines) {
        if (!inSection) {
            if (line.includes(accountIdentifier)) inSection = true;
            continue;
        }

        // Another account section encountered — false start (still in summary) or real stop
        if (acctHeaderRe.test(line) || ALL_SC_CARDS.some(c => line.includes(c))) {
            if (transactions.length > 0) break;
            inSection = false;
            continue;
        }

        if (skipRe.test(line) || refNumRe.test(line)) continue;

        const m = line.match(dateRe);
        if (!m) continue;

        const [, dateStr, rest] = m;
        const amounts = [...rest.matchAll(/([\d,]+\.\d{2})/g)].map(a => parseFloat(a[0].replace(/,/g, '')));
        if (amounts.length < 2) continue; // need txn amount + balance at minimum

        const balance = amounts[amounts.length - 1];
        const txnAmount = amounts[0];
        if (txnAmount === 0) continue;

        // Positive if balance increased (deposit), negative if decreased (withdrawal)
        const isDeposit = prevBalance === null || balance >= prevBalance;
        prevBalance = balance;

        // Description is everything before the first amount
        const desc = rest.replace(/\s+[\d,]+\.\d{2}.*$/, '').trim();
        if (!desc) continue;

        // Date is DD Mon YYYY — split off year for formatDate(DD Mon, YYYY)
        const parts = dateStr.trim().split(/\s+/); // [DD, Mon, YYYY]
        transactions.push({
            date: formatDate(`${parts[0]} ${parts[1]}`, parts[2]),
            description: desc,
            amount: isDeposit ? txnAmount : -txnAmount
        });
    }

    console.log(`[SC ${accountIdentifier}] ${transactions.length} transactions parsed`);
    return transactions;
}
