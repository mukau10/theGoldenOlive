import { useTranslation } from 'react-i18next';
import ContactForm from './ContactForm';

const Contact = () => {
  const { t } = useTranslation();
  
  return (
    <section id="contact" className="py-5 bg-dark-light position-relative overflow-hidden" itemScope itemType="https://schema.org/ContactPage" aria-labelledby="contact-heading">
      {/* Background decoration */}
      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>

      <div className="container-fluid px-3 px-md-4 position-relative" data-aos="fade-up">
        <div className="text-center mb-4 mb-md-5">
          <h2 id="contact-heading" className="display-4 display-md-3 fw-bold text-warning mb-3 mb-md-4" style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}>{t('contact.title')}</h2>
          <p className="fs-5 fs-md-4 text-white fw-light opacity-75" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>{t('contact.subtitle')}</p>
          <div className="mx-auto mt-3 bg-warning rounded-pill" style={{ width: '96px', height: '4px' }}></div>
        </div>

        {/* Google Maps */}
        <div className="mb-4 mb-md-5">
          <div className="bg-black border border-warning rounded overflow-hidden shadow-lg opacity-75">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d429.2936968698904!2d4.388302388653184!3d51.20782050181604!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c3f762c1beb19d%3A0x7ed7ef8cdf7f0d5b!2sThe%20Golden%20Olive!5e0!3m2!1snl!2sbe!4v1716628993936!5m2!1snl!2sbe"
              width="100%"
              height="300"
              style={{ height: 'clamp(250px, 50vw, 450px)' }}
              allowFullScreen
              loading="lazy"
              title="The Golden Olive Restaurant Antwerpen locatie"
              referrerPolicy="no-referrer-when-downgrade"
              aria-label="Kaart van The Golden Olive restaurant locatie"
              className="w-100 rounded"
            ></iframe>
          </div>
        </div>

        <div className="row g-4 justify-content-center">
          {/* Address Card */}
          <div className="col-12 col-md-4 mb-3 mb-md-0">
            <div
              className="bg-black border border-warning rounded p-3 p-md-4 text-center h-100 contact-card-hover"
              style={{ transition: 'all 0.5s' }}
              itemScope
              itemType="https://schema.org/PostalAddress"
            >
              <div className="address">
                <div
                  className="bg-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 mb-md-4 contact-icon-hover"
                  style={{ width: 'clamp(3rem, 6vw, 4rem)', height: 'clamp(3rem, 6vw, 4rem)', transition: 'all 0.3s' }}
                >
                  <i className="bi bi-geo-alt text-white" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }} aria-hidden="true"></i>
                </div>
                <h4 className="fs-5 fs-md-4 fw-bold text-white mb-2 mb-md-3 contact-title-hover" style={{ transition: 'color 0.3s', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}>
                  {t('contact.address.title')}
                </h4>
                <div className="text-white" style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                  <p itemProp="streetAddress" className="fw-medium mb-1">{t('contact.address.street')}</p>
                  <p className="mb-1">
                    <span itemProp="postalCode">2000</span> <span itemProp="addressLocality">{t('contact.address.city')}</span>
                  </p>
                  <p itemProp="addressCountry" className="mb-0">{t('contact.address.country')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hours Card */}
          <div className="col-12 col-md-4 mb-3 mb-md-0">
            <div
              className="bg-black border border-warning rounded p-3 p-md-4 text-center h-100 contact-card-hover"
              style={{ transition: 'all 0.5s' }}
            >
              <div className="hours">
                <div
                  className="bg-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 mb-md-4 contact-icon-hover"
                  style={{ width: 'clamp(3rem, 6vw, 4rem)', height: 'clamp(3rem, 6vw, 4rem)', transition: 'all 0.3s' }}
                >
                  <i className="bi bi-clock text-white" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }} aria-hidden="true"></i>
                </div>
                <h4 className="fs-5 fs-md-4 fw-bold text-white mb-2 mb-md-3 contact-title-hover" style={{ transition: 'color 0.3s', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}>
                  {t('contact.hours.title')}
                </h4>
                <div className="text-white" style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                  <p className="fw-medium mb-1">{t('contact.hours.days')}</p>
                  <p className="fs-5 fs-md-4 mb-0" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>{t('contact.hours.time')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Card */}
          <div className="col-12 col-md-4 mb-3 mb-md-0">
            <div
              className="bg-black border border-warning rounded p-3 p-md-4 text-center h-100 contact-card-hover"
              style={{ transition: 'all 0.5s' }}
              itemScope
              itemType="https://schema.org/ContactPoint"
            >
              <div className="phone">
                <div
                  className="bg-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 mb-md-4 contact-icon-hover"
                  style={{ width: 'clamp(3rem, 6vw, 4rem)', height: 'clamp(3rem, 6vw, 4rem)', transition: 'all 0.3s' }}
                >
                  <i className="bi bi-phone text-white" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }} aria-hidden="true"></i>
                </div>
                <h4 className="fs-5 fs-md-4 fw-bold text-white mb-2 mb-md-3 contact-title-hover" style={{ transition: 'color 0.3s', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}>
                  {t('contact.phone.title')}
                </h4>
                <div className="text-white">
                  <a
                    href="tel:+32494194397"
                    itemProp="telephone"
                    className="fs-5 fs-md-4 fw-medium text-white text-decoration-none"
                    style={{ transition: 'color 0.3s', fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}
                  >
                    +32 494 19 43 97
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="row mt-5" data-aos="fade-up" data-aos-delay="200">
          <ContactForm />
        </div>
      </div>
    </section>
  );
};

export default Contact;

