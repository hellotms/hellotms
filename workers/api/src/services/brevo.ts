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
  projectTitle: string;
  totalAmount: string;
  dueDate: string;
  downloadUrl: string;
  companyName?: string;
  companyUrl?: string;
  companyEmail?: string;
}): string {
  const companyName = params.companyName || 'The Marketing Solution';
  const companyUrl = params.companyUrl || 'hellotms.com.bd';
  const companyEmail = params.companyEmail || `hello@${companyUrl.replace(/^https?:\/\//, '').split('/')[0]}`;
  const hostname = companyUrl.replace(/^https?:\/\//, '').split('/')[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Invoice ${params.invoiceNumber}</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:#1e40af;padding:30px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">${companyName}</h1>
      <p style="color:#bfdbfe;margin:8px 0 0">Invoice ${params.invoiceNumber}</p>
    </div>
    <div style="padding:30px">
      <p style="color:#475569;line-height:1.6">Dear <strong>${params.recipientName}</strong>,</p>
      <p style="color:#475569;line-height:1.6">
        Please find attached your invoice for the project <strong>${params.projectTitle}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:6px">
        <tr>
          <td style="padding:12px 16px;color:#64748b;font-size:14px">Invoice Number</td>
          <td style="padding:12px 16px;color:#1e293b;font-weight:bold;font-size:14px">${params.invoiceNumber}</td>
        </tr>
        <tr style="background:#f1f5f9">
          <td style="padding:12px 16px;color:#64748b;font-size:14px">Total Amount</td>
          <td style="padding:12px 16px;color:#059669;font-weight:bold;font-size:18px">${params.totalAmount}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#64748b;font-size:14px">Due Date</td>
          <td style="padding:12px 16px;color:#dc2626;font-weight:bold;font-size:14px">${params.dueDate}</td>
        </tr>
      </table>
      <div style="text-align:center;margin:32px 0">
        <a href="${params.downloadUrl}"
           style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
          Download Invoice PDF
        </a>
      </div>
      <p style="color:#64748b;font-size:13px">
        For any queries, please contact us at ${companyEmail} or call us at our office.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
      © ${new Date().getFullYear()} ${hostname} · All rights reserved
    </div>
  </div>
</body>
</html>`;
}
