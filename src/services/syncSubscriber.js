import { useAppStore, getSyncableState } from '../store/useAppStore';
import { enqueueSyncQueueJob } from '../utils/syncQueue';
import { pushFullState } from '../services/syncService';

let previousState = null;
let debounceTimer = null;
const DEBOUNCE_MS = 2000;

function getFingerprint(state) {
    return JSON.stringify({
        bookmarks: state.bookmarks,
        memorizedAyahs: state.memorizedAyahs,
        memorizedSurahs: state.memorizedSurahs,
        collections: state.collections,
        readingSessions: state.readingSessions?.slice(-5),
        planners: state.planners,
        pomodoroHistory: state.pomodoroHistory?.slice(-5),
    });
}

async function enqueueChangeIfNeeded(currentState) {
    if (!previousState) {
        previousState = getFingerprint(currentState);
        return;
    }

    const currentFingerprint = getFingerprint(currentState);
    if (currentFingerprint === previousState) return;

    previousState = currentFingerprint;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
        const syncableState = getSyncableState(currentState);
        await enqueueSyncQueueJob({
            type: 'state-sync',
            payload: syncableState,
            dedupeKey: `state-sync-${new Date().toISOString().split('T')[0]}`,
        });
    }, DEBOUNCE_MS);
}

export function startSyncSubscriber() {
    const syncableState = getSyncableState(useAppStore.getState());
    previousState = getFingerprint(syncableState);

    return useAppStore.subscribe((state) => {
        const syncable = getSyncableState(state);
        enqueueChangeIfNeeded(syncable);
    });
}

export function triggerImmediateSync() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    const state = useAppStore.getState();
    previousState = getFingerprint(getSyncableState(state));
    return pushFullState();
}
