// IndexedDB wrapper for offline-first data storage
// Falls back to in-memory store if IndexedDB is unavailable (e.g. restricted webviews)

const DB_NAME = "zimexam_offline";
const DB_VERSION = 8;

const STORES = {
  subjects: "subjects",
  topics: "topics",
  questions: "questions",
  notes: "notes",
  studentResults: "studentResults",
  topicProgress: "topicProgress",
  pendingSync: "pendingSync",
  mockExams: "mockExams",
  diagrams: "diagrams",
  bookmarks: "bookmarks",
  practiceTests: "practiceTests",
  entityRecords: "entityRecords",
  contentPackages: "contentPackages",
};

// In-memory fallback used when IndexedDB is not available
const memoryStore = {};
Object.values(STORES).forEach((s) => { memoryStore[s] = {}; });

let dbInstance = null;
let openDBPromise = null;



function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openDBPromise) return openDBPromise;

  openDBPromise = new Promise((resolve) => {
    try {
      if (!window?.indexedDB) {
        console.warn("[offlineDB] IndexedDB not available");
        openDBPromise = null;
        return resolve(null);
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      // Generous timeout for slow mobile devices
      const timeout = setTimeout(() => {
        console.warn("[offlineDB] IndexedDB open timed out — using memory store");
        openDBPromise = null;
        resolve(null);
      }, 10000);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        Object.values(STORES).forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: store === STORES.entityRecords ? "cache_key" : "id" });
          }
        });
      };

      req.onsuccess = (e) => {
        clearTimeout(timeout);
        dbInstance = e.target.result;
        openDBPromise = null;

        dbInstance.onclose = () => {
          console.warn("[offlineDB] DB connection closed — will reopen on next access");
          dbInstance = null;
        };
        dbInstance.onerror = (ev) => {
          console.error("[offlineDB] DB runtime error", ev);
        };
        // Handle version conflicts (another tab has newer version open)
        dbInstance.onversionchange = () => {
          dbInstance.close();
          dbInstance = null;
          console.warn("[offlineDB] DB version changed — connection closed");
        };

        resolve(dbInstance);
      };

      req.onerror = (e) => {
        clearTimeout(timeout);
        console.error("[offlineDB] Open error:", e.target?.error);
        openDBPromise = null;
        resolve(null);
      };

      // onblocked means another tab has an older version open.
      // Don't fail — just wait (the timeout will handle it if it never unblocks)
      req.onblocked = () => {
        console.warn("[offlineDB] Open blocked — waiting for other tabs to close");
        // Don't resolve null here — let onsuccess or timeout handle it
      };

    } catch (err) {
      console.error("[offlineDB] Exception opening DB:", err);
      openDBPromise = null;
      resolve(null);
    }
  });

  return openDBPromise;
}

async function getAll(storeName) {
  const db = await openDB();
  if (!db) return Object.values(memoryStore[storeName] || {});
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      console.warn("[offlineDB] getAll error:", e);
      resolve([]);
    }
  });
}

async function getById(storeName, id) {
  const db = await openDB();
  if (!db) return memoryStore[storeName]?.[id] || null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) {
      console.warn("[offlineDB] getById error:", e);
      resolve(null);
    }
  });
}

async function putMany(storeName, items) {
  if (!Array.isArray(items)) items = items ? [items] : [];
  if (!items || items.length === 0) return;
  const db = await openDB();
  if (!db) {
    items.forEach((item) => { if (item?.id) memoryStore[storeName][item.id] = item; });
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      items.forEach((item) => { if (item?.id) store.put(item); });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => {
        console.warn("[offlineDB] putMany error:", e.target?.error);
        resolve();
      };
    } catch (e) {
      console.warn("[offlineDB] putMany exception:", e);
      resolve();
    }
  });
}

async function putOne(storeName, item) {
  return putMany(storeName, [item]);
}

async function deleteOne(storeName, id) {
  const db = await openDB();
  if (!db) { delete memoryStore[storeName][id]; return; }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      console.warn("[offlineDB] deleteOne error:", e);
      resolve();
    }
  });
}

async function clearStore(storeName) {
  const db = await openDB();
  if (!db) { memoryStore[storeName] = {}; return; }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      console.warn("[offlineDB] clearStore error:", e);
      resolve();
    }
  });
}

export const offlineDB = {
  STORES,
  getAll,
  getById,
  putMany,
  putOne,
  deleteOne,
  clearStore,
  async getEntityRecords(entityName) {
    const records = await getAll(STORES.entityRecords);
    return records
      .filter((record) => record.entity_name === entityName)
      .map(({ cache_key, entity_name, cached_at, ...data }) => data);
  },
  async putEntityRecords(entityName, items) {
    if (!items || items.length === 0) return;
    const now = new Date().toISOString();
    await putMany(
      STORES.entityRecords,
      items
        .filter((item) => item?.id)
        .map((item) => ({
          ...item,
          cache_key: `${entityName}:${item.id}`,
          entity_name: entityName,
          cached_at: now,
        }))
    );
  },
  async putEntityRecord(entityName, item) {
    if (!item?.id) return;
    return this.putEntityRecords(entityName, [item]);
  },
  async deleteEntityRecord(entityName, id) {
    if (!id) return;
    return deleteOne(STORES.entityRecords, `${entityName}:${id}`);
  },
};
