import { useEffect, useRef } from 'react';
import { useAppStore, getSyncableState } from '../store/useAppStore';
import { authService, syncService } from '../services/appwrite';

export default function AutoSyncManager() {
    const isInitialMount = useRef(true);
    const syncTimeoutRef = useRef(null);

    useEffect(() => {
        let isSubscribed = true;

        const performInitialPull = async (userId) => {
            try {
                const remoteData = await syncService.pullState(userId);
                if (!isSubscribed) return;

                const currentState = useAppStore.getState();
                const localLastSyncAt = currentState.lastSyncAt || 0;

                if (remoteData && remoteData.state && remoteData.updatedAt > localLastSyncAt) {
                    // Cloud has newer data, auto pull and apply
                    console.log('Cloud has newer data, auto-pulling...', remoteData.updatedAt, '>', localLastSyncAt);
                    useAppStore.setState({ ...remoteData.state, lastSyncAt: remoteData.updatedAt });
                }
            } catch (error) {
                console.error('Auto-pull failed:', error);
            }
        };

        const initSync = async () => {
            const currentUser = useAppStore.getState().currentUser;
            if (!currentUser) {
                try {
                    const user = await authService.getCurrentUser();
                    if (user && isSubscribed) {
                        useAppStore.getState().setCurrentUser(user);
                        performInitialPull(user.$id);
                    }
                } catch {
                    // ignore
                }
            } else {
                performInitialPull(currentUser.$id);
            }
        };

        initSync();

        return () => {
            isSubscribed = false;
        };
    }, []);

    useEffect(() => {
        // Subscribe to store changes to trigger auto-push
        const unsubscribe = useAppStore.subscribe(
            (state, prevState) => {
                // Ignore changes on initial mount setup
                if (isInitialMount.current) {
                    isInitialMount.current = false;
                    return;
                }

                if (!state.currentUser) return;

                // Compare syncable state
                const currentSyncState = getSyncableState(state);
                const prevSyncState = getSyncableState(prevState);

                // Exclude lastSyncAt from comparison to avoid infinite loops
                const currentCompare = { ...currentSyncState };
                delete currentCompare.lastSyncAt;

                const prevCompare = { ...prevSyncState };
                delete prevCompare.lastSyncAt;

                const isDifferent = JSON.stringify(currentCompare) !== JSON.stringify(prevCompare);

                if (isDifferent) {
                    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                    
                    // Debounce push for 5 seconds
                    syncTimeoutRef.current = setTimeout(async () => {
                        try {
                            const result = await syncService.pushState(state.currentUser.$id, currentSyncState);
                            useAppStore.setState({ lastSyncAt: result.updatedAt });
                            console.log('Auto-push successful');
                        } catch (error) {
                            console.error('Auto-push failed:', error);
                        }
                    }, 5000);
                }
            }
        );

        return () => {
            unsubscribe();
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, []);

    return null;
}
