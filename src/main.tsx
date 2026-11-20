import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class JarvisErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected runtime error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('J. A. R. V. I. S. UI boundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#02050b] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl space-y-4 text-center">
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              J. A. R. V. I. S. System Recovery
            </div>
            <h2 className="text-lg font-bold text-white">
              Display Module Reset Required
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ek temporary preview error detect hua hai: <code className="text-amber-300">{this.state.message}</code>
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
              >
                Reload J. A. R. V. I. S.
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('jarvis_screen_brightness');
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Reset Display Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <JarvisErrorBoundary>
    <App />
  </JarvisErrorBoundary>
);
