import { offlineDB } from "./offlineDB";

const KNOWN_ENTITY_STORES = {
  Subject: offlineDB.STORES.subjects,
  Topic: offlineDB.STORES.topics,
  Question: offlineDB.STORES.questions,
  Note: offlineDB.STORES.notes,
  StudentResult: offlineDB.STORES.studentResults,
  TopicProgress: offlineDB.STORES.topicProgress,
  MockExam: offlineDB.STORES.mockExams,
  Diagram: offlineDB.STORES.diagrams,
  Bookmark: offlineDB.STORES.bookmarks,
  PracticeTest: offlineDB.STORES.practiceTests,
};

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function matchesFilter(item, filter = {}) {
  return Object.entries(filter || {}).every(([key, value]) => {
    if (value === undefined) return true;
    return item?.[key] === value;
  });
}

function sortItems(items, sort) {
  if (!sort) return items;
  const desc = String(sort).startsWith("-");
  const field = desc ? String(sort).slice(1) : String(sort);
  return [...items].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return av > bv ? (desc ? -1 : 1) : (desc ? 1 : -1);
  });
}

async function readCachedEntity(entityName) {
  const storeName = KNOWN_ENTITY_STORES[entityName];
  const [knownRecords, genericRecords] = await Promise.all([
    storeName ? offlineDB.getAll(storeName).catch(() => []) : Promise.resolve([]),
    offlineDB.getEntityRecords(entityName).catch(() => []),
  ]);

  const byId = new Map();
  [...genericRecords, ...knownRecords].forEach((item) => {
    if (item?.id) byId.set(item.id, item);
  });
  return [...byId.values()];
}

async function cacheEntityRecords(entityName, records) {
  const items = Array.isArray(records) ? records.filter(Boolean) : records ? [records] : [];
  if (!items.length) return;

  const storeName = KNOWN_ENTITY_STORES[entityName];
  await Promise.all([
    offlineDB.putEntityRecords(entityName, items).catch(() => {}),
    storeName ? offlineDB.putMany(storeName, items).catch(() => {}) : Promise.resolve(),
  ]);
}

async function updateCachedRecord(entityName, item) {
  if (!item?.id) return;
  const storeName = KNOWN_ENTITY_STORES[entityName];
  await Promise.all([
    offlineDB.putEntityRecord(entityName, item).catch(() => {}),
    storeName ? offlineDB.putOne(storeName, item).catch(() => {}) : Promise.resolve(),
  ]);
}

async function deleteCachedRecord(entityName, id) {
  const storeName = KNOWN_ENTITY_STORES[entityName];
  await Promise.all([
    offlineDB.deleteEntityRecord(entityName, id).catch(() => {}),
    storeName ? offlineDB.deleteOne(storeName, id).catch(() => {}) : Promise.resolve(),
  ]);
}

function wrapEntity(entityName, entity) {
  return {
    ...entity,
    async list(sort, limit, offset = 0) {
      if (!isOffline()) {
        try {
          const data = await entity.list(sort, limit, offset);
          await cacheEntityRecords(entityName, data);
          return data;
        } catch (error) {
          const cached = await readCachedEntity(entityName);
          if (cached.length) return sortItems(cached, sort).slice(offset, limit ? offset + limit : undefined);
          throw error;
        }
      }

      const cached = await readCachedEntity(entityName);
      return sortItems(cached, sort).slice(offset, limit ? offset + limit : undefined);
    },

    async filter(filter = {}, sort, limit, offset = 0) {
      if (!isOffline()) {
        try {
          const data = await entity.filter(filter, sort, limit, offset);
          await cacheEntityRecords(entityName, data);
          return data;
        } catch (error) {
          const cached = await readCachedEntity(entityName);
          if (cached.length) {
            return sortItems(cached.filter((item) => matchesFilter(item, filter)), sort)
              .slice(offset, limit ? offset + limit : undefined);
          }
          throw error;
        }
      }

      const cached = await readCachedEntity(entityName);
      return sortItems(cached.filter((item) => matchesFilter(item, filter)), sort)
        .slice(offset, limit ? offset + limit : undefined);
    },

    async get(id) {
      if (!isOffline()) {
        try {
          const data = await entity.get(id);
          await cacheEntityRecords(entityName, data);
          return data;
        } catch (error) {
          const cached = (await readCachedEntity(entityName)).find((item) => item.id === id);
          if (cached) return cached;
          throw error;
        }
      }

      return (await readCachedEntity(entityName)).find((item) => item.id === id) || null;
    },

    async create(data) {
      if (!isOffline()) {
        const created = await entity.create(data);
        await cacheEntityRecords(entityName, created || data);
        return created;
      }

      const id = data.id || `offline_${entityName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const queued = { ...data, id, _pending: true, created_date: data.created_date || new Date().toISOString() };
      const { queueEntity } = await import("./syncManager");
      await queueEntity(entityName, "create", queued);
      await updateCachedRecord(entityName, queued);
      return queued;
    },

    async update(id, data) {
      if (!isOffline()) {
        const updated = await entity.update(id, data);
        await cacheEntityRecords(entityName, updated || { ...data, id });
        return updated;
      }

      const existing = (await readCachedEntity(entityName)).find((item) => item.id === id) || {};
      const queued = { ...existing, ...data, id, _pending: true, updated_date: new Date().toISOString() };
      const { queueEntity } = await import("./syncManager");
      await queueEntity(entityName, "update", { id, ...data });
      await updateCachedRecord(entityName, queued);
      return queued;
    },

    async delete(id) {
      if (!isOffline()) {
        const result = await entity.delete(id);
        await deleteCachedRecord(entityName, id);
        return result;
      }

      const { queueEntity } = await import("./syncManager");
      await queueEntity(entityName, "delete", { id });
      await deleteCachedRecord(entityName, id);
      return true;
    },
  };
}

export function withOfflineEntityFallback(client) {
  const entityCache = new Map();

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop !== "entities") return Reflect.get(target, prop, receiver);

      return new Proxy(target.entities, {
        get(entitiesTarget, entityName, entitiesReceiver) {
          const entity = Reflect.get(entitiesTarget, entityName, entitiesReceiver);
          if (!entity || typeof entityName !== "string") return entity;
          if (!entityCache.has(entityName)) {
            entityCache.set(entityName, wrapEntity(entityName, entity));
          }
          return entityCache.get(entityName);
        },
      });
    },
  });
}
