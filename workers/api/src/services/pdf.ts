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
  /** Branding fields */
  ownerName?: string;
  ownerUrl?: string;
}

function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
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

  const margin = 50;
  const blue = rgb(0.118, 0.251, 0.686);
  const dark = rgb(0.118, 0.161, 0.235);
  const gray = rgb(0.282, 0.345, 0.408);
  const lightGray = rgb(0.973, 0.984, 0.992);
  const green = rgb(0.024, 0.584, 0.416);
  const red = rgb(0.863, 0.149, 0.149);
  const white = rgb(1, 1, 1);
  const darkGray = rgb(0.286, 0.286, 0.286); // #494949

  const pageHeight = PageSizes.A4[1];
  const scaleFactor = pageHeight / 3508; // Scaling from UI's recommended 3508px height to PDF points

  const padTop = (data.padMarginTop ?? 150) * scaleFactor;
  const padBottom = (data.padMarginBottom ?? 100) * scaleFactor;

  // ── Embedded pad image (fetched once, reused across pages) ──────────────────
  let embeddedPadImg: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  let usePad = false;
  if (data.padImageUrl) {
    try {
      const imgRes = await fetch(data.padImageUrl);
      if (!imgRes.ok) throw new Error('Pad image fetch failed');
      const imgBuf = await imgRes.arrayBuffer();
      const ct = imgRes.headers.get('content-type') ?? '';
      embeddedPadImg = ct.includes('png')
        ? await doc.embedPng(imgBuf)
        : await doc.embedJpg(imgBuf);
      usePad = true;
    } catch { /* fallback to default header */ }
  }

  // ── Helper: add a new page with optional pad background ────────────────────
  function addPage() {
    const p = doc.addPage(PageSizes.A4);
    const { width, height } = p.getSize();
    if (usePad && embeddedPadImg) {
      p.drawImage(embeddedPadImg, { x: 0, y: 0, width, height });
    }
    return { page: p, width, height };
  }

  // ── Page 1 ─────────────────────────────────────────────────────────────────
  let { page, width, height } = addPage();

  const ownerName = data.ownerName || 'The Marketing Solution';
  const ownerUrl = data.ownerUrl ? new URL(data.ownerUrl).hostname : 'themarketingsolution.com.bd';

  // ── Header (only when no pad background) ──────────────────────────────────
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

  // ── Current y position ─────────────────────────────────────────────────────
  // If usePad is true, we respect the custom top margin. 
  // If false, we use a fixed offset for the default blue header.
  let y = usePad ? height - padTop : height - 110;

  // ── Helper: ensure enough space, add page if not ───────────────────────────
  function ensureSpace(needed: number) {
    const minY = usePad ? padBottom : 50;
    if (y - needed < minY) {
      const next = addPage();
      page = next.page;
      width = next.width;
      height = next.height;
      y = usePad ? height - padTop : height - 50;
    }
  }

  // ── Billing and Project info — matches the webview layout ─────────────────
  const billX = margin;
  const rightEdge = width - margin;

  // ── Record the top Y so right side can be drawn at same baseline ──────────
  const headerTopY = y;

  // LEFT SIDE: Label
  const billToLabel = data.type === 'estimate' ? 'ESTIMATE TO' : 'INVOICE TO';
  page.drawText(billToLabel, { x: billX, y, size: 11, font: boldFont, color: gray });
  y -= 16;

  // Company Name (bold, larger)
  const companyName = cleanText(data.company.name);
  const truncCompany = companyName.length > 50 ? companyName.slice(0, 47) + '...' : companyName;
  page.drawText(truncCompany, { x: billX, y, size: 13, font: boldFont, color: dark });
  y -= 14;

  // Address
  if (data.company.address) {
    const addr = cleanText(data.company.address);
    const truncAddr = addr.length > 70 ? addr.slice(0, 67) + '...' : addr;
    page.drawText(truncAddr, { x: billX, y, size: 9, font: regularFont, color: gray });
    y -= 13;
  }

  // Phone and Email removed per user request

  // Add extra space before Subject line as requested
  y -= 25;

  // Subject line
  const subjectText = data.subject
    ? cleanText(data.subject)
    : `Invoice for ${cleanText(data.project.title)}${data.project.location ? ` at ${cleanText(data.project.location)}` : ''}`;
  const truncSubject = subjectText.length > 70 ? subjectText.slice(0, 67) + '...' : subjectText;
  page.drawText('Sub: ', { x: billX, y, size: 8, font: boldFont, color: dark });
  page.drawText(truncSubject, { x: billX + 26, y, size: 8, font: regularFont, color: dark });

  // RIGHT SIDE: drawn relative to headerTopY (same top baseline as left)
  // Big "INVOICE" text, right-aligned
  const invoiceLabel = data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
  const invLabelSize = 16;
  page.drawText(invoiceLabel, {
    x: rightEdge - boldFont.widthOfTextAtSize(invoiceLabel, invLabelSize),
    y: headerTopY, size: invLabelSize, font: boldFont, color: dark,
  });

  // Date row
  const dateRowY = headerTopY - 32;
  page.drawText('Date', { x: rightEdge - 130, y: dateRowY, size: 9, font: boldFont, color: gray });
  const dateVal = cleanText(data.invoiceDate);
  page.drawText(dateVal, {
    x: rightEdge - regularFont.widthOfTextAtSize(dateVal, 9),
    y: dateRowY, size: 9, font: regularFont, color: dark,
  });

  // INV NO# row
  const invRowY = headerTopY - 48;
  page.drawText('INV NO#', { x: rightEdge - 130, y: invRowY, size: 9, font: boldFont, color: gray });
  const invVal = cleanText(data.invoiceNumber);
  page.drawText(invVal, {
    x: rightEdge - boldFont.widthOfTextAtSize(invVal, 9),
    y: invRowY, size: 9, font: boldFont, color: blue,
  });

  // PROJECT row removed per user request.

  // Push Y below both columns (left side subject is now the lowest point)
  y = Math.min(y, invRowY) - 16;

  // ── Divider ────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  // ── Items Table Header ─────────────────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 8, width: width - 2 * margin, height: 26, color: darkGray });
  // Adjusted column positions for more room on the right
  const cols = { sl: margin + 6, desc: margin + 30, qty: width - 250, unit: width - 180, total: width - 100 };
  page.drawText('SL', { x: cols.sl, y: y + 4, size: 8, font: boldFont, color: white });
  page.drawText('DESCRIPTION', { x: cols.desc, y: y + 4, size: 8, font: boldFont, color: white });
  page.drawText('QTY', { x: cols.qty, y: y + 4, size: 8, font: boldFont, color: white });
  page.drawText('UNIT PRICE', { x: cols.unit - 8, y: y + 4, size: 8, font: boldFont, color: white });
  page.drawText('TOTAL', { x: cols.total - 4, y: y + 4, size: 8, font: boldFont, color: white });
  y -= 22;

  // ── Items Rows ─────────────────────────────────────────────────────────────
  data.items.forEach((item, i) => {
    ensureSpace(24);
    const rowBg = i % 2 === 0 ? lightGray : white;
    page.drawRectangle({ x: margin, y: y - 8, width: width - 2 * margin, height: 22, color: rowBg });
    const desc = cleanText(item.description);
    const truncDesc = desc.length > 55 ? desc.slice(0, 52) + '...' : desc;
    page.drawText(String(i + 1), { x: cols.sl, y: y + 4, size: 8, font: regularFont, color: dark });
    page.drawText(truncDesc, { x: cols.desc, y: y + 4, size: 8, font: regularFont, color: dark });
    page.drawText(String(item.quantity ?? 0), { x: cols.qty, y: y + 4, size: 8, font: regularFont, color: dark });
    page.drawText(fmtBDT(item.unitPrice ?? 0), { x: cols.unit - 8, y: y + 4, size: 8, font: regularFont, color: dark });
    page.drawText(fmtBDT(item.amount ?? 0), { x: cols.total - 4, y: y + 4, size: 8, font: regularFont, color: dark });
    y -= 22;
  });

  y -= 10;

  // ── Totals Section & Other Comments (Side-by-Side) ────────────────────────
  const subtotal = data.totalAmount ?? 0;
  const discountAmt = data.discountType === 'percent'
    ? subtotal * ((data.discountValue ?? 0) / 100)
    : (data.discountValue ?? 0);
  const totalPayable = Math.max(0, subtotal - discountAmt);
  const totalPaid = (data.payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0) + (data.advanceReceived ?? 0);
  const due = Math.max(0, totalPayable - totalPaid);

  const totalsX = width - 270;
  const commentsX = margin;

  ensureSpace(120);
  // Divider above totals
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 18;

  // Save the Y position so we can draw the left column (Comments) after the right column (Totals)
  const columnsStartY = y;

  // ── RIGHT COLUMN: Totals Box ───────────────────────────────────────────────
  let rightY = columnsStartY;

  // Subtotal row
  page.drawText('Sub Total:', { x: totalsX, y: rightY, size: 9, font: boldFont, color: dark });
  const subtotalStr = fmtBDT(subtotal);
  page.drawText(subtotalStr, {
    x: width - margin - regularFont.widthOfTextAtSize(subtotalStr, 9),
    y: rightY, size: 9, font: regularFont, color: dark,
  });
  rightY -= 16;

  // Discount row
  if (discountAmt > 0) {
    const discLabel = data.discountType === 'percent'
      ? `Discount (${data.discountValue}%):`
      : 'Discount:';
    page.drawText(discLabel, { x: totalsX, y: rightY, size: 9, font: boldFont, color: red });
    const discStr = `- ${fmtBDT(discountAmt)}`;
    page.drawText(discStr, {
      x: width - margin - regularFont.widthOfTextAtSize(discStr, 9),
      y: rightY, size: 9, font: regularFont, color: red,
    });
    rightY -= 16;
  }

  // Total payable row
  page.drawText('Total Payable:', { x: totalsX, y: rightY, size: 10, font: boldFont, color: dark });
  const payableStr = fmtBDT(totalPayable);
  page.drawText(payableStr, {
    x: width - margin - boldFont.widthOfTextAtSize(payableStr, 12),
    y: rightY, size: 12, font: boldFont, color: blue,
  });
  rightY -= 20;

  page.drawLine({ start: { x: totalsX, y: rightY }, end: { x: width - margin, y: rightY }, thickness: 1, color: blue });
  rightY -= 15;

  // ── Payment History ────────────────────────────────────────────────────────
  const hasPayments = (data.payments ?? []).length > 0;
  const hasAdvance = (data.advanceReceived ?? 0) > 0;

  if (data.type === 'invoice' && (hasPayments || hasAdvance)) {
    page.drawText('PAYMENTS RECEIVED', { x: totalsX, y: rightY, size: 9, font: boldFont, color: blue });
    rightY -= 14;

    // Show Advance Payment first if it exists
    if ((data.advanceReceived ?? 0) > 0) {
      page.drawText('Project Advance Payment', { x: totalsX, y: rightY, size: 8, font: regularFont, color: gray });
      const advStr = `- ${fmtBDT(data.advanceReceived!)}`;
      page.drawText(advStr, {
        x: width - margin - regularFont.widthOfTextAtSize(advStr, 8),
        y: rightY, size: 8, font: boldFont, color: gray,
      });
      rightY -= 16;
    }

    data.payments!.forEach(p => {
      const methodStr = p.method ? ` (${cleanText(p.method)})` : '';
      const label = `${cleanText(p.date)}${methodStr}`;
      page.drawText(label, { x: totalsX, y: rightY, size: 8, font: regularFont, color: gray });
      const amtStr = `- ${fmtBDT(p.amount ?? 0)}`;
      page.drawText(amtStr, {
        x: width - margin - regularFont.widthOfTextAtSize(amtStr, 8),
        y: rightY, size: 8, font: boldFont, color: gray,
      });
      rightY -= 16;
    });

    rightY -= 4;
  }

  // Total Paid summary line
  if (data.type === 'invoice' && totalPaid > 0) {
    page.drawText('Total Paid:', { x: totalsX, y: rightY, size: 9, font: boldFont, color: dark });
    const paidStr = `- ${fmtBDT(totalPaid)}`;
    page.drawText(paidStr, {
      x: width - margin - regularFont.widthOfTextAtSize(paidStr, 9),
      y: rightY, size: 9, font: regularFont, color: gray,
    });
    rightY -= 14;
  }
  rightY -= 10;

  // ── DUE BOX ───────────────────────────────────────────────────────────────
  if (data.type === 'invoice') {
    const dueColor = due > 0 ? red : green;
    const dueLabel = due > 0 ? `AMOUNT DUE: ${fmtBDT(due)}` : 'FULLY PAID';
    page.drawRectangle({ x: totalsX - 8, y: rightY - 10, width: width - margin - totalsX + 8, height: 28, color: dueColor });
    const dueTxtW = boldFont.widthOfTextAtSize(dueLabel, 11);
    page.drawText(dueLabel, {
      x: totalsX + (width - margin - totalsX - dueTxtW) / 2,
      y: rightY - 3, size: 11, font: boldFont, color: white,
    });
  }

  // ── LEFT COLUMN: Other Comments + Amount in Words ──────────────────────────
  let leftY = columnsStartY;

  page.drawText('Other Comments:', { x: commentsX, y: leftY, size: 8, font: boldFont, color: dark });
  leftY -= 13;
  const comments = [
    '1. Make all payments in Cash / A/C Cheque / PO favoring of "THE MARKETING SOLUTION"',
    '2. All rates are Excluding VAT and other Taxes.',
    '3. Payment should be paid within 15 days after product delivery/submission of the bill.',
  ];

  const commentMaxWidth = totalsX - commentsX - 20;
  for (const line of comments) {
    const cleanLine = cleanText(line);
    const wrapped = cleanLine.match(new RegExp(`.{1,${Math.floor(commentMaxWidth / 4.5)}}(\\s|$)`, 'g')) ?? [cleanLine];
    for (const wl of wrapped.slice(0, 2)) {
      page.drawText(wl.trim(), { x: commentsX + 4, y: leftY, size: 7.5, font: regularFont, color: gray });
      leftY -= 11;
    }
  }

  // Sync main Y cursor to the lowest point of both columns, adding some padding before the next section
  y = Math.min(leftY, rightY) - 10;

  // ── FULL WIDTH BOTTOM BLOCK: Amount in Words ──────────────────────────────
  ensureSpace(40);
  const amtBlockHeight = 22;
  y -= amtBlockHeight; // Shift down for the rectangle's bottom-left corner

  // Light box background
  page.drawRectangle({
    x: margin,
    y: y,
    width: width - 2 * margin,
    height: amtBlockHeight,
    color: rgb(0.96, 0.96, 0.96),
  });

  const amtInWordsLabel = 'Amount in Words: ';
  const amtInWordsValue = `Taka ${numberToWords(due > 0 ? due : totalPayable)} Only`;
  const textY = y + 7;

  page.drawText(amtInWordsLabel, { x: margin + 8, y: textY, size: 8, font: boldFont, color: dark });
  const labelWidth = boldFont.widthOfTextAtSize(amtInWordsLabel, 8);
  page.drawText(cleanText(amtInWordsValue), { x: margin + 8 + labelWidth, y: textY, size: 8, font: regularFont, color: dark });

  y -= 22;
  // Computer generated note
  ensureSpace(20);
  const disclaimer = '* This is a computer generated invoice, no signature is required.';
  const discSize = 7;
  const itFont = await doc.embedFont(StandardFonts.HelveticaOblique);
  page.drawText(disclaimer, {
    x: width - margin - itFont.widthOfTextAtSize(disclaimer, discSize),
    y: y,
    size: discSize,
    font: itFont,
    color: gray,
  });
  y -= 15;

  // ── Notes ────────────────────────────────────────────────────────────────
  if (data.notes) {
    const notes = cleanText(data.notes);
    ensureSpace(40);
    y -= 6;
    page.drawText('Notes:', { x: margin, y, size: 9, font: boldFont, color: dark });
    y -= 14;
    const noteLines = notes.match(/.{1,90}/g) ?? [notes];
    noteLines.slice(0, 3).forEach(line => {
      ensureSpace(14);
      page.drawText(line, { x: margin + 8, y, size: 9, font: regularFont, color: gray });
      y -= 13;
    });
  }

  ensureSpace(60);
  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 18;
  const thankMsg = 'Thank you for being with us! We look forward to serving you again.';
  const thankW = regularFont.widthOfTextAtSize(thankMsg, 9);
  page.drawText(thankMsg, { x: (width - thankW) / 2, y, size: 9, font: regularFont, color: blue });
  y -= 14;

  // ── Footer (only when no pad background) ─────────────────────────────────
  if (!usePad) {
    const pages = doc.getPages();
    pages.forEach(p => {
      const { width: pw } = p.getSize();
      p.drawRectangle({ x: 0, y: 0, width: pw, height: 38, color: lightGray });
      p.drawText(`${ownerUrl} · support@${ownerUrl}`, {
        x: margin, y: 14, size: 8, font: regularFont, color: gray,
      });
    });
  }

  return doc.save();
}
