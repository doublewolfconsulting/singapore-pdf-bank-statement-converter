// ============================================================
// Citi parser (SMRT Platinum Visa + Rewards World Mastercard)
//
// Citi statements are single-card PDFs with a simple single-line format:
//   DD MON  DESCRIPTION  AMOUNT
//
// Credits (refunds, payments) use parentheses: (AMOUNT)
// Debits are plain amounts.
//
// Year is read from "Statement Date" in the header. Both Citi card types
// share identical transaction formatting, so one parser covers both.
// ============================================================
function parseStandardCitiTransactions(text, year) {
    const transactions = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        const dateMatch = trimmed.match(/^(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))\s+(.+)$/i);
        if (!dateMatch) continue;
        const [, dateStr, rest] = dateMatch;
        if (rest.includes('DESCRIPTION') || rest.includes('AMOUNT') ||
            rest.toUpperCase().includes('BALANCE PREVIOUS') ||
            rest.toUpperCase().includes('TOTAL')) continue;

        const creditMatch = rest.match(/^(.+?)\s+\((\d+\.?\d*)\)\s*$/);
        if (creditMatch) {
            transactions.push({
                date: formatDate(dateStr, year),
                description: creditMatch[1].trim(),
                amount: parseFloat(creditMatch[2])
            });
            continue;
        }
        const debitMatch = rest.match(/^(.+?)\s+(\d+\.?\d*)\s*$/);
        if (debitMatch) {
            transactions.push({
                date: formatDate(dateStr, year),
                description: debitMatch[1].trim(),
                amount: -parseFloat(debitMatch[2])
            });
        }
    }
    return transactions;
}
