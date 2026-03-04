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

async function buildAndStorePdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  id: string,
  supabaseUrl: string,
): Promise<{ pdfUrl: string; pdfBytes: Uint8Array; pdfBase64: string } | { error: string }> {
  const { data: invoice, error: invoiceError } = await (supabase as any)
    .from('invoices')
    .select('*, invoice_items(*), projects(*), companies(*)')
    .eq('id', id)
    .single();

  if (invoiceError || !invoice) return { error: 'Invoice not found' };

  // Fetch pad background from site_settings
  const { data: settings } = await (supabase as any)
    .from('site_settings')
    .select('invoice_pad_url, pad_margin_top, pad_margin_bottom')
    .eq('id', 1)
    .single();

  const pdfData: InvoicePdfData = {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: new Date(invoice.created_at).toLocaleDateString('en-BD'),
    dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-BD') : undefined,
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
    items: (invoice.invoice_items ?? []).map((item: { description: string; quantity: number; unit_price: number; amount: number }) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.amount,
    })),
    totalAmount: invoice.total_amount,
    padImageUrl: settings?.invoice_pad_url ?? undefined,
    padMarginTop: settings?.pad_margin_top ?? 150,
    padMarginBottom: settings?.pad_margin_bottom ?? 100,
  };

  const pdfBytes = await generateInvoicePdf(pdfData);
  const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

  // Store in a predictable, CDN-friendly folder: generated-invoices/<invoice-id>.pdf
  const storagePath = `generated-invoices/${id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('[invoices] PDF upload error:', uploadError);
    return { error: 'Failed to upload PDF to storage' };
  }

  // Use public CDN URL — works forever, no expiry
  const pdfUrl = `${supabaseUrl}/storage/v1/object/public/invoices/${storagePath}`;

  // Persist the PDF URL on the invoice record
  await (supabase as any).from('invoices').update({ pdf_url: pdfUrl }).eq('id', id);

  return { pdfUrl, pdfBytes, pdfBase64 };
}

// ─── GET /invoices/:id/pdf — generate PDF on demand (always fresh) ────────────

invoicesRoute.get('/:id/pdf', async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const result = await buildAndStorePdf(supabase, id, c.env.SUPABASE_URL);
  if ('error' in result) {
    return c.json({ error: result.error }, result.error === 'Invoice not found' ? 404 : 500);
  }

  return c.json({ pdfUrl: result.pdfUrl, success: true });
});

// ─── POST /invoices/:id/send — generate PDF, store, email it ─────────────────

invoicesRoute.post('/:id/send', requirePermission('send_invoice'), async (c) => {
  const { id } = c.req.param();
  const { recipientEmail, recipientName } = await c.req.json();

  if (!recipientEmail) return c.json({ error: 'recipientEmail is required' }, 400);

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const pdfResult = await buildAndStorePdf(supabase, id, c.env.SUPABASE_URL);
  if ('error' in pdfResult) {
    return c.json({ error: pdfResult.error }, pdfResult.error === 'Invoice not found' ? 404 : 500);
  }

  // Fetch invoice metadata for email
  const { data: invoice } = await (supabase as any)
    .from('invoices')
    .select('invoice_number, total_amount, due_date, companies(name), projects(title)')
    .eq('id', id)
    .single();

  if (!invoice) return c.json({ error: 'Invoice not found after PDF gen' }, 404);

  // Update sent_at and status
  await (supabase as any)
    .from('invoices')
    .update({ sent_at: new Date().toISOString(), status: 'sent' })
    .eq('id', id);

  // Build and send email with PDF attachment
  const html = buildInvoiceEmailHtml({
    recipientName: recipientName ?? (invoice.companies as any)?.name ?? 'Client',
    invoiceNumber: invoice.invoice_number,
    projectTitle: (invoice.projects as any)?.title ?? 'Project',
    totalAmount: `৳ ${Number(invoice.total_amount).toLocaleString('en-IN')}`,
    dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-BD') : 'Please see invoice',
    downloadUrl: pdfResult.pdfUrl,
  });

  const emailResult = await sendEmail(
    c.env.BREVO_API_KEY,
    c.env.BREVO_SENDER_EMAIL,
    c.env.BREVO_SENDER_NAME,
    {
      to: [{ email: recipientEmail, name: recipientName }],
      subject: `Invoice ${invoice.invoice_number} from Marketing Solution`,
      htmlContent: html,
      attachments: [{ name: `${invoice.invoice_number}.pdf`, content: pdfResult.pdfBase64, contentType: 'application/pdf' }],
    }
  );

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: c.get('userId'),
    action: 'invoice_sent',
    entity_type: 'invoice',
    entity_id: id,
    after: { recipientEmail, sentAt: new Date().toISOString() },
  });

  return c.json({
    success: true,
    message: 'Invoice sent successfully',
    pdfUrl: pdfResult.pdfUrl,
    emailSent: emailResult.success,
  });
});
