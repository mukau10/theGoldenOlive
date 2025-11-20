const Mogelijkheden = () => {
  return (
    <section id="why-us" className="py-4 py-md-5 bg-dark-light">
      <div className="container-fluid px-3 px-md-4" data-aos="fade-up">
        <div className="text-center mb-4 mb-md-5">
          <h2 className="display-5 display-md-4 fw-bold text-golden mb-3 mb-md-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
            Mogelijkheden
          </h2>
          <p className="fs-5 fs-md-4 text-white opacity-75" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>Waarom voor Ons Restaurant Kiezen</p>
        </div>

        <div className="row g-4 justify-content-center">
          {/* Box 1: Afhalen */}
          <div className="col-12 col-md-6 col-lg-4 mb-3 mb-md-0">
            <div
              className="card-modern bg-dark-light backdrop-blur border border-golden rounded-3 p-3 p-md-4 h-100 text-center"
              data-aos="zoom-in"
              data-aos-delay="100"
            >
              <div
                className="position-absolute top-0 end-0 m-2 m-md-3"
                style={{
                  width: 'clamp(40px, 6vw, 48px)',
                  height: 'clamp(40px, 6vw, 48px)',
                  background: 'linear-gradient(135deg, var(--bs-golden), var(--bs-golden-light))',
                  color: 'var(--bs-dark-custom)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  boxShadow: '0 4px 20px rgba(255, 193, 7, 0.5)',
                  zIndex: 2,
                }}
              >
                01
              </div>
              <div className="mb-2 mb-md-3">
                <i className="bi bi-bag-check text-golden" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}></i>
              </div>
              <h4 className="fs-5 fs-md-4 fw-bold text-white mb-2 mb-md-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>
                Afhalen
              </h4>
              <p className="text-white small lh-base opacity-75" style={{ fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>
                Bel ons, geef je favoriete gerechten door en vertel ons wanneer je het wilt ophalen. Wij zorgen ervoor
                dat je eten klaar staat.
              </p>
            </div>
          </div>

          {/* Box 2: Bestel en geniet thuis */}
          <div className="col-12 col-md-6 col-lg-4 mb-3 mb-md-0">
            <div
              className="card-modern bg-dark-light backdrop-blur border border-golden rounded-3 p-3 p-md-4 h-100 text-center"
              data-aos="zoom-in"
              data-aos-delay="200"
            >
              <div
                className="position-absolute top-0 end-0 m-2 m-md-3"
                style={{
                  width: 'clamp(40px, 6vw, 48px)',
                  height: 'clamp(40px, 6vw, 48px)',
                  background: 'linear-gradient(135deg, var(--bs-golden), var(--bs-golden-light))',
                  color: 'var(--bs-dark-custom)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  boxShadow: '0 4px 20px rgba(255, 193, 7, 0.5)',
                  zIndex: 2,
                }}
              >
                02
              </div>
              <div className="mb-2 mb-md-3">
                <i className="bi bi-house-heart text-golden" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}></i>
              </div>
              <h4 className="fs-5 fs-md-4 fw-bold text-white mb-2 mb-md-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>
                Bestel en geniet thuis
              </h4>
              <p className="text-white small lh-base opacity-75" style={{ fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>
                Plaats eenvoudig je bestelling via onze website of telefonisch, en wij brengen je favoriete gerechten
                rechtstreeks naar je deur.
              </p>
            </div>
          </div>

          {/* Box 3: Reserveren */}
          <div className="col-12 col-md-6 col-lg-4 mb-3 mb-md-0">
            <div
              className="card-modern bg-dark-light backdrop-blur border border-golden rounded-3 p-3 p-md-4 h-100 text-center"
              data-aos="zoom-in"
              data-aos-delay="300"
            >
              <div
                className="position-absolute top-0 end-0 m-2 m-md-3"
                style={{
                  width: 'clamp(40px, 6vw, 48px)',
                  height: 'clamp(40px, 6vw, 48px)',
                  background: 'linear-gradient(135deg, var(--bs-golden), var(--bs-golden-light))',
                  color: 'var(--bs-dark-custom)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  boxShadow: '0 4px 20px rgba(255, 193, 7, 0.5)',
                  zIndex: 2,
                }}
              >
                03
              </div>
              <div className="mb-2 mb-md-3">
                <i className="bi bi-telephone text-golden" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}></i>
              </div>
              <h4 className="fs-5 fs-md-4 fw-bold text-white mb-2 mb-md-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>
                Reserveren
              </h4>
              <p className="text-white small lh-base mb-2 mb-md-3 opacity-75" style={{ fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>
                Reserveren is niet noodzakelijk, want wij werken met een 'first come, first serve'-beleid.
              </p>
              <a
                href="tel:+32494194397"
                className="btn btn-outline-warning rounded-pill px-3 px-md-4 py-2 fw-medium text-decoration-none"
                style={{ borderColor: 'var(--bs-golden)', color: 'var(--bs-golden)', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}
              >
                <i className="bi bi-telephone me-1"></i>Bel nu
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Mogelijkheden;

