// ============================================================
// Month helpers and shared utilities
// ============================================================
const MONTHS = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

// Last-resort year extraction — scans for any 20XX year in the document
function fallbackYear(text) {
    const m = text.match(/\b(20\d{2})\b/);
    if (m) return m[1];
    console.warn('Could not extract year from statement — check the PDF');
    return String(new Date().getFullYear());
}

function formatDate(dateStr, year) {
    const [day, monthStr] = dateStr.trim().split(/\s+/);
    const month = MONTHS[monthStr.toUpperCase()];
    const shortYear = year.slice(2);
    return `${month}/${day}/${shortYear}`;
}

// ============================================================
// Category matching
// ============================================================
function categorizeTransaction(description) {
    if (typeof CATEGORY_RULES === 'undefined') return null;
    const upper = description.toUpperCase();
    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        for (const keyword of keywords) {
            if (upper.includes(keyword.toUpperCase())) return category;
        }
    }
    return '';
}
