import { useEffect, useRef } from 'react';
import { useAppStore, getSyncableState } from '../store/useAppStore';
import { authService, syncService } from '../services/appwrite';

/**
 * Headless component that automatically handles Cloud Synchronization
 * It pulls on initial mount if authenticated, and pushes automatically
 * (debounced) whenever the persistent state changes.
 */
export default function CloudSync() {
    const isPulling = useRef(false);
    const pushTimeout = useRef(null);

    useEffect(() => {
        const initializeSync = async () => {
            try {
                // 1. Get current logged in user from Appwrite
                const user = await authService.getCurrentUser();
                useAppStore.getState().setCurrentUser(user);

                if (user) {
                    // 2. Initial Pull
                    isPulling.current = true;
                    try {
                        const remoteData = await syncService.pullState(user.$id);
                        const localLastSyncAt = useAppStore.getState().lastSyncAt || 0;

                        if (remoteData && remoteData.state && remoteData.updatedAt > localLastSyncAt) {
                            useAppStore.setState({ ...remoteData.state, lastSyncAt: remoteData.updatedAt });
                            console.log('Successfully pulled remote state from Appwrite');
                        }
                    } catch (error) {
                        console.error('Failed to pull state from Appwrite', error);
                    } finally {
                        isPulling.current = false;
                    }
                }
            } catch (error) {
                // Not authenticated, safely ignore
                useAppStore.getState().setCurrentUser(null);
            }
        };

        initializeSync();

        // 3. Subscribe to Zustand store changes for Automatic Backup
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
            unsubscribe();
            if (pushTimeout.current) clearTimeout(pushTimeout.current);
        };
    }, []);

    // Headless
    return null;
}
