import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log extendido para diagnóstico en consola
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      try { this.props.onReset(); } catch {}
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-full w-full flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-slate-700 mb-3">Se produjo un error al cargar este chat.</p>
            <button onClick={this.handleRetry} className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">Reintentar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}