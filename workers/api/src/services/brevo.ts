export interface BrevoEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: { name: string; content: string; contentType?: string }[];
}

export async function sendEmail(
  apiKey: string,
  senderEmail: string,
  senderName: string,
  options: BrevoEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: options.to,
    subject: options.subject,
    htmlContent: options.htmlContent,
    textContent: options.textContent ?? options.subject,
    ...(options.attachments?.length ? { attachment: options.attachments } : {}),
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Brevo] Send failed:', errText);
    return { success: false, error: errText };
  }

  const data = await res.json() as { messageId?: string };
  return { success: true, messageId: data.messageId };
}

export function buildInviteEmailHtml(params: {
  recipientName: string;
  inviteUrl: string;
  role: string;
  senderName: string;
  tempPassword?: string;
  companyName?: string;
  companyUrl?: string;
}): string {
  const companyName = params.companyName || 'The Marketing Solution';
  const companyUrl = params.companyUrl || 'hellotms.com.bd';
  const hostname = companyUrl.replace(/^https?:\/\//, '').split('/')[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Staff Invitation</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:#1e40af;padding:30px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">${companyName}</h1>
      <p style="color:#bfdbfe;margin:8px 0 0">${hostname}</p>
    </div>
    <div style="padding:30px">
      <h2 style="color:#1e293b;margin:0 0 16px">You've been invited!</h2>
      <p style="color:#475569;line-height:1.6">
        Hi <strong>${params.recipientName}</strong>,<br><br>
        <strong>${params.senderName}</strong> has invited you to join the
        <strong>${companyName}</strong> admin panel as a <strong>${params.role}</strong>.
      </p>
      ${params.tempPassword ? `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
        <p style="color:#0369a1;margin:0 0 8px;font-size:13px;font-weight:bold">YOUR TEMPORARY PASSWORD</p>
        <p style="font-family:monospace;font-size:20px;font-weight:bold;color:#1e293b;letter-spacing:2px;margin:0">${params.tempPassword}</p>
        <p style="color:#64748b;font-size:12px;margin:8px 0 0">You will be asked to change this password on first login.</p>
      </div>` : ''}
      <div style="text-align:center;margin:24px 0">
        <a href="${params.inviteUrl}"
           style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
          Login to Admin Panel
        </a>
      </div>
      <p style="color:#64748b;font-size:13px">
        If you did not expect this email, please ignore it.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
      © ${new Date().getFullYear()} ${hostname} · All rights reserved
    </div>
  </div>
</body>
</html>`;
}

export function buildPasswordResetEmailHtml(params: {
  recipientName: string;
  loginUrl: string;
  tempPassword: string;
  companyName?: string;
  companyUrl?: string;
}): string {
  const companyName = params.companyName || 'The Marketing Solution';
  const companyUrl = params.companyUrl || 'hellotms.com.bd';
  const hostname = companyUrl.replace(/^https?:\/\//, '').split('/')[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Temporary Password Reset</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:#1e40af;padding:30px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">${companyName}</h1>
      <p style="color:#bfdbfe;margin:8px 0 0">${hostname}</p>
    </div>
    <div style="padding:30px">
      <h2 style="color:#1e293b;margin:0 0 16px">Your Password has been Reset</h2>
      <p style="color:#475569;line-height:1.6">
        Hi <strong>${params.recipientName}</strong>,<br><br>
        Your administrator has reset your password for the
        <strong>${companyName}</strong> admin panel.
      </p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
        <p style="color:#0369a1;margin:0 0 8px;font-size:13px;font-weight:bold">YOUR NEW TEMPORARY PASSWORD</p>
        <p style="font-family:monospace;font-size:20px;font-weight:bold;color:#1e293b;letter-spacing:2px;margin:0">${params.tempPassword}</p>
        <p style="color:#64748b;font-size:12px;margin:8px 0 0">You will be required to change this password on your next login.</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${params.loginUrl}"
           style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
          Login to Admin Panel
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
      © ${new Date().getFullYear()} ${hostname} · All rights reserved
    </div>
  </div>
</body>
</html>`;
}

export function buildInvoiceEmailHtml(params: {
  recipientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  subject: string;
  companyAddress: string;
  projectTitle: string;
  subtotal: string;
  discount: string;
  totalPayable: string;
  totalPaid: string;
  dueAmount: string;
  dueAmountNumber: number;
  items: { description: string; qty: number; unitPrice: string; total: string; isSl?: number }[];
  collections: { date: string; method: string; amount: string }[];
  downloadUrl: string;
  companyName?: string;
  companyUrl?: string;
  companyEmail?: string;
  type?: string;
}): string {
  const companyName = params.companyName || 'The Marketing Solution';
  const companyUrl = params.companyUrl || 'hellotms.com.bd';
  const companyEmail = params.companyEmail || `hello@${companyUrl.replace(/^https?:\/\//, '').split('/')[0]}`;
  const hostname = companyUrl.replace(/^https?:\/\//, '').split('/')[0];
  const dueColor = params.dueAmountNumber > 0 ? '#dc2626' : '#059669';
  const dueText = params.dueAmountNumber > 0 ? `AMOUNT DUE: ${params.dueAmount}` : 'FULLY PAID';
  const labelPrefix = params.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';

  const itemsHtml = params.items.map((item, i) => `
    <tr style="border-bottom:1px solid #e2e8f0;background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'}">
      <td style="padding:10px;color:#475569;font-size:13px">${i + 1}</td>
      <td style="padding:10px;color:#1e293b;font-size:13px">${item.description}</td>
      <td style="padding:10px;color:#1e293b;font-size:13px;text-align:center">${item.qty}</td>
      <td style="padding:10px;color:#1e293b;font-size:13px;text-align:right">${item.unitPrice}</td>
      <td style="padding:10px;color:#1e293b;font-size:13px;font-weight:bold;text-align:right">${item.total}</td>
    </tr>
  `).join('');

  const collectionsHtml = params.collections.length > 0 ? `
    <div style="margin-top:20px">
      <h3 style="color:#1e40af;font-size:14px;margin-bottom:8px">Payments Received</h3>
      <table style="width:100%;font-size:12px;color:#475569;border-collapse:collapse">
        ${params.collections.map(c => `
          <tr>
            <td style="padding:4px 0">${c.date} ${c.method ? `(${c.method})` : ''}</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold">- ${c.amount}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${labelPrefix} ${params.invoiceNumber}</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    
    <!-- Header -->
    <div style="padding:40px;border-bottom:1px solid #e2e8f0">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <!-- Bill To -->
          <td style="vertical-align:top;width:60%">
            <p style="margin:0 0 4px;font-size:10px;color:#64748b;font-weight:bold;letter-spacing:1px">${labelPrefix} TO</p>
            <p style="margin:0;font-size:18px;font-weight:bold;color:#0f172a">${params.recipientName}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#475569">${params.companyAddress}</p>
            <div style="margin-top:20px;display:flex;align-items:flex-start;gap:8px">
              <span style="font-size:12px;font-weight:bold;color:#475569">Sub:</span>
              <span style="font-size:13px;color:#0f172a">${params.subject}</span>
            </div>
          </td>
          <!-- Details -->
          <td style="vertical-align:top;text-align:right">
            <h1 style="margin:0 0 16px;font-size:30px;font-weight:900;letter-spacing:2px;color:#0f172a">${labelPrefix}</h1>
            <table style="width:100%;border-collapse:collapse;margin-left:auto">
              <tr>
                <td style="padding:4px 8px;color:#64748b;font-size:12px;font-weight:bold;text-align:left">Date</td>
                <td style="padding:4px 8px;color:#0f172a;font-size:13px;text-align:right">${params.invoiceDate}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#64748b;font-size:12px;font-weight:bold;text-align:left">${labelPrefix} NO#</td>
                <td style="padding:4px 8px;color:#1e40af;font-size:13px;font-weight:bold;text-align:right">${params.invoiceNumber}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Items Table -->
    <div style="padding:0">
      <table style="width:100%;border-collapse:collapse">
        <thead style="background:#494949;border-bottom:1px solid #cbd5e1">
          <tr>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#ffffff;width:40px">SL</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#ffffff">Description</th>
            <th style="padding:12px 10px;text-align:center;font-size:11px;color:#ffffff;width:60px">Qty</th>
            <th style="padding:12px 10px;text-align:right;font-size:11px;color:#ffffff;width:100px">Unit Price</th>
            <th style="padding:12px 10px;text-align:right;font-size:11px;color:#ffffff;width:120px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Summary & Comments -->
    <div style="padding:30px 40px;border-top:1px solid #e2e8f0;background:#fafafa">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <!-- Left: Comments -->
          <td style="vertical-align:top;width:60%;padding-right:30px">
            <h3 style="margin:0 0 12px;font-size:12px;color:#0f172a;text-transform:uppercase">Other Comments</h3>
            <ol style="margin:0;padding-left:16px;color:#475569;font-size:11px;line-height:1.6">
              <li>Make all payments in Cash / A/C Cheque / PO favoring of <strong>"THE MARKETING SOLUTION"</strong></li>
              <li>All rates are Excluding VAT and other Taxes.</li>
              <li>Payment should be paid within 15 days after product delivery/submission of the bill.</li>
            </ol>
          </td>

          <!-- Right: Totals -->
          <td style="vertical-align:top">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr>
                <td style="padding:4px 0;color:#64748b;font-weight:bold">Sub Total:</td>
                <td style="padding:4px 0;text-align:right;color:#0f172a">${params.subtotal}</td>
              </tr>
              ${params.discount && params.discount !== '৳ 0' ? `
              <tr>
                <td style="padding:4px 0;color:#dc2626;font-weight:bold">Discount:</td>
                <td style="padding:4px 0;text-align:right;color:#dc2626">- ${params.discount}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 0 4px;color:#0f172a;font-weight:bold;font-size:14px">Total Payable:</td>
                <td style="padding:8px 0 4px;text-align:right;color:#1e40af;font-weight:bold;font-size:14px;border-bottom:2px solid #1e40af">${params.totalPayable}</td>
              </tr>
            </table>

            ${collectionsHtml}

            ${params.totalPaid !== '৳ 0' ? `
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
              <tr>
                <td style="padding:4px 0;color:#0f172a;font-weight:bold">Total Paid:</td>
                <td style="padding:4px 0;text-align:right;color:#475569">- ${params.totalPaid}</td>
              </tr>
            </table>` : ''}

            <div style="margin-top:20px;background:${dueColor};color:#fff;text-align:center;padding:8px;border-radius:4px;font-weight:bold;font-size:14px">
              ${dueText}
            </div>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:10px;color:#94a3b8;font-style:italic;text-align:right">
        * This is a computer generated invoice, no signature is required.
      </p>
    </div>

    <!-- Download Action -->
    <div style="background:#fff;padding:30px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0 0 20px;color:#475569;font-size:14px">Please find attached the official PDF copy of your ${labelPrefix.toLowerCase()}.</p>
      <a href="${params.downloadUrl}" target="_blank"
         style="background:#1e40af;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">
        Download Original PDF
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
      <p style="margin:0 0 8px">For any queries, please contact us at <strong>${companyEmail}</strong></p>
      <p style="margin:0">&copy; ${new Date().getFullYear()} ${companyName} · ${hostname}</p>
    </div>
  </div>
</body>
</html>`;
}
