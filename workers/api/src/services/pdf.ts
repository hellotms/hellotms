import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

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
  notes?: string;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const blue = rgb(0.118, 0.251, 0.686);   // #1e40af
  const dark = rgb(0.118, 0.161, 0.235);   // #1e293b
  const gray = rgb(0.282, 0.345, 0.408);   // #475569
  const lightGray = rgb(0.973, 0.984, 0.992); // #f8fafc
  const green = rgb(0.024, 0.584, 0.416);  // #059669
  const white = rgb(1, 1, 1);

  let y = height - margin;

  // ── Header band ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: blue });

  page.drawText('Marketing Solution', {
    x: margin, y: height - 45,
    size: 22, font: boldFont, color: white,
  });
  page.drawText('hellotms.com.bd', {
    x: margin, y: height - 65,
    size: 11, font: regularFont, color: rgb(0.749, 0.859, 1),
  });

  // Invoice label (top right)
  const label = data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
  page.drawText(label, {
    x: width - margin - boldFont.widthOfTextAtSize(label, 26),
    y: height - 50,
    size: 26, font: boldFont, color: white,
  });
  page.drawText(data.invoiceNumber, {
    x: width - margin - regularFont.widthOfTextAtSize(data.invoiceNumber, 11),
    y: height - 68,
    size: 11, font: regularFont, color: rgb(0.749, 0.859, 1),
  });

  y = height - 115;

  // ── Billing info ───────────────────────────────────────────────────────────
  page.drawText('BILLED TO', {
    x: margin, y,
    size: 9, font: boldFont, color: blue,
  });
  page.drawText('PROJECT', {
    x: width / 2, y,
    size: 9, font: boldFont, color: blue,
  });
  page.drawText('INVOICE DATE', {
    x: width - 200, y,
    size: 9, font: boldFont, color: blue,
  });

  y -= 18;
  page.drawText(data.company.name, {
    x: margin, y,
    size: 12, font: boldFont, color: dark,
  });
  page.drawText(data.project.title, {
    x: width / 2, y,
    size: 11, font: regularFont, color: dark,
  });
  page.drawText(data.invoiceDate, {
    x: width - 200, y,
    size: 11, font: regularFont, color: dark,
  });

  y -= 16;
  if (data.company.address) {
    page.drawText(data.company.address.slice(0, 40), {
      x: margin, y,
      size: 9, font: regularFont, color: gray,
    });
  }
  if (data.project.location) {
    page.drawText(data.project.location, {
      x: width / 2, y,
      size: 9, font: regularFont, color: gray,
    });
  }
  if (data.dueDate) {
    page.drawText(`DUE: ${data.dueDate}`, {
      x: width - 200, y,
      size: 9, font: boldFont, color: rgb(0.863, 0.149, 0.149),
    });
  }

  y -= 16;
  if (data.company.phone) {
    page.drawText(`📞 ${data.company.phone}`, {
      x: margin, y,
      size: 9, font: regularFont, color: gray,
    });
  }
  if (data.company.email) {
    page.drawText(`✉ ${data.company.email}`, {
      x: margin, y: y - 14,
      size: 9, font: regularFont, color: gray,
    });
  }

  y -= 50;

  // ── Table header ───────────────────────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 8, width: width - 2 * margin, height: 26, color: blue });
  const cols = { desc: margin + 8, qty: width - 220, unit: width - 150, amount: width - 75 };
  page.drawText('DESCRIPTION', { x: cols.desc, y: y + 4, size: 9, font: boldFont, color: white });
  page.drawText('QTY', { x: cols.qty, y: y + 4, size: 9, font: boldFont, color: white });
  page.drawText('UNIT PRICE', { x: cols.unit, y: y + 4, size: 9, font: boldFont, color: white });
  page.drawText('AMOUNT', { x: cols.amount - 10, y: y + 4, size: 9, font: boldFont, color: white });

  y -= 20;

  // ── Table rows ─────────────────────────────────────────────────────────────
  data.items.forEach((item, i) => {
    const rowBg = i % 2 === 0 ? lightGray : white;
    page.drawRectangle({ x: margin, y: y - 8, width: width - 2 * margin, height: 22, color: rowBg });

    const truncDesc = item.description.length > 55 ? item.description.slice(0, 52) + '...' : item.description;
    page.drawText(truncDesc, { x: cols.desc, y: y + 4, size: 9, font: regularFont, color: dark });
    page.drawText(String(item.quantity), { x: cols.qty, y: y + 4, size: 9, font: regularFont, color: dark });
    page.drawText(`৳ ${item.unitPrice.toLocaleString('en-IN')}`, { x: cols.unit, y: y + 4, size: 9, font: regularFont, color: dark });
    page.drawText(`৳ ${item.amount.toLocaleString('en-IN')}`, { x: cols.amount - 10, y: y + 4, size: 9, font: regularFont, color: dark });
    y -= 22;
  });

  y -= 12;

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalsX = width - 230;
  page.drawLine({ start: { x: totalsX, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;
  page.drawText('TOTAL AMOUNT', { x: totalsX, y, size: 10, font: boldFont, color: dark });
  page.drawText(`৳ ${data.totalAmount.toLocaleString('en-IN')}`, {
    x: width - margin - regularFont.widthOfTextAtSize(`৳ ${data.totalAmount.toLocaleString('en-IN')}`, 14),
    y, size: 14, font: boldFont, color: green,
  });

  y -= 18;
  page.drawLine({ start: { x: totalsX, y }, end: { x: width - margin, y }, thickness: 1, color: blue });

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    y -= 30;
    page.drawText('Notes:', { x: margin, y, size: 9, font: boldFont, color: dark });
    y -= 15;
    page.drawText(data.notes.slice(0, 120), { x: margin, y, size: 9, font: regularFont, color: gray });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: lightGray });
  page.drawText('Thank you for choosing Marketing Solution · hellotms.com.bd · hello@hellotms.com.bd', {
    x: margin, y: 15,
    size: 8, font: regularFont, color: gray,
  });

  const bytes = await doc.save();
  return bytes;
}
