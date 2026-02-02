/**
 * Contact Page - Standalone page for contact information
 * The Golden Olive
 */

import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import Contact from './Contact';
import SEOHead from '../SEO/SEOHead';

const ContactPage = () => {
  return (
    <>
      <SEOHead 
        title="Contact | The Golden Olive" 
        description="Neem contact op met The Golden Olive. Vind ons adres, telefoonnummer en openingstijden. Reserveer uw tafel vandaag nog!"
      />
      <Header />
      <main id="main" style={{ paddingTop: '100px' }}>
        <Contact />
      </main>
      <Footer />
    </>
  );
};

export default ContactPage;
