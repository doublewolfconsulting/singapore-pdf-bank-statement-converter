// ============================================================
// UOB parser (Absolute Cashback AMEX + PRVI Miles + Preferred Platinum)
//
// UOB statements are multi-card PDFs — all cards appear in one file.
// Each card's section is identified by a header line (e.g. "ABSOLUTE CASHBACK AMEX").
// The parser isolates the target card's section and stops at the next card header.
//
// Transaction format is two columns (Post Date + Trans Date) followed by description:
//   DD MON  DD MON  DESCRIPTION  [AMOUNT [CR]]
//
// Amount may appear on the same line or on the following line (multi-line layout).
// Credits use a "CR" suffix; debits are plain amounts.
//
// All three UOB card types share identical transaction formatting,
// so one parser covers all — cardIdentifier is passed to isolate the section.
// ============================================================
function extractUOBStatementInfo(text) {
    const match = text.match(/Statement Date\s+(\d+)\s+([A-Z]{3})\s+(\d{4})/i);
    if (!match) return { statementYear: fallbackYear(text), stmtMonthNum: 1 };

    const [, , monthStr, year] = match;
    const stmtMonthNum = MONTHS[monthStr.toUpperCase()] || 1;

    return { statementYear: year, stmtMonthNum };
}

function extractUOBYear(text) {
    const { statementYear, stmtMonthNum } = extractUOBStatementInfo(text);
    // If statement is Jan/Feb/Mar, some transactions may be from previous year
    if (stmtMonthNum <= 3) {
        return String(parseInt(statementYear) - 1);
    }
    return statementYear;
}

function parseUOBTransactions(text, year, cardIdentifier) {
    const transactions = [];
    const lines = text.split(/\r?\n/);
    let inCardSection = false;
    let currentTransaction = null;

    // Get statement info for cross-year detection
    const { statementYear, stmtMonthNum } = extractUOBStatementInfo(text);

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Card section entry
        if (!inCardSection && trimmed.includes(cardIdentifier) && !trimmed.includes('TOTAL BALANCE')) {
            inCardSection = true;
            continue;
        }

        // Card section exit
        if (inCardSection) {
            const otherCards = ['ABSOLUTE CASHBACK AMEX', 'PRVI MILES MASTERCARD', 'PREFERRED PLATINUM VISA'];
            for (const otherCard of otherCards) {
                if (otherCard !== cardIdentifier && trimmed.includes(otherCard)) {
                    inCardSection = false;
                    break;
                }
            }
            if (trimmed.includes('Total Amount Due') ||
                trimmed.includes('New Balance') ||
                (trimmed.includes('Page') && trimmed.match(/Page\s+\d+\s+of\s+\d+/))) {
                inCardSection = false;
            }
        }
        if (!inCardSection) continue;

        // Transaction line: POST_DATE  TRANS_DATE  DESCRIPTION [AMOUNT [CR]]
        const txMatch = trimmed.match(
            /^(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))\s+(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))\s+(.+)$/i
        );

        if (txMatch) {
            const [, postDate, transDate, description] = txMatch;
            if (description.toUpperCase().includes('DESCRIPTION') ||
                description.toUpperCase().includes('POST DATE') ||
                description.toUpperCase().includes('PREVIOUS BALANCE')) continue;

            // Determine correct year for this transaction
            const txMonthStr = transDate.trim().split(/\s+/)[1].toUpperCase();
            const txMonthNum = MONTHS[txMonthStr] || 1;
            let txYear = statementYear;

            // If transaction month is much later than statement month → previous year
            // e.g., Statement JAN (1), transaction DEC (12) → previous year
            if (txMonthNum > stmtMonthNum + 6) {
                txYear = String(parseInt(statementYear) - 1);
            }

            // Check if amount is on the same line
            const sameLine = description.match(/^(.+?)\s+(\d+[,\d]*\.?\d*)(\s+CR)?\s*$/i);
            if (sameLine) {
                const desc = sameLine[1].trim();
                const amount = parseFloat(sameLine[2].replace(/,/g, ''));
                const isCredit = sameLine[3] !== undefined;
                transactions.push({
                    date: formatDate(transDate, txYear),
                    description: desc,
                    amount: isCredit ? amount : -amount
                });
                currentTransaction = null;
            } else {
                // Multi-line: amount on next line(s)
                currentTransaction = { date: formatDate(transDate, txYear), description: description.trim() };
            }
        } else if (currentTransaction) {
            // Skip reference number lines
            if (trimmed.match(/^Ref No\./i)) continue;

            // Amount line: must have decimal point (e.g., "63.31" not "069")
            const amountMatch = trimmed.match(/^(\d+[,\d]*\.\d{2})(\s+CR)?\s*$/);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                const isCredit = amountMatch[2] !== undefined;
                transactions.push({
                    date: currentTransaction.date,
                    description: currentTransaction.description,
                    amount: isCredit ? amount : -amount
                });
                currentTransaction = null;
            }
        }
    }
    return transactions;
}
