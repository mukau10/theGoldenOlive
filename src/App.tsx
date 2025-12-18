import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import AOS from 'aos';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Mogelijkheden from './components/About/Mogelijkheden';
import Menu from './components/Menu/Menu';
import Events from './components/Events/Events';
import Gallery from './components/Gallery/Gallery';
import FullGallery from './components/Gallery/FullGallery';
import Contact from './components/Contact/Contact';
import Footer from './components/Footer/Footer';
import PrivacyPolicy from './components/PrivacyPolicy/PrivacyPolicy';
import AllergenInfo from './components/AllergenInfo/AllergenInfo';
import StructuredData from './components/SEO/StructuredData';
import SEOHead from './components/SEO/SEOHead';
import SplashScreen from './components/SplashScreen/SplashScreen';
import { preloadMenu } from './hooks/useMenu';
import { preloadAllergens } from './hooks/useAllergens';
import './App.css';

// Main page component
const HomePage = () => {
  return (
    <>
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
    </>
  );
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  useEffect(() => {
    // Initialize AOS
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false,
    });

    // Preload menu and allergens data immediately on app start
    preloadMenu();
    preloadAllergens();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <SplashScreen />
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/galerij" element={<FullGallery />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/allergenen" element={<AllergenInfo />} />
          <Route path="/allergie" element={<AllergenInfo />} />
          {/* Fallback to home for any other routes */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
