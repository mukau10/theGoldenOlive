import { useTranslation } from 'react-i18next';
import './TrustSignals.css';

const TrustSignals = () => {
  const { t } = useTranslation();

  // Check if restaurant is currently open
  const getCurrentStatus = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Restaurant is open Ma-Zo: 17:00 - 23:00
    // All days are open
    if (hour >= 17 && hour < 23) {
      return { isOpen: true, message: t('trustSignals.openNow') || 'Nu open' };
    }
    return { isOpen: false, message: t('trustSignals.closedNow') || 'Nu gesloten' };
  };

  const status = getCurrentStatus();

  return (
    <section className="trust-signals py-4 py-md-5 bg-dark-light">
      <div className="container-fluid px-3 px-md-4">
        <div className="row g-3 g-md-4 justify-content-center">
          {/* Opening Hours - Prominent */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="trust-card bg-black border border-warning rounded-3 p-3 p-md-4 text-center h-100">
              <div className="trust-icon mb-3">
                <i className="bi bi-clock-history text-warning" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="text-warning fw-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('trustSignals.openingHours') || 'Openingsuren'}
              </h5>
              <div className={`status-badge mb-3 ${status.isOpen ? 'open' : 'closed'}`}>
                <span className="badge-dot"></span>
                <span className="badge-text">{status.message}</span>
              </div>
              <p className="text-white mb-1 fw-medium">
                {t('header.hours') || 'Ma-Zo: 17:00 - 23:00'}
              </p>
              <p className="text-white-50 small mb-0">
                {t('trustSignals.everyDay') || 'Elke dag open'}
              </p>
            </div>
          </div>

          {/* No Reservation Needed */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="trust-card bg-black border border-warning rounded-3 p-3 p-md-4 text-center h-100">
              <div className="trust-icon mb-3">
                <i className="bi bi-door-open text-warning" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="text-warning fw-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('trustSignals.walkIn') || 'Loop gerust binnen'}
              </h5>
              <p className="text-white mb-0">
                {t('trustSignals.noReservation') || 'Reserveren niet nodig'}
              </p>
            </div>
          </div>

          {/* Quick Contact */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="trust-card bg-black border border-warning rounded-3 p-3 p-md-4 text-center h-100">
              <div className="trust-icon mb-3">
                <i className="bi bi-telephone text-warning" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="text-warning fw-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('trustSignals.quickContact') || 'Snelle Contact'}
              </h5>
              <a
                href="tel:+32494194397"
                className="btn btn-warning btn-sm rounded-pill px-4 py-2 mt-2"
                style={{ fontSize: '0.9rem' }}
              >
                <i className="bi bi-telephone-fill me-2"></i>
                +32 494 19 43 97
              </a>
            </div>
          </div>

          {/* Location */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="trust-card bg-black border border-warning rounded-3 p-3 p-md-4 text-center h-100">
              <div className="trust-icon mb-3">
                <i className="bi bi-geo-alt text-warning" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="text-warning fw-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('trustSignals.location') || 'Locatie'}
              </h5>
              <p className="text-white mb-0 small">
                {t('header.address') || 'Vlaamsekaai 65, 2000 ANTWERPEN'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;
