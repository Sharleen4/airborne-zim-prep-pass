import { useState, useEffect, useCallback } from "react";
import { syncPendingResults, getPendingCount } from "./syncManager";

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [syncDetails, setSyncDetails] = useState(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const results = await syncPendingResults();
      setSyncDetails({
        synced: results.synced,
        failed: results.failed,
        total: results.synced + results.failed,
      });
      setLastSynced(new Date());
      await refreshPendingCount();
      setSyncError(null);
    } catch (e) {
      console.warn("Sync error:", e);
      setSyncError(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPendingCount]);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = async () => {
      setIsOffline(false);
      await sync();
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Only sync on mount if there are actually pending items — avoids hammering API
    getPendingCount().then(count => {
      setPendingCount(count);
      if (count > 0 && navigator.onLine) sync();
    });

    // Retry sync every 30 seconds if there are pending items
    const retryInterval = setInterval(async () => {
      if (navigator.onLine && !syncing) {
        await refreshPendingCount();
        const count = await getPendingCount();
        if (count > 0) await sync();
      }
    }, 30_000);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearInterval(retryInterval);
    };
  }, []);

  return { isOffline, syncing, pendingCount, lastSynced, syncError, sync, refreshPendingCount, syncDetails };
}