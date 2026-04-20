import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

export interface PaymentRecord {
  date: string;
  amount: number;
  method?: string;
  note?: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subject?: string;
  type: 'invoice' | 'estimate';
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  project: {
    title: string;
    eventStartDate: string;
    location?: string;
  };
  items: {
    description: string;
    quantity: number;
    dayMonth: number;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number;
  discountType?: 'flat' | 'percent';
  discountValue?: number;
  advanceReceived?: number;
  payments?: PaymentRecord[];
  notes?: string;
  /** Optional: URL of the invoice pad background image (from site_settings) */
  padImageUrl?: string;
  /** Top content margin in points when padImageUrl is set (default: 150) */
  padMarginTop?: number;
  /** Bottom content margin in points when padImageUrl is set (default: 100) */
  padMarginBottom?: number;
  /** Optional header for the multiplier column (e.g. "Day", "Month") */
  multiplierLabel?: string;
  /** Branding fields */
  ownerName?: string;
  ownerUrl?: string;
}

function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Allow spaces, common punctuation, and newlines \n
  return str.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ');
}

/** 
 * Splits text into multiple lines based on maximum width 
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const p of paragraphs) {
    const words = p.split(/\s+/);
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      
      if (width < maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine || lines.length === 0) lines.push(currentLine);
  }
  return lines;
}

function fmtBDT(n: number): string {
  return `BDT ${Math.round(n || 0).toLocaleString('en-IN')}`;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const conv = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + conv(n % 100) : '');
    return '';
  };
  const proc = (n: number): string => {
    if (n < 1000) return conv(n);
    if (n < 100000) return conv(Math.floor(n / 1000)) + ' Thousand ' + conv(n % 1000);
    if (n < 10000000) return conv(Math.floor(n / 100000)) + ' Lakh ' + proc(n % 100000);
    return conv(Math.floor(n / 10000000)) + ' Crore ' + proc(n % 10000000);
  };
  return proc(Math.floor(num)).trim();
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const itFont = await doc.embedFont(StandardFonts.HelveticaOblique);

  const margin = 50;
  const blue = rgb(0.118, 0.251, 0.686);
  const dark = rgb(0.118, 0.161, 0.235);
  const gray = rgb(0.282, 0.345, 0.408);
  const lightGray = rgb(0.973, 0.984, 0.992);
  const white = rgb(1, 1, 1);
  const red = rgb(0.863, 0.149, 0.149);
  const green = rgb(0.024, 0.584, 0.416);
  const darkGray = rgb(0.286, 0.286, 0.286); // #494949

  const pageHeight = PageSizes.A4[1];
  const scaleFactor = pageHeight / 3508;

  const padTop = (data.padMarginTop ?? 150) * scaleFactor;
  const padBottom = (data.padMarginBottom ?? 100) * scaleFactor;

  let embeddedPadImg: any = null;
  let usePad = false;
  if (data.padImageUrl) {
    try {
      const imgRes = await fetch(data.padImageUrl);
      if (imgRes.ok) {
        const imgBuf = await imgRes.arrayBuffer();
        const ct = imgRes.headers.get('content-type') ?? '';
        embeddedPadImg = ct.includes('png')
          ? await doc.embedPng(imgBuf)
          : await doc.embedJpg(imgBuf);
        usePad = true;
      }
    } catch { /* fallback */ }
  }

  function addPage() {
    const p = doc.addPage(PageSizes.A4);
    const { width: pw, height: ph } = p.getSize();
    if (usePad && embeddedPadImg) {
      p.drawImage(embeddedPadImg, { x: 0, y: 0, width: pw, height: ph });
    }
    return { page: p, width: pw, height: ph };
  }

  let { page, width, height } = addPage();

  const ownerName = data.ownerName || 'The Marketing Solution';
  const ownerUrl = data.ownerUrl ? new URL(data.ownerUrl).hostname : 'themarketingsolution.com.bd';

  if (!usePad) {
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: blue });
    page.drawText(ownerName, { x: margin, y: height - 45, size: 22, font: boldFont, color: white });
    page.drawText(ownerUrl, { x: margin, y: height - 65, size: 11, font: regularFont, color: rgb(0.749, 0.859, 1) });
    const label = data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
    page.drawText(label, {
      x: width - margin - boldFont.widthOfTextAtSize(label, 20),
      y: height - 50, size: 20, font: boldFont, color: white,
    });
    page.drawText(cleanText(data.invoiceNumber), {
      x: width - margin - regularFont.widthOfTextAtSize(cleanText(data.invoiceNumber), 11),
      y: height - 68, size: 11, font: regularFont, color: rgb(0.749, 0.859, 1),
    });
  }

  let y = usePad ? height - padTop : height - 110;

  const cols = { sl: margin + 6, desc: margin + 30, qty: width - 260, days: width - 210, unit: width - 170, total: width - 100 };
  const mLabel = (data.multiplierLabel || 'Days').toUpperCase();

  function drawTableHeader() {
    page.drawRectangle({ x: margin, y: y - 8, width: width - 2 * margin, height: 26, color: darkGray });
    page.drawText('SL', { x: cols.sl, y: y + 4, size: 8, font: boldFont, color: white });
    page.drawText('DESCRIPTION', { x: cols.desc, y: y + 4, size: 8, font: boldFont, color: white });
    page.drawText('QTY', { x: cols.qty, y: y + 4, size: 8, font: boldFont, color: white });
    page.drawText(mLabel, { x: cols.days, y: y + 4, size: 8, font: boldFont, color: white });
    page.drawText('UNIT PRICE', { x: cols.unit, y: y + 4, size: 8, font: boldFont, color: white });
    page.drawText('TOTAL', { x: cols.total - 4, y: y + 4, size: 8, font: boldFont, color: white });
    y -= 22;
  }

  function ensureSpace(needed: number, isItemRow = false) {
    const minY = usePad ? padBottom : 50;
    if (y - needed < minY) {
      const next = addPage();
      page = next.page;
      width = next.width;
      height = next.height;
      y = usePad ? height - (padTop * 1.15) : height - 50;
      if (isItemRow) {
        drawTableHeader();
      }
    }
  }

  const billX = margin;
  const rightEdge = width - margin;
  const headerTopY = y;

  const billToLabel = data.type === 'estimate' ? 'ESTIMATE TO' : 'INVOICE TO';
  page.drawText(billToLabel, { x: billX, y, size: 11, font: boldFont, color: gray });
  y -= 16;

  page.drawText(cleanText(data.company.name), { x: billX, y, size: 13, font: boldFont, color: dark });
  y -= 14;

  if (data.company.address) {
    const addrLines = wrapText(cleanText(data.company.address), 250, regularFont, 9);
    addrLines.forEach(l => {
      page.drawText(l, { x: billX, y, size: 9, font: regularFont, color: gray });
      y -= 11;
    });
  }

  y -= 10;
  const subjectText = data.subject || `${data.type === 'invoice' ? 'Invoice' : 'Estimate'} for ${data.project.title}`;
  const subjectLines = wrapText(`Sub: ${cleanText(subjectText)}`, 300, regularFont, 8.5);
  subjectLines.forEach((l, i) => {
    const isFirst = i === 0;
    if (isFirst) {
      page.drawText('Sub: ', { x: billX, y, size: 8.5, font: boldFont, color: dark });
      page.drawText(l.replace('Sub: ', ''), { x: billX + 26, y, size: 8.5, font: regularFont, color: dark });
    } else {
      page.drawText(l, { x: billX + 26, y, size: 8.5, font: regularFont, color: dark });
    }
    y -= 11;
  });

  const invoiceLabel = data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
  page.drawText(invoiceLabel, {
    x: rightEdge - boldFont.widthOfTextAtSize(invoiceLabel, 16),
    y: headerTopY, size: 16, font: boldFont, color: dark,
  });

  const dateRowY = headerTopY - 32;
  page.drawText('Date', { x: rightEdge - 130, y: dateRowY, size: 9, font: boldFont, color: gray });
  page.drawText(cleanText(data.invoiceDate), {
    x: rightEdge - regularFont.widthOfTextAtSize(cleanText(data.invoiceDate), 9),
    y: dateRowY, size: 9, font: regularFont, color: dark,
  });

  const invRowY = headerTopY - 48;
  const invNoLabel = data.type === 'estimate' ? 'EST NO#' : 'INV NO#';
  page.drawText(invNoLabel, { x: rightEdge - 130, y: invRowY, size: 9, font: boldFont, color: gray });
  page.drawText(cleanText(data.invoiceNumber), {
    x: rightEdge - boldFont.widthOfTextAtSize(cleanText(data.invoiceNumber), 9),
    y: invRowY, size: 9, font: boldFont, color: blue,
  });
  y = Math.min(y, invRowY) - 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 10;

  drawTableHeader();

  data.items.forEach((item, i) => {
    const descLines = wrapText(cleanText(item.description), 180, regularFont, 8);
    const rowHeight = Math.max(22, (descLines.length * 11) + 10);
    ensureSpace(rowHeight, true);

    const rowBg = i % 2 === 0 ? lightGray : white;
    page.drawRectangle({ x: margin, y: y - rowHeight + 14, width: width - 2 * margin, height: rowHeight, color: rowBg });

    page.drawText(String(i + 1), { x: cols.sl, y: y + 4, size: 8, font: regularFont, color: dark });
    descLines.forEach((dl, di) => {
      page.drawText(dl, { x: cols.desc, y: y + 4 - (di * 11), size: 8, font: regularFont, color: dark });
    });
    
    page.drawText(String(item.quantity ?? 0), { x: cols.qty, y: y + 4, size: 8, font: regularFont, color: dark });
    page.drawText(String(item.dayMonth ?? 1), { x: cols.days, y: y + 4, size: 8, font: regularFont, color: dark });
    page.drawText(fmtBDT(item.unitPrice ?? 0), { x: cols.unit, y: y + 4, size: 8, font: regularFont, color: dark });
    page.drawText(fmtBDT(item.amount ?? 0), { x: cols.total - 4, y: y + 4, size: 8, font: regularFont, color: dark });
    
    y -= rowHeight;
  });

  const subtotal = data.totalAmount ?? 0;
  const discountAmt = data.discountType === 'percent' ? subtotal * ((data.discountValue ?? 0) / 100) : (data.discountValue ?? 0);
  const totalPayable = Math.max(0, subtotal - discountAmt);
  const totalPaid = (data.payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0) + (data.advanceReceived ?? 0);
  const due = Math.max(0, totalPayable - totalPaid);

  ensureSpace(150);
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 18;

  const totalsX = width - 230;
  const commentsX = margin;
  let summaryY = y;

  // Totals Box (Right)
  let rightY = summaryY;
  const drawRow = (label: string, val: string, f: any, sz: number, col: any, isPaidRow = false) => {
    page.drawText(label, { x: totalsX, y: rightY, size: sz - 1, font: boldFont, color: col });
    page.drawText(val, { x: width - margin - f.widthOfTextAtSize(val, sz), y: rightY, size: sz, font: f, color: col });
    rightY -= (isPaidRow ? 14 : 18);
  };

  drawRow('Sub Total:', fmtBDT(subtotal), regularFont, 9, dark);
  if (discountAmt > 0) drawRow('Discount:', `- ${fmtBDT(discountAmt)}`, regularFont, 9, red);
  drawRow('Total Payable:', fmtBDT(totalPayable), boldFont, 12, blue);
  
  page.drawLine({ start: { x: totalsX, y: rightY + 5 }, end: { x: width - margin, y: rightY + 5 }, thickness: 1, color: blue });
  rightY -= 15;

  if (data.type === 'invoice' && (totalPaid > 0)) {
    page.drawText('PAYMENTS HISTORY', { x: totalsX, y: rightY, size: 9, font: boldFont, color: blue });
    rightY -= 14;
    if (data.advanceReceived) drawRow('Project Advance', `- ${fmtBDT(data.advanceReceived)}`, regularFont, 8, gray, true);
    data.payments?.forEach(p => drawRow(p.date, `- ${fmtBDT(p.amount)}`, regularFont, 8, gray, true));
    drawRow('Total Paid:', `- ${fmtBDT(totalPaid)}`, boldFont, 9, gray);
  }

  if (data.type === 'invoice') {
    rightY -= 10;
    const dueLabel = due > 0 ? `AMOUNT DUE: ${fmtBDT(due)}` : 'FULLY PAID';
    page.drawRectangle({ x: totalsX - 8, y: rightY - 10, width: width - margin - totalsX + 8, height: 28, color: due > 0 ? red : green });
    page.drawText(dueLabel, { x: totalsX, y: rightY - 3, size: 10, font: boldFont, color: white });
    rightY -= 32; // Standard box height (28) + small gap
  }

  // Comments Box (Left)
  let leftY = summaryY;
  page.drawText('Other Comments:', { x: commentsX, y: leftY, size: 8, font: boldFont, color: dark });
  leftY -= 13;
  const commonComments = [
    { text: '1. Make all payments in Cash / A/C Cheque / PO favoring of:\n', bold: '"THE MARKETING SOLUTION"' },
    { text: `2. All rates are Excluding VAT and other Taxes.`, bold: '' },
    { text: `3. Payment should be paid within ${data.type === 'estimate' ? '15 days after work order' : '15 days after delivery'}.`, bold: '' }
  ];

  commonComments.forEach(c => {
    const fullText = c.text + c.bold;
    const lines = wrapText(fullText, 280, regularFont, 7.5);
    lines.forEach(l => {
      // If this line contains any part of the bold text
      if (c.bold && (l.includes(c.bold) || c.bold.includes(l.trim()) || l.includes(c.bold.split(' ')[0]))) {
        // Find where the bold part starts in this line
        // A simpler way: if the line is part of the bold sequence, 
        // we can check if it's the exact bold string or a suffix/prefix of it.
        // But since we added \n, the bold part will likely be its own line.
        
        if (l.includes(c.bold)) {
          const parts = l.split(c.bold);
          page.drawText(parts[0], { x: commentsX + 4, y: leftY, size: 7.5, font: regularFont, color: gray });
          const w = regularFont.widthOfTextAtSize(parts[0], 7.5);
          page.drawText(c.bold, { x: commentsX + 4 + w, y: leftY, size: 7.5, font: boldFont, color: dark });
        } else if (c.bold.includes(l.trim())) {
          // The whole line is bold
          page.drawText(l, { x: commentsX + 4, y: leftY, size: 7.5, font: boldFont, color: dark });
        } else {
          page.drawText(l, { x: commentsX + 4, y: leftY, size: 7.5, font: regularFont, color: gray });
        }
      } else {
        page.drawText(l, { x: commentsX + 4, y: leftY, size: 7.5, font: regularFont, color: gray });
      }
      leftY -= 10;
    });
  });

  y = Math.min(leftY, rightY) - 20;
  ensureSpace(40);
  page.drawRectangle({ x: margin, y: y, width: width - 2 * margin, height: 22, color: rgb(0.96, 0.96, 0.96) });
  const wordVal = `Taka ${numberToWords(due > 0 ? due : totalPayable)} Only`;
  page.drawText('Amount in Words: ', { x: margin + 8, y: y + 7, size: 8, font: boldFont, color: dark });
  page.drawText(wordVal, { x: margin + 8 + boldFont.widthOfTextAtSize('Amount in Words: ', 8), y: y + 7, size: 8, font: regularFont, color: dark });

  y -= 25;
  const disclaimer = `* This is a computer generated ${data.type}, no signature is required.`;
  page.drawText(disclaimer, { x: width - margin - itFont.widthOfTextAtSize(disclaimer, 7.5), y, size: 7.5, font: itFont, color: gray });

  if (data.notes) {
    y -= 25;
    ensureSpace(60);
    page.drawText('Notes:', { x: margin, y, size: 9, font: boldFont, color: dark });
    y -= 14;
    wrapText(cleanText(data.notes), 500, regularFont, 9).forEach(ln => {
      ensureSpace(12);
      page.drawText(ln, { x: margin + 8, y, size: 9, font: regularFont, color: gray });
      y -= 12;
    });
  }

  return doc.save();
}
