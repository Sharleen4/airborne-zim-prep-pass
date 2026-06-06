// Returns a Set of topic IDs that have been cached (have questions or notes) for offline use.
import { useState, useEffect } from "react";
import { offlineDB } from "@/lib/offlineDB";

export function useCachedTopicIds() {
  const [cachedIds, setCachedIds] = useState(new Set());

  useEffect(() => {
    async function check() {
      const [questions, notes] = await Promise.all([
        offlineDB.getAll(offlineDB.STORES.questions),
        offlineDB.getAll(offlineDB.STORES.notes),
      ]);
      const ids = new Set([
        ...questions.map(q => q.topic_id),
        ...notes.map(n => n.topic_id),
      ]);
      setCachedIds(ids);
    }
    check();
  }, []);

  return cachedIds;
}