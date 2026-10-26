/**
 * Render.com API backend — mirrors the exported surface of `appwrite.js` so
 * consumers can swap cleanly (see `backend.js` for the selector).
 *
 *  - auth: POST /auth/register | /auth/login | /auth/refresh (JWT HS256,
 *    persisted in localStorage — tokens only, never secrets)
 *  - sync: GET /v1/sync (pull) + PUT /v1/sync (push) with the EXACT same
 *    document field names appwrite.js serializes: { userId, stateData } where
 *    stateData is the JSON-stringified sync payload. Push keeps the Appwrite
 *    merge semantics: remote doc is fetched and merged via mergeStateInto so
 *    both devices' data survives.
 *  - realtime: Appwrite Realtime has no JWT equivalent here, so `client` is a
 *    polling shim with the same subscribe(channel, callback) signature.
 *    Emits { payload: { userId, updatedAt } } whenever the server-side sync
 *    doc timestamp changes: every POLL_INTERVAL_MS (<=60s per the contract's
 *    documented fallback) and immediately on visibilitychange.
 *
 * Endpoints are frozen in the Render backend contract:
 * quran-backend/docs/contract-auth-sync.md
 */
import axios from 'axios';
import { mergeStateInto } from '../utils/syncMerge';
import { renderApiBaseUrl } from './apiConfig';

// Realtime shim: probe frequency (contract fallback interval is <=60s).
const POLL_INTERVAL_MS = 30000;
// Refresh the access token this many seconds before it expires.
const TOKEN_EXPIRY_MARGIN_S = 30;

export const databaseId = 'render_sync';
export const collectionId = 'user_sync';

export const isRenderConfigured = !!renderApiBaseUrl;

/* ─── Token persistence (localStorage; tokens are credentials, not secrets) ─── */

export const TOKEN_KEYS = {
    access: 'quran-nur.render.accessToken',
    refresh: 'quran-nur.render.refreshToken',
    user: 'quran-nur.render.user',
};

const readTokens = () => {
    try {
        return {
            access: localStorage.getItem(TOKEN_KEYS.access) || null,
            refresh: localStorage.getItem(TOKEN_KEYS.refresh) || null,
        };
    } catch {
        return { access: null, refresh: null };
    }
};

const clearTokens = () => {
    try {
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.refresh);
        localStorage.removeItem(TOKEN_KEYS.user);
    } catch { /* storage unavailable */ }
};

const persistTokens = (accessToken, refreshToken, user) => {
    try {
        if (accessToken) localStorage.setItem(TOKEN_KEYS.access, accessToken);
        if (refreshToken) localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
        if (user) localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
    } catch { /* storage unavailable */ }
};

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem(TOKEN_KEYS.user);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

/* ─── Small pure helpers (also exercised by tests) ─── */

// Appwrite models use `$id`; the Render contract returns `{ id }`. Normalize so
// every `currentUser.$id` in the app keeps working regardless of backend.
export const normalizeUser = (user) => {
    if (!user) return null;
    const id = user.$id || user.id || user._id || user.sub;
    if (!id) return null;
    return {
        $id: id,
        id,
        email: user.email ?? null,
        name: user.name ?? null,
    };
};

const decodeBase64Url = (value) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    if (typeof atob === 'function') {
        return atob(padded);
    }
    return Buffer.from(padded, 'base64').toString('utf8');
};

// Decode a JWT's payload claims ({ sub, typ, ... }) — never verify here; the
// server is the source of truth, the client only uses this for exp expiry.
export const decodeJwtClaims = (token) => {
    try {
        const segments = token.split('.');
        if (segments.length < 2) return null;
        const json = decodeBase64Url(segments[1]);
        return JSON.parse(json) || null;
    } catch {
        return null;
    }
};

const isAccessTokenUsable = (token, marginSeconds = TOKEN_EXPIRY_MARGIN_S) => {
    if (!token) return false;
    const claims = decodeJwtClaims(token);
    if (!claims?.exp) return true; // opaque/non-JWT token: let the server decide via 401
    return claims.exp * 1000 > Date.now() + marginSeconds * 1000;
};

// Contract timestamps are ISO-8601 UTC strings; tolerate RFC-style and epoch-ms.
export const parseTimestamp = (value) => {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? null : parsed;
};

// Tolerate the "minimal envelope": a bare doc, `{ doc }`/`{ sync }` wrappers,
// or a listDocuments-style array. The byte-identical fields inside stay
// `userId` / `stateData`.
export const pickSyncDoc = (body) => {
    let candidate = body;
    if (Array.isArray(candidate)) candidate = candidate[0];
    if (candidate && typeof candidate === 'object' && (candidate.doc || candidate.sync)) {
        candidate = candidate.doc || candidate.sync;
    }
    return candidate && typeof candidate === 'object' ? candidate : null;
};

const extractSyncUpdatedAt = (body, doc) => (
    parseTimestamp(body?.updatedAt ?? body?.lastSyncAt ?? doc?.updatedAt ?? doc?.lastSyncAt)
);

// `stateData` is the JSON-stringified payload; also accept an already-parsed
// `state` only if the server chose to inline it.
export const parseSyncState = (doc) => {
    if (!doc) return null;
    if (doc.stateData != null) {
        return typeof doc.stateData === 'string'
            ? JSON.parse(doc.stateData)
            : doc.stateData;
    }
    if (doc.state != null) {
        return typeof doc.state === 'string' ? JSON.parse(doc.state) : doc.state;
    }
    return null;
};

/* ─── HTTP client with Bearer auth + single-flight 401 refresh retry ─── */

export const http = axios.create({
    baseURL: renderApiBaseUrl,
    headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
    const { access } = readTokens();
    if (access) config.headers.Authorization = `Bearer ${access}`;
    return config;
});

let refreshInFlight = null;

const refreshSession = () => {
    if (!refreshInFlight) {
        refreshInFlight = authService.refresh().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
};

http.interceptors.response.use(undefined, async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && config && !config.retriedAfterRefresh && readTokens().refresh) {
        config.retriedAfterRefresh = true;
        try {
            await refreshSession();
        } catch {
            return Promise.reject(error);
        }
        const { access } = readTokens();
        if (access) config.headers.Authorization = `Bearer ${access}`;
        else delete config.headers.Authorization;
        return http(config);
    }
    return Promise.reject(error);
});

/* ─── Auth Service Actions (same shape as appwrite.js authService) ─── */

export const authService = {
    async getCurrentUser() {
        const tokens = readTokens();
        if (!tokens.access && !tokens.refresh) return null;
        if (isAccessTokenUsable(tokens.access)) return readStoredUser();
        // Access token near/at expiry: rotate silently; a dead refresh token
        // signs the local session out (Appwrite parity: invalid session → null).
        try {
            return await authService.refresh();
        } catch {
            return null;
        }
    },

    async refresh() {
        const tokens = readTokens();
        if (!tokens.refresh) throw new Error('RenderApi: no refresh token stored');
        try {
            const { data } = await axios.post(
                `${renderApiBaseUrl}/auth/refresh`,
                { refreshToken: tokens.refresh },
                { headers: { Accept: 'application/json' } },
            );
            const user = normalizeUser(data?.user);
            persistTokens(data?.accessToken, data?.refreshToken, user);
            return user;
        } catch (error) {
            // Rotation failed → session is unusable; drop local credentials so
            // getCurrentUser() reports signed-out on the next call.
            clearTokens();
            throw error;
        }
    },

    async login(email, password) {
        const { data } = await axios.post(
            `${renderApiBaseUrl}/auth/login`,
            { email, password },
            { headers: { Accept: 'application/json' } },
        );
        const user = normalizeUser(data?.user);
        persistTokens(data?.accessToken, data?.refreshToken, user);
        return user;
    },

    async register(email, password, name) {
        const { data } = await axios.post(
            `${renderApiBaseUrl}/auth/register`,
            { email, password, ...(name ? { name } : {}) },
            { headers: { Accept: 'application/json' } },
        );
        const user = normalizeUser(data?.user);
        persistTokens(data?.accessToken, data?.refreshToken, user);
        return user;
    },

    // No recovery endpoint in the frozen contract yet — fail loudly instead of
    // pretending it succeeded; the auth forms surface err.message.
    async sendPasswordRecovery() {
        throw new Error('Password recovery is handled by the account email on the Render backend (not yet available).');
    },

    // JWTs are stateless (no server session to delete): sign out locally only.
    async logout() {
        clearTokens();
        return null;
    },
};

/* ─── Sync Service (same document contract as appwrite.js) ─── */

export const syncService = {
    async pullState() {
        try {
            const { data } = await http.get('/v1/sync');
            const body = pickSyncDoc(data);
            if (!body) return null;
            const state = parseSyncState(body);
            if (state == null) return null;
            return {
                state,
                updatedAt: extractSyncUpdatedAt(data, body) ?? 0,
            };
        } catch (error) {
            if (error?.response?.status === 404) return null; // no doc yet
            console.error('RenderApi sync pull error:', error);
            throw error;
        }
    },

    async pushState(userId, stateData) {
        try {
            // Merge local into the existing cloud doc so both devices' data
            // survives (identical to appwrite.js push semantics).
            let mergedData = stateData;
            let existingData = {};
            try {
                const { data } = await http.get('/v1/sync');
                const body = pickSyncDoc(data);
                if (body?.stateData != null) {
                    existingData = parseSyncState(body) || {};
                } else {
                    existingData = {};
                }
            } catch (error) {
                if (error?.response?.status !== 404) throw error;
                // 404 = first push for this user; nothing to merge with.
            }
            mergedData = mergeStateInto(existingData, stateData);

            const { data } = await http.put('/v1/sync', {
                userId,
                stateData: JSON.stringify(mergedData),
            });
            return {
                updatedAt: parseTimestamp(data?.lastSyncAt ?? data?.updatedAt) ?? Date.now(),
            };
        } catch (error) {
            console.error('RenderApi sync push error:', error);
            throw error;
        }
    },
};

/* ─── Realtime replacement: polling shim with client.subscribe signature ─── */

export const client = {
    /**
     * Poll-for-change subscription, signature-compatible with Appwrite Realtime
     * (`client.subscribe(channel, (response) => ...)` → `response.payload`).
     * Emits `{ payload: { userId, updatedAt } }` only when the server-side
     * sync timestamp CHANGES (first observation is the baseline — CloudSync
     * already performs the initial pull at attach time). The channel string is
     * accepted for signature parity; there is exactly one sync doc per user.
     * Returns an unsubscribe function.
     */
    subscribe(channel, callback) {
        if (typeof callback !== 'function') return () => {};
        let stopped = false;
        let timerId = null;
        let lastUpdatedAt = null;

        const stopPolling = () => {
            if (timerId) clearTimeout(timerId);
            timerId = null;
        };

        const pollOnce = async () => {
            if (stopped) return;
            const tokens = readTokens();
            if (!tokens.access && !tokens.refresh) return; // signed out — nothing to poll
            try {
                const { data } = await http.get('/v1/sync');
                if (stopped) return;
                const body = pickSyncDoc(data);
                const userId = body?.userId;
                const updatedAt = extractSyncUpdatedAt(data, body);
                if (updatedAt == null) return;
                if (lastUpdatedAt === null) {
                    lastUpdatedAt = updatedAt; // baseline; do not emit
                    return;
                }
                // A missing userId would be dropped by CloudSync's own filter,
                // so only emit payloads we know belong to a document.
                if (updatedAt !== lastUpdatedAt && userId != null) {
                    lastUpdatedAt = updatedAt;
                    callback({ payload: { userId, updatedAt } });
                }
            } catch (error) {
                if (error?.response?.status === 401) {
                    // The interceptor already attempted a refresh; a persisting
                    // 401 means the refresh token is dead → stop polling
                    // silently (CloudSync re-attaches after next login).
                    stopPolling();
                    return;
                }
                // Steady-state failures (offline, server cold start) are not
                // fatal — visibilitychange + the next tick will retry.
            }
        };

        const scheduleNext = () => {
            if (stopped) return;
            timerId = setTimeout(async () => {
                await pollOnce();
                scheduleNext();
            }, POLL_INTERVAL_MS);
        };

        const onVisibility = () => {
            if (stopped) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                // Immediate check on resume, matching the contract's poll fallback.
                pollOnce();
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        // Immediate first check to establish the baseline (no emit on first observation).
        (async () => {
            await pollOnce();
            scheduleNext();
        })();

        return () => {
            stopped = true;
            stopPolling();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    },
};
