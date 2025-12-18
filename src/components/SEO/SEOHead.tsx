import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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
  title,
  description,
  keywords,
  image = 'https://thegoldenolive.be/assets/img/golden/IMG_4117.JPEG',
  url = 'https://the-goldenolive.be/',
  type = 'restaurant',
}: SEOHeadProps) => {
  const { t, i18n } = useTranslation();
  
  // Use provided title/description or get from translations based on language
  const seoTitle = title || t('seo.title');
  const seoDescription = description || t('seo.description');
  const seoKeywords = keywords || t('seo.keywords');
  useEffect(() => {
    // Update title
    document.title = seoTitle;

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
    updateMetaTag('title', seoTitle);
    updateMetaTag('description', seoDescription);
    updateMetaTag('keywords', seoKeywords);

    // Open Graph tags
    updateMetaTag('og:title', seoTitle, true);
    updateMetaTag('og:description', seoDescription, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:locale', i18n.language === 'nl' ? 'nl_BE' : i18n.language === 'fr' ? 'fr_BE' : 'en_US', true);

    // Twitter Card tags
    updateMetaTag('twitter:title', seoTitle);
    updateMetaTag('twitter:description', seoDescription);
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
  }, [seoTitle, seoDescription, seoKeywords, image, url, type, i18n.language]);

  return null; // This component doesn't render anything
};

export default SEOHead;

