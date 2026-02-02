import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { useTranslation } from 'react-i18next';

const Events = () => {
  const { t } = useTranslation();
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="events" className="py-5 bg-dark-light position-relative overflow-hidden">
      {/* Background decoration */}
      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>

      <div className="container-fluid px-3 px-md-4 position-relative" data-aos="fade-up">
        <div className="section-title-modern text-center mb-4 mb-md-5">
          <span className="section-label">{t('events.label', 'Evenementen')}</span>
          <h2 className="section-heading">{t('events.title')}</h2>
          <p className="section-subtitle">{t('events.subtitle')}</p>
          <div className="section-line mx-auto"></div>
        </div>

        <div className="bg-black border border-warning rounded p-3 p-md-4 shadow-lg" data-aos="fade-up" data-aos-delay="100">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={0}
            slidesPerView={1}
            navigation={{
              nextEl: '.swiper-button-next-events',
              prevEl: '.swiper-button-prev-events',
            }}
            pagination={{
              clickable: true,
              el: '.swiper-pagination-events',
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            loop={true}
            className="events-swiper"
          >
            {/* Slide 1: Verjaardagen */}
            <SwiperSlide>
              <div className="bg-black border border-warning rounded overflow-hidden events-card-hover" style={{ transition: 'all 0.5s' }}>
                <div className="row g-0 h-100">
                  <div className="col-12 col-md-6 position-relative overflow-hidden">
                    <img
                      src="/img/event-verjaardagen.jpg"
                      className="w-100 h-100 events-image-hover"
                      style={{ objectFit: 'cover', minHeight: 'clamp(200px, 40vw, 300px)', transition: 'transform 0.7s' }}
                      alt="Verjaardagen bij The Golden Olive"
                    />
                    <div
                      className="position-absolute top-0 start-0 w-100 h-100 bg-warning events-overlay"
                      style={{ opacity: 0, transition: 'opacity 0.5s' }}
                    ></div>
                  </div>
                  <div className="col-12 col-md-6 p-3 p-md-4 d-flex flex-column justify-content-center">
                    <h3 className="fs-4 fs-md-3 fw-bold text-white mb-2 mb-md-3 events-title-hover" style={{ transition: 'color 0.3s', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
                      {t('events.birthdays.title')}
                    </h3>
                    <p className="text-light lh-lg fst-italic opacity-75" style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }} dangerouslySetInnerHTML={{ __html: t('events.birthdays.description') }}></p>
                  </div>
                </div>
              </div>
            </SwiperSlide>

            {/* Slide 2: Bedrijfsfeestjes */}
            <SwiperSlide>
              <div className="bg-black border border-warning rounded overflow-hidden events-card-hover" style={{ transition: 'all 0.5s' }}>
                <div className="row g-0 h-100">
                  <div className="col-12 col-md-6 position-relative overflow-hidden">
                    <img
                      src="/img/event-bedrijfsfeestjes.jpg"
                      className="w-100 h-100 events-image-hover"
                      style={{ objectFit: 'cover', minHeight: '250px', transition: 'transform 0.7s' }}
                      alt="Bedrijfsfeestjes bij The Golden Olive"
                    />
                    <div
                      className="position-absolute top-0 start-0 w-100 h-100 bg-warning events-overlay"
                      style={{ opacity: 0, transition: 'opacity 0.5s' }}
                    ></div>
                  </div>
                  <div className="col-12 col-md-6 p-3 p-md-4 d-flex flex-column justify-content-center">
                    <h3 className="fs-4 fs-md-3 fw-bold text-white mb-2 mb-md-3 events-title-hover" style={{ transition: 'color 0.3s', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
                      {t('events.corporate.title')}
                    </h3>
                    <p className="text-light lh-lg fst-italic opacity-75" style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      {t('events.corporate.description')}
                    </p>
                  </div>
                </div>
              </div>
            </SwiperSlide>

            {/* Slide 3: Andere Evenementen */}
            <SwiperSlide>
              <div className="bg-black border border-warning rounded overflow-hidden events-card-hover" style={{ transition: 'all 0.5s' }}>
                <div className="row g-0 h-100">
                  <div className="col-12 col-md-6 position-relative overflow-hidden">
                    <img
                      src="/img/event-andereEvenement.jpg"
                      className="w-100 h-100 events-image-hover"
                      style={{ objectFit: 'cover', minHeight: '250px', transition: 'transform 0.7s' }}
                      alt="Andere Evenementen bij The Golden Olive"
                    />
                    <div
                      className="position-absolute top-0 start-0 w-100 h-100 bg-warning events-overlay"
                      style={{ opacity: 0, transition: 'opacity 0.5s' }}
                    ></div>
                  </div>
                  <div className="col-12 col-md-6 p-3 p-md-4 d-flex flex-column justify-content-center">
                    <h3 className="fs-4 fs-md-3 fw-bold text-white mb-2 mb-md-3 events-title-hover" style={{ transition: 'color 0.3s', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
                      {t('events.other.title')}
                    </h3>
                    <p className="text-light lh-lg fst-italic opacity-75" style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      {t('events.other.description')}
                    </p>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          </Swiper>

          {/* Custom Navigation Buttons */}
          <div className="swiper-button-prev-events carousel-control-prev" style={{ left: '0' }}>
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Previous</span>
          </div>
          <div className="swiper-button-next-events carousel-control-next" style={{ right: '0' }}>
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Next</span>
          </div>

          {/* Custom Pagination */}
          <div className="swiper-pagination-events carousel-indicators"></div>
        </div>

        <div className="text-center mt-4 mt-md-5">
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              scrollToContact();
            }}
            className="btn btn-warning rounded-pill px-4 px-md-5 py-2 py-md-3 fw-bold text-black"
            style={{ transition: 'all 0.3s', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}
          >
            <i className="bi bi-calendar-event me-2"></i>
            {t('events.planEvent')}
          </a>
        </div>
      </div>
    </section>
  );
};

export default Events;

