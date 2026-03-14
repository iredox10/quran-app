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
                        const remoteState = await syncService.pullState(user.$id);
                        if (remoteState) {
                            useAppStore.setState(remoteState);
                        }
                        console.log('Successfully pulled remote state from Appwrite');
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
            // stringifying the partialize output ensures we don't trigger on internal transient state changes
            const prevStr = JSON.stringify(getSyncableState(prevState));
            const currentStr = JSON.stringify(getSyncableState(state));

            if (prevStr !== currentStr) {
                // Debounce the push step to prevent hammering the Appwrite DB
                if (pushTimeout.current) clearTimeout(pushTimeout.current);

                pushTimeout.current = setTimeout(async () => {
                    try {
                        const dataToSync = getSyncableState(state);
                        await syncService.pushState(user.$id, dataToSync);
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
