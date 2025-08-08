
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
   * Menu Categories Carousel
   */
      const categorySwiper = new Swiper('.category-swiper', {
      speed: 600,
      loop: false,
      slidesPerView: 'auto',
      spaceBetween: 20,
      centeredSlides: true,
      allowTouchMove: true,
      preventClicks: false,
      preventClicksPropagation: false,
      navigation: {
        enabled: false
      },
      pagination: {
        el: '.category-pagination',
        type: 'bullets',
        clickable: true
      },
    breakpoints: {
      320: {
        slidesPerView: 1.2,
        spaceBetween: 15
      },
      480: {
        slidesPerView: 1.5,
        spaceBetween: 20
      },
      768: {
        slidesPerView: 2.5,
        spaceBetween: 25
      },
      992: {
        slidesPerView: 3.5,
        spaceBetween: 30
      },
      1200: {
        slidesPerView: 4.5,
        spaceBetween: 35
      },
      1400: {
        slidesPerView: 5.5,
        spaceBetween: 40
      }
    }
  });

  // Custom navigation for category carousel
  const nextButton = document.querySelector('.category-swiper-button-next');
  const prevButton = document.querySelector('.category-swiper-button-prev');
  
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      categorySwiper.slideNext();
    });
  }
  
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      categorySwiper.slidePrev();
    });
  }

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

// Menu Items Component System
function createMenuItemComponent(itemData, category) {
  const template = document.getElementById('menu-item-template');
  const clone = template.content.cloneNode(true);
  
  // Set basic properties
  const menuItem = clone.querySelector('.menu-item');
  menuItem.classList.add(`filter-${category}`);
  menuItem.setAttribute('data-item-id', itemData.id);
  
  // Set image
  const img = menuItem.querySelector('img');
  img.src = itemData.image;
  img.alt = itemData.alt;
  
  // Set title and price
  const title = menuItem.querySelector('a');
  title.textContent = itemData.name;
  title.href = `#${itemData.id}`;
  
  const price = menuItem.querySelector('span');
  price.textContent = itemData.price;
  
  // Set description
  const description = menuItem.querySelector('.text-white\\/70');
  description.innerHTML = itemData.description;
  
  // Create allergens for the main allergen section
  const allergensContainer = menuItem.querySelector('.flex.flex-wrap.gap-2');
  allergensContainer.innerHTML = '';
  
  // Create allergen symbols for the breadcrumb section
  const allergenSymbolsContainer = menuItem.querySelector('.allergen-symbols');
  allergenSymbolsContainer.innerHTML = '';
  
  itemData.allergens.forEach(allergen => {
    // Create allergen badge for main section
    const allergenSpan = document.createElement('span');
    allergenSpan.className = `allergen bg-${allergen.color}-500/20 text-${allergen.color}-300 border border-${allergen.color}-500/30 px-2 py-1 rounded-full text-xs font-medium hover:bg-${allergen.color}-500/30 transition-colors cursor-pointer`;
    allergenSpan.textContent = allergen.code;
    allergenSpan.setAttribute('data-allergen', allergen.description);
    allergenSpan.setAttribute('title', allergen.type);
    allergenSpan.setAttribute('role', 'button');
    allergenSpan.setAttribute('tabindex', '0');
    
    // Add click event for allergen info
    allergenSpan.addEventListener('click', function() {
      showAllergenInfo(allergen.description);
    });
    
    allergensContainer.appendChild(allergenSpan);
    
    // Create allergen symbol for breadcrumb section
    const allergenSymbol = document.createElement('span');
    allergenSymbol.className = `allergen-symbol bg-${allergen.color}-500/30 text-${allergen.color}-300 border border-${allergen.color}-500/50 px-1.5 py-0.5 rounded text-xs font-bold cursor-pointer hover:bg-${allergen.color}-500/50 transition-colors`;
    allergenSymbol.textContent = allergen.code;
    allergenSymbol.setAttribute('data-allergen', allergen.description);
    allergenSymbol.setAttribute('title', `${allergen.type}: ${allergen.description}`);
    allergenSymbol.setAttribute('role', 'button');
    allergenSymbol.setAttribute('tabindex', '0');
    
    // Add click event for allergen info
    allergenSymbol.addEventListener('click', function() {
      showAllergenInfo(allergen.description);
    });
    
    allergenSymbolsContainer.appendChild(allergenSymbol);
  });
  
  return menuItem;
}

function generateMenuItems() {
  const menuData = JSON.parse(document.getElementById('menu-items-data').textContent);
  const container = document.getElementById('menu-items-container');
  
  // Clear existing items
  container.innerHTML = '';
  
  // Generate items for each category
  Object.keys(menuData).forEach(category => {
    menuData[category].forEach(item => {
      const menuItem = createMenuItemComponent(item, category);
      container.appendChild(menuItem);
    });
  });
  
  // Ensure proper grid layout without Isotope interference
  setTimeout(() => {
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
    container.style.gap = '1.5rem';
    container.style.width = '100%';
    
    // Ensure all menu items are properly displayed
    const menuItems = container.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.style.display = 'block';
      item.style.position = 'relative';
      item.style.width = '100%';
      item.style.height = 'auto';
      item.style.margin = '0';
      item.style.opacity = '1';
      item.style.transform = 'none';
    });
  }, 100);
}

function showAllergenInfo(description) {
  // Create a modal for allergen information
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-dark-800 border border-golden-400/30 rounded-xl p-6 max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-playfair font-bold text-golden-400">Allergenen Informatie</h3>
        <button class="text-white hover:text-golden-400 transition-colors text-2xl" onclick="this.closest('.fixed').remove()">&times;</button>
      </div>
      <p class="text-white/80 leading-relaxed">${description}</p>
      <div class="mt-6 text-center">
        <button class="bg-golden-400 text-dark-900 hover:bg-golden-300 px-6 py-2 rounded-full font-medium transition-colors" onclick="this.closest('.fixed').remove()">
          Sluiten
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Initialize menu items when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  generateMenuItems();
});

