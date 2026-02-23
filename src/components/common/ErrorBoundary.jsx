import React from "react";
import { logUploadError } from "../utils/uploadLogger";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
    // Registrar en upload logger para diagnóstico de fallos silenciosos
    try { logUploadError(null, error, 'ErrorBoundary:' + (info?.componentStack?.split('\n')[1] || '')); } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      try { this.props.onReset(); } catch {}
    }
  };

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || '';
      const label = this.props.label || 'esta sección';
      return this.props.fallback || (
        <div className="h-full w-full flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-slate-700 mb-1 font-semibold">Algo ha ido mal en {label}.</p>
            <p className="text-sm text-slate-500 mb-3">Pulsa "Reintentar" o recarga la página si el problema persiste.</p>
            {message && (
              <p className="text-xs text-slate-400 mb-3 break-all font-mono">{message}</p>
            )}
            <button onClick={this.handleRetry} className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">Reintentar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}