// Syncs pending changes to the server when online
// Supports queuing creates, updates, and deletes for any entity type

import { offlineDB } from "./offlineDB";
import { base44 } from "@/api/base44Client";

// ─── Generic Entity Queueing ────────────────────────────────────────────────

export async function queueEntity(entityName, operation, data) {
  const now = new Date().toISOString();
  const item = {
    id: `pending_${entityName}_${operation}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    entity_name: entityName,
    operation, // "create", "update", or "delete"
    data, // contains the data or ID to sync
    queued_at: now,
    timestamp: now,
    retry_count: 0,
  };
  await offlineDB.putOne(offlineDB.STORES.pendingSync, item);
  return item;
}

// ─── Student Results (backward compatible) ────────────────────────────────────

export async function queueResult(resultData) {
  const item = await queueEntity("StudentResult", "create", resultData);
  // Also save to local results store for immediate display
  await offlineDB.putOne(offlineDB.STORES.studentResults, {
    ...resultData,
    id: item.id,
    created_date: item.queued_at,
    _pending: true,
  });
  return item;
}

// ─── Topic Progress (backward compatible) ──────────────────────────────────

export async function queueTopicProgress(progressData) {
  const item = await queueEntity("TopicProgress", "create", progressData);
  // Optimistically update the local topicProgress store too
  await offlineDB.putOne(offlineDB.STORES.topicProgress, {
    ...progressData,
    id: item.id,
    created_date: item.queued_at,
    _pending: true,
  });
  return item;
}

// ─── Sync all pending items ─────────────────────────────────────────────────

export async function syncPendingResults() {
  const pending = await offlineDB.getAll(offlineDB.STORES.pendingSync);
  if (!pending.length) return { synced: 0, failed: 0, details: [] };

  const results = { synced: 0, failed: 0, details: [] };

  for (const item of pending) {
    try {
      const entity = base44.entities[item.entity_name];
      if (!entity) {
        throw new Error(`Unknown entity: ${item.entity_name}`);
      }

      // Handle different operation types
      if (item.operation === "create") {
        await entity.create(item.data);
        results.synced++;
        results.details.push({ id: item.id, status: "synced" });
      } else if (item.operation === "update") {
        const { id, ...updateData } = item.data;
        await entity.update(id, updateData);
        results.synced++;
        results.details.push({ id: item.id, status: "synced" });
      } else if (item.operation === "delete") {
        await entity.delete(item.data.id);
        results.synced++;
        results.details.push({ id: item.id, status: "synced" });
      }

      // Remove from queue on success
      await offlineDB.deleteOne(offlineDB.STORES.pendingSync, item.id);
    } catch (err) {
      console.warn(`[syncManager] Sync failed for ${item.entity_name} ${item.operation}:`, item.id, err);
      results.failed++;
      results.details.push({ id: item.id, status: "failed", error: err.message });
      
      // Increment retry count for exponential backoff
      item.retry_count = (item.retry_count || 0) + 1;
      if (item.retry_count < 5) {
        await offlineDB.putOne(offlineDB.STORES.pendingSync, item);
      } else {
        // Give up after 5 retries, move to dead letter
        console.error(`[syncManager] Giving up on ${item.id} after 5 retries`);
        await offlineDB.deleteOne(offlineDB.STORES.pendingSync, item.id);
      }
    }
  }

  return results;
}

export async function getPendingCount() {
  const pending = await offlineDB.getAll(offlineDB.STORES.pendingSync);
  return pending.length;
}