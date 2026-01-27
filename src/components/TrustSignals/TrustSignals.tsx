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
          {/* Opening Hours - Only this card remains */}
          <div className="col-12 col-md-6 col-lg-4">
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
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;
