import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function OfflineFallbackScreen({
  title = "You're offline",
  message = "We couldn't load this page because you're not connected to the internet. Check your connection and try again.",
  onRetry,
  showHomeLink = true,
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retrying, setRetrying] = useState(false);

  // Listen for network changes so the screen feels alive on native apps too
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // On native apps a hard reload can feel jarring — try a soft refresh first.
        if (typeof window !== "undefined" && window.location) {
          window.location.reload();
        }
      }
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  };

  return (
    <div
      className="min-h-screen bg-background font-jakarta flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom"
      style={{
        paddingTop: "max(3rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="w-24 h-24 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-orange-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{message}</p>

          {/* Live network status pill — helpful on native apps where the user toggles wifi */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-border bg-secondary">
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-orange-500 animate-pulse"}`}
            />
            {isOnline ? "Back online — tap retry" : "Currently offline"}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 min-h-[48px]"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying..." : "Try Again"}
          </button>

          {showHomeLink && (
            <Link
              to="/home"
              className="w-full border-2 border-border text-foreground font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-secondary transition-colors min-h-[48px]"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          💡 Tip: Content you've already viewed is saved for offline use.
        </p>
      </motion.div>
    </div>
  );
}