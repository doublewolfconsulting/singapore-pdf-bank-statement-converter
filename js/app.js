// ============================================================
// Application bootstrap
// ============================================================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.js';

let selectedFiles = [];

// Custom card type dropdown
(function () {
    const wrapper = document.getElementById('cardTypeSelect');
    const trigger = document.getElementById('cardTypeTrigger');
    const items   = document.querySelectorAll('#cardTypeOptions li');
    const hidden  = document.getElementById('cardType');

    trigger.addEventListener('click', () => wrapper.classList.toggle('open'));

    items.forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('group-header')) return;
            hidden.value = item.dataset.value;
            trigger.textContent = item.textContent;
            items.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            wrapper.classList.remove('open');
            updateFilename();
        });
    });

    document.addEventListener('click', e => {
        if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
    });
})();

// Custom output format dropdown
(function () {
    const wrapper = document.getElementById('outputFormatSelect');
    const trigger = document.getElementById('outputFormatTrigger');
    const items   = document.querySelectorAll('#outputFormatOptions li');
    const hidden  = document.getElementById('outputFormat');

    trigger.addEventListener('click', () => wrapper.classList.toggle('open'));

    items.forEach(item => {
        item.addEventListener('click', () => {
            hidden.value = item.dataset.value;
            trigger.textContent = item.textContent;
            items.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            wrapper.classList.remove('open');
            const isCSV = hidden.value === 'csv';
            document.getElementById('convertBtn').textContent = isCSV ? 'Convert to CSV' : 'Convert to QIF';
            document.getElementById('outputFormatHint').textContent = isCSV
                ? '.csv extension will be added automatically'
                : '.qif extension will be added automatically';
        });
    });

    document.addEventListener('click', e => {
        if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
    });
})();

// ============================================================
// UI handlers
// ============================================================
function updateFilename() {
    const cardType = document.getElementById('cardType').value;
    const filenameMap = {
        'citi-smrt': 'Citi_SMRT',
        'citi-rewards': 'Citi_Rewards',
        'uob-absolute': 'UOB_Absolute_Cashback',
        'uob-privi': 'UOB_PRVI_Miles',
        'uob-preferred': 'UOB_Preferred_Platinum',
        'amex-krisflyer': 'AMEX_KrisFlyer',
        'sc-simply-cash': 'SC_Simply_Cash',
        'sc-priority-banking': 'SC_Priority_Banking',
        'sc-securities-settlement': 'SC_Securities_Settlement',
        'sc-bonussaver': 'SC_BonusSaver',
        'sc-unlimitedsaver': 'SC_UnlimitedSaver',
        'hsbc-advance': 'HSBC_Advance',
        'hsbc-revolution': 'HSBC_Revolution',
        'hsbc-premier': 'HSBC_Premier',
        'hsbc-everyday-global': 'HSBC_Everyday_Global',
    };
    document.getElementById('outputFilename').value = filenameMap[cardType] || 'statement';
}

function handleFiles(files) {
    selectedFiles = Array.from(files);
    const fileList = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBtn');
    if (selectedFiles.length > 0) {
        fileList.innerHTML = `<div class="file-list"><strong>Selected ${selectedFiles.length} file(s):</strong><br>${selectedFiles.map(f => f.name).join('<br>')}</div>`;
        convertBtn.disabled = false;
    } else {
        fileList.innerHTML = '';
        convertBtn.disabled = true;
    }
}

// ============================================================
// Statement parsing orchestrator
// ============================================================
async function parseBankStatement(file, cardType) {
    const parser = PARSERS[cardType];
    if (!parser) throw new Error('Unsupported card type: ' + cardType);
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const extractor = parser.coordinateExtraction ? extractTextFromPDFByCoordinates : extractTextFromPDF;
    const text = isPDF ? await extractor(file) : await file.text();
    const year = parser.extractYear(text);
    if (parser.cardIdentifier) return parser.parseTransactions(text, year, parser.cardIdentifier);
    return parser.parseTransactions(text, year);
}

async function convert() {
    const errorDiv = document.getElementById('errorDiv');
    const outputSection = document.getElementById('outputSection');
    const outputContent = document.getElementById('outputContent');
    const transactionCount = document.getElementById('transactionCount');
    const format = document.getElementById('outputFormat').value;
    const startingNumber = parseInt(document.getElementById('startingNumber').value) || 1;
    const cardType = document.getElementById('cardType').value;

    console.log('=== CONVERSION START ===');
    console.log('Card Type:', PARSERS[cardType].name);
    console.log('First Transaction ID:', startingNumber);
    console.log('Files to process:', selectedFiles.length);

    errorDiv.innerHTML = '';
    outputSection.style.display = 'none';

    try {
        let allTransactions = [];

        for (const file of selectedFiles) {
            console.log(`\n📄 Processing: ${file.name}`);
            const transactions = await parseBankStatement(file, cardType);
            console.log(`   ✓ Found ${transactions.length} transactions`);

            if (transactions.length > 0) {
                console.log(`   📅 Date range: ${transactions[0].date} to ${transactions[transactions.length-1].date}`);
            }

            allTransactions.push(...transactions);
        }

        console.log(`\n📊 TOTAL: ${allTransactions.length} transactions from ${selectedFiles.length} file(s)`);

        if (allTransactions.length === 0) {
            console.warn('⚠️ No transactions found');
            errorDiv.innerHTML = `<div class="error">No transactions found in uploaded statement(s).</div>`;
            return;
        }

        // Sort by date
        allTransactions.sort((a, b) => {
            const [m1, d1, y1] = a.date.split('/').map(Number);
            const [m2, d2, y2] = b.date.split('/').map(Number);
            return new Date(2000 + y1, m1 - 1, d1) - new Date(2000 + y2, m2 - 1, d2);
        });

        console.log(`📅 After sorting: ${allTransactions[0].date} to ${allTransactions[allTransactions.length-1].date}`);

        // Category breakdown
        const categoryStats = {};
        allTransactions.forEach(txn => {
            const catTarget = txn.memo ? `${txn.description} ${txn.memo}` : txn.description;
            const cat = categorizeTransaction(catTarget) || '[Uncategorized]';
            categoryStats[cat] = (categoryStats[cat] || 0) + 1;
        });

        console.log('\n📂 Category Breakdown:');
        Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} transactions`);
        });

        const qifType = PARSERS[cardType].qifType || 'CCard';
        const isCSV = format === 'csv';
        const output = isCSV
            ? generateCSV(allTransactions, startingNumber, qifType)
            : generateQIF(allTransactions, startingNumber, qifType);
        outputContent.value = output;
        document.getElementById('outputHeading').textContent = isCSV ? 'CSV Output' : 'QIF Output';
        document.getElementById('downloadBtn').textContent = isCSV ? 'Download CSV' : 'Download QIF';
        transactionCount.textContent = `Generated ${allTransactions.length} transactions`;
        outputSection.style.display = 'block';

        console.log('\n✅ CONVERSION COMPLETE');
        console.log(`N numbers: ${startingNumber} to ${startingNumber + allTransactions.length - 1}`);
        console.log('=== END ===\n');

    } catch (err) {
        console.error('❌ ERROR:', err);
        errorDiv.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
}

function downloadFile() {
    const content = document.getElementById('outputContent').value;
    const format = document.getElementById('outputFormat').value;
    const ext = format === 'csv' ? '.csv' : '.qif';
    let filename = document.getElementById('outputFilename').value.trim() || 'statement';
    filename = filename.replace(/\.(qif|csv)$/i, '') + ext;
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
