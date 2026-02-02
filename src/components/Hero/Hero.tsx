import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Essential properties for autoplay on all browsers/devices
    video.muted = true;
    video.playsInline = true;
    video.defaultMuted = true;

    // Simple, reliable play function
    const playVideo = async () => {
      if (!video || video.ended) return;
      
      // Ensure muted (required for autoplay)
      video.muted = true;
      
      try {
        if (video.paused && video.readyState >= 2) {
          await video.play();
        }
      } catch (error) {
        // Autoplay blocked - this is normal on some browsers
        // Video will play on first user interaction
        console.log('[Video] Autoplay blocked, waiting for user interaction');
      }
    };

    // Play when video data is loaded
    const handleLoadedData = () => {
      setIsVideoLoaded(true);
      playVideo();
    };

    // Handle video errors
    const handleError = () => {
      console.error('[Video] Failed to load video');
      setVideoError(true);
    };

    // Resume play if video gets paused (e.g., tab switch)
    const handleVisibilityChange = () => {
      if (!document.hidden && video.paused) {
        playVideo();
      }
    };

    // Play on user interaction (for browsers that block autoplay)
    const handleUserInteraction = () => {
      playVideo();
      // Remove listener after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    // Event listeners
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', playVideo);
    video.addEventListener('error', handleError);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleUserInteraction, { passive: true, once: true });
    document.addEventListener('touchstart', handleUserInteraction, { passive: true, once: true });

    // Initial play attempt
    if (video.readyState >= 2) {
      handleLoadedData();
    }

    // Cleanup
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', playVideo);
      video.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  const goToMenu = () => {
    navigate('/menu');
  };
  
  const goToContact = () => {
    navigate('/contact');
  };

  return (
    <section
      id="hero"
      className="position-relative d-flex align-items-center justify-content-center overflow-hidden"
      style={{
        minHeight: '100dvh', // Dynamic viewport height for mobile
        background: '#000', // Fallback background color
      }}
      role="banner"
      aria-label={t('hero.sectionLabel')}
    >
      {/* Fallback background image - shows while video loads or if video fails */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          zIndex: 0,
          backgroundImage: 'url(/img/golden/IMG_4117.JPEG)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: videoError || !isVideoLoaded ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
        aria-hidden="true"
      />

      {/* Video element - clean implementation */}
      {!videoError && (
        <video
          ref={videoRef}
          id="hero-video"
          autoPlay
          muted
          loop
          playsInline
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            objectFit: 'cover',
            zIndex: 1,
            opacity: isVideoLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
          preload="metadata"
          poster="/img/golden/IMG_4117.JPEG"
          aria-label={t('hero.videoLabel')}
        >
          <source src="/img/header_video.mp4" type="video/mp4" />
        </video>
      )}

      {/* Modern gradient overlay */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          zIndex: 2,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2))',
          pointerEvents: 'none',
        }}
      ></div>

      {/* Content */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between container-fluid px-3 px-md-4 text-center"
        style={{ zIndex: 10, paddingTop: '120px', paddingBottom: '60px' }}
        data-aos="zoom-in"
        data-aos-delay="100"
      >
        {/* Title - hidden on mobile to show more video */}
        <div className="row justify-content-center d-none d-md-block">
          <div className="col-12 col-lg-8">
            <h1
              className="display-3 display-md-2 display-lg-1 fw-bold text-white mb-3 mb-md-4 lh-1"
              style={{
                fontFamily: "'Playfair Display', serif",
                textShadow: '2px 2px 12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 0, 0, 0.7)',
                fontSize: 'clamp(2rem, 5vw, 5rem)',
              }}
            >
              <br className="d-none d-sm-block" />
            </h1>
          </div>
        </div>

        {/* CTA Buttons - positioned at bottom on mobile, center on desktop */}
        <div className="row justify-content-center mt-auto mt-md-4">
          <div className="col-12 col-sm-auto">
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center flex-wrap">
              <button
                onClick={goToMenu}
                className="btn btn-outline-golden rounded-pill px-4 px-md-5 py-2 py-md-3 fw-semibold text-decoration-none"
                style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', transition: 'all 0.3s ease' }}
                aria-label={t('hero.viewMenu')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <i className="bi bi-menu-button-wide me-2"></i>{t('common.ourMenu')}
              </button>
              <button
                onClick={() => navigate('/bestellen')}
                className="btn rounded-pill px-4 px-md-5 py-2 py-md-3 fw-semibold text-decoration-none"
                style={{ 
                  fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', 
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, var(--bs-golden) 0%, #e6ac00 100%)',
                  color: '#000',
                  border: 'none'
                }}
                aria-label={t('order.orderOnline', { defaultValue: 'Online Bestellen' })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <i className="bi bi-bag-check me-2"></i>{t('order.orderOnline', { defaultValue: 'Online Bestellen' })}
              </button>
              <button
                onClick={goToContact}
                className="btn btn-warning rounded-pill px-4 px-md-5 py-2 py-md-3 fw-semibold text-dark text-decoration-none"
                style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', transition: 'all 0.3s ease' }}
                aria-label={t('contact.reservation', { defaultValue: 'Reserveer' })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <i className="bi bi-calendar-check me-2"></i>{t('contact.reservation', { defaultValue: 'Reserveer' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

