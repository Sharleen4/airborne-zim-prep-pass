import { useEffect, useState } from 'react';
import { AlertCircle, X, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handleControllerChange = () => {
      setShowUpdate(true);
    };

    // Listen for when a new SW takes control (update ready)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Also check on first load if there's a waiting SW
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        // New SW is waiting — prompt user
        setShowUpdate(true);
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!showUpdate) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 flex items-center justify-between gap-3 z-[400] safe-top"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm font-semibold truncate">New version available</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold"
        >
          <RotateCcw className="w-3 h-3" />
          Reload
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}