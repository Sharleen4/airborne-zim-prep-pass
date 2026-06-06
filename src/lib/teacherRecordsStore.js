// Offline-first store for teacher-recorded assessment results (tests, exams, exercises).
// Uses a dedicated IndexedDB store ("teacherRecords") and syncs pending records to the
// TeacherRecord entity whenever the user is online.

import { base44 } from "@/api/base44Client";

const DB_NAME = "zimexam_teacher_records";
const DB_VERSION = 1;
const STORE = "teacherRecords";

const memory = {};
let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve) => {
    try {
      if (!window?.indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "local_id" });
      };
      req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function newId() {
  return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listLocalRecords(teacherEmail) {
  const db = await openDB();
  if (!db) return Object.values(memory).filter(r => r.teacher_email === teacherEmail);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result || []).filter(r => r.teacher_email === teacherEmail));
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}

export async function saveLocalRecord(record) {
  const item = {
    ...record,
    local_id: record.local_id || newId(),
    synced: !!record.synced,
    created_at: record.created_at || new Date().toISOString(),
  };
  const db = await openDB();
  if (!db) { memory[item.local_id] = item; return item; }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => resolve(item);
    } catch { resolve(item); }
  });
}

export async function deleteLocalRecord(local_id) {
  const db = await openDB();
  if (!db) { delete memory[local_id]; return; }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(local_id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
}

// Push every unsynced local record to the TeacherRecord entity.
export async function syncPendingRecords(teacherEmail) {
  if (!navigator.onLine) return { synced: 0, pending: 0 };
  const all = await listLocalRecords(teacherEmail);
  const pending = all.filter(r => !r.synced);
  let synced = 0;
  for (const r of pending) {
    try {
      // Strip local-only fields before sending
      const { local_id, synced: _s, created_at, ...payload } = r;
      await base44.entities.TeacherRecord.create(payload);
      await saveLocalRecord({ ...r, synced: true });
      synced += 1;
    } catch (e) {
      console.warn("[teacherRecords] sync failed for", r.local_id, e.message);
    }
  }
  return { synced, pending: pending.length };
}