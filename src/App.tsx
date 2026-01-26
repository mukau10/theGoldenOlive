import { useEffect, lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { preloadMenu } from './hooks/useMenu';
import { preloadAllergens } from './hooks/useAllergens';
import './App.css';

// Lazy load heavy components for better code splitting
const Header = lazy(() => import('./components/Header/Header'));
const Hero = lazy(() => import('./components/Hero/Hero'));
const About = lazy(() => import('./components/About/About'));
const Mogelijkheden = lazy(() => import('./components/About/Mogelijkheden'));
const Menu = lazy(() => import('./components/Menu/Menu'));
const Events = lazy(() => import('./components/Events/Events'));
const Gallery = lazy(() => import('./components/Gallery/Gallery'));
const FullGallery = lazy(() => import('./components/Gallery/FullGallery'));
const Contact = lazy(() => import('./components/Contact/Contact'));
const Footer = lazy(() => import('./components/Footer/Footer'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy/PrivacyPolicy'));
const AllergenInfo = lazy(() => import('./components/AllergenInfo/AllergenInfo'));
const StructuredData = lazy(() => import('./components/SEO/StructuredData'));
const SEOHead = lazy(() => import('./components/SEO/SEOHead'));
const SplashScreen = lazy(() => import('./components/SplashScreen/SplashScreen'));
const CookieConsent = lazy(() => import('./components/CookieConsent/CookieConsent'));

// Lazy load AOS only when needed
let AOS: any = null;
const loadAOS = async () => {
  if (!AOS) {
    AOS = (await import('aos')).default;
  }
  return AOS;
};

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#000',
    color: '#ffc107'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div className="spinner-border text-warning" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  </div>
);

// Main page component
const HomePage = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SEOHead />
      <StructuredData />
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Mogelijkheden />
        <Menu />
        <Events />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </Suspense>
  );
};

// Scroll to top on route change - memoized
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use requestAnimationFrame for smoother scroll
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [pathname]);

  return null;
};

function App() {
  // Initialize AOS lazily - only when needed
  useEffect(() => {
    let mounted = true;
    
    // Load and initialize AOS after a short delay to not block initial render
    const initAOS = async () => {
      try {
        const AOSModule = await loadAOS();
        if (mounted && AOSModule) {
          AOSModule.init({
            duration: 1000,
            easing: 'ease-in-out',
            once: true,
            mirror: false,
            // Disable AOS on mobile for better performance
            disable: window.innerWidth < 768 ? 'mobile' : false,
          });
        }
      } catch (error) {
        console.error('Failed to initialize AOS:', error);
      }
    };

    // Delay AOS initialization to prioritize critical content
    const timer = setTimeout(initAOS, 100);

    // Preload menu and allergens data immediately on app start
    // These are fire-and-forget, errors are handled in the hooks
    preloadMenu().catch((error) => {
      console.error('Failed to preload menu:', error);
    });
    preloadAllergens().catch((error) => {
      console.error('Failed to preload allergens:', error);
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Memoize routes to prevent unnecessary re-renders
  const routes = useMemo(() => (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route 
        path="/galerij" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            <FullGallery />
          </Suspense>
        } 
      />
      <Route 
        path="/privacy-policy" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            <PrivacyPolicy />
          </Suspense>
        } 
      />
      <Route 
        path="/allergenen" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            <AllergenInfo />
          </Suspense>
        } 
      />
      <Route 
        path="/allergie" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            <AllergenInfo />
          </Suspense>
        } 
      />
      {/* Fallback to home for any other routes */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  ), []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={null}>
          <SplashScreen />
          <CookieConsent />
        </Suspense>
        <div className="App">
          {routes}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
