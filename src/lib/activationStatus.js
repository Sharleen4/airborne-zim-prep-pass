const ACTIVATION_CACHE_PREFIX = "zama_activation_status";
const LEGACY_SUBSCRIPTION_CACHE_KEY = "zama_sub_status";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const OFFLINE_GRACE_DAYS = 14;

function storageAvailable() {
  return typeof globalThis !== "undefined" && !!globalThis.window?.localStorage;
}

function getStorage() {
  return globalThis.window?.localStorage;
}

export function activationCacheKey(user) {
  const identifier = user?.email || user?.id || "local";
  return `${ACTIVATION_CACHE_PREFIX}_${identifier}`;
}

function daysUntil(timestamp, now = Date.now()) {
  if (!timestamp) return 0;
  return Math.max(0, Math.ceil((timestamp - now) / MS_PER_DAY));
}

function roleBypass(user) {
  if (user?.__localOfflinePreview) return { active: true, isLocalOfflinePreview: true };
  if (user?.role === "admin") return { active: true, isAdmin: true };
  if (user?.role === "teacher" || user?.role === "school_admin") return { active: true, isStaff: true };
  return null;
}

export function normalizeActivationStatus(user, rawStatus = {}, options = {}) {
  const now = options.now || Date.now();
  const source = options.source || "online";
  const bypass = roleBypass(user);
  const input = { ...(rawStatus || {}), ...(bypass || {}) };
  const isTrial = !!input.isTrial || input.status === "trial" || input.activation_status === "trial";
  const isAdmin = !!input.isAdmin || user?.role === "admin";
  const isStaff = !!input.isStaff || user?.role === "teacher" || user?.role === "school_admin";
  const isLocalOfflinePreview = !!input.isLocalOfflinePreview || !!user?.__localOfflinePreview;
  const isExpired =
    !!input.isExpired ||
    input.status === "expired" ||
    input.activation_status === "expired";

  let status = "free";
  let active = false;

  if (isAdmin || isStaff || isLocalOfflinePreview) {
    status = "active";
    active = true;
  } else if (isTrial) {
    status = "trial";
    active = true;
  } else if (input.active === true || input.status === "active" || input.activation_status === "active") {
    status = "active";
    active = true;
  } else if (isExpired) {
    status = "expired";
  }

  return {
    ...input,
    active,
    status,
    activation_status: status,
    source,
    isTrial,
    isAdmin,
    isStaff,
    isLocalOfflinePreview,
    isExpired: status === "expired",
    isFree: status === "free" || status === "expired",
    limited: !active,
    checked_at: input.checked_at || now,
  };
}

export function readCachedActivation(user) {
  if (!storageAvailable()) return null;
  try {
    const storage = getStorage();
    const stored = storage.getItem(activationCacheKey(user));
    if (stored) return JSON.parse(stored);

    const legacy = storage.getItem(LEGACY_SUBSCRIPTION_CACHE_KEY);
    if (!legacy) return null;
    return JSON.parse(legacy);
  } catch {
    return null;
  }
}

export function cachedActivationIsValid(cached, now = Date.now()) {
  if (!cached) return false;
  const status = cached.activation_status || cached.status;
  const grantsAccess = cached.active === true || status === "active" || status === "trial" || status === "offline_cached";
  const offlineExpiresAt = Number(cached.offline_expires_at || 0);
  return grantsAccess && offlineExpiresAt > now;
}

export function activationFromCache(user, now = Date.now()) {
  const cached = readCachedActivation(user);
  if (!cachedActivationIsValid(cached, now)) {
    return normalizeActivationStatus(user, { active: false, status: "free" }, { source: "cache", now });
  }

  return {
    ...cached,
    active: true,
    status: "offline_cached",
    activation_status: "offline_cached",
    source: "cache",
    isOfflineCached: true,
    isExpired: false,
    isFree: false,
    limited: false,
    offline_grace_days_left: daysUntil(Number(cached.offline_expires_at), now),
  };
}

export function cacheActivationIfAllowed(user, activation, now = Date.now()) {
  if (!storageAvailable() || !activation?.active) return;
  const status = activation.activation_status || activation.status;
  if (!["active", "trial", "offline_cached"].includes(status)) return;

  const cached = {
    ...activation,
    status: status === "offline_cached" ? "active" : status,
    activation_status: status === "offline_cached" ? "active" : status,
    source: "online",
    checked_at: now,
    offline_expires_at: now + OFFLINE_GRACE_DAYS * MS_PER_DAY,
    offline_grace_days: OFFLINE_GRACE_DAYS,
  };

  try {
    const storage = getStorage();
    storage.setItem(activationCacheKey(user), JSON.stringify(cached));
    storage.setItem(LEGACY_SUBSCRIPTION_CACHE_KEY, JSON.stringify(cached));
  } catch {}
}

export function clearActivationCache(user) {
  if (!storageAvailable()) return;
  try {
    const storage = getStorage();
    storage.removeItem(LEGACY_SUBSCRIPTION_CACHE_KEY);
    if (user) storage.removeItem(activationCacheKey(user));
  } catch {}
}
