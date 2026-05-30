import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-pos-bg-primary flex flex-col items-center justify-center p-8 text-center font-body">
          <AlertTriangle size={48} className="text-pos-accent-warning mb-4" strokeWidth={1.5} />
          <h1 className="font-display font-wght-510 text-pos-xl text-pos-text-primary mb-2">
            Something went wrong
          </h1>
          <p className="text-pos-text-tertiary text-pos-sm mb-8 max-w-sm">
            {this.state.message || 'An unexpected error occurred. Please reload the page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-pos-accent-primary text-white rounded-pos-md font-medium text-pos-sm hover:bg-pos-accent-hover transition-colors"
          >
            <RefreshCw size={16} />
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
