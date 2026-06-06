import { useState, useEffect } from "react";
import { HardDrive, Zap, AlertCircle } from "lucide-react";
import { offlineDB } from "@/lib/offlineDB";
import { getPendingCount } from "@/lib/syncManager";

export default function OfflineStorageStatus() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [subjects, topics, questions, results, pending] = await Promise.all([
        offlineDB.getAll(offlineDB.STORES.subjects).then(d => d?.length || 0),
        offlineDB.getAll(offlineDB.STORES.topics).then(d => d?.length || 0),
        offlineDB.getAll(offlineDB.STORES.questions).then(d => d?.length || 0),
        offlineDB.getAll(offlineDB.STORES.studentResults).then(d => d?.length || 0),
        getPendingCount(),
      ]);
      setStats({ subjects, topics, questions, results, pending });
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <HardDrive className="w-3 h-3" />
        Loading storage info...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
        <HardDrive className="w-4 h-4 text-primary" />
        Cached Data
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between text-xs bg-secondary rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground">Subjects</span>
          <span className="font-semibold">{stats.subjects}</span>
        </div>
        <div className="flex items-center justify-between text-xs bg-secondary rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground">Topics</span>
          <span className="font-semibold">{stats.topics}</span>
        </div>
        <div className="flex items-center justify-between text-xs bg-secondary rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground">Questions</span>
          <span className="font-semibold">{stats.questions}</span>
        </div>
        <div className="flex items-center justify-between text-xs bg-secondary rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground">Results</span>
          <span className="font-semibold">{stats.results}</span>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold">{stats.pending} changes pending sync</p>
            <p className="text-amber-700 mt-0.5">Connect to internet to sync automatically</p>
          </div>
        </div>
      )}
    </div>
  );
}