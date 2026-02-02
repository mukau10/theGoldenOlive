import { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import FloatingActions from './components/FloatingActions/FloatingActions';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Events from './components/Events/Events';
import Gallery from './components/Gallery/Gallery';
import FullGallery from './components/Gallery/FullGallery';
import Footer from './components/Footer/Footer';
import PrivacyPolicy from './components/PrivacyPolicy/PrivacyPolicy';
import CookiePolicy from './components/CookiePolicy/CookiePolicy';
import AllergenInfo from './components/AllergenInfo/AllergenInfo';
import StructuredData from './components/SEO/StructuredData';
import SEOHead from './components/SEO/SEOHead';
import SplashScreen from './components/SplashScreen/SplashScreen';
import CookieConsent from './components/CookieConsent/CookieConsent';
import { OrderPage } from './components/Order';
import MenuPage from './components/Menu/MenuPage';
import ContactPage from './components/Contact/ContactPage';
import { preloadMenu } from './hooks/useMenu';
import { preloadAllergens } from './hooks/useAllergens';
import './App.css';

// Import AOS directly (no dynamic import to avoid code splitting)
import AOS from 'aos';
import 'aos/dist/aos.css';

// Main page component - Homepage with Hero, About, Events, Gallery
const HomePage = () => {
  return (
    <>
      <SEOHead />
      <StructuredData />
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Events />
        <Gallery />
      </main>
      <Footer />
    </>
  );
};

// Scroll to top on route change, or scroll to hash if present
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash, scroll to that element
    if (hash) {
      // Small delay to ensure the page has rendered
      const timer = setTimeout(() => {
        const element = document.getElementById(hash.replace('#', ''));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    
    // Otherwise scroll to top
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [pathname, hash]);

  return null;
};

function App() {
  // Initialize AOS directly (no dynamic import)
  useEffect(() => {
    // Initialize AOS after a short delay to not block initial render
    const timer = setTimeout(() => {
      try {
        AOS.init({
          duration: 1000,
          easing: 'ease-in-out',
          once: true,
          mirror: false,
          // Disable AOS on mobile for better performance
          disable: window.innerWidth < 768 ? 'mobile' : false,
        });
      } catch (error) {
        console.error('Failed to initialize AOS:', error);
      }
    }, 100);

    // Preload menu and allergens data immediately on app start
    // These are fire-and-forget, errors are handled in the hooks
    preloadMenu().catch((error) => {
      console.error('Failed to preload menu:', error);
    });
    preloadAllergens().catch((error) => {
      console.error('Failed to preload allergens:', error);
    });

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Memoize routes to prevent unnecessary re-renders
  const routes = useMemo(() => (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Menu Page */}
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/menukaart" element={<MenuPage />} />
      {/* Contact Page */}
      <Route path="/contact" element={<ContactPage />} />
      {/* Gallery */}
      <Route path="/galerij" element={<FullGallery />} />
      {/* Legal & Info */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/cookie-policy" element={<CookiePolicy />} />
      <Route path="/allergenen" element={<AllergenInfo />} />
      <Route path="/allergie" element={<AllergenInfo />} />
      {/* Online Order System */}
      <Route path="/bestellen" element={<OrderPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/order/success" element={<OrderPage />} />
      {/* Fallback to home for any other routes */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  ), []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <SplashScreen />
        <CookieConsent />
        <div className="App">
          {routes}
        </div>
        {/* Floating Action Buttons for quick access to key actions */}
        <FloatingActions />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
