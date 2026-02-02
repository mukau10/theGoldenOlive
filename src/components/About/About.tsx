import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();
  
  return (
    <section id="about" className="about-section" aria-labelledby="about-heading" itemScope itemType="https://schema.org/AboutPage">
      {/* Decorative elements */}
      <div className="about-decoration about-decoration-1"></div>
      <div className="about-decoration about-decoration-2"></div>
      
      <div className="container-fluid px-3 px-md-5" data-aos="fade-up">
        <div className="row g-5 align-items-center">
          {/* Image with modern frame */}
          <div className="col-12 col-lg-6 order-2 order-lg-1" data-aos="fade-right" data-aos-delay="100">
            <div className="about-image-wrapper">
              <div className="about-image-frame">
                <img
                  src="/img/golden/IMG_4117.JPEG"
                  alt="The Golden Olive Restaurant Antwerpen interieur"
                  loading="lazy"
                  className="about-image"
                />
              </div>
              {/* Floating accent card */}
              <div className="about-accent-card" data-aos="fade-up" data-aos-delay="300">
                <span className="accent-number">10+</span>
                <span className="accent-text">{t('about.yearsExperience', 'Jaar Ervaring')}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="col-12 col-lg-6 order-1 order-lg-2" data-aos="fade-left" data-aos-delay="200">
            <div className="about-content">
              <div className="section-title-modern text-center text-lg-start mb-4">
                <span className="section-label">{t('about.label', 'Over Ons')}</span>
                <h2 id="about-heading" className="section-heading">
                  {t('about.title')}
                </h2>
                <div className="section-line"></div>
              </div>
              
              <p className="about-description">
                {t('about.description')}
              </p>
              
              {/* Feature highlights */}
              <div className="about-features">
                <div className="about-feature">
                  <div className="feature-icon">
                    <i className="bi bi-award"></i>
                  </div>
                  <div className="feature-text">
                    <strong>{t('about.feature1Title', 'Kwaliteit')}</strong>
                    <span>{t('about.feature1Desc', 'Verse ingrediënten')}</span>
                  </div>
                </div>
                <div className="about-feature">
                  <div className="feature-icon">
                    <i className="bi bi-heart"></i>
                  </div>
                  <div className="feature-text">
                    <strong>{t('about.feature2Title', 'Passie')}</strong>
                    <span>{t('about.feature2Desc', 'Met liefde bereid')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

