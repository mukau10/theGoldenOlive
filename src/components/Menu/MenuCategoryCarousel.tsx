import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { useTranslation } from 'react-i18next';
import type { MenuCategory } from '../../types/menu';
import { categoryInfoMap } from '../../utils/categoryInfo';
import MenuCategoryCard from './MenuCategoryCard';
import { BiGridAlt } from 'react-icons/bi';
import { translateCategory } from '../../utils/menuTranslations';

interface MenuCategoryCarouselProps {
  categories: MenuCategory[];
  selectedCategory: MenuCategory | '*';
  onSelectCategory: (category: MenuCategory | '*') => void;
}

const MenuCategoryCarousel = ({
  categories,
  selectedCategory,
  onSelectCategory,
}: MenuCategoryCarouselProps) => {
  const { t } = useTranslation();

  const handleSelect = (category: MenuCategory | '*') => {
    onSelectCategory(category);
  };

  return (
    <div className="menu-category-carousel-wrap mb-4 mb-md-5" data-aos="fade-up" data-aos-delay="100">
      <div className="menu-category-carousel-container position-relative rounded-4 p-2 p-md-4">
        <div className="menu-category-carousel-header text-center mb-2 mb-md-4">
          <h4 className="menu-category-carousel-title text-warning fw-bold mb-1">
            {t('menu.chooseCategory')}
          </h4>
          <small className="text-white-50 d-block menu-category-carousel-hint">
            <i className="bi bi-arrow-left-right me-1" aria-hidden="true" />
            {t('menu.swipeNavigate')}
          </small>
        </div>

        <Swiper
          modules={[Navigation, FreeMode]}
          slidesPerView="auto"
          spaceBetween={10}
          slidesOffsetBefore={12}
          slidesOffsetAfter={12}
          freeMode={{
            enabled: true,
            sticky: true,
            momentumRatio: 0.45,
          }}
          navigation={{
            nextEl: '.swiper-button-next-menu-categories',
            prevEl: '.swiper-button-prev-menu-categories',
          }}
          className="menu-category-swiper-horizontal"
          breakpoints={{
            576: { spaceBetween: 12, slidesOffsetBefore: 16, slidesOffsetAfter: 16 },
            768: { spaceBetween: 16, slidesOffsetBefore: 0, slidesOffsetAfter: 0 },
            992: { spaceBetween: 20 },
          }}
        >
          <SwiperSlide className="menu-category-slide">
            <MenuCategoryCard
              filter="*"
              icon={BiGridAlt}
              title={t('menu.allCategories')}
              subtitle=""
              isActive={selectedCategory === '*'}
              onClick={() => handleSelect('*')}
              variant="carousel"
            />
          </SwiperSlide>

          {categories.map((category) => {
            const info = categoryInfoMap[category];
            if (!info) return null;

            return (
              <SwiperSlide key={category} className="menu-category-slide">
                <MenuCategoryCard
                  filter={`.filter-${category}`}
                  icon={info.icon}
                  title={translateCategory(category, t)}
                  subtitle=""
                  isActive={selectedCategory === category}
                  onClick={() => handleSelect(category)}
                  variant="carousel"
                />
              </SwiperSlide>
            );
          })}
        </Swiper>

        <button
          type="button"
          className="swiper-button-prev-menu-categories menu-carousel-nav-btn-outer d-none d-md-flex"
          aria-label={t('common.previous') || 'Vorige'}
        >
          <span className="menu-carousel-nav-btn rounded-circle d-flex align-items-center justify-content-center">
            <i className="bi bi-chevron-left fs-5 fw-bold text-black" aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          className="swiper-button-next-menu-categories menu-carousel-nav-btn-outer d-none d-md-flex"
          aria-label={t('common.next') || 'Volgende'}
        >
          <span className="menu-carousel-nav-btn rounded-circle d-flex align-items-center justify-content-center">
            <i className="bi bi-chevron-right fs-5 fw-bold text-black" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  );
};

export default MenuCategoryCarousel;
