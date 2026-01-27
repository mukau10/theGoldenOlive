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
    video.setAttribute('preload', 'auto');
    
    // Force muted state - critical for autoplay
    video.muted = true;
    video.playsInline = true;
    video.volume = 0;
    video.defaultMuted = true;

    // Function to ensure video is visible
    const ensureVideoVisible = () => {
      video.style.display = 'block';
      video.style.visibility = 'visible';
      video.style.opacity = '1';
      video.style.zIndex = '1';
    };

    // Aggressive function to force video play - will retry continuously
    const forcePlay = async () => {
      // Always ensure muted state before playing
      video.muted = true;
      video.volume = 0;
      video.defaultMuted = true;
      ensureVideoVisible();
      
      try {
        if (video.paused) {
          // Try multiple play strategies
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise;
            return true;
          }
        }
      } catch (error) {
        // Try clicking play button programmatically if it exists
        const playButton = video.parentElement?.querySelector('.vjs-big-play-button') as HTMLElement;
        if (playButton) {
          playButton.click();
        }
        
        // Try to trigger play via click event on video
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        video.dispatchEvent(clickEvent);
        
        // Try touch event for mobile
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          view: window
        } as TouchEventInit);
        try {
          video.dispatchEvent(touchEvent);
        } catch (e) {
          // TouchEvent might not be available
        }
      }
      return false;
    };

    // Ensure video is visible immediately
    ensureVideoVisible();
    
    // Load video first
    video.load();
    
    // Immediate play attempt
    forcePlay();

    // Optimized retry interval - check every 500ms to reduce CPU usage
    let lastPlayAttempt = 0;
    const playInterval = setInterval(() => {
      const now = Date.now();
      // Throttle play attempts to max once per 500ms
      if (now - lastPlayAttempt > 500 && video.paused && video.readyState >= 1) {
        lastPlayAttempt = now;
        forcePlay();
      }
    }, 500); // Reduced frequency for better performance

    // Listen for all video events and force play
    const handleVideoEvent = () => {
      forcePlay();
    };
    
    video.addEventListener('loadedmetadata', handleVideoEvent);
    video.addEventListener('loadeddata', handleVideoEvent);
    video.addEventListener('canplay', handleVideoEvent);
    video.addEventListener('canplaythrough', handleVideoEvent);
    video.addEventListener('playing', () => {
      ensureVideoVisible();
    });
    video.addEventListener('pause', () => {
      // If video gets paused, immediately try to play again
      setTimeout(forcePlay, 100);
    });
    video.addEventListener('ended', () => {
      // If video ends, restart it
      video.currentTime = 0;
      forcePlay();
    });

    // Debounced video interaction handler for better performance
    let interactionTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastInteractionTime = 0;
    
    const enableVideoOnInteraction = () => {
      const now = Date.now();
      // Throttle interactions to max once per 200ms
      if (now - lastInteractionTime < 200) {
        return;
      }
      lastInteractionTime = now;
      
      // Clear existing timeout
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
      
      // Debounce the play attempt
      interactionTimeout = setTimeout(() => {
        forcePlay();
        
        // Also try to click any play button that might be visible
        const playButtons = document.querySelectorAll('button[aria-label*="play"], .vjs-big-play-button, .vjs-play-control');
        if (playButtons.length > 0) {
          (playButtons[0] as HTMLElement).click();
        }
      }, 100);
    };

    // Optimized interaction events - only essential ones, with passive listeners
    const eventOptions = { passive: true, capture: false };
    document.addEventListener('touchstart', enableVideoOnInteraction, eventOptions);
    document.addEventListener('click', enableVideoOnInteraction, eventOptions);
    window.addEventListener('load', enableVideoOnInteraction, { once: true });
    window.addEventListener('DOMContentLoaded', enableVideoOnInteraction, { once: true });

    // Intersection Observer - force play when video comes into view
    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              forcePlay();
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(video);
    }

    // Cleanup function
    return () => {
      clearInterval(playInterval);
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
      if (observer) {
        observer.disconnect();
      }
      document.removeEventListener('touchstart', enableVideoOnInteraction);
      document.removeEventListener('click', enableVideoOnInteraction);
      video.removeEventListener('loadedmetadata', handleVideoEvent);
      video.removeEventListener('loadeddata', handleVideoEvent);
      video.removeEventListener('canplay', handleVideoEvent);
      video.removeEventListener('canplaythrough', handleVideoEvent);
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
        background: 'transparent', // Background image removed - using video instead
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
        webkit-playsinline="true"
        x5-playsinline="true"
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          objectFit: 'cover',
          zIndex: 1,
          display: 'block',
          visibility: 'visible',
          opacity: 1,
          width: '100%',
          height: '100%',
          minWidth: '100%',
          minHeight: '100%',
          background: 'transparent',
          pointerEvents: 'auto', // Changed to auto so video can receive events
        }}
        preload="auto"
        aria-label={t('hero.videoLabel')}
        onClick={(e) => {
          const video = e.currentTarget;
          if (video.paused) {
            video.play().catch(() => {});
          }
        }}
        onTouchStart={(e) => {
          const video = e.currentTarget;
          if (video.paused) {
            video.play().catch(() => {});
          }
        }}
        onLoadedData={(e) => {
          const video = e.currentTarget;
          video.style.display = 'block';
          video.style.visibility = 'visible';
          video.style.opacity = '1';
          // Try to play immediately when data is loaded
          if (video.paused) {
            video.play().catch(() => {});
          }
        }}
        onCanPlay={(e) => {
          const video = e.currentTarget;
          video.style.display = 'block';
          video.style.visibility = 'visible';
          video.style.opacity = '1';
          // Try to play when video can play
          if (video.paused) {
            video.play().catch(() => {});
          }
        }}
      >
        <source src="/img/header_video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
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
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              <button
                onClick={scrollToMenu}
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
                onClick={() => {
                  const contactSection = document.getElementById('contact');
                  if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
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

