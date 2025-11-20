import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

/**
 * SEO Head component for dynamic meta tags
 * Updates document head with SEO metadata
 */
const SEOHead = ({
  title = 'The Golden Olive - Restaurant Antwerpen | Spareribs, Mix BBQ & Events',
  description = 'Geniet van authentieke gerechten bij The Golden Olive in Antwerpen. Specialiteiten: spareribs, mix BBQ, hamburgers. Perfect voor verjaardagen, bedrijfsfeesten en evenementen. Reserveer nu!',
  keywords = 'The Golden Olive, restaurant Antwerpen, spareribs, mix BBQ, hamburgers, verjaardagsfeest, bedrijfsfeest, evenementen, reserveren, eten, drinken, Vlaamsekaai, Antwerpen restaurant',
  image = 'https://thegoldenolive.be/assets/img/golden/IMG_4117.JPEG',
  url = 'https://the-goldenolive.be/',
  type = 'restaurant',
}: SEOHeadProps) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Primary meta tags
    updateMetaTag('title', title);
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);

    // Twitter Card tags
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    updateMetaTag('twitter:url', url);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description, keywords, image, url, type]);

  return null; // This component doesn't render anything
};

export default SEOHead;

