
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
        
        // Show/hide menu items based on filter
        menuItems.forEach(item => {
          if (filterValue === '*' || item.classList.contains(filterValue.substring(1))) {
            item.style.display = 'block';
            item.style.opacity = '1';
            item.style.transform = 'none';
          } else {
            item.style.display = 'none';
            item.style.opacity = '0';
            item.style.transform = 'scale(0.8)';
          }
        });
        
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

// Menu Items Component System - DIRECT HTML GENERATION
function createMenuItemComponent(itemData, category) {
  // Create menu item directly with HTML
  const menuItem = document.createElement('div');
  menuItem.className = `menu-item filter-${category} bg-gradient-to-br from-dark-800/90 to-dark-900/90 backdrop-blur-lg border border-golden-400/20 rounded-2xl overflow-hidden hover:border-golden-400/50 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-golden-400/20 transition-all duration-500 h-full group`;
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
      <span class="allergen-symbol allergen-${allergen.color} inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg relative z-10" 
            data-allergen="${allergen.description}"
            title="${allergen.type}: ${allergen.description}"
            style="background: ${bgColor} !important; color: ${textColor} !important; border: 2px solid ${bgColor} !important; box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;">
        ${allergen.code}
      </span>`;
  });
  

  
  // Set complete HTML content
  menuItem.innerHTML = `
    <div class="relative overflow-hidden">
      <!-- Image with overlay -->
      <div class="relative">
        <img class="w-full object-cover transition-transform duration-500 group-hover:scale-110" style="height: 300px;" src="${itemData.image}" alt="${itemData.alt}">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div class="absolute top-4 right-4 bg-golden-400/90 backdrop-blur-sm text-dark-900 px-3 py-1 rounded-full font-bold text-lg shadow-lg">
          ${itemData.price}
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6 flex flex-col h-full">
        <!-- Title -->
        <div class="mb-4">
          <a href="#${itemData.id}" class="text-xl font-playfair font-bold text-white hover:text-golden-400 transition-colors duration-300 group-hover:text-golden-300">
            ${itemData.name}
          </a>
        </div>
        
        <!-- Description -->
        <div class="text-white/70 text-sm mb-6 flex-grow min-h-[3rem] leading-relaxed group-hover:text-white/80 transition-colors duration-300">
          ${itemData.description}
        </div>
        
        <!-- Allergen Section -->
        <div class="mt-auto bg-dark-700/50 rounded-xl p-4 border border-golden-400/10 group-hover:border-golden-400/20 transition-colors duration-300">
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-1">
              <i class="bi bi-shield-exclamation text-golden-400 text-base"></i>
              <span class="text-sm text-golden-300 font-semibold">Allergenen</span>
            </div>
            <div class="text-xs text-white/60 italic ml-6">Klik voor details</div>
          </div>
          <div class="flex flex-wrap gap-2 allergen-symbols">
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

function generateMenuItems() {
  const menuData = JSON.parse(document.getElementById('menu-items-data').textContent);
  const container = document.getElementById('menu-items-container');
  
  if (!container) {
    console.error('❌ Container not found!');
    return;
  }
  
  // Clear existing items
  container.innerHTML = '';
  
  console.log('🚀 Starting new HTML generation...');
  
  // Generate items for each category
  Object.keys(menuData).forEach(category => {
    menuData[category].forEach(item => {
      console.log(`📝 Generating HTML for ${item.name} with ${item.allergens.length} allergens`);
      const menuItem = createMenuItemComponent(item, category);
      if (menuItem) {
        container.appendChild(menuItem);
        console.log(`✅ Added ${item.name} to container`);
      }
    });
  });
  
  // Ensure proper grid layout with modern responsive design
  setTimeout(() => {
    container.style.display = 'grid';
    container.style.width = '100%';
    container.style.alignItems = 'stretch';
    container.style.justifyContent = 'center';
    container.style.margin = '0 auto';
    
    // Add responsive breakpoint adjustments with proper centering
    const updateGridLayout = () => {
      const width = window.innerWidth;
      if (width >= 1536) { // 2xl
        container.style.gridTemplateColumns = 'repeat(4, 1fr)';
        container.style.gap = '2rem';
        container.style.maxWidth = '1536px';
      } else if (width >= 1280) { // xl
        container.style.gridTemplateColumns = 'repeat(3, 1fr)';
        container.style.gap = '1.5rem';
        container.style.maxWidth = '1280px';
      } else if (width >= 768) { // md
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        container.style.gap = '1.5rem';
        container.style.maxWidth = '768px';
      } else { // mobile
        container.style.gridTemplateColumns = '1fr';
        container.style.gap = '1rem';
        container.style.maxWidth = '400px';
        container.style.padding = '0 1rem';
      }
    };
    
    // Ensure all menu items are properly displayed with enhanced styling
    const menuItems = container.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.position = 'relative';
      item.style.width = '100%';
      item.style.height = 'auto';
      item.style.margin = '0';
      item.style.opacity = '1';
      item.style.transform = 'none';
      item.style.minHeight = '600px';
    });
    
    updateGridLayout();
    window.addEventListener('resize', updateGridLayout);
  }, 100);
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

// Initialize menu items when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  generateMenuItems();
  
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

