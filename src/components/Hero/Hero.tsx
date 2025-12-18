import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const Hero = () => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set video attributes for mobile autoplay - critical for iOS and Android
    video.setAttribute('autoplay', 'autoplay');
    video.setAttribute('muted', 'muted');
    video.setAttribute('playsinline', 'playsinline');
    video.setAttribute('webkit-playsinline', 'webkit-playsinline');
    video.setAttribute('x5-playsinline', 'true'); // For Android/WeChat browsers
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-player-fullscreen', 'true');
    video.setAttribute('x5-video-orientation', 'portrait');
    video.muted = true;
    video.playsInline = true;
    video.volume = 0; // Ensure volume is 0 for mobile autoplay

    // Function to attempt video play with retry logic
    const attemptPlay = async () => {
      try {
        // Ensure video is muted before attempting to play
        video.muted = true;
        video.volume = 0;
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Video is playing successfully');
          video.style.background = 'transparent';
          video.style.backgroundColor = 'transparent';
        }
      } catch (error) {
        console.warn('Video autoplay prevented:', error);
        // Retry after a short delay
        setTimeout(() => {
          if (video.paused) {
            video.muted = true;
            video.volume = 0;
            video.play().catch(() => {
              // Silently fail if still blocked
            });
          }
        }, 500);
      }
    };

    // Try to play immediately when video is ready
    if (video.readyState >= 3) {
      // Video is already loaded enough
      attemptPlay();
    }

    // Listen for video events - multiple events for better mobile support
    video.addEventListener('loadedmetadata', attemptPlay, { once: true });
    video.addEventListener('loadeddata', attemptPlay, { once: true });
    video.addEventListener('canplay', attemptPlay, { once: true });
    video.addEventListener('canplaythrough', attemptPlay, { once: true });
    video.addEventListener('playing', () => {
      video.style.background = 'transparent';
      video.style.backgroundColor = 'transparent';
    });

    // On mobile, autoplay might be blocked - enable play on first user interaction
    const enableVideoOnInteraction = () => {
      video.muted = true;
      video.volume = 0;
      attemptPlay();
    };

    // Multiple interaction events for better mobile support
    const interactionOptions = { once: true, passive: true };
    document.addEventListener('touchstart', enableVideoOnInteraction, interactionOptions);
    document.addEventListener('touchend', enableVideoOnInteraction, interactionOptions);
    document.addEventListener('click', enableVideoOnInteraction, interactionOptions);
    document.addEventListener('scroll', enableVideoOnInteraction, interactionOptions);

    // Intersection Observer - retry when video comes into view
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && video.paused) {
              attemptPlay();
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(video);
      
      return () => {
        observer.disconnect();
      };
    }

    // Cleanup function
    return () => {
      document.removeEventListener('touchstart', enableVideoOnInteraction);
      document.removeEventListener('touchend', enableVideoOnInteraction);
      document.removeEventListener('click', enableVideoOnInteraction);
      document.removeEventListener('scroll', enableVideoOnInteraction);
    };
  }, []);

  const scrollToMenu = () => {
    const menuSection = document.getElementById('menu');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      className="position-relative d-flex align-items-center justify-content-center overflow-hidden"
      style={{
        minHeight: '100dvh', // Dynamic viewport height for mobile
        background: "url('/img/golden/IMG_4117.JPEG') center/cover no-repeat",
      }}
      role="banner"
      aria-label={t('hero.sectionLabel')}
    >
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
          display: 'block',
          visibility: 'visible',
          opacity: 1,
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
        preload="auto"
        aria-label={t('hero.videoLabel')}
      >
        <source src="/img/header_video.mp4" type="video/mp4" />
        <source src="/img/header_video.mov" type="video/quicktime" />
        <img
          src="/img/golden/IMG_4117.JPEG"
          alt="Restaurant ambiance"
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{ objectFit: 'cover' }}
        />
      </video>

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
        className="position-relative container-fluid px-3 px-md-4 text-center"
        style={{ zIndex: 10, paddingTop: '120px', paddingBottom: '60px' }}
        data-aos="zoom-in"
        data-aos-delay="100"
      >
        <div className="row justify-content-center">
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

        {/* Menu button */}
        <div className="row justify-content-center mt-4 mt-md-5">
          <div className="col-12 col-sm-auto">
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              <button
                onClick={scrollToMenu}
                className="btn btn-outline-golden rounded-pill px-4 px-md-5 py-2 py-md-3 fw-semibold text-decoration-none"
                style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}
                aria-label={t('hero.viewMenu')}
              >
                <i className="bi bi-arrow-right me-2"></i>{t('common.ourMenu')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

