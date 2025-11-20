import { useState } from 'react';

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const galleryImages = [
    '/img/golden/mixedGrill.JPEG',
    '/img/golden/tigerGarnalen.JPEG',
    '/img/golden/IMG_1809.JPEG',
    '/img/golden/spareribs.JPEG',
    '/img/golden/chickeniwings.JPEG',
    '/img/golden/hamburger1.JPEG',
    '/img/golden/hamburger2.JPEG',
    '/img/golden/hamburger3.JPEG',
    '/img/golden/dessert.JPEG',
    '/img/golden/dessert1.JPEG',
    '/img/golden/mocktail1.JPEG',
    '/img/golden/mocktail2.JPEG',
    '/img/golden/mocktail3.JPEG',
    '/img/golden/IMG_1799.JPEG',
    '/img/golden/IMG_1812.JPEG',
    '/img/golden/IMG_1966.JPEG',
    '/img/golden/IMG_2022.JPEG',
    '/img/golden/IMG_2085.JPEG',
    '/img/golden/IMG_2136.JPEG',
    '/img/golden/IMG_2139.JPEG',
    '/img/golden/IMG_2215.JPEG',
    '/img/golden/IMG_3356.JPEG',
    '/img/golden/IMG_3447.JPEG',
    '/img/golden/IMG_3465.JPEG',
    '/img/golden/IMG_4098.JPEG',
    '/img/golden/IMG_4100.JPEG',
    '/img/golden/IMG_4117.JPEG',
    '/img/golden/IMG_4215.JPEG',
    '/img/golden/IMG_4221.JPEG',
    '/img/golden/IMG_4243.JPEG',
    '/img/golden/IMG_4250.JPEG',
    '/img/golden/IMG_4254.JPEG',
    '/img/golden/IMG_7252.JPEG',
  ];

  return (
    <>
      <section id="gallery" className="py-5 bg-dark-custom position-relative overflow-hidden">
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>

        <div className="container-fluid px-3 px-md-4 position-relative" data-aos="fade-up">
          <div className="text-center mb-4 mb-md-5">
            <h2 className="display-4 display-md-3 fw-bold text-warning mb-3 mb-md-4" style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}>Galerij</h2>
            <p className="fs-5 fs-md-4 text-warning fw-light opacity-75" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>Een voorproefje</p>
            <div className="mx-auto mt-3 bg-warning rounded-pill" style={{ width: '96px', height: '4px' }}></div>
          </div>
        </div>

        <div className="container-fluid px-3 px-md-4" data-aos="fade-up" data-aos-delay="100">
          <div id="gallery-grid" className="gallery-grid d-flex flex-wrap">
            {galleryImages.map((image, index) => (
              <div key={index} className="gallery-item">
                <a
                  href={image}
                  className="gallery-lightbox"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedImage(image);
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
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="position-absolute top-0 end-0 m-4 btn-close btn-close-white"
            onClick={() => setSelectedImage(null)}
            aria-label="Close"
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

