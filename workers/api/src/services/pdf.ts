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
}

function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Keep standard ASCII 32-126 and high-order WinAnsi for basic latin
  return str.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

function fmtBDT(n: number): string {
  return `BDT ${Math.round(n || 0).toLocaleString('en-IN')}`;
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

  // ── Header (only when no pad background) ──────────────────────────────────
  if (!usePad) {
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: blue });
    page.drawText('Marketing Solution', { x: margin, y: height - 45, size: 22, font: boldFont, color: white });
    page.drawText('hellotms.com.bd', { x: margin, y: height - 65, size: 11, font: regularFont, color: rgb(0.749, 0.859, 1) });
    const label = data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
    page.drawText(label, {
      x: width - margin - boldFont.widthOfTextAtSize(label, 26),
      y: height - 50, size: 26, font: boldFont, color: white,
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

  // ── Billing and Project info ──────────────────────────────────────────────
  const billX = margin;
  const infoX = width - 180; // Adjusted for better alignment

  const labelSize = 8;
  const subContentSize = 9;

  // 1. Labels
  page.drawText('BILLED TO', { x: billX, y, size: labelSize, font: boldFont, color: blue });
  page.drawText('INVOICE INFO', { x: infoX, y, size: labelSize, font: boldFont, color: blue });

  y -= 16;

  // 2. Company Name & Invoice Number
  const companyName = cleanText(data.company.name);
  const truncCompany = companyName.length > 50 ? companyName.slice(0, 47) + '...' : companyName;
  page.drawText(truncCompany, { x: billX, y, size: 12, font: boldFont, color: dark });
  page.drawText(`INV: ${cleanText(data.invoiceNumber)}`, { x: infoX, y, size: 10, font: regularFont, color: dark });

  y -= 16;

  // 3. Address & Date
  if (data.company.address) {
    const addr = cleanText(data.company.address);
    const addrLines = addr.match(new RegExp(`.{1,${60}}`, 'g')) ?? [addr];
    addrLines.slice(0, 1).forEach(line => {
      page.drawText(line, { x: billX, y, size: subContentSize, font: regularFont, color: gray });
    });
  }
  page.drawText(`DATE: ${cleanText(data.invoiceDate)}`, { x: infoX, y, size: 10, font: regularFont, color: dark });

  y -= 15;

  // 4. Project Info & Due Date
  const projectTitle = cleanText(data.project.title);
  const locationText = data.project.location ? ` at ${cleanText(data.project.location)}` : '';
  const projectLine = `${projectTitle}${locationText}`;
  const truncProj = projectLine.length > 65 ? projectLine.slice(0, 62) + '...' : projectLine;

  page.drawText('PROJECT:', { x: billX, y, size: 8, font: boldFont, color: blue });
  page.drawText(truncProj, { x: billX + 45, y, size: 9, font: regularFont, color: dark });

  if (data.dueDate) {
    page.drawText(`DUE: ${cleanText(data.dueDate)}`, { x: infoX, y, size: 10, font: boldFont, color: red });
  }

  y -= 15;

  // 5. Contact Info
  let contactLine = '';
  if (data.company.phone) contactLine += `Tel: ${cleanText(data.company.phone)}`;
  if (data.company.email) contactLine += `${contactLine ? ' | ' : ''}Email: ${cleanText(data.company.email)}`;

  if (contactLine) {
    const truncContact = contactLine.length > 70 ? contactLine.slice(0, 67) + '...' : contactLine;
    page.drawText(truncContact, { x: billX, y, size: 8, font: regularFont, color: gray });
  }

  y -= 24;

  // ── Divider ────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  // ── Items Table Header ─────────────────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 8, width: width - 2 * margin, height: 26, color: blue });
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

  // ── Totals Section ─────────────────────────────────────────────────────────
  const subtotal = data.totalAmount ?? 0;
  const discountAmt = data.discountType === 'percent'
    ? subtotal * ((data.discountValue ?? 0) / 100)
    : (data.discountValue ?? 0);
  const totalPayable = Math.max(0, subtotal - discountAmt);
  const totalPaid = (data.payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0) + (data.advanceReceived ?? 0);
  const due = Math.max(0, totalPayable - totalPaid);

  const totalsX = width - 270;

  ensureSpace(120);
  page.drawLine({ start: { x: totalsX, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 18;

  // Subtotal row
  page.drawText('Sub Total:', { x: totalsX, y, size: 9, font: boldFont, color: dark });
  const subtotalStr = fmtBDT(subtotal);
  page.drawText(subtotalStr, {
    x: width - margin - regularFont.widthOfTextAtSize(subtotalStr, 9),
    y, size: 9, font: regularFont, color: dark,
  });
  y -= 16;

  // Discount row
  if (discountAmt > 0) {
    const discLabel = data.discountType === 'percent'
      ? `Discount (${data.discountValue}%):`
      : 'Discount:';
    page.drawText(discLabel, { x: totalsX, y, size: 9, font: boldFont, color: red });
    const discStr = `- ${fmtBDT(discountAmt)}`;
    page.drawText(discStr, {
      x: width - margin - regularFont.widthOfTextAtSize(discStr, 9),
      y, size: 9, font: regularFont, color: red,
    });
    y -= 16;
  }

  // Total payable row
  page.drawText('Total Payable:', { x: totalsX, y, size: 10, font: boldFont, color: dark });
  const payableStr = fmtBDT(totalPayable);
  page.drawText(payableStr, {
    x: width - margin - boldFont.widthOfTextAtSize(payableStr, 12),
    y, size: 12, font: boldFont, color: blue,
  });
  y -= 20;

  page.drawLine({ start: { x: totalsX, y }, end: { x: width - margin, y }, thickness: 1, color: blue });
  y -= 15;

  // ── Payment History ────────────────────────────────────────────────────────
  const hasPayments = (data.payments ?? []).length > 0;
  const hasAdvance = (data.advanceReceived ?? 0) > 0;

  if (hasPayments || hasAdvance) {
    ensureSpace(30);
    page.drawText('PAYMENTS RECEIVED', { x: totalsX, y, size: 9, font: boldFont, color: blue });
    y -= 14;

    // Show Advance Payment first if it exists
    if ((data.advanceReceived ?? 0) > 0) {
      ensureSpace(18);
      page.drawText('Project Advance Payment', { x: totalsX, y, size: 8, font: regularFont, color: gray });
      const advStr = `- ${fmtBDT(data.advanceReceived!)}`;
      page.drawText(advStr, {
        x: width - margin - regularFont.widthOfTextAtSize(advStr, 8),
        y, size: 8, font: boldFont, color: gray,
      });
      y -= 16;
    }

    data.payments!.forEach(p => {
      ensureSpace(18);
      const methodStr = p.method ? ` (${cleanText(p.method)})` : '';
      const label = `${cleanText(p.date)}${methodStr}`;
      page.drawText(label, { x: totalsX, y, size: 8, font: regularFont, color: gray });
      const amtStr = `- ${fmtBDT(p.amount ?? 0)}`;
      page.drawText(amtStr, {
        x: width - margin - regularFont.widthOfTextAtSize(amtStr, 8),
        y, size: 8, font: boldFont, color: gray,
      });
      y -= 16;
    });

    ensureSpace(10);
    y -= 4;
  }

  // Total Paid summary line
  if (totalPaid > 0) {
    page.drawText('Total Paid:', { x: totalsX, y, size: 9, font: boldFont, color: dark });
    const paidStr = `- ${fmtBDT(totalPaid)}`;
    page.drawText(paidStr, {
      x: width - margin - regularFont.widthOfTextAtSize(paidStr, 9),
      y, size: 9, font: regularFont, color: gray,
    });
    y -= 14;
  }
  y -= 10;

  // ── DUE BOX ───────────────────────────────────────────────────────────────
  ensureSpace(45);
  const dueColor = due > 0 ? red : green;
  const dueLabel = due > 0 ? `AMOUNT DUE: ${fmtBDT(due)}` : 'FULLY PAID';
  page.drawRectangle({ x: totalsX - 8, y: y - 10, width: width - margin - totalsX + 8, height: 28, color: dueColor });
  const dueTxtW = boldFont.widthOfTextAtSize(dueLabel, 11);
  page.drawText(dueLabel, {
    x: totalsX + (width - margin - totalsX - dueTxtW) / 2,
    y: y + 5, size: 11, font: boldFont, color: white,
  });
  y -= 44;


  // ── Notes ────────────────────────────────────────────────────────────────
  if (data.notes) {
    const notes = cleanText(data.notes);
    ensureSpace(40);
    y -= 10;
    page.drawText('Notes:', { x: margin, y, size: 9, font: boldFont, color: dark });
    y -= 14;
    const noteLines = notes.match(/.{1,90}/g) ?? [notes];
    noteLines.slice(0, 3).forEach(line => {
      ensureSpace(14);
      page.drawText(line, { x: margin + 8, y, size: 9, font: regularFont, color: gray });
      y -= 13;
    });
  }

  // ── Thank You note ────────────────────────────────────────────────────────
  ensureSpace(60);
  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 18;
  const thankMsg = 'Thank you for choosing us! We look forward to serving you again.';
  const thankW = regularFont.widthOfTextAtSize(thankMsg, 9);
  page.drawText(thankMsg, { x: (width - thankW) / 2, y, size: 9, font: regularFont, color: blue });
  y -= 14;

  // ── Footer (only when no pad background) ─────────────────────────────────
  if (!usePad) {
    const pages = doc.getPages();
    pages.forEach(p => {
      const { width: pw } = p.getSize();
      p.drawRectangle({ x: 0, y: 0, width: pw, height: 38, color: lightGray });
      p.drawText('hellotms.com.bd · hello@hellotms.com.bd', {
        x: margin, y: 14, size: 8, font: regularFont, color: gray,
      });
    });
  }

  return doc.save();
}
