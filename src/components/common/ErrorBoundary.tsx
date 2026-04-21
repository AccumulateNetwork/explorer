import { Alert, Button } from 'antd';
import React from 'react';
import { useLocation } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundaryInner extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <Alert
            message="This page failed to render"
            description={
              <div>
                <p>
                  <strong>Error:</strong> {this.state.error?.toString()}
                </p>
                <details style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
                  <summary>Stack trace</summary>
                  {this.state.error?.stack}
                  {this.state.errorInfo?.componentStack}
                </details>
                <Button
                  style={{ marginTop: 16 }}
                  type="primary"
                  size="small"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
              </div>
            }
            type="error"
            showIcon
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Keying the boundary by pathname means a route change resets the error
// state — users can navigate away from a broken page instead of being
// stuck on it until they hard-reload.
export function ErrorBoundary({ children }: Props) {
  const location = useLocation();
  return (
    <ErrorBoundaryInner key={location.pathname}>{children}</ErrorBoundaryInner>
  );
}
