import { useEffect, useRef } from 'react';
import { useAppStore, getSyncableState } from '../store/useAppStore';
import { authService, syncService } from '../services/appwrite';
import { mergeStateInto } from '../utils/syncMerge';

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

    useEffect(() => {
        const performPull = async (user) => {
            if (isPulling.current) return;
            isPulling.current = true;
            try {
                const remoteData = await syncService.pullState(user.$id);
                const localLastSyncAt = useAppStore.getState().lastSyncAt || 0;

                if (remoteData && remoteData.state && remoteData.updatedAt > localLastSyncAt) {
                    const merged = mergeStateInto(useAppStore.getState(), remoteData.state);
                    useAppStore.setState({ ...merged, lastSyncAt: remoteData.updatedAt });
                    console.log('Successfully pulled remote state from Appwrite');
                }
            } catch (error) {
                console.error('Failed to pull state from Appwrite', error);
            } finally {
                isPulling.current = false;
            }
        };

        const initializeSync = async () => {
            try {
                // 1. Get current logged in user from Appwrite
                const user = await authService.getCurrentUser();
                useAppStore.getState().setCurrentUser(user);

                if (user) {
                    // 2. Initial Pull (already authenticated at app start)
                    pullInFlight.current = pullInFlight.current.then(() => performPull(user));
                }
            } catch (error) {
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
            if (userId && !wasLoggedIn) {
                pullInFlight.current = pullInFlight.current.then(() => performPull(state.currentUser));
            }
        });

        // 4. Subscribe to Zustand store changes for Automatic Backup
        const unsubscribe = useAppStore.subscribe((state, prevState) => {
            const user = state.currentUser;
            if (!user) return; // Only backup if logged in
            if (isPulling.current) return; // Prevent loop right after pulling

            // Check if actual syncable data changed
            const currentSyncState = getSyncableState(state);
            const prevSyncState = getSyncableState(prevState);

            // Exclude lastSyncAt from comparison to avoid infinite loops
            const currentCompare = { ...currentSyncState };
            delete currentCompare.lastSyncAt;

            const prevCompare = { ...prevSyncState };
            delete prevCompare.lastSyncAt;

            const prevStr = JSON.stringify(prevCompare);
            const currentStr = JSON.stringify(currentCompare);

            if (prevStr !== currentStr) {
                // Debounce the push step to prevent hammering the Appwrite DB
                if (pushTimeout.current) clearTimeout(pushTimeout.current);

                pushTimeout.current = setTimeout(async () => {
                    try {
                        const result = await syncService.pushState(user.$id, currentSyncState);
                        useAppStore.setState({ lastSyncAt: result.updatedAt });
                        console.log('Automated background backup complete');
                    } catch (error) {
                        console.error('Automated backup failed', error);
                    }
                }, 4000); // 4 seconds delay
            }
        });

        return () => {
            unsubscribeUser();
            unsubscribe();
            if (pushTimeout.current) clearTimeout(pushTimeout.current);
        };
    }, []);

    // Headless
    return null;
}
