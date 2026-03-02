import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { generateInvoicePdf } from '../services/pdf.js';
import { sendEmail, buildInvoiceEmailHtml } from '../services/brevo.js';
import type { Env, Variables } from '../types.js';
import type { InvoicePdfData } from '../services/pdf.js';

export const invoicesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

invoicesRoute.use('*', authMiddleware);

// POST /invoices/:id/send — generate PDF, store to Supabase Storage, send email
invoicesRoute.post('/:id/send', requirePermission('send_invoice'), async (c) => {
  const { id } = c.req.param();
  const { recipientEmail, recipientName } = await c.req.json();

  if (!recipientEmail) return c.json({ error: 'recipientEmail is required' }, 400);

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // Fetch invoice + items + project + company
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), projects(*), companies(*)')
    .eq('id', id)
    .single();

  if (invoiceError || !invoice) {
    return c.json({ error: 'Invoice not found' }, 404);
  }

  // Build PDF data
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
  };

  // Generate PDF
  const pdfBytes = await generateInvoicePdf(pdfData);
  const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

  // Upload to Supabase Storage
  const storagePath = `invoices/${invoice.company_id}/${invoice.project_id}/${id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('[invoices/send] Upload error:', uploadError);
    return c.json({ error: 'Failed to upload PDF' }, 500);
  }

  // Get signed URL (7-day expiry)
  const { data: signedUrl } = await supabase.storage
    .from('invoices')
    .createSignedUrl(storagePath, 7 * 24 * 3600);

  const downloadUrl = signedUrl?.signedUrl ?? `https://supabase-project.supabase.co/storage/v1/object/public/invoices/${storagePath}`;

  // Update invoice with pdf_url and sent_at
  await supabase
    .from('invoices')
    .update({ pdf_url: downloadUrl, sent_at: new Date().toISOString(), status: 'sent' })
    .eq('id', id);

  // Send email via Brevo (with PDF attachment)
  const html = buildInvoiceEmailHtml({
    recipientName: recipientName ?? invoice.companies?.name ?? 'Client',
    invoiceNumber: invoice.invoice_number,
    projectTitle: invoice.projects?.title ?? 'Project',
    totalAmount: `৳ ${Number(invoice.total_amount).toLocaleString('en-IN')}`,
    dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-BD') : 'Please see invoice',
    downloadUrl,
  });

  const emailResult = await sendEmail(
    c.env.BREVO_API_KEY,
    c.env.BREVO_SENDER_EMAIL,
    c.env.BREVO_SENDER_NAME,
    {
      to: [{ email: recipientEmail, name: recipientName }],
      subject: `Invoice ${invoice.invoice_number} from Marketing Solution`,
      htmlContent: html,
      attachments: [{ name: `${invoice.invoice_number}.pdf`, content: pdfBase64, contentType: 'application/pdf' }],
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
    message: 'Invoice sent successfully',
    pdfUrl: downloadUrl,
    emailSent: emailResult.success,
  });
});

// GET /invoices/:id/pdf — return signed URL or regenerate
invoicesRoute.get('/:id/pdf', async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { data: invoice } = await supabase
    .from('invoices')
    .select('pdf_url, company_id, project_id')
    .eq('id', id)
    .single();

  if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

  if (invoice.pdf_url) {
    return c.json({ pdfUrl: invoice.pdf_url });
  }

  // If no PDF yet, return storage path hint
  const storagePath = `invoices/${invoice.company_id}/${invoice.project_id}/${id}.pdf`;
  const { data: signedUrl } = await supabase.storage
    .from('invoices')
    .createSignedUrl(storagePath, 3600);

  return c.json({ pdfUrl: signedUrl?.signedUrl ?? null, message: 'PDF not yet generated' });
});
