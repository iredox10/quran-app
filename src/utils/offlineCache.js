import { db } from './db';

const STORE_NAME = 'api-responses';

export async function getOfflineCacheEntry(key) {
  try {
    const entry = await db.table(STORE_NAME).get(key);
    return entry || null;
  } catch (error) {
    console.error('Dexie getOfflineCacheEntry error:', error);
    return null;
  }
}

export async function setOfflineCacheEntry(key, data) {
  try {
    await db.table(STORE_NAME).put({ key, data, updatedAt: Date.now() });
  } catch (error) {
    console.error('Dexie setOfflineCacheEntry error:', error);
    throw error;
  }
}

export async function getOfflineCacheData(key) {
  const entry = await getOfflineCacheEntry(key);
  return entry?.data ?? null;
}

export async function getAllOfflineCacheEntries() {
  try {
    const entries = await db.table(STORE_NAME).toArray();
    return entries;
  } catch (error) {
    console.error('Dexie getAllOfflineCacheEntries error:', error);
    return [];
  }
}

export async function getOfflineCacheStats(prefix = '') {
  try {
    let query = db.table(STORE_NAME);
    if (prefix) {
      query = query.where('key').startsWith(prefix);
    }
    const entries = await query.toArray();

    const approximateBytes = entries.reduce((sum, entry) => {
      try {
        return sum + new Blob([JSON.stringify(entry.data)]).size;
      } catch {
        return sum;
      }
    }, 0);

    return {
      count: entries.length,
      approximateBytes,
    };
  } catch (error) {
    console.error('Dexie getOfflineCacheStats error:', error);
    return { count: 0, approximateBytes: 0 };
  }
}

export async function deleteOfflineCacheByPrefix(prefix) {
  try {
    const count = await db.table(STORE_NAME).where('key').startsWith(prefix).delete();
    return count;
  } catch (error) {
    console.error('Dexie deleteOfflineCacheByPrefix error:', error);
    throw error;
  }
}
