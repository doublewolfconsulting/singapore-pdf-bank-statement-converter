// ============================================================
// PDF text extraction (client-side via PDF.js)
// ============================================================
// Two extraction modes — chosen per parser via coordinateExtraction flag:
//
// extractTextFromPDF (default): processes items in PDF content stream order.
//   Works well for single-column statements (Citi, UOB, AMEX, HSBC).
//
// extractTextFromPDFByCoordinates: groups items by Y coordinate (visual row),
//   sorts each row left-to-right by X. Correctly reconstructs multi-column
//   layouts where PDF.js emits columns separately (e.g. SC statements).
//   Set coordinateExtraction: true in a parser to use this method.
// ============================================================
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let lastY = null, currentLine = '';
        textContent.items.forEach((item, idx) => {
            const y = item.transform[5];
            if (lastY !== null && Math.abs(y - lastY) > 5) {
                fullText += currentLine.trim() + '\n';
                currentLine = '';
            }
            if (idx > 0) {
                const prevItem = textContent.items[idx - 1];
                const gap = item.transform[4] - (prevItem.transform[4] + prevItem.width);
                if (gap > 1) currentLine += ' ';
            }
            currentLine += item.str;
            lastY = y;
        });
        if (currentLine) fullText += currentLine.trim() + '\n';
    }
    // Log in chunks to avoid console truncation
    const chunkSize = 3000;
    for (let i = 0; i < fullText.length; i += chunkSize) {
        console.log(`=== RAW TEXT [${i}–${Math.min(i + chunkSize, fullText.length)}] ===\n` + fullText.slice(i, i + chunkSize));
    }
    return fullText;
}

async function extractTextFromPDFByCoordinates(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const Y_TOLERANCE = 3; // points — items within this Y range are the same row

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const rows = []; // [{y, items: [{x, text, width}]}]
        for (const item of textContent.items) {
            if (!item.str.trim()) continue;
            const x = item.transform[4];
            const y = item.transform[5];
            const row = rows.find(r => Math.abs(r.y - y) <= Y_TOLERANCE);
            if (row) {
                row.items.push({ x, text: item.str, width: item.width || 0 });
            } else {
                rows.push({ y, items: [{ x, text: item.str, width: item.width || 0 }] });
            }
        }

        // Sort rows top-to-bottom (PDF Y axis is bottom-up)
        rows.sort((a, b) => b.y - a.y);

        for (const row of rows) {
            row.items.sort((a, b) => a.x - b.x);
            let line = '';
            for (let j = 0; j < row.items.length; j++) {
                if (j === 0) {
                    line += row.items[j].text;
                } else {
                    const prev = row.items[j - 1];
                    const gap = row.items[j].x - (prev.x + prev.width);
                    if (gap > 1) line += ' ';
                    line += row.items[j].text;
                }
            }
            if (line.trim()) fullText += line.trim() + '\n';
        }
    }

    // Log in chunks to avoid console truncation
    const chunkSize = 3000;
    for (let i = 0; i < fullText.length; i += chunkSize) {
        console.log(`=== RAW TEXT [${i}–${Math.min(i + chunkSize, fullText.length)}] ===\n` + fullText.slice(i, i + chunkSize));
    }
    return fullText;
}
