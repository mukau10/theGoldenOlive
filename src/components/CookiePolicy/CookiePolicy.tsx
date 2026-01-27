import { useTranslation } from 'react-i18next';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const CookiePolicy = () => {
  const { t } = useTranslation();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <Header />
      <main className="pt-24 pb-16 bg-dark-custom">
        <div className="container-fluid px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-5" data-aos="fade-up">
              <h1
                className="display-4 fw-bold text-golden mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {t('cookiePolicy.title')}
              </h1>
              <p className="fs-5 text-white-50">
                {t('cookiePolicy.lastUpdated')}: <span className="text-warning">{t('cookiePolicy.lastUpdatedDate')}</span>
              </p>
              <div className="mx-auto mt-3 bg-warning rounded-pill" style={{ width: '96px', height: '4px' }}></div>
            </div>

            {/* Content */}
            <div
              className="bg-black border border-warning rounded-3 p-4 p-lg-5 shadow-lg"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              {/* Introduction */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">{t('cookiePolicy.introduction.title')}</h2>
                <div className="text-white-50 lh-lg">
                  <p>{t('cookiePolicy.introduction.text1')}</p>
                  <p>{t('cookiePolicy.introduction.text2')}</p>
                </div>
              </section>

              {/* What are cookies */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">{t('cookiePolicy.whatAreCookies.title')}</h2>
                <div className="text-white-50 lh-lg">
                  <p>{t('cookiePolicy.whatAreCookies.text1')}</p>
                  <p>{t('cookiePolicy.whatAreCookies.text2')}</p>
                </div>
              </section>

              {/* Types of cookies */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">{t('cookiePolicy.typesOfCookies.title')}</h2>
                <div className="text-white-50 lh-lg">
                  <h4 className="h5 text-warning mt-4 mb-2">{t('cookiePolicy.typesOfCookies.essential.title')}</h4>
                  <p>{t('cookiePolicy.typesOfCookies.essential.text')}</p>

                  <h4 className="h5 text-warning mt-4 mb-2">{t('cookiePolicy.typesOfCookies.functional.title')}</h4>
                  <p>{t('cookiePolicy.typesOfCookies.functional.text')}</p>

                  <h4 className="h5 text-warning mt-4 mb-2">{t('cookiePolicy.typesOfCookies.analytics.title')}</h4>
                  <p>{t('cookiePolicy.typesOfCookies.analytics.text')}</p>
                </div>
              </section>

              {/* How we use cookies */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">{t('cookiePolicy.howWeUseCookies.title')}</h2>
                <div className="text-white-50 lh-lg">
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-warning me-2"></i>
                      {t('cookiePolicy.howWeUseCookies.use1')}
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-warning me-2"></i>
                      {t('cookiePolicy.howWeUseCookies.use2')}
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-warning me-2"></i>
                      {t('cookiePolicy.howWeUseCookies.use3')}
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-warning me-2"></i>
                      {t('cookiePolicy.howWeUseCookies.use4')}
                    </li>
                  </ul>
                </div>
              </section>

              {/* Managing cookies */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">{t('cookiePolicy.managingCookies.title')}</h2>
                <div className="text-white-50 lh-lg">
                  <p>{t('cookiePolicy.managingCookies.text1')}</p>
                  <p>{t('cookiePolicy.managingCookies.text2')}</p>
                  <p className="mt-3">
                    <strong className="text-warning">{t('cookiePolicy.managingCookies.note')}</strong>
                  </p>
                </div>
              </section>

              {/* Third-party cookies */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">{t('cookiePolicy.thirdPartyCookies.title')}</h2>
                <div className="text-white-50 lh-lg">
                  <p>{t('cookiePolicy.thirdPartyCookies.text')}</p>
                </div>
              </section>

              {/* Contact */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">{t('cookiePolicy.contact.title')}</h2>
                <div className="text-white-50 lh-lg">
                  <p>{t('cookiePolicy.contact.text')}</p>
                  <p className="mt-3">
                    <strong className="text-warning">The Golden Olive</strong>
                    <br />
                    Vlaamsekaai 65
                    <br />
                    2000 Antwerpen, België
                    <br />
                    <a href="tel:+32494194397" className="text-warning text-decoration-none">
                      +32 494 19 43 97
                    </a>
                  </p>
                </div>
              </section>

              {/* Back to top button */}
              <div className="text-center mt-5">
                <button
                  onClick={scrollToTop}
                  className="btn btn-outline-warning rounded-pill px-4 py-2"
                >
                  <i className="bi bi-arrow-up me-2"></i>
                  {t('common.backToTop')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
