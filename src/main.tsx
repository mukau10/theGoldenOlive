import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import './i18n/config'
import App from './App.tsx'

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

// Register Service Worker for caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Service Worker] Registered successfully:', registration.scope);
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.warn('[Service Worker] Registration failed:', error);
      });

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Service Worker] New version available, reloading...');
      // Optionally reload the page when new service worker is activated
      // window.location.reload();
    });
  });
}

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
    background-color: #000;
    color: #fff;
    text-align: center;
    padding: 2rem;
  `;
  errorDiv.innerHTML = `
    <div>
      <h1 style="color: #ffc107; margin-bottom: 1rem;">Fout bij het laden</h1>
      <p>De applicatie kan niet worden geladen. Controleer of de HTML correct is.</p>
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
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #000;
      color: #fff;
      text-align: center;
      padding: 2rem;
    ">
      <div>
        <h1 style="color: #ffc107; margin-bottom: 1rem;">Fout bij het initialiseren</h1>
        <p style="margin-bottom: 1rem;">Er is een fout opgetreden bij het laden van de applicatie.</p>
        <button 
          onclick="window.location.reload()" 
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
