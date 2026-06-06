import { useState } from "react";
import { queueEntity } from "@/lib/syncManager";
import { offlineDB } from "@/lib/offlineDB";
import { useOffline } from "@/lib/useOffline";

/**
 * Hook to create/update/delete entities with automatic offline queueing.
 * Usage: const { create, update, delete: deleteEntity, loading, error } = useOfflineEntity('Topic');
 */
export function useOfflineEntity(entityName) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOffline } = useOffline();

  const create = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const { base44 } = await import("@/api/base44Client");
      
      if (isOffline) {
        // Queue for sync when online
        await queueEntity(entityName, "create", data);
      } else {
        // Create immediately online
        await base44.entities[entityName].create(data);
      }
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const { base44 } = await import("@/api/base44Client");
      
      if (isOffline) {
        // Queue for sync when online
        await queueEntity(entityName, "update", { id, ...data });
      } else {
        // Update immediately online
        await base44.entities[entityName].update(id, data);
      }
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteEntity = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { base44 } = await import("@/api/base44Client");
      
      if (isOffline) {
        // Queue for sync when online
        await queueEntity(entityName, "delete", { id });
      } else {
        // Delete immediately online
        await base44.entities[entityName].delete(id);
      }
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { create, update, delete: deleteEntity, loading, error, isOffline };
}