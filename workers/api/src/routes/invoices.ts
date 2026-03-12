import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { generateInvoicePdf } from '../services/pdf.js';
import { sendEmail, buildInvoiceEmailHtml } from '../services/brevo.js';
import type { Env, Variables } from '../types.js';
import type { InvoicePdfData } from '../services/pdf.js';
    const { data: settings } = await (supabase as any)
      .from('site_settings')
      .select('hero_title, public_site_url, contact_info')
      .eq('id', 1)
      .single();

    const { data: invoice } = await (supabase as any)
      .from('invoices')
      .select('invoice_number, invoice_date, subject, total_amount, due_date, discount_value, discount_type, companies(name, address), projects(title, location), invoice_items(description, quantity, unit_price, amount), collections(amount, payment_date, method)')
      .eq('id', id)
      .single();

    if (!invoice) return c.json({ error: 'Invoice not found after PDF gen' }, 404);

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
    const collections = invoice.collections || [];
    const totalPaid = collections.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const dueAmountNum = Math.max(0, totalPayable - totalPaid);

    const fmt = (num: number) => `৳ ${Number(num).toLocaleString('en-IN')}`;
    const cleanStr = (str: string | undefined | null) => str ? str.replace(/[^\x20-\x7E]/g, '') : '';
    const subjectPrefix = invoice.subject ? invoice.subject : `Invoice for ${invoice.projects?.title}${invoice.projects?.location ? ` at ${invoice.projects?.location}` : ''}`;

    // Build and send email with PDF attachment
    const html = buildInvoiceEmailHtml({
      recipientName: recipientName ?? (invoice.companies as any)?.name ?? 'Client',
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
        unitPrice: fmt(i.unit_price || 0),
        total: fmt(i.amount || 0),
      })),
      collections: collections.map((c: any) => ({
        date: c.payment_date || '',
        method: cleanStr(c.method),
        amount: fmt(c.amount || 0),
      })),
      downloadUrl: pdfResult.pdfUrl,
      companyName: settings?.hero_title,
      companyUrl: settings?.public_site_url,
      companyEmail: (settings?.contact_info as any)?.email,
      type: invoice.type
    });

    const emailResult = await sendEmail(
      c.env.BREVO_API_KEY,
      c.env.BREVO_SENDER_EMAIL,
      c.env.BREVO_SENDER_NAME,
      {
        to: [{ email: recipientEmail, name: recipientName }],
        subject: `Invoice ${invoice.invoice_number} from ${settings?.hero_title ?? 'Marketing Solution'}`,
        htmlContent: html,
        attachments: [{ name: `${invoice.invoice_number}.pdf`, content: pdfResult.pdfBase64 || '', contentType: 'application/pdf' }],
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
  } catch (err: any) {
    console.error('[invoices] POST send error:', err);
    return c.json({ error: err.message }, 500);
  }
});
