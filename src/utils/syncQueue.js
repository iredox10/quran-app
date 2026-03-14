const DB_NAME = 'quran-sync-queue-db';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';

function openSyncQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('dedupeKey', 'dedupeKey', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStore(mode, handler) {
  return openSyncQueueDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = handler(store, transaction, resolve, reject);

    transaction.onerror = () => reject(transaction.error);
    if (result !== undefined) {
      resolve(result);
    }
  }));
}

export async function listSyncQueueJobs() {
  return runStore('readonly', (store, _transaction, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueSyncQueueJob({ type, payload, userId = null, dedupeKey = null }) {
  const existingJobs = dedupeKey ? await listSyncQueueJobs() : [];
  const existingJob = dedupeKey
    ? existingJobs.find((job) => job.dedupeKey === dedupeKey && job.status !== 'completed')
    : null;

  const job = {
    id: existingJob?.id || `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    userId,
    dedupeKey,
    status: 'pending',
    attempts: existingJob?.attempts || 0,
    lastError: null,
    queuedAt: existingJob?.queuedAt || Date.now(),
    updatedAt: Date.now(),
  };

  await runStore('readwrite', (store) => {
    store.put(job);
  });

  return job;
}

export async function updateSyncQueueJob(jobId, updates) {
  const jobs = await listSyncQueueJobs();
  const existingJob = jobs.find((job) => job.id === jobId);
  if (!existingJob) {
    return null;
  }

  const nextJob = {
    ...existingJob,
    ...updates,
    updatedAt: Date.now(),
  };

  await runStore('readwrite', (store) => {
    store.put(nextJob);
  });

  return nextJob;
}

export async function removeSyncQueueJob(jobId) {
  await runStore('readwrite', (store) => {
    store.delete(jobId);
  });
}

export async function getSyncQueueSummary(type = null, userId = null) {
  const jobs = await listSyncQueueJobs();
  const filtered = jobs.filter((job) => (!type || job.type === type) && (!userId || job.userId === userId));

  return {
    total: filtered.length,
    pending: filtered.filter((job) => job.status === 'pending').length,
    failed: filtered.filter((job) => job.status === 'failed').length,
  };
}
