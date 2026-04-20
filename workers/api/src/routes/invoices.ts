import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { generateInvoicePdf } from '../services/pdf.js';
import { sendEmail, buildInvoiceEmailHtml } from '../services/brevo.js';
import type { Env, Variables } from '../types.js';
import type { InvoicePdfData } from '../services/pdf.js';

export const invoicesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

invoicesRoute.use('*', authMiddleware);

// ─── Shared helper: fetch invoice, generate PDF, store in /generated-invoices/<id>.pdf ──
async function buildPdfFromData(
  data: InvoicePdfData,
  env: Env
): Promise<{ pdfUrl: string; pdfBytes: Uint8Array; pdfBase64: string }> {
  const pdfBytes = await generateInvoicePdf(data);
  const toBase64 = (arr: Uint8Array) => {
    const CHUNK_SIZE = 0x8000;
    let idx = 0;
    let res = '';
    while (idx < arr.length) {
      const chunk = arr.subarray(idx, Math.min(idx + CHUNK_SIZE, arr.length));
      res += String.fromCharCode(...chunk);
      idx += CHUNK_SIZE;
    }
    return btoa(res);
  };
  const pdfBase64 = toBase64(pdfBytes);
  const shortId = Math.random().toString(36).slice(2, 10);
  const storagePath = `estimates/estimate_${data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '-')}_${shortId}.pdf`;
  await env.MEDIA_BUCKET.put(storagePath, pdfBytes, {
    httpMetadata: { contentType: 'application/pdf' },
  });
  const pdfUrl = `${env.R2_PUBLIC_URL}/${storagePath}`;
  return { pdfUrl, pdfBytes, pdfBase64 };
}

async function buildAndStorePdf(
  id: string,
  env: Env,
  force = false
): Promise<{ pdfUrl: string; pdfBytes?: Uint8Array; pdfBase64?: string; companyName?: string; companyUrl?: string; companyEmail?: string; type?: string; } | { error: string }> {
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from('invoices')
      .select('*, companies(*), projects(title, event_start_date, location, advance_received), invoice_items(*)')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) return { error: 'Invoice not found' };

    // ── Check if we can skip generation ─────────────────────────────────────
    if (!force && invoice.pdf_url) {
      try {
        const url = new URL(invoice.pdf_url);
        const path = url.pathname.slice(1); // remove leading slash
        const existing = await env.MEDIA_BUCKET.get(path);
        if (existing) {
          const pdfBytes = new Uint8Array(await existing.arrayBuffer());

          // Chunked base64 helper
          const toBase64 = (arr: Uint8Array) => {
            const CHUNK_SIZE = 0x8000;
            let idx = 0;
            let res = '';
            while (idx < arr.length) {
              const chunk = arr.subarray(idx, Math.min(idx + CHUNK_SIZE, arr.length));
              res += String.fromCharCode(...chunk);
              idx += CHUNK_SIZE;
            }
            return btoa(res);
          };

          return {
            pdfUrl: invoice.pdf_url,
            pdfBytes,
            pdfBase64: toBase64(pdfBytes)
          };
        }
      } catch (e) {
        console.warn('[invoices] Existing PDF in DB but failed to fetch from R2, regenerating...');
      }
    }

    // ── Generate New PDF ─────────────────────────────────────────────────────
    // Fetch branding and pad background from site_settings
    const { data: settings } = await (supabase as any)
      .from('site_settings')
      .select('invoice_pad_url, pad_margin_top, pad_margin_bottom, hero_title, public_site_url, contact_info')
      .eq('id', 1)
      .single();

    // Fetch payment history (collections) for this project
    const { data: collections } = await (supabase as any)
      .from('collections')
      .select('amount, payment_date, method, note')
      .eq('project_id', invoice.project_id)
      .order('payment_date', { ascending: true });

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      } catch { return '—'; }
    };

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoice_number,
      invoiceDate: formatDate(invoice.invoice_date ?? invoice.created_at),
      dueDate: invoice.due_date ? formatDate(invoice.due_date) : undefined,
      subject: invoice.subject ?? undefined,
      type: invoice.type as 'invoice' | 'estimate',
      company: {
        name: invoice.companies?.name ?? 'Client',
        address: invoice.companies?.address ?? undefined,
        phone: invoice.companies?.phone ?? undefined,
        email: invoice.companies?.email ?? undefined,
      },
      project: {
        title: invoice.projects?.title ?? 'Project',
        eventStartDate: invoice.projects?.event_start_date ?? '',
        location: invoice.projects?.location ?? undefined,
      },
      items: (invoice.invoice_items ?? []).map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        dayMonth: item.day_month ?? 1,
        unitPrice: item.unit_price,
        amount: item.amount,
      })),
      totalAmount: invoice.total_amount,
      multiplierLabel: invoice.multiplier_label ?? undefined,
      discountType: invoice.discount_type ?? 'flat',
      discountValue: invoice.discount_value ?? 0,
      advanceReceived: invoice.projects?.advance_received ?? 0,
      payments: (collections ?? []).map((c: any) => ({
        date: formatDate(c.payment_date),
        amount: c.amount,
        method: c.method,
        note: c.note,
      })),
      notes: invoice.notes ?? undefined,
      padImageUrl: settings?.invoice_pad_url ?? undefined,
      padMarginTop: settings?.pad_margin_top ?? 150,
      padMarginBottom: settings?.pad_margin_bottom ?? 80,
      ownerName: 'The Marketing Solution',
      ownerUrl: settings?.public_site_url ?? 'themarketingsolution.com.bd',
    };

    const pdfBytes = await generateInvoicePdf(pdfData);

    const toBase64 = (arr: Uint8Array) => {
      const CHUNK_SIZE = 0x8000;
      let idx = 0;
      let res = '';
      while (idx < arr.length) {
        const chunk = arr.subarray(idx, Math.min(idx + CHUNK_SIZE, arr.length));
        res += String.fromCharCode(...chunk);
        idx += CHUNK_SIZE;
      }
      return btoa(res);
    };
    const pdfBase64 = toBase64(pdfBytes);

    const versionHash = Math.random().toString(36).slice(2, 8);
    const typeLabel = (invoice.type === 'estimate') ? 'Estimate' : 'Invoice';
    const safeNumber = invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '-');
    const storagePath = `invoices/${typeLabel}_${safeNumber}_${versionHash}.pdf`;

    await env.MEDIA_BUCKET.put(storagePath, pdfBytes, {
      httpMetadata: { 
        contentType: 'application/pdf',
        contentDisposition: `inline; filename="${typeLabel}_${safeNumber}.pdf"`
      },
    });

    const pdfUrl = `${env.R2_PUBLIC_URL}/${storagePath}`;

    // Update DB
    const { error: updateError } = await (supabase as any)
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', id);

    if (updateError) {
      console.error('[invoices] DB update error for pdf_url:', updateError);
    }

    return { pdfUrl, pdfBytes, pdfBase64 };
  } catch (err: any) {
    console.error('[invoices] buildAndStorePdf error:', err);
    return { error: err.message || 'Internal error' };
  }
}

// ─── POST /estimate/send — stateless estimate generation and email ──
invoicesRoute.post('/estimate/send', requirePermission('manage_invoices'), async (c) => {
  try {
    const data = await c.req.json();
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    
    // Fetch branding from site_settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('invoice_pad_url, pad_margin_top, pad_margin_bottom, hero_title, public_site_url, contact_info')
      .eq('id', 1)
      .single();

    const pdfData: InvoicePdfData = {
      ...data,
      padImageUrl: settings?.invoice_pad_url ?? undefined,
      padMarginTop: settings?.pad_margin_top ?? 150,
      padMarginBottom: settings?.pad_margin_bottom ?? 80,
      ownerName: 'The Marketing Solution',
      ownerUrl: settings?.public_site_url ?? 'themarketingsolution.com.bd',
    };

    const { pdfUrl, pdfBase64 } = await buildPdfFromData(pdfData, c.env);

    // Build email HTML using the same branding
    const fmt = (num: number) => `৳ ${Number(num).toLocaleString('en-IN')}`;
    const cleanStr = (str: string | undefined | null) => str ? str.replace(/[^\x20-\x7E]/g, '') : '';
    
    const recipients = data.recipients || [{ email: data.company.email, name: data.company.name }];
    const multiplierLabel = data.multiplierLabel || data.multiplier_label;
    const emailResults = [];

    for (const rec of recipients) {
      const html = buildInvoiceEmailHtml({
        recipientName: rec.name || data.company.name || 'Client',
        clientName: data.company.name,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        subject: cleanStr(data.subject || `Estimate for ${data.project.title}`),
        companyAddress: cleanStr(data.company.address),
        projectTitle: data.project.title,
        subtotal: fmt(data.totalAmount),
        discount: data.discountValue > 0 ? fmt(data.discountValue) : '',
        totalPayable: fmt(data.totalAmount - (data.discountType === 'percent' ? (data.totalAmount * data.discountValue / 100) : data.discountValue)),
        totalPaid: '৳ 0',
        dueAmount: fmt(data.totalAmount),
        dueAmountNumber: data.totalAmount,
        items: data.items.map((i: any) => ({
          description: cleanStr(i.description),
          qty: i.quantity,
          dayMonth: i.day_month ?? 1,
          unitPrice: fmt(i.unitPrice),
          total: fmt(i.amount),
        })),
        collections: [],
        downloadUrl: pdfUrl,
        companyName: 'The Marketing Solution',
        companyUrl: settings?.public_site_url,
        companyEmail: (settings?.contact_info as any)?.email,
        type: 'estimate',
        multiplierLabel
      });

      const res = await sendEmail(
        c.env.BREVO_API_KEY,
        c.env.BREVO_SENDER_EMAIL,
        c.env.BREVO_SENDER_NAME,
        {
          to: [{ email: rec.email, name: rec.name }],
          subject: `Estimate ${data.invoiceNumber} from The Marketing Solution`,
          htmlContent: html,
          attachments: [{ name: `${data.invoiceNumber}.pdf`, content: pdfBase64, contentType: 'application/pdf' }],
        }
      );
      emailResults.push(res);
    }

    return c.json({
      success: true,
      message: 'Estimate sent successfully',
      pdfUrl,
      emailSent: emailResults.every(r => r.success),
    });
  } catch (err: any) {
    console.error('[invoices] POST estimate/send error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ─── GET /invoices/:id/pdf — generate PDF on demand ────────────
invoicesRoute.get('/:id/pdf', requirePermission('manage_invoices'), async (c) => {
  const { id } = c.req.param();
  const force = c.req.query('force') === 'true';
  try {
    const result = await buildAndStorePdf(id, c.env, force);

    if ('error' in result) {
      return c.json({ error: result.error }, result.error === 'Invoice not found' ? 404 : 500);
    }

    return c.json({ pdfUrl: result.pdfUrl, success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── POST /invoices/:id/send — generate PDF, store, email it ─────────────────
invoicesRoute.post('/:id/send', requirePermission('send_invoice'), async (c) => {
  const { id } = c.req.param();
  try {
    const payload = await c.req.json().catch(() => ({}));
    const { recipientEmail, recipientName, recipients: recipientsInput, force } = payload;

    // Handle both single recipient (legacy) and multiple recipients
    let recipients: { name: string; email: string }[] = [];
    if (recipientsInput && Array.isArray(recipientsInput)) {
      recipients = recipientsInput;
    } else if (recipientEmail) {
      recipients = [{ email: recipientEmail, name: recipientName || 'Client' }];
    }

    if (recipients.length === 0) return c.json({ error: 'At least one recipient is required' }, 400);

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    const pdfResult = await buildAndStorePdf(id, c.env, !!force);

    if ('error' in pdfResult) {
      return c.json({ error: pdfResult.error }, pdfResult.error === 'Invoice not found' ? 404 : 500);
    }

    // Fetch branding and invoice metadata for email
    const { data: settings } = await (supabase as any)
      .from('site_settings')
      .select('hero_title, public_site_url, contact_info')
      .eq('id', 1)
      .single();

    const { data: invoice } = await (supabase as any)
      .from('invoices')
      .select('invoice_number, invoice_date, subject, total_amount, due_date, discount_value, discount_type, type, multiplier_label, companies(name, address), projects(id, title, location, advance_received), invoice_items(description, quantity, day_month, unit_price, amount)')
      .eq('id', id)
      .single();

    if (!invoice) return c.json({ error: 'Invoice not found after PDF gen' }, 404);

    // Fetch collections separately (only for invoices with a real project)
    let collections: any[] = [];
    if (invoice.type === 'invoice' && invoice.projects?.id) {
      const { data: collectionsData } = await (supabase as any)
        .from('collections')
        .select('amount, payment_date, method')
        .eq('project_id', invoice.projects.id)
        .order('payment_date', { ascending: true });
      collections = collectionsData || [];
    }

    // Update sent_at and status
    await (supabase as any)
      .from('invoices')
      .update({ sent_at: new Date().toISOString(), status: 'sent' })
      .eq('id', id);

    // Prepare calculations for the new email template
    const rawSubtotal = invoice.total_amount || 0;
    const discountAmt = invoice.discount_type === 'percent'
      ? rawSubtotal * ((invoice.discount_value || 0) / 100)
      : (invoice.discount_value || 0);
    const totalPayable = Math.max(0, rawSubtotal - discountAmt);
    const totalPaid = (invoice.projects?.advance_received || 0) + collections.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const dueAmountNum = Math.max(0, totalPayable - totalPaid);

    const fmt = (num: number) => `৳ ${Number(num).toLocaleString('en-IN')}`;
    const cleanStr = (str: string | undefined | null) => str ? str.replace(/[^\x20-\x7E]/g, '') : '';
    const subjectPrefix = invoice.subject ? invoice.subject : `Invoice for ${invoice.projects?.title}${invoice.projects?.location ? ` at ${invoice.projects?.location}` : ''}`;

    // Build and send email with PDF attachment
    const html = buildInvoiceEmailHtml({
      recipientName: recipientName ?? (invoice.companies as any)?.name ?? 'Client',
      clientName: (invoice.companies as any)?.name ?? 'Client',
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date || new Date().toISOString().slice(0, 10),
      subject: cleanStr(subjectPrefix),
      companyAddress: cleanStr((invoice.companies as any)?.address),
      projectTitle: (invoice.projects as any)?.title ?? 'Project',
      subtotal: fmt(rawSubtotal),
      discount: discountAmt > 0 ? fmt(discountAmt) : '',
      totalPayable: fmt(totalPayable),
      totalPaid: fmt(totalPaid),
      dueAmount: fmt(dueAmountNum),
      dueAmountNumber: dueAmountNum,
      items: (invoice.invoice_items || []).map((i: any) => ({
        description: cleanStr(i.description),
        qty: i.quantity || 0,
        dayMonth: i.day_month || 1,
        unitPrice: fmt(i.unit_price || 0),
        total: fmt(i.amount || 0),
      })),
      collections: collections.map((c: any) => ({
        date: c.payment_date || '',
        method: cleanStr(c.method),
        amount: fmt(c.amount || 0),
      })),
      downloadUrl: pdfResult.pdfUrl,
      companyName: 'The Marketing Solution',
      companyUrl: settings?.public_site_url,
      companyEmail: (settings?.contact_info as any)?.email,
      type: invoice.type,
      multiplierLabel: invoice.multiplier_label
    });


    const emailResults = [];
    for (const rec of recipients) {
      const personalizedHtml = buildInvoiceEmailHtml({
        recipientName: rec.name || (invoice.companies as any)?.name || 'Client',
        clientName: (invoice.companies as any)?.name ?? 'Client',
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date || new Date().toISOString().slice(0, 10),
        subject: cleanStr(subjectPrefix),
        companyAddress: cleanStr((invoice.companies as any)?.address),
        projectTitle: (invoice.projects as any)?.title ?? 'Project',
        subtotal: fmt(rawSubtotal),
        discount: discountAmt > 0 ? fmt(discountAmt) : '',
        totalPayable: fmt(totalPayable),
        totalPaid: fmt(totalPaid),
        dueAmount: fmt(dueAmountNum),
        dueAmountNumber: dueAmountNum,
        items: (invoice.invoice_items || []).map((i: any) => ({
          description: cleanStr(i.description),
          qty: i.quantity || 0,
          dayMonth: i.day_month || 1,
          unitPrice: fmt(i.unit_price || 0),
          total: fmt(i.amount || 0),
        })),
        collections: collections.map((c: any) => ({
          date: c.payment_date || '',
          method: cleanStr(c.method),
          amount: fmt(c.amount || 0),
        })),
        downloadUrl: pdfResult.pdfUrl,
        companyName: 'The Marketing Solution',
        companyUrl: settings?.public_site_url,
        companyEmail: (settings?.contact_info as any)?.email,
        type: invoice.type,
        multiplierLabel: invoice.multiplier_label
      });

      const res = await sendEmail(
        c.env.BREVO_API_KEY,
        c.env.BREVO_SENDER_EMAIL,
        c.env.BREVO_SENDER_NAME,
        {
          to: [{ email: rec.email, name: rec.name }],
          subject: `${invoice.type === 'estimate' ? 'Estimate' : 'Invoice'} ${invoice.invoice_number} from The Marketing Solution`,
          htmlContent: personalizedHtml,
          attachments: [{ name: `${invoice.invoice_number}.pdf`, content: pdfResult.pdfBase64 || '', contentType: 'application/pdf' }],
        }
      );
      emailResults.push(res);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: c.get('userId'),
      action: 'invoice_sent',
      entity_type: 'invoice',
      entity_id: id,
      after: { recipients, sentAt: new Date().toISOString() },
    });

    return c.json({
      success: true,
      message: 'Invoice sent successfully',
      pdfUrl: pdfResult.pdfUrl,
      emailSent: emailResults.every(r => r.success),
    });
  } catch (err: any) {
    console.error('[invoices] POST send error:', err);
    return c.json({ error: err.message }, 500);
  }
});
