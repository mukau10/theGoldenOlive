import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import './i18n/config'
import App from './App.tsx'

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
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
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
