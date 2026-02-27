import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 m-4">
          <div className="h-16 w-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            The application encountered an unexpected error. Please try refreshing the page.
          </p>
          
          <div className="bg-slate-100 dark:bg-black/30 p-4 rounded-lg text-left w-full max-w-lg mb-6 overflow-auto max-h-40">
            <code className="text-xs text-rose-500 font-mono">
              {this.state.error && this.state.error.toString()}
            </code>
          </div>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
