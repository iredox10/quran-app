import { useEffect, useRef } from 'react';
import { useAppStore, getSyncPayload } from '../store/useAppStore';
import { authService, syncService } from '../services/appwrite';
import { mergeStateInto, slimStatePayload } from '../utils/syncMerge';

const PENDING_MARKER = 'quran-app-sync-pending';

/**
 * Headless component that automatically handles Cloud Synchronization
 * It pulls on initial mount if authenticated, pulls again whenever the user
 * logs in (so a fresh device gets its data back), and pushes automatically
 * (debounced) whenever the persistent state changes.
 */
export default function CloudSync() {
    const isPulling = useRef(false);
    const pushTimeout = useRef(null);
    const pullInFlight = useRef(Promise.resolve());
    const retryTimers = useRef([]);
    const pushAfterPull = useRef(false);
    const disposed = useRef(false);

    useEffect(() => {
        disposed.current = false;
        const { setSyncStatus } = useAppStore.getState();

        const delay = (ms) => new Promise((resolve) => {
            const id = setTimeout(resolve, ms);
            retryTimers.current.push(id);
        });

        const runPush = async (getFreshPayloadFn) => {
            const delays = [0, 5000, 20000];
            let lastError = null;
            for (let attempt = 0; attempt < delays.length; attempt++) {
                if (attempt > 0) await delay(delays[attempt]);
                if (disposed.current) return false;
                const user = useAppStore.getState().currentUser;
                if (!user) return false;

                let payload;
                try {
                    payload = slimStatePayload(getFreshPayloadFn());
                } catch (error) {
                    const message = String(error?.message || error);
                    console.error('Sync payload could not be built', error);
                    setSyncStatus('error', message);
                    return false;
                }

                try {
                    setSyncStatus('pushing');
                    const result = await syncService.pushState(user.$id, payload);
                    useAppStore.setState({ lastSyncAt: result.updatedAt });
                    localStorage.removeItem(PENDING_MARKER);
                    setSyncStatus('idle');
                    console.log('Automated background backup complete');
                    return true;
                } catch (error) {
                    lastError = error;
                    console.error('Automated backup failed', error);
                }
            }

            const message = String(lastError?.message || lastError);
            setSyncStatus('error', message);
            const user = useAppStore.getState().currentUser;
            if (user) {
                localStorage.setItem(PENDING_MARKER, JSON.stringify({ userId: user.$id, at: Date.now() }));
            }
            return false;
        };

        const flushPending = async () => {
            try {
                const raw = localStorage.getItem(PENDING_MARKER);
                if (!raw) return;
                const user = useAppStore.getState().currentUser;
                if (!user) return;
                let marker = null;
                try {
                    marker = JSON.parse(raw);
                } catch {
                    marker = null;
                }
                if (marker?.userId && marker.userId !== user.$id) return;
                await runPush(() => getSyncPayload(useAppStore.getState()));
            } catch (error) {
                console.error('Pending sync flush failed', error);
            }
        };

        const performPull = async (user) => {
            if (isPulling.current) return;
            isPulling.current = true;
            setSyncStatus('pulling');
            let remoteData = null;
            let merged = false;
            try {
                remoteData = await syncService.pullState(user.$id);
                const localLastSyncAt = useAppStore.getState().lastSyncAt || 0;

                if (remoteData && remoteData.state && remoteData.updatedAt > localLastSyncAt) {
                    const mergedState = mergeStateInto(useAppStore.getState(), remoteData.state);
                    useAppStore.setState({ ...mergedState, lastSyncAt: remoteData.updatedAt });
                    merged = true;
                    console.log('Successfully pulled remote state from Appwrite');
                }
                setSyncStatus('idle');
            } catch (error) {
                console.error('Failed to pull state from Appwrite', error);
                setSyncStatus('error', String(error?.message || error));
            } finally {
                isPulling.current = false;
            }

            if (merged && remoteData && !pushAfterPull.current) {
                pushAfterPull.current = true;
                try {
                    let localStr;
                    try {
                        localStr = JSON.stringify(slimStatePayload(getSyncPayload(useAppStore.getState())));
                    } catch {
                        localStr = null;
                    }
                    let remoteStr;
                    try {
                        remoteStr = JSON.stringify(slimStatePayload(remoteData.state));
                    } catch {
                        remoteStr = JSON.stringify(remoteData.state);
                    }
                    if (localStr !== remoteStr) {
                        await runPush(() => getSyncPayload(useAppStore.getState()));
                    }
                } catch (error) {
                    console.error('Post-pull backup failed', error);
                } finally {
                    pushAfterPull.current = false;
                }
            }
        };

        const initializeSync = async () => {
            try {
                // 1. Get current logged in user from Appwrite
                const user = await authService.getCurrentUser();
                useAppStore.getState().setCurrentUser(user);

                if (user) {
                    // 2. Initial Pull (already authenticated at app start)
                    pullInFlight.current = pullInFlight.current
                        .then(() => performPull(user))
                        .then(() => flushPending());
                }
            } catch {
                // Not authenticated, safely ignore
                useAppStore.getState().setCurrentUser(null);
            }
        };

        initializeSync();

        // 3. Pull whenever the user logs in (null -> user transition), so a
        //    fresh device restores its cloud data right after sign-in.
        const unsubscribeUser = useAppStore.subscribe((state, prevState) => {
            const userId = state.currentUser?.$id || null;
            const wasLoggedIn = prevState.currentUser?.$id || null;
            if (userId && userId !== wasLoggedIn) {
                useAppStore.setState({ lastSyncAt: 0 });
                pullInFlight.current = pullInFlight.current.then(() => performPull(state.currentUser));
            } else if (!userId && wasLoggedIn) {
                useAppStore.setState({ lastSyncAt: 0, syncStatus: 'idle', syncError: null });
            }
        });

        // 4. Subscribe to Zustand store changes for Automatic Backup
        const unsubscribe = useAppStore.subscribe((state, prevState) => {
            const user = state.currentUser;
            if (!user) return; // Only backup if logged in
            if (isPulling.current) return; // Prevent loop right after pulling

            // Exclude lastSyncAt from comparison to avoid infinite loops
            const currentCompare = getSyncPayload(state);
            const prevCompare = getSyncPayload(prevState);

            const prevStr = JSON.stringify(prevCompare);
            const currentStr = JSON.stringify(currentCompare);

            if (prevStr !== currentStr) {
                // Debounce the push step to prevent hammering the Appwrite DB
                if (pushTimeout.current) clearTimeout(pushTimeout.current);

                pushTimeout.current = setTimeout(() => {
                    runPush(() => getSyncPayload(useAppStore.getState()));
                }, 4000); // 4 seconds delay
            }
        });

        const handleOnline = () => {
            flushPending();
        };
        window.addEventListener('online', handleOnline);

        return () => {
            disposed.current = true;
            unsubscribeUser();
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            if (pushTimeout.current) clearTimeout(pushTimeout.current);
            retryTimers.current.forEach((id) => clearTimeout(id));
            retryTimers.current = [];
        };
    }, []);

    // Headless
    return null;
}
