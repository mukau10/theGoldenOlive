import { useEffect } from 'react';

/**
 * Structured Data (JSON-LD) component for SEO
 * Implements Schema.org markup for Restaurant and Menu
 */
const StructuredData = () => {
  useEffect(() => {
    // Restaurant Schema
    const restaurantSchema = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'The Golden Olive',
      description:
        'Authentiek restaurant in Antwerpen gespecialiseerd in spareribs, mix BBQ, hamburgers. Perfect voor verjaardagen, bedrijfsfeesten en evenementen.',
      url: 'https://the-goldenolive.be',
      telephone: '+32494194397',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Vlaamsekaai 65',
        addressLocality: 'Antwerpen',
        postalCode: '2000',
        addressCountry: 'BE',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 51.20782050181604,
        longitude: 4.388302388653184,
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '17:00',
          closes: '23:00',
        },
      ],
      servesCuisine: ['Belgian', 'International', 'BBQ', 'Grill'],
      priceRange: '€€',
      acceptsReservations: true,
      menu: 'https://the-goldenolive.be/#menu',
      image: [
        'https://thegoldenolive.be/assets/img/golden/IMG_4117.JPEG',
        'https://thegoldenolive.be/assets/img/golden/mixedGrill.JPEG',
        'https://thegoldenolive.be/assets/img/golden/spareribs.JPEG',
      ],
      sameAs: ['https://www.facebook.com/TheGoldenolivee', 'https://www.instagram.com/thegoldenolive._'],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.5',
        reviewCount: '150',
      },
      hasMenu: {
        '@type': 'Menu',
        url: 'https://the-goldenolive.be/#menu',
      },
    };

    // Menu ItemList Schema
    const menuSchema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'The Golden Olive Menu',
      description: 'Uitgebreide menukaart van The Golden Olive met spareribs, mix BBQ, hamburgers en meer',
      url: 'https://the-goldenolive.be/#menu',
      itemListElement: [
        {
          '@type': 'MenuItem',
          name: 'Mix BBQ',
          description: 'Een combinatie van verschillende soorten vlees, geserveerd met Champignon saus, salade en friet',
          offers: {
            '@type': 'Offer',
            price: '39.99',
            priceCurrency: 'EUR',
          },
        },
        {
          '@type': 'MenuItem',
          name: 'Spareribs',
          description: 'Spareribs in verschillende smaken: Natuur, BBQ, Gekarameliseerd, Spicy, Thai',
          offers: {
            '@type': 'Offer',
            price: '28.99',
            priceCurrency: 'EUR',
          },
        },
        {
          '@type': 'MenuItem',
          name: 'Tiger garnalen',
          description: 'Tiger garnalen met zoetzure saus',
          offers: {
            '@type': 'Offer',
            price: '8.00',
            priceCurrency: 'EUR',
          },
        },
        {
          '@type': 'MenuItem',
          name: 'Chicken Wings',
          description: 'Kippenvleugels met keuze uit: Natuur, Zoetzure saus en BBQ Saus',
          offers: {
            '@type': 'Offer',
            price: '8.00',
            priceCurrency: 'EUR',
          },
        },
      ],
    };

    // Organization Schema (for better local SEO)
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'The Golden Olive',
      url: 'https://the-goldenolive.be',
      logo: 'https://thegoldenolive.be/assets/img/logo.png',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+32494194397',
        contactType: 'Customer Service',
        areaServed: 'BE',
        availableLanguage: ['nl', 'en', 'fr'],
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Vlaamsekaai 65',
        addressLocality: 'Antwerpen',
        postalCode: '2000',
        addressCountry: 'BE',
      },
      sameAs: ['https://www.facebook.com/TheGoldenolivee', 'https://www.instagram.com/thegoldenolive._'],
    };

    // Breadcrumb Schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://the-goldenolive.be/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Menu',
          item: 'https://the-goldenolive.be/#menu',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Contact',
          item: 'https://the-goldenolive.be/#contact',
        },
      ],
    };

    // Create script tags for structured data
    const createScriptTag = (id: string, schema: object) => {
      // Remove existing script if present
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
      }

      const script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    };

    // Add all structured data
    createScriptTag('restaurant-schema', restaurantSchema);
    createScriptTag('menu-schema', menuSchema);
    createScriptTag('organization-schema', organizationSchema);
    createScriptTag('breadcrumb-schema', breadcrumbSchema);

    // Cleanup function
    return () => {
      ['restaurant-schema', 'menu-schema', 'organization-schema', 'breadcrumb-schema'].forEach((id) => {
        const script = document.getElementById(id);
        if (script) {
          script.remove();
        }
      });
    };
  }, []);

  return null; // This component doesn't render anything
};

export default StructuredData;

