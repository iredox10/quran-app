import { useEffect } from 'react';
import { useAppStore, getSyncPayload } from '../store/useAppStore';
import { authService, syncService, client } from '../services/backend';
import { apiBaseUrl } from '../services/apiConfig';
import { isSyncCancellation } from '../services/renderApi';
import { createSyncEngine } from '../services/syncEngine';

/** One lifecycle-owned sync engine; StrictMode cleanup cannot cancel its replacement. */
export default function CloudSync() {
    useEffect(() => {
        const engine=createSyncEngine({
            store:useAppStore,payload:getSyncPayload,auth:authService,sync:syncService,
            subscribe:callback=>client.subscribe('sync',callback),
            namespace:`quran-sync-v2:${apiBaseUrl}`,cancelled:isSyncCancellation,
        });
        engine.start();
        return ()=>engine.stop();
    },[]);
    return null;
}
