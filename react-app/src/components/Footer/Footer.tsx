const Footer = () => {
  return (
    <footer
      id="footer"
      role="contentinfo"
      className="bg-black border-top border-warning position-relative"
      style={{ background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)' }}
    >
      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>
      <div className="py-4 py-md-5 position-relative" style={{ zIndex: 2 }}>
        <div className="container-fluid px-3 px-md-4">
          <div className="row justify-content-center mb-4 mb-md-5">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="text-center bg-black border border-warning rounded-3 p-3 p-md-4 shadow">
                <img
                  src="/img/logo.png"
                  alt="The Golden Olive Restaurant Logo"
                  className="mb-3 mb-md-4"
                  style={{ width: 'clamp(80px, 15vw, 120px)', height: 'auto' }}
                  loading="lazy"
                />

                <div className="d-flex justify-content-center gap-3 mb-3 mb-md-4" aria-label="Social media links">
                  <a
                    href="https://www.facebook.com/TheGoldenolivee"
                    className="btn btn-outline-warning rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 'clamp(44px, 8vw, 50px)', height: 'clamp(44px, 8vw, 50px)', transition: 'all 0.3s' }}
                    aria-label="Bezoek onze Facebook pagina"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-facebook text-warning" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }} aria-hidden="true"></i>
                  </a>
                  <a
                    href="https://www.instagram.com/thegoldenolive._"
                    className="btn btn-outline-warning rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 'clamp(44px, 8vw, 50px)', height: 'clamp(44px, 8vw, 50px)', transition: 'all 0.3s' }}
                    aria-label="Volg ons op Instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-instagram text-warning" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }} aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div
        className="border-top border-warning bg-black position-relative"
        style={{ zIndex: 2, background: 'rgba(0,0,0,0.9) !important' }}
      >
        <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
          <div className="text-center">
            <div className="text-white mb-2" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              &copy; 2025 Copyright{' '}
              <strong>
                <span className="text-warning">The Golden Olive</span>
              </strong>
              . All Rights Reserved
            </div>
            <div className="text-white-50 small" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2 gap-sm-3">
                <div>
                  BTW-nummer{' '}
                  <a href="#" aria-label="BTW nummer" className="text-warning text-decoration-none">
                    BE0738909475
                  </a>
                </div>
                <div className="d-none d-sm-block text-secondary">|</div>
                <div>
                  <a href="/privacy-policy" className="text-warning text-decoration-none">
                    Privacy Policy
                  </a>
                </div>
                <div className="d-none d-sm-block text-secondary">|</div>
                <div>
                  <a href="/allergenen" className="text-warning text-decoration-none">
                    Allergenen Info
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

