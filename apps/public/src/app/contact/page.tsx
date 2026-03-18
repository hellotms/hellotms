'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Send, CheckCircle, Phone, Mail, MapPin, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
const BUDGET_OPTIONS = [
  '৳ 10,000 – 25,000',
  '৳ 25,000 – 50,000',
  '৳ 50,000 – 1,00,000',
  '৳ 1,00,000 – 2,50,000',
  '৳ 2,50,000+',
];

type LeadFormValues = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  event_date?: string;
  budget_range?: string;
  message?: string;
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const form = useForm<LeadFormValues>();

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    }
    fetchSettings();
  }, []);

  const onSubmit = async (values: LeadFormValues) => {
    setLoading(true);
    setError('');
    try {
      // 1. Insert into Contact Submissions directly to bypass Worker setup if not running
      const { error: contactError } = await supabase.from('contact_submissions').insert([
        {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          company: values.company || undefined,
          service: values.budget_range || undefined,
          message: values.message || '(No message provided)',
        }
      ]);

      if (contactError) throw contactError;

      // 2. Also put into Leads as it previously attempted parallel APIs
      const { error: leadError } = await supabase.from('leads').insert([
        {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          event_date: values.event_date || undefined,
          budget_range: values.budget_range || undefined,
          message: values.message || undefined,
          status: 'new'
        }
      ]);

      if (leadError) console.warn('[leads] secondary sync missed'); // Only best effort

      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = settings?.contact_info as any;

  const CONTACT_CARDS = [
    { icon: Phone, label: 'Phone / WhatsApp', value: contactInfo?.phone || '+880 1700 000 000', href: contactInfo?.phone ? `tel:${contactInfo.phone.replace(/\s/g, '')}` : 'tel:+8801700000000' },
    { icon: Mail, label: 'Email', value: contactInfo?.email || 'hello@themarketingsolution.com', href: contactInfo?.email ? `mailto:${contactInfo.email}` : 'mailto:hello@themarketingsolution.com' },
    { icon: MapPin, label: 'Location', value: contactInfo?.address || 'Dhaka, Bangladesh', href: undefined },
    { icon: Clock, label: 'Office Hours', value: 'Sat – Thu, 9 AM – 7 PM', href: undefined },
  ];

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all';

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 hero-gradient overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="container relative z-10 text-center">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">Reach Out</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--foreground)] mb-5">
            Let's Plan Your <span className="text-[#d6802b]">Event</span>
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
            Fill in the form below and our team will get back to you within 24 hours.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact info sidebar */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="font-bold text-[var(--foreground)] text-lg">Contact Info</h2>
                {CONTACT_CARDS.map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">{label}</p>
                      {href ? (
                        <a href={href} className="text-sm font-medium text-[var(--foreground)] hover:text-indigo-500 transition-colors">
                          {value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-[var(--foreground)]">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[var(--foreground)] text-sm">Quick Response</p>
                    <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                      We typically respond within a few hours on weekdays. For urgent inquiries, call or WhatsApp us directly.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="text-center py-16 px-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                  <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-5" />
                  <h2 className="text-2xl font-black text-[var(--foreground)]">Message Received!</h2>
                  <p className="text-[var(--muted)] mt-3 max-w-sm mx-auto text-sm leading-relaxed">
                    Thank you for reaching out. We'll review your inquiry and get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); form.reset(); }}
                    className="mt-8 bg-[var(--surface)] border border-[var(--border)] hover:border-indigo-500/40 px-6 py-2.5 rounded-xl text-sm font-medium text-[var(--foreground)] transition-all"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Full Name *</label>
                      <input {...form.register('name', { required: true })} placeholder="Your full name" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Email Address *</label>
                      <input type="email" {...form.register('email', { required: true })} placeholder="your@email.com" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Phone Number</label>
                      <input {...form.register('phone')} placeholder="+880XXXXXXXXXX" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Company / Organization</label>
                      <input {...form.register('company')} placeholder="Your company" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Event Date</label>
                      <input type="date" {...form.register('event_date')} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Budget Range</label>
                      <select {...form.register('budget_range')} className={inputCls}>
                        <option value="">Select budget...</option>
                        {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Message</label>
                    <textarea
                      {...form.register('message')}
                      rows={4}
                      placeholder="Tell us about your event, requirements, and any special requests..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:shadow-indigo-500/25 disabled:opacity-60"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Send Inquiry</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

