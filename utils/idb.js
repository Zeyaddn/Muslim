/**
 * هُدى - IndexedDB utility (zero external deps)
 * Replaces localStorage for large Quran data (> 5MB limit concern).
 *
 * Stores:
 *   quran_surahs  - Full surah JSON keyed by surah id (number)
 *   user_prefs    - App preferences keyed by string key
 *   prayer_cache  - Prayer times keyed by date string
 *   api_cache     - Generic API cache keyed by URL
 */

const DB_NAME = 'huda_db';
const DB_VERSION = 2;

const STORES = {
  quran: 'quran_surahs',
  prefs: 'user_prefs',
  prayer: 'prayer_cache',
  api: 'api_cache',
};

let _dbPromise = null;

export function openDB() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.quran)) {
          db.createObjectStore(STORES.quran, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.prefs)) {
          db.createObjectStore(STORES.prefs);
        }
        if (!db.objectStoreNames.contains(STORES.prayer)) {
          db.createObjectStore(STORES.prayer);
        }
        if (!db.objectStoreNames.contains(STORES.api)) {
          const apiStore = db.createObjectStore(STORES.api, { keyPath: 'url' });
          apiStore.createIndex('expires', 'expires', { unique: false });
        }
      };

      req.onsuccess = (event) => resolve(event.target.result);
      req.onerror = (event) => {
        console.warn('[huda-idb] open failed:', event.target.error);
        resolve(null); // graceful fallback
      };
      req.onblocked = () => {
        console.warn('[huda-idb] upgrade blocked - close other tabs');
      };
    } catch (e) {
      console.warn('[huda-idb] IndexedDB not available:', e);
      resolve(null);
    }
  });

  return _dbPromise;
}

function idbTx(storeName, mode, fn) {
  return openDB().then((db) => {
    if (!db) return null;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    }).catch((e) => {
      console.warn('[huda-idb] tx error:', e);
      return null;
    });
  });
}

/* ===== Quran surah cache ===== */

export async function getQuranSurahIDB(surahId) {
  try {
    const result = await idbTx(STORES.quran, 'readonly', (store) => store.get(surahId));
    if (!result || !Array.isArray(result.ayahs)) return null;
    return result;
  } catch {
    return null;
  }
}

export async function setQuranSurahIDB(surahId, data) {
  if (!data || !Array.isArray(data.ayahs)) return;
  try {
    const record = { ...data, id: surahId, cachedAt: Date.now() };
    await idbTx(STORES.quran, 'readwrite', (store) => store.put(record));
  } catch (e) {
    console.warn('[huda-idb] setQuranSurah failed:', e);
  }
}

export async function getAllCachedSurahIds() {
  try {
    const db = await openDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.quran, 'readonly');
      const req = tx.objectStore(STORES.quran).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/* ===== User prefs cache ===== */

export async function getPrefIDB(key) {
  try {
    return await idbTx(STORES.prefs, 'readonly', (store) => store.get(key));
  } catch {
    return null;
  }
}

export async function setPrefIDB(key, value) {
  try {
    await idbTx(STORES.prefs, 'readwrite', (store) => store.put(value, key));
  } catch (e) {
    console.warn('[huda-idb] setPref failed:', e);
  }
}

/* ===== Prayer times cache ===== */

export async function getPrayerCacheIDB(dateKey) {
  try {
    return await idbTx(STORES.prayer, 'readonly', (store) => store.get(dateKey));
  } catch {
    return null;
  }
}

export async function setPrayerCacheIDB(dateKey, data) {
  try {
    await idbTx(STORES.prayer, 'readwrite', (store) => store.put(data, dateKey));
  } catch (e) {
    console.warn('[huda-idb] setPrayer failed:', e);
  }
}

/* ===== Generic API cache with TTL ===== */

export async function getApiCacheIDB(url) {
  try {
    const record = await idbTx(STORES.api, 'readonly', (store) => store.get(url));
    if (!record) return null;
    if (record.expires && record.expires < Date.now()) {
      idbTx(STORES.api, 'readwrite', (store) => store.delete(url)).catch(() => {});
      return null;
    }
    return record.data;
  } catch {
    return null;
  }
}

export async function setApiCacheIDB(url, data, ttlMs = 3600000) {
  try {
    const record = { url, data, cachedAt: Date.now(), expires: Date.now() + ttlMs };
    await idbTx(STORES.api, 'readwrite', (store) => store.put(record));
  } catch (e) {
    console.warn('[huda-idb] setApiCache failed:', e);
  }
}

export async function cleanExpiredApiCache() {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORES.api, 'readwrite');
    const store = tx.objectStore(STORES.api);
    const index = store.index('expires');
    const range = window.IDBKeyRange.upperBound(Date.now());
    const req = index.openCursor(range);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
  } catch {}
}