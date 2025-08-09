
(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let header = select('#header')
    let offset = header.offsetHeight

    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos - offset,
      behavior: 'smooth'
    })
  }

  /**
   * Toggle .header-scrolled class to #header when page is scrolled
   */
  let selectHeader = select('#header')
  let selectTopbar = select('#topbar')
  if (selectHeader) {
    const headerScrolled = () => {
      if (window.scrollY > 100) {
        selectHeader.classList.add('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.add('topbar-scrolled')
        }
      } else {
        selectHeader.classList.remove('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.remove('topbar-scrolled')
        }
      }
    }
    window.addEventListener('load', headerScrolled)
    onscroll(document, headerScrolled)
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('#navbar').classList.toggle('navbar-mobile')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Mobile nav dropdowns activate
   */
  on('click', '.navbar .dropdown > a', function(e) {
    if (select('#navbar').classList.contains('navbar-mobile')) {
      e.preventDefault()
      this.nextElementSibling.classList.toggle('dropdown-active')
    }
  }, true)

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let navbar = select('#navbar')
      if (navbar.classList.contains('navbar-mobile')) {
        navbar.classList.remove('navbar-mobile')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove()
    });
  }



  /**
   * Initiate glightbox 
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Events slider
   */
  new Swiper('.events-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20
      },

      1200: {
        slidesPerView: 3,
        spaceBetween: 20
      }
    }
  });

  /**
   * Enhanced Menu Categories Carousel with modern features
   */
      const categorySwiper = new Swiper('.category-swiper', {
      speed: 800,
      loop: false,
      slidesPerView: 'auto',
      spaceBetween: 24,
      centeredSlides: true,
      allowTouchMove: true,
      preventClicks: false,
      preventClicksPropagation: false,
      grabCursor: true,
      watchSlidesProgress: true,
      parallax: true,
      effect: 'slide',
      coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 100,
        modifier: 2,
        slideShadows: false,
      },
      navigation: {
        enabled: false
      },
      pagination: {
        el: '.category-pagination',
        type: 'bullets',
        clickable: true,
        dynamicBullets: true,
        dynamicMainBullets: 3,
        renderBullet: function (index, className) {
          return '<span class="' + className + ' w-3 h-3 bg-golden-400/30 hover:bg-golden-400/60 rounded-full transition-all duration-300 cursor-pointer"></span>';
        }
      },
      autoplay: {
        delay: 4000,
        disableOnInteraction: true,
        pauseOnMouseEnter: true,
      },
      freeMode: {
        enabled: true,
        sticky: false,
        momentumRatio: 0.25,
        momentumVelocityRatio: 0.25,
      },
      mousewheel: {
        enabled: true,
        forceToAxis: true,
        sensitivity: 0.5,
      },
    breakpoints: {
      320: {
        slidesPerView: 1.3,
        spaceBetween: 16,
        centeredSlides: true
      },
      480: {
        slidesPerView: 1.8,
        spaceBetween: 20,
        centeredSlides: true
      },
      768: {
        slidesPerView: 2.8,
        spaceBetween: 24,
        centeredSlides: false
      },
      992: {
        slidesPerView: 3.8,
        spaceBetween: 28,
        centeredSlides: false
      },
      1200: {
        slidesPerView: 4.8,
        spaceBetween: 32,
        centeredSlides: false
      },
      1400: {
        slidesPerView: 5.5,
        spaceBetween: 36,
        centeredSlides: false
      }
    },
    on: {
      init: function () {
        console.log('Category carousel initialized');
      },
      slideChange: function () {
        // Update pagination progress bar
        const progressBar = document.querySelector('.swiper-pagination-progressbar-fill');
        if (progressBar) {
          const progress = (this.activeIndex / (this.slides.length - this.slidesPerViewDynamic())) * 100;
          progressBar.style.width = Math.min(progress, 100) + '%';
        }
        
        // Update main carousel progress bar
        const carouselProgressBar = document.querySelector('.carousel-progress-bar');
        if (carouselProgressBar) {
          const carouselProgress = (this.activeIndex / (this.slides.length - this.slidesPerViewDynamic())) * 100;
          carouselProgressBar.style.width = Math.min(carouselProgress, 100) + '%';
        }
      },
      progress: function (swiper, progress) {
        // Real-time progress update for smoother animation
        const carouselProgressBar = document.querySelector('.carousel-progress-bar');
        if (carouselProgressBar) {
          carouselProgressBar.style.width = (progress * 100) + '%';
        }
      },
      touchStart: function () {
        // Add touch feedback
        this.el.style.transform = 'scale(0.98)';
      },
      touchEnd: function () {
        // Remove touch feedback
        this.el.style.transform = 'scale(1)';
      }
    }
  });

  // Enhanced custom navigation for category carousel
  const nextButton = document.querySelector('.category-swiper-button-next');
  const prevButton = document.querySelector('.category-swiper-button-prev');
  
  if (nextButton) {
    nextButton.addEventListener('click', (e) => {
      e.preventDefault();
      categorySwiper.slideNext();
      
      // Add visual feedback
      nextButton.style.transform = 'scale(0.9)';
      setTimeout(() => {
        nextButton.style.transform = 'scale(1)';
      }, 150);
    });
  }
  
  if (prevButton) {
    prevButton.addEventListener('click', (e) => {
      e.preventDefault();
      categorySwiper.slidePrev();
      
      // Add visual feedback
      prevButton.style.transform = 'scale(0.9)';
      setTimeout(() => {
        prevButton.style.transform = 'scale(1)';
      }, 150);
    });
  }

  // Add keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && prevButton) {
      categorySwiper.slidePrev();
    } else if (e.key === 'ArrowRight' && nextButton) {
      categorySwiper.slideNext();
    }
  });

  // Auto-hide navigation on mobile when not needed
  function updateNavigationVisibility() {
    const container = document.querySelector('.menu-category-carousel');
    if (container && window.innerWidth < 768) {
      const isScrollable = categorySwiper.slides.length > categorySwiper.slidesPerViewDynamic();
      if (nextButton) nextButton.style.display = isScrollable ? 'flex' : 'none';
      if (prevButton) prevButton.style.display = isScrollable ? 'flex' : 'none';
    } else {
      if (nextButton) nextButton.style.display = 'flex';
      if (prevButton) prevButton.style.display = 'flex';
    }
  }

  window.addEventListener('resize', updateNavigationVisibility);
  updateNavigationVisibility();

  /**
   * Menu filtering functionality
   */
  window.addEventListener('load', () => {
    let menuContainer = select('#menu-items-container');
    if (menuContainer) {
      let menuFilters = select('.menu-category-card', true);

      on('click', '.menu-category-card', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove active class from all filters
        menuFilters.forEach(function(el) {
          el.classList.remove('filter-active');
          el.classList.remove('bg-gradient-to-br', 'from-golden-400', 'to-golden-600', 'border-2', 'border-golden-400', 'shadow-lg', 'shadow-golden-400/25');
          el.classList.add('bg-dark-800/80', 'backdrop-blur-sm', 'border', 'border-golden-400/30');
        });
        
        // Add active class to clicked filter
        this.classList.add('filter-active');
        this.classList.remove('bg-dark-800/80', 'backdrop-blur-sm', 'border', 'border-golden-400/30');
        this.classList.add('bg-gradient-to-br', 'from-golden-400', 'to-golden-600', 'border-2', 'border-golden-400', 'shadow-lg', 'shadow-golden-400/25');

        // Get the filter value
        const filterValue = this.getAttribute('data-filter');
        
        // Get all menu items
        const menuItems = menuContainer.querySelectorAll('.menu-item');
        
        // Clear container and rebuild with filtered content
        menuContainer.innerHTML = '';
        console.log('🔄 Filtering with value:', filterValue);
        console.log('📊 Original menu data available:', !!window.originalMenuData);
        
        // Get the original menu data from window object (stored during initial load)
        if (window.originalMenuData) {
          const fragment = document.createDocumentFragment();
          
          if (filterValue === '*') {
            console.log('🌟 Showing all categories');
            // Show all categories and items
            Object.keys(window.originalMenuData).forEach(category => {
              // Add category header
              const categoryHeader = createCategoryHeader(category);
              if (categoryHeader) {
                fragment.appendChild(categoryHeader);
              }
              
              // Add category items
              window.originalMenuData[category].forEach(item => {
                const menuItem = createMenuItemComponent(item, category);
                if (menuItem) {
                  fragment.appendChild(menuItem);
                }
              });
            });
          } else {
            // Show only selected category
            const filterCategory = filterValue.substring(1); // Remove the '.' prefix (e.g., "filter-voorgerechten")
            const targetCategory = filterCategory.replace('filter-', ''); // Remove "filter-" prefix (e.g., "voorgerechten")
            console.log('🎯 Filtering for category:', filterCategory, '→', targetCategory);
            console.log('📋 Category data exists:', !!window.originalMenuData[targetCategory]);
            
            if (window.originalMenuData[targetCategory]) {
              console.log('📝 Items in category:', window.originalMenuData[targetCategory].length);
              
              // Add category header
              const categoryHeader = createCategoryHeader(targetCategory);
              if (categoryHeader) {
                fragment.appendChild(categoryHeader);
                console.log('✅ Category header added');
              }
              
              // Add category items
              window.originalMenuData[targetCategory].forEach((item, index) => {
                const menuItem = createMenuItemComponent(item, targetCategory);
                if (menuItem) {
                  fragment.appendChild(menuItem);
                  console.log(`✅ Menu item ${index + 1} added: ${item.name}`);
                }
              });
            } else {
              console.error('❌ No data found for category:', targetCategory);
              console.log('📋 Available categories:', Object.keys(window.originalMenuData));
            }
          }
          
          // Append all filtered content at once
          menuContainer.appendChild(fragment);
          console.log('✅ Fragment appended to container');
          
          // Ensure proper Bootstrap layout
          setTimeout(() => {
            menuContainer.className = 'row g-4';
            console.log('✅ Bootstrap layout applied');
          }, 50);
        } else {
          console.error('❌ No original menu data available');
        }
        
        // Update active filter indicator
        const filterIndicator = document.getElementById('active-filter-indicator');
        const filterText = document.getElementById('active-filter-text');
        
        if (filterIndicator && filterText) {
          if (filterValue === '*') {
            filterIndicator.style.display = 'none';
          } else {
            const categoryName = this.querySelector('h6').textContent;
            filterText.textContent = categoryName;
            filterIndicator.style.display = 'block';
          }
        }
        
        // Scroll to menu items container with smooth animation
        setTimeout(() => {
          const menuItemsContainer = document.getElementById('menu-items-container');
          if (menuItemsContainer) {
            menuItemsContainer.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100); // Small delay to ensure filtering is complete
        
        // Refresh AOS animations
        if (typeof AOS !== 'undefined') {
          AOS.refresh();
        }
      }, true);
    }
  });

  /**
   * Initiate gallery lightbox 
   */
  const galleryLightbox = GLightbox({
    selector: '.gallery-lightbox'
  });

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    })
  });

})()

// Create category header component
function createCategoryHeader(category) {
  const categoryInfo = {
    'voorgerechten': {
      title: 'Voorgerechten',
      description: 'Heerlijke starters om je maaltijd mee te beginnen',
      icon: 'bi-egg-fried'
    },
    'mixed-grill': {
      title: 'Mixed Grill',
      description: 'Onze specialiteit: perfect gegrilde vlees combinaties',
      icon: 'bi-fire'
    },
    'kumpir': {
      title: 'Kumpir',
      description: 'Turkse gevulde aardappels met heerlijke toppings',
      icon: 'bi-geo-alt'
    },
    'spareribs': {
      title: 'Spareribs',
      description: 'Malse spareribs met onze huisgemaakte sauzen',
      icon: 'bi-grid-3x3-gap'
    },
    'burgers': {
      title: 'Burgers',
      description: 'Sappige burgers met verse ingrediënten',
      icon: 'bi-cup-hot'
    },
    'kindermenu': {
      title: 'Kindermenu',
      description: 'Speciaal samengesteld voor onze jongste gasten',
      icon: 'bi-emoji-smile'
    },
    'supplementen': {
      title: 'Supplementen',
      description: 'Extra\'s om je gerecht compleet te maken',
      icon: 'bi-plus-circle'
    },
    'desserten': {
      title: 'Desserten',
      description: 'Zoete afsluiting van je perfecte maaltijd',
      icon: 'bi-heart'
    },
    'mocktails': {
      title: 'Mocktails',
      description: 'Verfrissende alcoholvrije cocktails',
      icon: 'bi-cup-straw'
    },
    'frisdranken': {
      title: 'Frisdranken',
      description: 'Koude en verfrissende drankjes',
      icon: 'bi-droplet'
    },
    'warme-dranken': {
      title: 'Warme Dranken',
      description: 'Warme dranken voor gezellige momenten',
      icon: 'bi-cup'
    }
  };

  const info = categoryInfo[category];
  if (!info) return null;

  const headerElement = document.createElement('div');
  headerElement.className = `category-header filter-${category} col-12 d-flex align-items-center justify-content-center py-5 mb-4 mt-5`;
  headerElement.setAttribute('data-category', category);
  
  headerElement.innerHTML = `
    <div class="text-center" style="max-width: 600px;">
      <div class="d-flex align-items-center justify-content-center mb-4">
        <div class="bg-warning opacity-50" style="width: 60px; height: 1px;"></div>
        <div class="mx-3 bg-dark border border-warning rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
          <i class="${info.icon} text-warning fs-4"></i>
        </div>
        <div class="bg-warning opacity-50" style="width: 60px; height: 1px;"></div>
      </div>
      <h3 class="display-6 fw-bold text-warning mb-2" style="font-family: 'Playfair Display', serif;">${info.title}</h3>
      <p class="text-white-50 small">${info.description}</p>
    </div>
  `;
  
  return headerElement;
}

// Menu Items Component System - DIRECT HTML GENERATION
function createMenuItemComponent(itemData, category) {
  // Create menu item directly with HTML
  const menuItem = document.createElement('div');
  menuItem.className = `menu-item filter-${category} col-12 col-md-6 col-lg-4 col-xl-3 mb-4`;
  menuItem.setAttribute('data-item-id', itemData.id);
  
  // Generate allergen HTML for breadcrumb section
  let breadcrumbAllergensHTML = '';
  itemData.allergens.forEach(allergen => {
    const colors = {
      'red': '#dc3545', 'orange': '#ff7e00', 'yellow': '#ffc107',
      'green': '#28a745', 'blue': '#007bff', 'purple': '#6f42c1',
      'cyan': '#17a2b8', 'amber': '#ff9f43'
    };
    const bgColor = colors[allergen.color] || '#dc3545';
    const textColor = allergen.color === 'yellow' ? '#000' : '#fff';
    
    breadcrumbAllergensHTML += `
      <span class="allergen-symbol allergen-${allergen.color} badge rounded-circle d-inline-flex align-items-center justify-content-center fw-bold" 
            data-allergen="${allergen.description}"
            title="${allergen.type}: ${allergen.description}"
            style="background: ${bgColor} !important; color: ${textColor} !important; border: 2px solid ${bgColor} !important; width: 28px; height: 28px; font-size: 11px; cursor: pointer;">
        ${allergen.code}
      </span>`;
  });
  

  
  // Set complete HTML content
  menuItem.innerHTML = `
    <div class="bg-black border border-warning rounded-3 overflow-hidden h-100 shadow-sm" style="transition: all 0.3s ease;">
      <!-- Image with overlay -->
      <div class="position-relative">
        <img class="w-100" style="height: 220px; object-fit: cover;" src="${itemData.image}" alt="${itemData.alt}">
        <div class="position-absolute top-0 end-0 m-3">
          <span class="badge bg-warning text-black fs-6 fw-bold px-3 py-2 rounded-pill">
            ${itemData.price}
          </span>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-4">
        <!-- Title -->
        <h5 class="text-white fw-bold mb-3 lh-sm" style="font-family: 'Playfair Display', serif; min-height: 2.5rem;">
          <a href="#${itemData.id}" class="text-white text-decoration-none" style="transition: color 0.3s;">
            ${itemData.name}
          </a>
        </h5>
        
        <!-- Description -->
        <p class="text-white-50 small mb-3 lh-base" style="min-height: 3rem;">
          ${itemData.description}
        </p>
        
        <!-- Allergen Section -->
        <div class="border-top border-warning pt-3">
          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-info-circle text-warning me-2"></i>
            <span class="small text-warning fw-medium">Allergenen:</span>
          </div>
          <div class="d-flex flex-wrap gap-1 allergen-symbols mb-2">
            ${breadcrumbAllergensHTML}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add click events to all allergen elements
  const allergenElements = menuItem.querySelectorAll('.allergen, .allergen-symbol');
  allergenElements.forEach(element => {
    element.addEventListener('click', function() {
      const description = this.getAttribute('data-allergen');
      if (description) {
        showAllergenInfo(description);
      }
    });
  });
  
  return menuItem;
}



async function generateMenuItems() {
  const container = document.getElementById('menu-items-container');
  
  if (!container) {
    console.error('❌ Container not found!');
    return;
  }
  
  // Clear container for menu items
  container.innerHTML = '';
  
  try {
    let menuData = null;
    
    // Try to use preloaded data first
    if (menuDataPromise) {
      console.log('🚀 Using preloaded menu data...');
      menuData = await menuDataPromise;
    }
    
    // If preloading failed or no preloaded data, fetch directly
    if (!menuData) {
      console.log('📡 Fetching menu data directly...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('assets/data/menu.json', {
        signal: controller.signal,
        cache: 'default' // Enable caching for faster subsequent loads
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      menuData = await response.json();
    }
    
    console.log('🚀 Starting optimized HTML generation from external JSON...');
    
    // Store original menu data for filtering
    window.originalMenuData = menuData;
    console.log('📊 Stored original menu data:', Object.keys(menuData));
    console.log('📋 Total categories:', Object.keys(menuData).length);
    
    // Clear existing items
    container.innerHTML = '';
    
    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    let itemCount = 0;
    
    // Generate items for each category with category headers
    Object.keys(menuData).forEach((category, categoryIndex) => {
      // Add category header before each category (except when filtering)
      const categoryHeader = createCategoryHeader(category);
      if (categoryHeader) {
        fragment.appendChild(categoryHeader);
      }
      
      menuData[category].forEach(item => {
        console.log(`📝 Generating HTML for ${item.name} with ${item.allergens.length} allergens`);
        const menuItem = createMenuItemComponent(item, category);
        if (menuItem) {
          fragment.appendChild(menuItem);
          itemCount++;
        }
      });
    });
    
    // Append all items at once for better performance
    container.appendChild(fragment);
    console.log(`✅ Added ${itemCount} menu items to container in one batch`);
    
    // Setup Bootstrap row layout
    setTimeout(() => {
      container.className = 'row g-4';
      
      // Ensure all menu items are properly displayed
      const menuItems = container.querySelectorAll('.menu-item');
      menuItems.forEach(item => {
        // Remove any inline styles that might interfere with Bootstrap
        item.style.display = '';
        item.style.flexDirection = '';
        item.style.position = '';
        item.style.width = '';
        item.style.height = '';
        item.style.margin = '';
        item.style.opacity = '1';
        item.style.transform = 'none';
      });
    }, 100);
  
  } catch (error) {
    console.error('❌ Error loading menu data:', error);
    
    // Fallback: Try to load from inline script tag if external JSON fails
    try {
      const fallbackElement = document.getElementById('menu-items-data');
      if (fallbackElement && fallbackElement.textContent.trim()) {
        console.log('🔄 Falling back to inline menu data...');
        const menuData = JSON.parse(fallbackElement.textContent);
        const container = document.getElementById('menu-items-container');
        
        if (container) {
          container.innerHTML = '';
          Object.keys(menuData).forEach(category => {
            // Add category header
            const categoryHeader = createCategoryHeader(category);
            if (categoryHeader) {
              container.appendChild(categoryHeader);
            }
            
            menuData[category].forEach(item => {
              const menuItem = createMenuItemComponent(item, category);
              if (menuItem) {
                container.appendChild(menuItem);
              }
            });
          });
        }
      } else {
        // Show error message to user
        const container = document.getElementById('menu-items-container');
        if (container) {
          container.innerHTML = `
            <div class="col-span-full text-center py-12">
              <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md mx-auto">
                <i class="bi bi-exclamation-triangle text-red-400 text-4xl mb-4"></i>
                <h3 class="text-xl font-bold text-red-400 mb-2">Menu niet beschikbaar</h3>
                <p class="text-white/70">Er is een probleem opgetreden bij het laden van het menu. Probeer de pagina te vernieuwen.</p>
                <button onclick="location.reload()" class="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors">
                  Vernieuw pagina
                </button>
              </div>
            </div>
          `;
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
  }
}

function showAllergenInfo(description) {
  // Create a modern modal for allergen information
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-gradient-to-br from-dark-800/95 to-dark-900/95 border-2 border-golden-400/40 rounded-2xl p-8 max-w-lg w-full shadow-2xl shadow-golden-400/20 backdrop-blur-lg transform animate-scaleIn">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <i class="bi bi-shield-exclamation text-golden-400 text-2xl"></i>
          <h3 class="text-2xl font-playfair font-bold text-golden-400">Allergenen Informatie</h3>
        </div>
        <button class="text-white/70 hover:text-golden-400 transition-all duration-300 text-3xl hover:scale-110 hover:rotate-90 w-10 h-10 flex items-center justify-center rounded-full hover:bg-golden-400/10" onclick="this.closest('.fixed').remove()">&times;</button>
      </div>
      
      <!-- Content -->
      <div class="bg-dark-700/50 rounded-xl p-6 border border-golden-400/20 mb-6">
        <p class="text-white/90 leading-relaxed text-lg">${description}</p>
      </div>
      
      <!-- Footer -->
      <div class="flex justify-center gap-3">
        <button class="bg-gradient-to-r from-golden-400 to-golden-500 text-dark-900 hover:from-golden-300 hover:to-golden-400 px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-golden-400/30" onclick="this.closest('.fixed').remove()">
          <i class="bi bi-check-circle mr-2"></i>
          Begrepen
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.add('animate-fadeOut');
      setTimeout(() => modal.remove(), 300);
    }
  });
  
  // Close with Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.classList.add('animate-fadeOut');
      setTimeout(() => modal.remove(), 300);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Preload menu data as early as possible
let menuDataPromise = null;

// Start preloading immediately when script loads
function preloadMenuData() {
  if (!menuDataPromise) {
    console.log('🔄 Preloading menu data...');
    menuDataPromise = fetch('assets/data/menu.json', {
      cache: 'default'
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }).catch(error => {
      console.warn('⚠️ Preload failed, will try again later:', error);
      menuDataPromise = null; // Reset so we can try again
      return null;
    });
  }
  return menuDataPromise;
}

// Start preloading immediately
preloadMenuData();

// Early menu loading - start as soon as the container is available
function tryEarlyMenuLoad() {
  const container = document.getElementById('menu-items-container');
  if (container && !container.hasAttribute('data-menu-loaded')) {
    container.setAttribute('data-menu-loaded', 'loading');
    console.log('🚀 Starting early menu load...');
    generateMenuItems().then(() => {
      container.setAttribute('data-menu-loaded', 'complete');
    }).catch(error => {
      console.error('Early menu load failed:', error);
      container.removeAttribute('data-menu-loaded');
    });
    return true;
  }
  return false;
}

// Try loading menu as soon as possible
if (document.readyState === 'loading') {
  // If document is still loading, check periodically
  const checkInterval = setInterval(() => {
    if (tryEarlyMenuLoad()) {
      clearInterval(checkInterval);
    }
  }, 50); // Check every 50ms
  
  // Clear interval after 2 seconds to avoid infinite checking
  setTimeout(() => clearInterval(checkInterval), 2000);
} else {
  // Document already loaded, try immediately
  tryEarlyMenuLoad();
}

// Initialize menu items when DOM is loaded (fallback)
document.addEventListener('DOMContentLoaded', async function() {
  const container = document.getElementById('menu-items-container');
  
  // Only load if not already loaded/loading
  if (!container || !container.hasAttribute('data-menu-loaded')) {
    console.log('🔄 DOM loaded, starting menu load...');
    const menuLoadPromise = generateMenuItems();
    await menuLoadPromise;
  } else {
    console.log('✅ Menu already loaded or loading');
  }
  
  // Debug: Check if allergens are actually in the DOM after 2 seconds
  setTimeout(() => {
    const allergens = document.querySelectorAll('.allergen');
    const testAllergens = document.querySelectorAll('.allergen-red, .allergen-orange');
    const menuItems = document.querySelectorAll('.menu-item');
    
    console.log(`🔍 Found ${allergens.length} total allergen elements in DOM`);
    console.log(`🧪 Found ${testAllergens.length} test allergens`);
    console.log(`📋 Found ${menuItems.length} menu items`);
    
    // Check containers in menu items
    menuItems.forEach((item, index) => {
      const breadcrumbContainer = item.querySelector('.allergen-symbols');
      const mainContainer = item.querySelector('div.flex.flex-wrap.gap-2.mt-auto');
      console.log(`Menu item ${index + 1}:`, {
        breadcrumbContainer: !!breadcrumbContainer,
        mainContainer: !!mainContainer,
        breadcrumbChildren: breadcrumbContainer ? breadcrumbContainer.children.length : 0,
        mainChildren: mainContainer ? mainContainer.children.length : 0
      });
    });
    
    if (allergens.length > 0) {
      const firstAllergen = allergens[0];
      console.log('🎯 First allergen:', {
        element: firstAllergen,
        classes: firstAllergen.className,
        text: firstAllergen.textContent,
        parent: firstAllergen.parentElement,
        visible: firstAllergen.offsetWidth > 0 && firstAllergen.offsetHeight > 0
      });
    }
  }, 2000);
});

