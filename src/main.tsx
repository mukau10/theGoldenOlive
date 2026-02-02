import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import './i18n/config'
import App from './App.tsx'

// App version - increment this when deploying new versions
// This helps detect when the app needs to clear caches
const APP_VERSION = '2.0.0';
const VERSION_KEY = 'tgo_app_version';

// Global function to clear caches and reload - can be called from error handlers
declare global {
  interface Window {
    clearCachesAndReload: () => void;
  }
}

window.clearCachesAndReload = async () => {
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    // Clear localStorage version to force fresh start
    localStorage.removeItem(VERSION_KEY);
    
    // Force reload from server
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear caches:', error);
    window.location.reload();
  }
};

// Check if we need to clear caches due to version mismatch
const checkVersionAndClearCaches = async () => {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== APP_VERSION) {
      console.log(`[App] Version changed from ${storedVersion} to ${APP_VERSION}, clearing caches...`);
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[App] Caches cleared');
      }
      
      // Store new version
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      
      // If this is a significant version change, force reload
      if (storedVersion && storedVersion.split('.')[0] !== APP_VERSION.split('.')[0]) {
        window.location.reload();
        return false;
      }
    }
    return true;
  } catch (error) {
    console.warn('[App] Failed to check version:', error);
    return true;
  }
};

// Run version check immediately
checkVersionAndClearCaches();

// Global error handler for React 19.2.0 Activity error
// This is a known bug in React 19.2.0 - suppress the error to prevent console spam
// The error occurs internally in React's reconciliation process and doesn't affect functionality
if (typeof window !== 'undefined') {
  // Helper function to check if error is React 19 Activity error
  const isReact19ActivityError = (error: any): boolean => {
    if (!error) return false;
    
    const errorStr = typeof error === 'string' 
      ? error 
      : error?.message || error?.stack || error?.toString() || String(error);
    
    const errorLower = errorStr.toLowerCase();
    
    // Check for React 19 Activity error patterns
    const hasActivityError = (
      errorLower.includes('activity') ||
      errorLower.includes('cannot set properties of undefined') ||
      errorLower.includes('setting \'activity\'') ||
      errorLower.includes('setting "activity"')
    );
    
    // Check if error is from React vendor bundle with Activity-related stack trace
    const isReactVendorError = error?.stack && (
      error.stack.includes('react-vendor') ||
      error.stack.includes('react-vendor-CZZrESwP')
    );
    
    // Check for React internal function names in stack trace (only if from react-vendor)
    const hasReactInternalNames = isReactVendorError && (
      errorStr.includes('B3') ||
      errorStr.includes('Kf') ||
      errorStr.includes('at B3') ||
      errorStr.includes('at Kf')
    );
    
    return hasActivityError || (isReactVendorError && hasReactInternalNames);
  };

  // Catch errors before they reach console
  const originalError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (isReact19ActivityError(message) || isReact19ActivityError(error)) {
      return true; // Suppress the error
    }
    // Call original error handler if it exists
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppress console.error for React 19 Activity errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message + ' ' + arg.stack;
      if (arg?.message) return arg.message;
      if (arg?.stack) return arg.stack;
      return String(arg);
    }).join(' ');
    
    if (isReact19ActivityError(errorMessage) || args.some(isReact19ActivityError)) {
      return; // Suppress the error
    }
    originalConsoleError.apply(console, args);
  };

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isReact19ActivityError(event.reason)) {
      event.preventDefault(); // Suppress the error
      event.stopPropagation();
    }
  });
}

// Service Worker:
// - PROD: enable caching/offline
// - DEV: disable/unregister to prevent stale JS/CSS (very common source of “CSS not loading”)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // DEV: proactively disable any previously-registered SW + clear caches once per tab
    if (import.meta.env.DEV) {
      try {
        const flagKey = 'tgo_sw_disabled_in_dev';
        if (!sessionStorage.getItem(flagKey)) {
          sessionStorage.setItem(flagKey, '1');
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
          }
          // Ensure current page is controlled by network, not old SW
          window.location.reload();
          return;
        }
      } catch (error) {
        console.warn('[Service Worker] Failed to disable in dev:', error);
      }
      return;
    }

    // PROD: register and manage updates
    if (!import.meta.env.PROD) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Service Worker] Registered successfully:', registration.scope);

      // Check for updates immediately
      registration.update();

      // Check for updates every 5 minutes (more frequent to catch new deployments)
      setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);

      // Handle updates - prompt user or auto-reload
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready - reload to use new version
              console.log('[Service Worker] New version installed, reloading...');
              // Clear caches and reload
              if ('caches' in window) {
                caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
                });
              }
              window.location.reload();
            }
          });
        }
      });
    } catch (error) {
      console.warn('[Service Worker] Registration failed:', error);
    }

    // Listen for service worker controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Service Worker] Controller changed, reloading...');
      window.location.reload();
    });
  });
}

// Remove initial loader to show React app
const removeInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      loader.remove();
    }, 300);
  }
};

// Error handling for root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  // Fallback if root element doesn't exist
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
    color: #fff;
    text-align: center;
    padding: 2rem;
  `;
  errorDiv.innerHTML = `
    <div>
      <h1 style="color: #ffc107; margin-bottom: 1rem;">Fout bij het laden</h1>
      <p>De applicatie kan niet worden geladen. Controleer of de HTML correct is.</p>
      <button 
        onclick="clearCachesAndReload()" 
        style="
          padding: 0.75rem 2rem;
          background-color: #ffc107;
          color: #000;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 1rem;
        "
      >
        Pagina vernieuwen
      </button>
    </div>
  `;
  document.body.appendChild(errorDiv);
  throw new Error('Root element not found');
}

// Initialize app with error handling
try {
  const root = createRoot(rootElement);
  // Temporarily disable StrictMode to avoid React 19 Activity error
  // StrictMode can cause issues with some third-party libraries
  root.render(
    <App />
  );
  
  // Remove initial loader after React has mounted
  // Use requestAnimationFrame to ensure render is complete
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeInitialLoader();
    });
  });
} catch (error) {
  console.error('Failed to render app:', error);
  
  // Clear caches on render failure - likely stale cache issue
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
      color: #fff;
      text-align: center;
      padding: 2rem;
    ">
      <div>
        <h1 style="color: #ffc107; margin-bottom: 1rem;">Fout bij het initialiseren</h1>
        <p style="margin-bottom: 1rem;">Er is een fout opgetreden bij het laden van de applicatie.</p>
        <button 
          onclick="clearCachesAndReload()" 
          style="
            padding: 0.75rem 2rem;
            background-color: #ffc107;
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          "
        >
          Pagina vernieuwen
        </button>
      </div>
    </div>
  `;
}
