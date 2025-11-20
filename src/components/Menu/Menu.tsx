import { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { useMenu } from '../../hooks/useMenu';
import type { MenuCategory } from '../../types/menu';
import { categoryInfoMap } from '../../utils/categoryInfo';
import MenuItem from './MenuItem';
import MenuCategoryCard from './MenuCategoryCard';
import CategorySelectorModal from './CategorySelectorModal';
import { BiGridAlt } from 'react-icons/bi';

const Menu = () => {
  const { menuData, loading, error } = useMenu();
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | '*'>('*');
  const [showAllergenPopup, setShowAllergenPopup] = useState(false);
  const [allergenDescription, setAllergenDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isMenuSectionVisible, setIsMenuSectionVisible] = useState(false);
  const menuSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const menuSection = document.getElementById('menu');
    if (menuSection && selectedCategory !== '*') {
      menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory]);

  // Track menu section visibility for floating button
  useEffect(() => {
    const menuSection = menuSectionRef.current || document.getElementById('menu');
    if (!menuSection) return;

    // Check visibility - show button as soon as menu section enters viewport
    const checkVisibility = () => {
      const rect = menuSection.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      // Show button when menu section top is visible in viewport (even if just a small part)
      const isVisible = rect.top < windowHeight && rect.bottom > 0;
      setIsMenuSectionVisible(isVisible);
    };

    // Check immediately on mount
    checkVisibility();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Show button immediately when menu section enters viewport (any part visible)
          setIsMenuSectionVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0, // Trigger as soon as any part of the element is visible
        rootMargin: '0px', // No margin - trigger immediately when entering viewport
      }
    );

    observer.observe(menuSection);

    // Also check on scroll for immediate responsiveness
    const handleScroll = () => {
      checkVisibility();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleAllergenClick = (description: string) => {
    setAllergenDescription(description);
    setShowAllergenPopup(true);
  };

  // Define logical order for categories
  const categoryOrder: MenuCategory[] = [
    'voorgerechten',
    'mixed-bbq',
    'spareribs',
    'loaded-scoops',
    'rijst-pannetjes',
    'gevulde-aardappel-pannetje',
    'burgers',
    'kindermenu',
    'supplementen',
    'desserten',
    'mocktails',
    'frisdranken',
    'warme-dranken',
  ];

  // Sort categories in logical order
  const categories: MenuCategory[] = menuData
    ? (Object.keys(menuData) as MenuCategory[]).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        // If category not in order list, put it at the end
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
    : [];

  const filteredItems = () => {
    if (!menuData) return [];
    if (selectedCategory === '*') {
      // Show all categories with headers
      const allItems: Array<{ item: any; category: MenuCategory; isHeader?: boolean }> = [];
      categories.forEach((category) => {
        // Always show all items for each category, including placeholder for burgers
        const categoryItems = menuData[category];
        
        if (categoryItems && categoryItems.length > 0) {
          // Add category header
          allItems.push({ item: null as any, category, isHeader: true });
          // Add category items
          categoryItems.forEach((item) => {
            allItems.push({ item, category, isHeader: false });
          });
        }
      });
      return allItems;
    }
    // When a specific category is selected, show all items including placeholder
    if (menuData[selectedCategory]) {
      return menuData[selectedCategory].map((item) => ({ item, category: selectedCategory, isHeader: false }));
    }
    return [];
  };

  if (loading) {
    return (
      <section id="menu" className="py-5 bg-dark-custom">
        <div className="container-fluid px-4">
          <div className="text-center">
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !menuData) {
    return (
      <section id="menu" className="py-5 bg-dark-custom">
        <div className="container-fluid px-4">
          <div className="text-center">
            <p className="text-white">Error loading menu. Please refresh the page.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="menu" ref={menuSectionRef} className="py-5 bg-dark-custom">
      <div className="container-fluid px-4" data-aos="fade-up">
        <div className="text-center mb-4 mb-md-5">
          <h2 id="menu-heading" className="display-4 display-md-3 fw-bold text-warning mb-2 mb-md-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}>
            <i className="bi bi-journal-bookmark text-warning me-2 me-md-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}></i>Menu
          </h2>
          <p className="fs-6 fs-md-5 text-white mb-3 mb-md-4 opacity-75" style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)' }}>Ontdek onze culinaire specialiteiten</p>
          <div className="row justify-content-center">
            <div className="col-12 col-md-8">
              <div className="bg-black border border-warning rounded-pill p-2 p-md-3 d-flex align-items-center justify-content-center flex-wrap gap-2">
                <i className="bi bi-info-circle text-warning" style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}></i>
                <span className="text-warning small fw-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Klik op allergenen voor meer informatie</span>
                <span className="text-white-50 small d-none d-sm-inline" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>|</span>
                <a href="/allergenen" className="text-warning small text-decoration-none" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                  <i className="bi bi-shield-exclamation me-1"></i>Uitgebreide allergenen info
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Category Cards Carousel */}
        <div className="mb-5" data-aos="fade-up" data-aos-delay="100">
          <div className="menu-categories-container">
            <div
              className="menu-category-carousel-container position-relative rounded-4 p-4 p-md-5"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '2px solid rgba(255, 193, 7, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 193, 7, 0.1) inset',
                overflow: 'hidden',
              }}
            >
              {/* Decorative background elements */}
              <div
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{
                  background: 'radial-gradient(circle at 20% 50%, rgba(255, 193, 7, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 193, 7, 0.03) 0%, transparent 50%)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />

              {/* Category Title */}
              <div className="text-center mb-4 position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex align-items-center justify-content-center mb-2">
                  <div className="bg-warning opacity-25" style={{ width: '40px', height: '2px', borderRadius: '2px' }}></div>
                  <div
                    className="mx-3 bg-dark border border-warning rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'rgba(255, 193, 7, 0.1)',
                      boxShadow: '0 0 20px rgba(255, 193, 7, 0.3)',
                    }}
                  >
                    <i className="bi bi-grid-3x3-gap text-warning fs-4"></i>
                  </div>
                  <div className="bg-warning opacity-25" style={{ width: '40px', height: '2px', borderRadius: '2px' }}></div>
                </div>
                <h4
                  className="text-warning fw-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.75rem',
                    letterSpacing: '0.5px',
                    textShadow: '0 2px 10px rgba(255, 193, 7, 0.3)',
                  }}
                >
                  Kies een categorie
                </h4>
                <small
                  className="text-white-50 d-block"
                  style={{
                    fontSize: '0.9rem',
                    letterSpacing: '0.5px',
                  }}
                >
                  <i className="bi bi-arrow-left-right me-2"></i>
                  Swipe of gebruik de pijlen om te navigeren
                </small>
              </div>

              <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={20}
                slidesPerView={1}
                navigation={{
                  nextEl: '.swiper-button-next-menu',
                  prevEl: '.swiper-button-prev-menu',
                }}
                pagination={{
                  clickable: true,
                  el: '.swiper-pagination-menu',
                  bulletClass: 'swiper-pagination-bullet',
                  bulletActiveClass: 'swiper-pagination-bullet-active',
                  renderBullet: (_index, className) => {
                    return `<span class="${className}"></span>`;
                  },
                }}
                loop={true}
                className="menu-category-swiper mt-3 position-relative"
                style={{ paddingBottom: '20px' }}
              >
                {/* Slide 1: Hoofdcategorieën */}
                <SwiperSlide>
                  <div className="row g-3">
                    {/* All Categories Card */}
                    <div className="col-6 col-md-4">
                      <MenuCategoryCard
                        filter="*"
                        icon={BiGridAlt}
                        title="Alles"
                        subtitle="Complete Menu"
                        isActive={selectedCategory === '*'}
                        onClick={() => setSelectedCategory('*')}
                      />
                    </div>

                    {/* Voorgerechten Card */}
                    {categories.includes('voorgerechten') && categoryInfoMap['voorgerechten'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-voorgerechten"
                          icon={categoryInfoMap['voorgerechten'].icon}
                          title={categoryInfoMap['voorgerechten'].title}
                          subtitle="Starters"
                          isActive={selectedCategory === 'voorgerechten'}
                          onClick={() => setSelectedCategory('voorgerechten')}
                        />
                      </div>
                    )}

                    {/* Mixed BBQ Card */}
                    {categories.includes('mixed-bbq') && categoryInfoMap['mixed-bbq'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-mixed-bbq"
                          icon={categoryInfoMap['mixed-bbq'].icon}
                          title={categoryInfoMap['mixed-bbq'].title}
                          subtitle="BBQ Specialties"
                          isActive={selectedCategory === 'mixed-bbq'}
                          onClick={() => setSelectedCategory('mixed-bbq')}
                        />
                      </div>
                    )}
                  </div>
                </SwiperSlide>

                {/* Slide 2: Hoofdgerechten - BBQ & Ribs */}
                <SwiperSlide>
                  <div className="row g-3">
                    {/* Spareribs Card */}
                    {categories.includes('spareribs') && categoryInfoMap['spareribs'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-spareribs"
                          icon={categoryInfoMap['spareribs'].icon}
                          title={categoryInfoMap['spareribs'].title}
                          subtitle="Ribs Specialties"
                          isActive={selectedCategory === 'spareribs'}
                          onClick={() => setSelectedCategory('spareribs')}
                        />
                      </div>
                    )}

                    {/* Loaded Scoops Card */}
                    {categories.includes('loaded-scoops') && categoryInfoMap['loaded-scoops'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-loaded-scoops"
                          icon={categoryInfoMap['loaded-scoops'].icon}
                          title={categoryInfoMap['loaded-scoops'].title}
                          subtitle="Loaded Scoops"
                          isActive={selectedCategory === 'loaded-scoops'}
                          onClick={() => setSelectedCategory('loaded-scoops')}
                        />
                      </div>
                    )}

                    {/* Rijst Pannetjes Card */}
                    {categories.includes('rijst-pannetjes') && categoryInfoMap['rijst-pannetjes'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-rijst-pannetjes"
                          icon={categoryInfoMap['rijst-pannetjes'].icon}
                          title={categoryInfoMap['rijst-pannetjes'].title}
                          subtitle="Rijst Pannetjes"
                          isActive={selectedCategory === 'rijst-pannetjes'}
                          onClick={() => setSelectedCategory('rijst-pannetjes')}
                        />
                      </div>
                    )}
                  </div>
                </SwiperSlide>

                {/* Slide 3: Pannetjes & Burgers */}
                <SwiperSlide>
                  <div className="row g-3">
                    {/* Gevulde Aardappel Pannetje Card */}
                    {categories.includes('gevulde-aardappel-pannetje') && categoryInfoMap['gevulde-aardappel-pannetje'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-gevulde-aardappel-pannetje"
                          icon={categoryInfoMap['gevulde-aardappel-pannetje'].icon}
                          title={categoryInfoMap['gevulde-aardappel-pannetje'].title}
                          subtitle="Aardappel Pannetjes"
                          isActive={selectedCategory === 'gevulde-aardappel-pannetje'}
                          onClick={() => setSelectedCategory('gevulde-aardappel-pannetje')}
                        />
                      </div>
                    )}

                    {/* Burgers Card */}
                    {categories.includes('burgers') && categoryInfoMap['burgers'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-burgers"
                          icon={categoryInfoMap['burgers'].icon}
                          title={categoryInfoMap['burgers'].title}
                          subtitle="Burger Menu"
                          isActive={selectedCategory === 'burgers'}
                          onClick={() => setSelectedCategory('burgers')}
                        />
                      </div>
                    )}

                    {/* Kindermenu Card */}
                    {categories.includes('kindermenu') && categoryInfoMap['kindermenu'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-kindermenu"
                          icon={categoryInfoMap['kindermenu'].icon}
                          title={categoryInfoMap['kindermenu'].title}
                          subtitle="Kids Menu"
                          isActive={selectedCategory === 'kindermenu'}
                          onClick={() => setSelectedCategory('kindermenu')}
                        />
                      </div>
                    )}
                  </div>
                </SwiperSlide>

                {/* Slide 4: Supplementen & Desserten */}
                <SwiperSlide>
                  <div className="row g-3">
                    {/* Supplementen Card */}
                    {categories.includes('supplementen') && categoryInfoMap['supplementen'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-supplementen"
                          icon={categoryInfoMap['supplementen'].icon}
                          title={categoryInfoMap['supplementen'].title}
                          subtitle="Extras"
                          isActive={selectedCategory === 'supplementen'}
                          onClick={() => setSelectedCategory('supplementen')}
                        />
                      </div>
                    )}

                    {/* Desserten Card */}
                    {categories.includes('desserten') && categoryInfoMap['desserten'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-desserten"
                          icon={categoryInfoMap['desserten'].icon}
                          title={categoryInfoMap['desserten'].title}
                          subtitle="Desserts"
                          isActive={selectedCategory === 'desserten'}
                          onClick={() => setSelectedCategory('desserten')}
                        />
                      </div>
                    )}
                  </div>
                </SwiperSlide>

                {/* Slide 5: Dranken */}
                <SwiperSlide>
                  <div className="row g-3">
                    {/* Mocktails Card */}
                    {categories.includes('mocktails') && categoryInfoMap['mocktails'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-mocktails"
                          icon={categoryInfoMap['mocktails'].icon}
                          title={categoryInfoMap['mocktails'].title}
                          subtitle="Cocktails"
                          isActive={selectedCategory === 'mocktails'}
                          onClick={() => setSelectedCategory('mocktails')}
                        />
                      </div>
                    )}

                    {/* Frisdranken Card */}
                    {categories.includes('frisdranken') && categoryInfoMap['frisdranken'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-frisdranken"
                          icon={categoryInfoMap['frisdranken'].icon}
                          title={categoryInfoMap['frisdranken'].title}
                          subtitle="Soft Drinks"
                          isActive={selectedCategory === 'frisdranken'}
                          onClick={() => setSelectedCategory('frisdranken')}
                        />
                      </div>
                    )}

                    {/* Warme Dranken Card */}
                    {categories.includes('warme-dranken') && categoryInfoMap['warme-dranken'] && (
                      <div className="col-6 col-md-4">
                        <MenuCategoryCard
                          filter=".filter-warme-dranken"
                          icon={categoryInfoMap['warme-dranken'].icon}
                          title={categoryInfoMap['warme-dranken'].title}
                          subtitle="Hot Drinks"
                          isActive={selectedCategory === 'warme-dranken'}
                          onClick={() => setSelectedCategory('warme-dranken')}
                        />
                      </div>
                    )}
                  </div>
                </SwiperSlide>

              </Swiper>

              {/* Custom Navigation Buttons */}
              <div
                className="swiper-button-prev-menu position-absolute"
                style={{
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  cursor: 'pointer',
                  width: '60px',
                  height: '60px',
                }}
              >
                <div
                  className="menu-carousel-nav-btn rounded-circle d-flex align-items-center justify-content-center position-relative overflow-hidden"
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.9) 0%, rgba(255, 179, 0, 0.9) 100%)',
                    border: '2px solid rgba(255, 193, 7, 0.5)',
                    boxShadow: '0 4px 20px rgba(255, 193, 7, 0.3)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget;
                    btn.style.transform = 'scale(1.15)';
                    btn.style.boxShadow = '0 6px 30px rgba(255, 193, 7, 0.6), 0 0 0 4px rgba(255, 193, 7, 0.2)';
                    btn.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 1) 0%, rgba(255, 179, 0, 1) 100%)';
                    const overlay = btn.querySelector('div:last-child') as HTMLElement;
                    if (overlay) overlay.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget;
                    btn.style.transform = 'scale(1)';
                    btn.style.boxShadow = '0 4px 20px rgba(255, 193, 7, 0.3)';
                    btn.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.9) 0%, rgba(255, 179, 0, 0.9) 100%)';
                    const overlay = btn.querySelector('div:last-child') as HTMLElement;
                    if (overlay) overlay.style.opacity = '0';
                  }}
                >
                  <i className="bi bi-chevron-left fs-5 fw-bold text-black position-relative" style={{ zIndex: 2 }}></i>
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                </div>
                <span className="visually-hidden">Vorige categorieën</span>
              </div>
              <div
                className="swiper-button-next-menu position-absolute"
                style={{
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  cursor: 'pointer',
                  width: '60px',
                  height: '60px',
                }}
              >
                <div
                  className="menu-carousel-nav-btn rounded-circle d-flex align-items-center justify-content-center position-relative overflow-hidden"
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.9) 0%, rgba(255, 179, 0, 0.9) 100%)',
                    border: '2px solid rgba(255, 193, 7, 0.5)',
                    boxShadow: '0 4px 20px rgba(255, 193, 7, 0.3)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget;
                    btn.style.transform = 'scale(1.15)';
                    btn.style.boxShadow = '0 6px 30px rgba(255, 193, 7, 0.6), 0 0 0 4px rgba(255, 193, 7, 0.2)';
                    btn.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 1) 0%, rgba(255, 179, 0, 1) 100%)';
                    const overlay = btn.querySelector('div:last-child') as HTMLElement;
                    if (overlay) overlay.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget;
                    btn.style.transform = 'scale(1)';
                    btn.style.boxShadow = '0 4px 20px rgba(255, 193, 7, 0.3)';
                    btn.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.9) 0%, rgba(255, 179, 0, 0.9) 100%)';
                    const overlay = btn.querySelector('div:last-child') as HTMLElement;
                    if (overlay) overlay.style.opacity = '0';
                  }}
                >
                  <i className="bi bi-chevron-right fs-5 fw-bold text-black position-relative" style={{ zIndex: 2 }}></i>
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                </div>
                <span className="visually-hidden">Volgende categorieën</span>
              </div>

              {/* Custom Pagination */}
              <div
                className="swiper-pagination-menu position-relative d-flex justify-content-center align-items-center gap-2 mt-4"
                style={{ zIndex: 1 }}
              ></div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div id="menu-items-container" className="row g-4">
          {filteredItems().map(({ item, category, isHeader }, index) => {
            if (isHeader) {
              const info = categoryInfoMap[category];
              if (!info) return null;
              return (
                <div key={`header-${category}`} className="col-12">
                  <div
                    className="category-header d-flex align-items-center justify-content-center py-5 mb-4 mt-5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 193, 7, 0.05))',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 193, 7, 0.2)',
                    }}
                  >
                    <div className="text-center" style={{ maxWidth: '600px' }}>
                      <div className="d-flex align-items-center justify-content-center mb-4">
                        <div className="bg-warning opacity-50" style={{ width: '60px', height: '1px' }}></div>
                        <div
                          className="mx-3 bg-dark border border-warning rounded-circle d-flex align-items-center justify-content-center"
                          style={{ 
                            width: 'clamp(64px, 16vw, 48px)', 
                            height: 'clamp(64px, 16vw, 48px)' 
                          }}
                        >
                          {(() => {
                            const IconComponent = info.icon;
                            return (
                              <IconComponent 
                                className="text-warning" 
                                style={{ 
                                  fontSize: 'clamp(2rem, 10vw, 1.5rem)' 
                                }} 
                              />
                            );
                          })()}
                        </div>
                        <div className="bg-warning opacity-50" style={{ width: '60px', height: '1px' }}></div>
                      </div>
                      <h3
                        className="display-6 fw-bold text-warning mb-2"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {info.title}
                      </h3>
                      <p className="text-white-50 small">{info.description}</p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <MenuItem
                key={`${category}-${item.id}-${index}`}
                item={item}
                category={category}
                onAllergenClick={handleAllergenClick}
              />
            );
          })}
        </div>
      </div>

      {/* Allergen Popup */}
      {showAllergenPopup && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={() => setShowAllergenPopup(false)}
        >
          <div
            className="bg-dark border border-warning rounded-3 p-4"
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-warning mb-0">
                <i className="bi bi-shield-exclamation me-2"></i>Allergenen Informatie
              </h6>
              <button
                className="btn-close btn-close-white"
                onClick={() => setShowAllergenPopup(false)}
                aria-label="Close"
              ></button>
            </div>
            <p className="text-white mb-0">{allergenDescription}</p>
            <div className="mt-3 text-center">
              <button
                className="btn btn-warning btn-sm px-3 py-2 rounded-pill"
                onClick={() => setShowAllergenPopup(false)}
              >
                <i className="bi bi-check-circle me-1"></i>Begrepen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Category Selector - Floating Button - Only show when menu section is visible */}
      {isMenuSectionVisible && (
        <div
          className="d-md-none position-fixed"
          style={{
            bottom: '20px',
            right: '20px',
            zIndex: 9997,
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
        {/* Pulse Animation Ring */}
        <div
          className="position-absolute rounded-circle"
          style={{
            width: '64px',
            height: '64px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 193, 7, 0.3)',
            animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            pointerEvents: 'none',
          }}
        />
        <style>{`
          @keyframes pulse-ring {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0;
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
        <button
          onClick={() => setShowCategoryModal(true)}
          className="btn btn-warning rounded-circle shadow-lg border-0 d-flex align-items-center justify-content-center position-relative"
          style={{
            width: '64px',
            height: '64px',
            boxShadow: '0 4px 20px rgba(255, 193, 7, 0.4), 0 0 0 4px rgba(255, 193, 7, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 30px rgba(255, 193, 7, 0.6), 0 0 0 6px rgba(255, 193, 7, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 193, 7, 0.4), 0 0 0 4px rgba(255, 193, 7, 0.1)';
          }}
          aria-label="Open categorieën menu"
        >
          <i className="bi bi-grid-3x3-gap text-black fs-3"></i>
        </button>
      </div>
      )}

      {/* Category Selector Modal */}
      <CategorySelectorModal
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </section>
  );
};

export default Menu;

