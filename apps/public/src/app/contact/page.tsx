'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { API_BASE_URL } from '@/lib/utils';
import { Send, CheckCircle, Phone, Mail, MapPin, MessageSquare } from 'lucide-react';

type LeadFormValues = {
  full_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  event_date?: string;
  budget_range?: string;
  message?: string;
};

const BUDGET_OPTIONS = [
  '৳ 10,000 – 25,000',
  '৳ 25,000 – 50,000',
  '৳ 50,000 – 1,00,000',
  '৳ 1,00,000 – 2,50,000',
  '৳ 2,50,000+',
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm<LeadFormValues>({
    defaultValues: { full_name: '', email: '', phone: '', company_name: '', event_date: '', budget_range: '', message: '' },
  });

  const onSubmit = async (values: LeadFormValues) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Submission failed');
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-brand-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-brand-400 text-sm font-semibold tracking-widest uppercase mb-4">Reach Out</p>
          <h1 className="text-4xl sm:text-5xl font-black">Let's Plan Your Event</h1>
          <p className="mt-4 text-gray-300 text-lg max-w-xl mx-auto">Fill in the form and our team will get back to you within 24 hours.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Get In Touch</h2>
              <p className="mt-2 text-gray-500">We'd love to hear about your event. Let's talk!</p>
            </div>

            {[
              { icon: Phone, label: 'Phone / WhatsApp', value: '+880 1700 000 000', href: 'tel:+8801700000000' },
              { icon: Mail, label: 'Email', value: 'hello@hellotms.com.bd', href: 'mailto:hello@hellotms.com.bd' },
              { icon: MapPin, label: 'Location', value: 'Dhaka, Bangladesh', href: undefined },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                  {href ? (
                    <a href={href} className="font-medium text-gray-900 hover:text-brand-700 transition-colors">{value}</a>
                  ) : (
                    <p className="font-medium text-gray-900">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-brand-50 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-brand-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Quick Response</p>
                  <p className="text-xs text-gray-500 mt-1">We typically respond within a few hours on weekdays. For urgent inquiries, call or WhatsApp us directly.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="text-center py-16 px-8 bg-green-50 rounded-3xl border border-green-100">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-5" />
                <h2 className="text-2xl font-black text-gray-900">Message Received!</h2>
                <p className="text-gray-500 mt-3 max-w-sm mx-auto">Thank you for reaching out. Our team will review your inquiry and get back to you within 24 hours.</p>
                <button onClick={() => { setSubmitted(false); form.reset(); }} className="mt-8 bg-white border border-gray-200 hover:bg-gray-50 px-6 py-2.5 rounded-full text-sm text-gray-700 font-medium transition-colors">
                  Submit another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                    <input {...form.register('full_name', { required: true })} placeholder="Your full name" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                    <input type="email" {...form.register('email', { required: true })} placeholder="your@email.com" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <input {...form.register('phone')} placeholder="+880XXXXXXXXXX" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company / Organization</label>
                    <input {...form.register('company_name')} placeholder="Your company" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Date</label>
                    <input type="date" {...form.register('event_date')} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget Range</label>
                    <select {...form.register('budget_range')} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white">
                      <option value="">Select budget...</option>
                      {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea {...form.register('message')} rows={4} placeholder="Tell us about your event, what you need, and any special requirements..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
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
    </div>
  );
}
