import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: any) {
    console.error('Capital OS error boundary:', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-shell">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 12px' }}>Something went wrong</h2>
            <p style={{ color: '#aebbd0', lineHeight: 1.6 }}>{this.state.message}</p>
            <button
              className="primary auth-submit"
              onClick={() => window.location.reload()}
            >
              Reload the app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
