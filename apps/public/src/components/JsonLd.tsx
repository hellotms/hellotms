// Unused import removed

export function JsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://themarketingsolution.com.bd';
  const siteName = 'The Marketing Solution';
  const description = 'Bangladesh\'s leading event management and marketing agency. We specialize in corporate events, brand activations, and creative storytelling.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    'name': siteName,
    'description': description,
    'url': siteUrl,
    'telephone': '+8801700000000', // Placeholder: Update later if needed
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Dhaka, Bangladesh',
      'addressLocality': 'Dhaka',
      'addressRegion': 'Dhaka',
      'postalCode': '1212',
      'addressCountry': 'BD',
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': '23.8103',
      'longitude': '90.4125',
    },
    'openingHoursSpecification': {
      '@type': 'OpeningHoursSpecification',
      'dayOfWeek': [
        'Saturday',
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
      ],
      'opens': '09:00',
      'closes': '18:00',
    },
    'sameAs': [
      'https://www.facebook.com/TheMarketingSolutionBD',
      'https://www.instagram.com/TheMarketingSolution',
      'https://www.youtube.com/channel/TheMarketingSolution',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
