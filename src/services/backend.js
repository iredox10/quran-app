/**
 * Cloud backend selector — the single composition point between the Appwrite
 * backend (default) and the Render.com API (opt-in via `VITE_USE_RENDER_API`).
 *
 * Consumers that only need auth + sync + realtime subscribe here instead of
 * importing `./appwrite` directly. When the flag is OFF this module simply
 * re-exports appwrite.js, so behavior stays byte-identical to today.
 *
 * NOT swapped: raw Appwrite SDK surfaces (`databases`, `storage`, `account`,
 * Sauka group collections) still come from `./appwrite` — the Render contract
 * (quran-backend/docs/contract-*.md) does not cover those features yet.
 */
import * as appwrite from './appwrite';
import * as renderApi from './renderApi';
import { useRenderApi } from './apiConfig';

export const cloudBackendId = useRenderApi ? 'render' : 'appwrite';

export const authService = useRenderApi ? renderApi.authService : appwrite.authService;
export const syncService = useRenderApi ? renderApi.syncService : appwrite.syncService;
export const client = useRenderApi ? renderApi.client : appwrite.client;
// Kept for signature parity with appwrite.js (CloudSync builds its realtime
// channel string from them; the Render polling shim ignores it).
export const databaseId = useRenderApi ? renderApi.databaseId : appwrite.databaseId;
export const collectionId = useRenderApi ? renderApi.collectionId : appwrite.collectionId;
export const isCloudConfigured = useRenderApi ? renderApi.isRenderConfigured : appwrite.isAppwriteConfigured;
