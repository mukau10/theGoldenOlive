import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // You could also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // Clear error state and reload page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: '#000',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '600px' }}>
            <h1 style={{ color: '#ffc107', marginBottom: '1rem', fontSize: '2rem' }}>
              Oeps! Er is iets misgegaan
            </h1>
            <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
              We zijn een onverwachte fout tegengekomen. Probeer de pagina te vernieuwen.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details
                style={{
                  marginBottom: '2rem',
                  padding: '1rem',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '8px',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', color: '#ffc107' }}>
                  Technische details (alleen in development)
                </summary>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#ff6b6b',
                    marginTop: '0.5rem',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#ffcd39';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffc107';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Pagina vernieuwen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
