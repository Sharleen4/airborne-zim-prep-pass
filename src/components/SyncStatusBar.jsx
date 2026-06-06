import { WifiOff, RefreshCw, CheckCircle, AlertCircle, CloudUpload, Wifi } from "lucide-react";
import { useOffline } from "@/lib/useOffline";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function AutoHideBanner({ children }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-accent animate-in fade-in slide-in-from-top duration-300"
    >
      {children}
    </motion.div>
  );
}

export default function SyncStatusBar() {
  const { isOffline, syncing, pendingCount, lastSynced, syncError, sync, syncDetails } = useOffline();

  // Offline with pending items — most urgent
  if (isOffline) {
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-orange-500 shadow-md"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>Offline mode</span>
          {pendingCount > 0 && (
            <span className="bg-white/25 rounded-full px-2 py-0.5 ml-1">
              {pendingCount} pending
            </span>
          )}
        </div>
        <span className="text-white/80 text-[10px]">Changes will sync when online</span>
      </motion.div>
    );
  }

  // Actively syncing
  if (syncing) {
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-primary shadow-md"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>Syncing changes...</span>
        </div>
        {syncDetails && syncDetails.total > 0 && (
          <div className="text-white/90 text-[10px]">
            {syncDetails.synced} of {syncDetails.total}
          </div>
        )}
      </motion.div>
    );
  }

  // Sync error
  if (syncError) {
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-destructive shadow-md"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Sync failed</span>
        </div>
        <button
          onClick={sync}
          className="underline text-white/90 hover:text-white transition-colors"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  // Pending results waiting to sync (online but not yet synced)
  if (pendingCount > 0) {
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-500 shadow-md"
      >
        <div className="flex items-center gap-2">
          <CloudUpload className="w-4 h-4 flex-shrink-0" />
          <span>{pendingCount} pending sync</span>
        </div>
        <button
          onClick={sync}
          className="bg-white/25 hover:bg-white/40 transition-colors rounded-full px-2.5 py-0.5 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Sync
        </button>
      </motion.div>
    );
  }

  // All synced — show brief confirmation for 3 seconds only
  if (lastSynced) {
    return (
      <AutoHideBanner>
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span>All changes synced ✓</span>
      </AutoHideBanner>
    );
  }

  return null;
}