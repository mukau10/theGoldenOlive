import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();
  
  return (
    <section id="about" className="py-4 py-md-5 bg-dark-custom" aria-labelledby="about-heading" itemScope itemType="https://schema.org/AboutPage">
      <div className="container-fluid px-3 px-md-4" data-aos="fade-up">
        <div className="row g-4 g-lg-5 align-items-center">
          {/* Image */}
          <div className="col-12 col-lg-6 order-2 order-lg-1" data-aos="zoom-in" data-aos-delay="100">
            <div className="position-relative">
              <img
                src="/img/golden/IMG_4117.JPEG"
                alt="The Golden Olive Restaurant Antwerpen interieur"
                loading="lazy"
                className="w-100 rounded shadow-lg"
                style={{ height: 'clamp(250px, 40vw, 400px)', objectFit: 'cover' }}
              />
              <div
                className="position-absolute top-0 start-0 w-100 h-100 rounded"
                style={{ background: 'linear-gradient(to top, rgba(12, 11, 9, 0.5), transparent)' }}
              ></div>
            </div>
          </div>

          {/* Content */}
          <div className="col-12 col-lg-6 order-1 order-lg-2">
            <div className="section-title-modern text-center text-lg-start mb-4">
              <span className="section-label">{t('about.label', 'Over Ons')}</span>
              <h3
                id="about-heading"
                className="section-heading"
              >
                {t('about.title')}
              </h3>
              <div className="section-line"></div>
            </div>
            <p className="fs-6 fs-md-5 text-white fst-italic lh-lg text-center text-lg-start opacity-85" style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)' }}>
              {t('about.description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

