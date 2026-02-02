/**
 * Menu Page - Standalone page for the full menu
 * The Golden Olive
 */

import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import Menu from './Menu';
import SEOHead from '../SEO/SEOHead';

const MenuPage = () => {
  return (
    <>
      <SEOHead 
        title="Menu | The Golden Olive" 
        description="Bekijk ons uitgebreide menu met heerlijke gerechten. Van voorgerechten tot desserts, ontdek de smaken van The Golden Olive."
      />
      <Header />
      <main id="main" style={{ paddingTop: '100px' }}>
        <Menu />
      </main>
      <Footer />
    </>
  );
};

export default MenuPage;
