// ============================================================
// QIF generation
// ============================================================
function generateQIF(transactions, startNum, type = 'CCard') {
    let qif = `!Option:MDY\n!Type:${type}\n`;
    let num = startNum;
    transactions.forEach(txn => {
        qif += `D${txn.date}\nU${txn.amount.toFixed(2)}\nT${txn.amount.toFixed(2)}\nCX\nN${num}\nP${txn.description}\n`;
        if (txn.memo !== undefined) qif += `M${txn.memo}\n`;
        const catTarget = txn.memo ? `${txn.description} ${txn.memo}` : txn.description;
        const category = categorizeTransaction(catTarget);
        if (category) qif += `L${category}\n`;
        qif += `^\n`;
        num++;
    });
    return qif;
}

// ============================================================
// CSV generation
// ============================================================
function generateCSV(transactions, startNum, type) {
    const escape = s => `"${String(s).replace(/"/g, '""')}"`;
    const header = 'N,Date,Description,Memo,Amount,Category,Type';
    const rows = transactions.map((txn, i) => {
        const catTarget = txn.memo ? `${txn.description} ${txn.memo}` : txn.description;
        const category = categorizeTransaction(catTarget) || '';
        return [
            startNum + i,
            txn.date,
            escape(txn.description),
            escape(txn.memo || ''),
            txn.amount.toFixed(2),
            escape(category),
            type
        ].join(',');
    });
    return [header, ...rows].join('\n');
}
