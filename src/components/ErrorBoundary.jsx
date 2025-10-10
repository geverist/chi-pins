// src/components/ErrorBoundary.jsx
import { Component } from 'react';

/**
 * Error Boundary component to catch React errors and prevent app crashes
 * Wraps critical sections of the app to provide graceful error handling
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send to remote logger if available
    try {
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [{
            level: 'error',
            message: `[ErrorBoundary] ${error.toString()}`,
            timestamp: new Date().toISOString(),
            context: {
              componentStack: errorInfo.componentStack,
              errorName: error.name,
              errorMessage: error.message,
              errorStack: error.stack,
              boundaryName: this.props.name || 'unnamed'
            }
          }]
        })
      }).catch(() => {
        // Silently fail if logging endpoint is down
      });
    } catch (e) {
      // Ignore logging errors
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback, showDetails = false } = this.props;

      // If custom fallback provided, use it
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback(this.state.error, this.handleReset)
          : fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: '#11141a',
            color: '#f3f5f7',
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 8,
            border: '1px solid #2a2f37'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 24px', color: '#a7b0b8', fontSize: 14 }}>
            {this.props.name ? `Error in ${this.props.name}` : 'An unexpected error occurred'}
          </p>

          {showDetails && this.state.error && (
            <div
              style={{
                background: '#1a1e25',
                padding: 16,
                borderRadius: 4,
                marginBottom: 24,
                maxWidth: 600,
                textAlign: 'left',
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#ef4444',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {this.state.error.toString()}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => (e.target.style.background = '#2563eb')}
              onMouseOut={(e) => (e.target.style.background = '#3b82f6')}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                background: '#1a1e25',
                border: '1px solid #2a2f37',
                borderRadius: 8,
                color: '#f3f5f7',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => (e.target.style.background = '#2a2f37')}
              onMouseOut={(e) => (e.target.style.background = '#1a1e25')}
            >
              Reload Page
            </button>
          </div>

          {this.state.errorCount > 1 && (
            <div
              style={{
                marginTop: 16,
                padding: '8px 16px',
                background: '#fef2f2',
                color: '#991b1b',
                borderRadius: 4,
                fontSize: 12
              }}
            >
              This error has occurred {this.state.errorCount} times
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
