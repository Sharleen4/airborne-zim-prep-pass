import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
          <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
            <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Refresh the app to continue. If you are testing offline, rebuild and reopen the preview.
            </p>
            <button
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Register service worker for offline support — PRODUCTION ONLY.
// In dev, a SW can cache stale Vite chunks and break React (e.g. "Cannot read properties of null (reading 'useState')").
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // If a SW is currently controlling this dev page, it may be serving stale chunks
    // (causes "Cannot read properties of null (reading 'useState')"). Unregister,
    // clear caches, and hard-reload ONCE so fresh dev JS loads.
    const wasControlled = !!navigator.serviceWorker.controller;
    Promise.all([
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => {}))))
        .catch(() => {}),
      window.caches?.keys
        ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k).catch(() => {})))).catch(() => {})
        : Promise.resolve(),
    ]).then(() => {
      if (wasControlled && !sessionStorage.getItem('__sw_dev_reloaded')) {
        sessionStorage.setItem('__sw_dev_reloaded', '1');
        window.location.reload();
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // Check for updates every 30 minutes
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
      }).catch(() => {});
    });
  }
}

// Prevent pinch zoom
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
)
