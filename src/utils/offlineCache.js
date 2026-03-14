const DB_NAME = 'quran-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'api-responses';

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineCacheEntry(key) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function setOfflineCacheEntry(key, data) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key, data, updatedAt: Date.now() });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getOfflineCacheData(key) {
  const entry = await getOfflineCacheEntry(key);
  return entry?.data ?? null;
}

export async function getAllOfflineCacheEntries() {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineCacheStats(prefix = '') {
  const entries = await getAllOfflineCacheEntries();
  const filtered = prefix ? entries.filter((entry) => entry.key.startsWith(prefix)) : entries;
  const approximateBytes = filtered.reduce((sum, entry) => {
    try {
      return sum + new Blob([JSON.stringify(entry.data)]).size;
    } catch {
      return sum;
    }
  }, 0);

  return {
    count: filtered.length,
    approximateBytes,
  };
}

export async function deleteOfflineCacheByPrefix(prefix) {
  const db = await openOfflineDb();
  const entries = await getAllOfflineCacheEntries();
  const keys = entries.filter((entry) => entry.key.startsWith(prefix)).map((entry) => entry.key);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    keys.forEach((key) => store.delete(key));

    transaction.oncomplete = () => resolve(keys.length);
    transaction.onerror = () => reject(transaction.error);
  });
}
