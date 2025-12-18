import { useTranslation } from 'react-i18next';
import { useAllergens } from '../../hooks/useAllergens';
import { useAllergenTranslation } from '../../utils/allergenTranslations';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const AllergenInfo = () => {
  const { t } = useTranslation();
  const { translateAllergen } = useAllergenTranslation();
  const { allergensData, loading } = useAllergens();

  const allergenColors: Record<string, string> = {
    red: '#dc3545',
    orange: '#ff7e00',
    yellow: '#ffc107',
    green: '#28a745',
    blue: '#007bff',
    purple: '#6f42c1',
    cyan: '#17a2b8',
    amber: '#ff9f43',
    brown: '#8b4513',
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-24 pb-16 bg-dark-custom">
          <div className="container-fluid px-4 text-center">
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">{t('allergens.loading')}</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
                {t('allergens.title')}
              </h1>
              <p className="fs-5 text-white-50">
                {t('allergens.subtitle')}
              </p>
              <div className="mx-auto mt-3 bg-warning rounded-pill" style={{ width: '96px', height: '4px' }}></div>
            </div>

            {/* Warning Alert */}
            <div
              className="alert alert-warning mb-4"
              role="alert"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>{t('allergens.important')}:</strong> {t('allergens.warning')}
            </div>

            {/* Allergens Section */}
            {allergensData && (
              <>
                <div className="mb-5" data-aos="fade-up" data-aos-delay="150">
                  <h2 className="h3 fw-bold text-golden mb-4">
                    <i className="bi bi-list-check me-2"></i>{t('allergens.foodAllergens')}
                  </h2>
                  <div className="bg-black border border-warning rounded-3 p-4">
                    <div className="row g-3">
                      {allergensData.allergens.map((allergen, index) => {
                        const translated = translateAllergen(allergen);
                        const bgColor = allergenColors[allergen.color] || '#dc3545';
                        const textColor = allergen.color === 'yellow' || allergen.color === 'amber' ? '#000' : '#fff';
                        return (
                          <div key={index} className="col-12 col-md-6">
                            <div className="d-flex align-items-start mb-3">
                              <span
                                className="badge rounded-circle d-inline-flex align-items-center justify-content-center fw-bold me-3 flex-shrink-0"
                                style={{
                                  background: `${bgColor} !important`,
                                  color: `${textColor} !important`,
                                  width: '40px',
                                  height: '40px',
                                  fontSize: '14px',
                                }}
                              >
                                {allergen.code}
                              </span>
                              <div className="text-white-50">
                                <strong className="text-white d-block mb-1">{translated.type}</strong>
                                <small>{translated.description}</small>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dietary Section */}
                <div className="mb-5" data-aos="fade-up" data-aos-delay="200">
                  <h2 className="h3 fw-bold text-golden mb-4">
                    <i className="bi bi-check-circle me-2"></i>{t('allergens.dietaryIndicators')}
                  </h2>
                  <div className="bg-black border border-warning rounded-3 p-4">
                    <div className="row g-3">
                      {allergensData.dietary.map((dietary, index) => {
                        const translated = translateAllergen(dietary);
                        const bgColor = allergenColors[dietary.color] || '#28a745';
                        return (
                          <div key={index} className="col-12 col-md-6">
                            <div className="d-flex align-items-start mb-3">
                              <span
                                className="badge rounded-circle d-inline-flex align-items-center justify-content-center fw-bold me-3 flex-shrink-0"
                                style={{
                                  background: `${bgColor} !important`,
                                  color: '#000',
                                  width: '40px',
                                  height: '40px',
                                  fontSize: '14px',
                                }}
                              >
                                {dietary.code}
                              </span>
                              <div className="text-white-50">
                                <strong className="text-white d-block mb-1">{translated.type}</strong>
                                <small>{translated.description}</small>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Contact Information */}
            <div
              className="alert alert-info mb-4"
              role="alert"
              data-aos="fade-up"
              data-aos-delay="250"
            >
              <i className="bi bi-telephone me-2"></i>
              <strong>{t('allergens.haveQuestions')}</strong> {t('allergens.contactStaff')}{' '}
              <a href="tel:+32494194397" className="alert-link text-decoration-none">
                +32 494 19 43 97
              </a>
            </div>

            {/* Back to Home Button */}
            <div className="text-center mt-5" data-aos="fade-up" data-aos-delay="300">
              <button
                onClick={scrollToTop}
                className="btn btn-outline-warning me-3 rounded-pill px-4"
                aria-label={t('common.backToTop')}
              >
                <i className="bi bi-arrow-up me-2"></i>{t('common.backToTop')}
              </button>
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/';
                }}
                className="btn btn-warning rounded-pill px-4"
              >
                <i className="bi bi-house-door me-2"></i>{t('common.backToHome')}
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AllergenInfo;

