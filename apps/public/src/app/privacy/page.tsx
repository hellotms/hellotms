import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Hello TMS collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-black text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
        {[
          {
            title: '1. Information We Collect',
            text: 'When you contact us through our website, we collect information you voluntarily provide, including your name, email address, phone number, and event details. We may also collect technical information such as your IP address and browser type for security purposes.',
          },
          {
            title: '2. How We Use Your Information',
            text: 'We use the information you provide solely to respond to your inquiries, process service agreements, and communicate with you about your event. We do not sell, trade, or otherwise transfer your personal information to third parties without your consent.',
          },
          {
            title: '3. Data Security',
            text: 'We implement industry-standard security measures to protect your personal information. Your data is stored securely on our servers and transmitted over encrypted connections (HTTPS).',
          },
          {
            title: '4. Cookies',
            text: 'Our website may use cookies to improve your browsing experience. You can disable cookies through your browser settings, though this may affect website functionality.',
          },
          {
            title: '5. Third-Party Services',
            text: 'We may use third-party services to help operate our website and deliver services. These providers have access to your information only to perform specific tasks on our behalf and are obligated to protect it.',
          },
          {
            title: '6. Your Rights',
            text: 'You have the right to access, update, or request deletion of your personal information at any time. Contact us at hello@hellotms.com.bd to exercise these rights.',
          },
          {
            title: '7. Changes to This Policy',
            text: 'We reserve the right to update this privacy policy. Changes will be posted on this page with an updated revision date.',
          },
          {
            title: '8. Contact Us',
            text: 'If you have questions about this privacy policy, please contact us at hello@hellotms.com.bd or call +880 1700 000 000.',
          },
        ].map(({ title, text }) => (
          <div key={title}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
            <p className="leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
