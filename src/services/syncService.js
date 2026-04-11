import { getSyncableState, useAppStore } from '../store/useAppStore';
import { getUserSyncData, saveUserSyncData, pushBookmark, pushMemorization, pushProgress, pushPlanner } from './appwrite/userData';
import { listSyncQueueJobs, processSyncQueue } from '../utils/syncQueue';
import { isAppwriteConfigured } from './appwrite/client';

let currentUserId = null;
let isSyncing = false;
let syncStatus = 'idle';
let lastSyncAt = null;
let syncError = null;
let syncListeners = [];

function notifySyncChange() {
    syncListeners.forEach(fn => fn({ isSyncing, syncStatus, lastSyncAt, syncError, currentUserId }));
}

export function onSyncChange(fn) {
    syncListeners.push(fn);
    return () => {
        syncListeners = syncListeners.filter(f => f !== fn);
    };
}

export function getSyncState() {
    return { isSyncing, syncStatus, lastSyncAt, syncError, currentUserId };
}

export function setSyncUserId(userId) {
    currentUserId = userId;
    notifySyncChange();
}

export async function pullUserData() {
    if (!isAppwriteConfigured() || !currentUserId) {
        syncStatus = 'disabled';
        notifySyncChange();
        return null;
    }

    try {
        syncStatus = 'pulling';
        syncError = null;
        notifySyncChange();

        const cloudData = await getUserSyncData(currentUserId);
        if (!cloudData) {
            syncStatus = 'idle';
            notifySyncChange();
            return null;
        }

        const store = useAppStore.getState();
        const syncableFields = Object.keys(getSyncableState(store));

        const mergedState = {};
        for (const field of syncableFields) {
            if (cloudData[field] !== undefined) {
                mergedState[field] = cloudData[field];
            }
        }

        useAppStore.setState(mergedState);

        lastSyncAt = Date.now();
        syncStatus = 'synced';
        notifySyncChange();

        return cloudData;
    } catch (error) {
        syncError = error.message;
        syncStatus = 'error';
        notifySyncChange();
        console.error('Failed to pull user data:', error);
        return null;
    }
}

export async function pushFullState() {
    if (!isAppwriteConfigured() || !currentUserId) {
        syncStatus = 'disabled';
        notifySyncChange();
        return false;
    }

    try {
        isSyncing = true;
        syncStatus = 'pushing';
        syncError = null;
        notifySyncChange();

        const store = useAppStore.getState();
        const syncableState = getSyncableState(store);

        await saveUserSyncData(currentUserId, syncableState);

        lastSyncAt = Date.now();
        syncStatus = 'synced';
        isSyncing = false;
        notifySyncChange();

        return true;
    } catch (error) {
        syncError = error.message;
        syncStatus = 'error';
        isSyncing = false;
        notifySyncChange();
        console.error('Failed to push full state:', error);
        return false;
    }
}

export async function processPendingJobs() {
    if (!isAppwriteConfigured() || !currentUserId) return [];

    const jobs = await listSyncQueueJobs();
    const pendingJobs = jobs.filter(j => j.status === 'pending');

    if (pendingJobs.length === 0) return [];

    try {
        isSyncing = true;
        syncStatus = 'syncing';
        notifySyncChange();

        const results = await processSyncQueue(async (job) => {
            switch (job.type) {
                case 'bookmark':
                    await pushBookmark(currentUserId, job.payload);
                    break;
                case 'memorization':
                    await pushMemorization(currentUserId, job.payload);
                    break;
                case 'progress':
                    await pushProgress(currentUserId, job.payload);
                    break;
                case 'planner':
                    await pushPlanner(currentUserId, job.payload);
                    break;
                case 'state-sync':
                    await saveUserSyncData(currentUserId, job.payload);
                    break;
                default:
                    console.warn('Unknown sync job type:', job.type);
            }
        });

        await pushFullState();

        isSyncing = false;
        syncStatus = 'synced';
        notifySyncChange();

        return results;
    } catch (error) {
        syncError = error.message;
        syncStatus = 'error';
        isSyncing = false;
        notifySyncChange();
        console.error('Failed to process sync queue:', error);
        return [];
    }
}

export async function syncNow() {
    await processPendingJobs();
}

export function setupAutoSync() {
    if (!isAppwriteConfigured()) return { cleanup: () => {} };

    const handleOnline = () => {
        if (currentUserId) {
            processPendingJobs();
        }
    };

    window.addEventListener('online', handleOnline);

    return {
        cleanup: () => window.removeEventListener('online', handleOnline),
    };
}

export async function initializeSync(userId) {
    if (!isAppwriteConfigured()) {
        syncStatus = 'disabled';
        notifySyncChange();
        return;
    }

    currentUserId = userId;
    syncStatus = 'initializing';
    notifySyncChange();

    await pullUserData();
    await processPendingJobs();
}
