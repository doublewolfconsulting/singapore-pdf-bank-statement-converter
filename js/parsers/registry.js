// ============================================================
// Parser registry
// ============================================================
// Each entry maps a card/account key to its parser configuration.
// Keys match the <option value="..."> in index.html.
//
// Required fields:  name, extractYear, parseTransactions
// Optional fields:  cardIdentifier    — passed to parseTransactions for section isolation
//                   coordinateExtraction — use extractTextFromPDFByCoordinates instead of extractTextFromPDF
//                   qifType           — 'Bank' for bank accounts (default: 'CCard')
// ============================================================
const PARSERS = {
    'citi-smrt': {
        name: 'Citi SMRT Platinum Visa',
        extractYear: (text) => {
            const match = text.match(/Statement Date\s+\w+\s+\d+,?\s+(\d{4})/i);
            return match ? match[1] : fallbackYear(text);
        },
        parseTransactions: parseStandardCitiTransactions
    },
    'citi-rewards': {
        name: 'Citi Rewards World Mastercard',
        extractYear: (text) => {
            const stmtMatch = text.match(/Statement Date\s+\w+\s+\d+,?\s+(\d{4})/i);
            if (stmtMatch) return stmtMatch[1];
            const dueMatch = text.match(/Payment Due Date:\s+(\w+)\s+\d+,?\s+(\d{4})/i);
            if (dueMatch) {
                const [, month, year] = dueMatch;
                const earlyMonths = ['JANUARY', 'FEBRUARY', 'MARCH'];
                return earlyMonths.includes(month.toUpperCase()) ? String(parseInt(year) - 1) : year;
            }
            return fallbackYear(text);
        },
        parseTransactions: parseStandardCitiTransactions
    },
    'uob-absolute': {
        name: 'UOB Absolute Cashback',
        cardIdentifier: 'ABSOLUTE CASHBACK AMEX',
        extractYear: extractUOBYear,
        parseTransactions: parseUOBTransactions
    },
    'uob-privi': {
        name: 'UOB PRVI Miles',
        cardIdentifier: 'PRVI MILES MASTERCARD',
        extractYear: extractUOBYear,
        parseTransactions: parseUOBTransactions
    },
    'uob-preferred': {
        name: 'UOB Preferred Platinum',
        cardIdentifier: 'PREFERRED PLATINUM VISA',
        extractYear: extractUOBYear,
        parseTransactions: parseUOBTransactions
    },
    'amex-krisflyer': {
        name: 'AMEX KrisFlyer',
        extractYear: (text) => {
            // Year is embedded in DD.MM.YY dates — no extraction needed
            const m = text.match(/\d{2}\.\d{2}\.(\d{4})/);
            return m ? m[1] : fallbackYear(text);
        },
        parseTransactions: parseAMEXTransactions
    },
    'sc-simply-cash': {
        name: 'SC Simply Cash',
        cardIdentifier: 'SIMPLY CASH CREDIT CARD',
        coordinateExtraction: true,
        extractYear: scExtractYear,
        parseTransactions: parseSCTransactions
    },
    'sc-priority-banking': {
        name: 'SC Priority Banking Visa Infinite',
        cardIdentifier: 'PRIORITY BANKING VISA INFINITE',
        coordinateExtraction: true,
        extractYear: scExtractYear,
        parseTransactions: parseSCTransactions
    },
    'sc-securities-settlement': {
        name: 'SC Securities Settlement Account',
        cardIdentifier: 'SECURITIES SETTLEMENT ACCOUNT',
        coordinateExtraction: true,
        qifType: 'Bank',
        extractYear: scExtractYear,
        parseTransactions: parseSCBankTransactions
    },
    'sc-bonussaver': {
        name: 'SC Bonus$aver',
        cardIdentifier: 'Bonus$aver',
        coordinateExtraction: true,
        qifType: 'Bank',
        extractYear: scExtractYear,
        parseTransactions: parseSCBankTransactions
    },
    'sc-unlimitedsaver': {
        name: 'SC Unlimited$aver',
        cardIdentifier: 'UNLIMITED$AVER',
        coordinateExtraction: true,
        qifType: 'Bank',
        extractYear: scExtractYear,
        parseTransactions: parseSCBankTransactions
    },
    'hsbc-advance': {
        name: 'HSBC Advance',
        extractYear: hsbcExtractYear,
        parseTransactions: (text, year) => parseHSBCTransactions(text, year, 'Advance')
    },
    'hsbc-revolution': {
        name: 'HSBC Revolution',
        extractYear: hsbcExtractYear,
        parseTransactions: (text, year) => parseHSBCTransactions(text, year, 'Revolution')
    },
    'hsbc-premier': {
        name: 'HSBC Premier',
        coordinateExtraction: true,
        qifType: 'Bank',
        extractYear: hsbcBankExtractYear,
        parseTransactions: (text, year) => parseHSBCBankTransactions(text, year, 'PREMIER', ['EVERYDAY GLOBAL ACC', 'SECURITIES & UNIT TRUSTS'])
    },
    'hsbc-everyday-global': {
        name: 'HSBC Everyday Global',
        coordinateExtraction: true,
        qifType: 'Bank',
        extractYear: hsbcBankExtractYear,
        parseTransactions: (text, year) => parseHSBCBankTransactions(text, year, 'EVERYDAY GLOBAL ACC', ['SECURITIES & UNIT TRUSTS'])
    },
};
