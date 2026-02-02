import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Gallery = () => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Gallery images - only show images that are NOT used in menu items
  // Menu items use: tigerGarnalen, chickeniwings, mixedGrill, spareribs, hamburger2, hamburger3, IMG_3356, ouzzane-burger, moeilleux, mocktail2
  const galleryImages = useMemo(() => [
    '/img/golden/IMG_1809.JPEG',
    '/img/golden/IMG_4117.JPEG',
    '/img/golden/IMG_4250.JPEG',
  ], []);

  // Memoize displayed images - show only 3
  const displayedImages = useMemo(() => galleryImages.slice(0, 3), [galleryImages]);

  // Memoize event handlers
  const handleImageClick = useCallback((image: string) => {
    setSelectedImage(image);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  return (
    <>
      <section id="gallery" className="py-5 bg-dark-custom position-relative overflow-hidden">
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>

        <div className="container-fluid px-3 px-md-4 position-relative" data-aos="fade-up">
          <div className="section-title-modern text-center mb-4 mb-md-5">
            <span className="section-label">{t('gallery.label', 'Galerij')}</span>
            <h2 className="section-heading">{t('gallery.title')}</h2>
            <p className="section-subtitle">{t('gallery.subtitle')}</p>
            <div className="section-line mx-auto"></div>
          </div>
        </div>

        <div className="container-fluid px-3 px-md-4" data-aos="fade-up" data-aos-delay="100">
          <div id="gallery-grid" className="gallery-grid d-flex flex-wrap">
            {displayedImages.map((image, index) => (
              <div key={index} className="gallery-item">
                <a
                  href={image}
                  className="gallery-lightbox"
                  onClick={(e) => {
                    e.preventDefault();
                    handleImageClick(image);
                  }}
                >
                  <img src={image} alt={`Gallery image ${index + 1} - The Golden Olive Antwerpen`} loading="lazy" />
                  <div className="gallery-overlay">
                    <i className="bi bi-zoom-in text-warning" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}></i>
                  </div>
                </a>
              </div>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="text-center mt-4 mt-md-5" data-aos="fade-up" data-aos-delay="200">
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center align-items-center">
              <button
                onClick={() => navigate('/galerij')}
                className="btn btn-warning btn-lg rounded-pill px-5 py-3 fw-semibold"
                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {t('gallery.showMore')} <i className="bi bi-arrow-right ms-2"></i>
              </button>
              <a
                href="https://www.instagram.com/thegoldenolive._/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-warning btn-lg rounded-pill px-5 py-3 fw-semibold"
                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.borderColor = 'var(--bs-golden)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                <i className="bi bi-instagram me-2"></i>
                {t('gallery.followInstagram') || 'Volg ons op Instagram'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10000,
            padding: '2rem',
          }}
          onClick={handleCloseModal}
        >
          <button
            className="position-absolute top-0 end-0 m-4 btn-close btn-close-white"
            onClick={handleCloseModal}
            aria-label={t('common.close')}
            style={{ fontSize: '2rem' }}
          ></button>
          <img
            src={selectedImage}
            alt="Gallery"
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default Gallery;

