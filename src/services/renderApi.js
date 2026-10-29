/** Heroku API transport, app sessions, byte-preserving sync, and change polling. */
import axios from 'axios';
import { mergeStateInto } from '../utils/syncMerge';
import { apiBaseUrl } from './apiConfig';

export const databaseId = 'heroku';
export const collectionId = 'user_sync';
export const isRenderConfigured = true;
export const TOKEN_KEYS = Object.fromEntries(['access', 'refresh', 'user'].map(key => [key, `quran-nur.api.${apiBaseUrl}.${key}`]));
let sessionVersion = 0;
let refreshInFlight = null;
const listeners = new Set();
const stored = key => { try { return localStorage.getItem(key); } catch { return null; } };
const readTokens = () => ({ access: stored(TOKEN_KEYS.access), refresh: stored(TOKEN_KEYS.refresh) });
const readStoredUser = () => { try { return JSON.parse(stored(TOKEN_KEYS.user)); } catch { return null; } };
export const normalizeUser = user => {
    const id = user?.$id || user?.id || user?._id || user?.sub;
    return id ? { $id: id, id, email: user.email ?? null, name: user.name ?? null } : null;
};
const notify = user => listeners.forEach(callback => { try { callback(user); } catch { console.warn('Authentication listener failed'); } });
const clearTokens = () => {
    sessionVersion++;
    for (const key of Object.values(TOKEN_KEYS)) { try { localStorage.removeItem(key); } catch { /* unavailable */ } }
    notify(null);
};
const persistSession = (data, expectedVersion) => {
    const user = normalizeUser(data?.user);
    if (!user || typeof data?.accessToken !== 'string' || !data.accessToken || typeof data?.refreshToken !== 'string' || !data.refreshToken) throw new Error('Incomplete authentication response');
    if (expectedVersion !== sessionVersion) throw new Error('Session changed during sign-in');
    localStorage.setItem(TOKEN_KEYS.access, data.accessToken);
    localStorage.setItem(TOKEN_KEYS.refresh, data.refreshToken);
    localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
    notify(user);
    return user;
};
export class ApiError extends Error {
    constructor(error) {
        const code = error?.response?.data?.error;
        const messages = { account_requires_recovery: 'This account already exists. Use Forgot password to verify your email.', email_exists: 'An account already exists for this email.', invalid_credentials: 'Check your email and password.', recovery_not_configured: 'Password recovery is temporarily unavailable.', audio_too_large: 'Voice notes must be smaller than 5 MB.', forbidden: 'You do not have access to this group.', assignment_claimed: 'Someone has already claimed this part.', unauthorized: 'Please sign in again.' };
        super(messages[code] || code?.replaceAll('_', ' ') || (error?.response ? 'The request could not be completed.' : 'Unable to connect. Please try again.'));
        this.code = code;
        this.response = error?.response ? { status: error.response.status, data: { error: code } } : undefined;
    }
}
const publicHttp = axios.create({ baseURL: apiBaseUrl, timeout: 25000, headers: { Accept: 'application/json' } });
const decodeBase64Url = (value) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return atob(padded);
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

const isAccessTokenUsable = (token, marginSeconds = 30) => {
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
    if (doc.id && doc.updatedAt > 0) {
        const metadata = new Set(['id','userId','stateData','state','updatedAt','createdAt','version']);
        const legacy = Object.fromEntries(Object.entries(doc).filter(([key]) => !metadata.has(key) && !key.startsWith('_') && !key.startsWith('$')));
        if (Object.keys(legacy).length) return legacy;
    }
    return null;
};


const refreshSession = () => {
    if (!refreshInFlight) {
        const expectedVersion = sessionVersion;
        const token = readTokens().refresh;
        refreshInFlight = (async () => {
            if (!token) throw new Error('Please sign in again.');
            try {
                const { data } = await publicHttp.post('/auth/refresh', { refreshToken: token });
                return persistSession(data, expectedVersion);
            } catch (error) {
                if (error?.response?.status === 401 && expectedVersion === sessionVersion) clearTokens();
                throw error instanceof ApiError ? error : new ApiError(error);
            }
        })().finally(() => { refreshInFlight = null; });
    }
    return refreshInFlight;
};
export const http = axios.create({ baseURL: apiBaseUrl, timeout: 25000, headers: { Accept: 'application/json' } });
http.interceptors.request.use(config => {
    const { access } = readTokens();
    config.sessionVersion = sessionVersion;
    if (access) config.headers.Authorization = `Bearer ${access}`;
    return config;
});
http.interceptors.response.use(response => {
    if (response.config.sessionVersion !== sessionVersion) throw new Error('Session changed during request');
    return response;
}, async error => {
    const { config, response } = error;
    if (config && config.sessionVersion !== sessionVersion) throw new Error('Session changed during request');
    if (response?.status === 401 && config && !config.retriedAfterRefresh && readTokens().refresh) {
        config.retriedAfterRefresh = true;
        const latest = readTokens().access;
        if (config.headers.Authorization === `Bearer ${latest}`) {
            try { await refreshSession(); } catch { throw new ApiError(error); }
        }
        return http(config);
    }
    throw new ApiError(error);
});
export const authService = {
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    async getCurrentUser() {
        const tokens = readTokens();
        if (!tokens.access && !tokens.refresh) return null;
        if (isAccessTokenUsable(tokens.access)) return readStoredUser();
        try { return await refreshSession(); } catch { return readStoredUser(); }
    },
    refresh: refreshSession,
    async login(email, password) {
        const expected = ++sessionVersion;
        try { const { data } = await publicHttp.post('/auth/login', { email: email.trim(), password }); return persistSession(data, expected); }
        catch (error) { throw error instanceof ApiError ? error : new ApiError(error); }
    },
    async register(email, password, name) {
        const expected = ++sessionVersion;
        try { const { data } = await publicHttp.post('/auth/register', { email: email.trim(), password, ...(name?.trim() ? { name: name.trim() } : {}) }); return persistSession(data, expected); }
        catch (error) { throw error instanceof ApiError ? error : new ApiError(error); }
    },
    async sendPasswordRecovery(email) {
        try { return (await publicHttp.post('/auth/recovery', { email: email.trim() })).data; }
        catch (error) { throw new ApiError(error); }
    },
    async logout() { clearTokens(); },
};

let syncQueue = Promise.resolve();
const serialized = task => {
    const version = sessionVersion;
    const job = syncQueue.catch(() => {}).then(() => {
        if (version !== sessionVersion) throw new Error('Session changed before sync');
        return task();
    });
    syncQueue = job;
    return job;
};
const ownDocument = (body, userId) => {
    const doc = pickSyncDoc(body);
    if (doc?.userId && doc.userId !== userId) throw new Error('Sync account mismatch');
    return doc;
};
const requireOwner = userId => {
    const user = readStoredUser();
    if (!user || (userId && user.$id !== userId)) throw new Error('Sync account mismatch');
    return user.$id;
};
export const syncService = {
    pullState(userId) { return serialized(async () => {
        const owner = requireOwner(userId);
        const { data } = await http.get('/v1/sync');
        const body = ownDocument(data, owner), state = parseSyncState(body);
        if (state == null) return null;
        const updatedAt = extractSyncUpdatedAt(data, body);
        if (!Number.isFinite(updatedAt) || updatedAt <= 0) throw new Error('Missing sync timestamp');
        return { state, updatedAt };
    }); },
    pushState(userId, stateData) { return serialized(async () => {
        const owner = requireOwner(userId);
        const { data: previous } = await http.get('/v1/sync');
        const remote = parseSyncState(ownDocument(previous, owner)) || {};
        const merged = mergeStateInto(remote, stateData);
        const { data } = await http.put('/v1/sync', { userId: owner, stateData: JSON.stringify(merged) });
        if (data?.userId !== owner) throw new Error('Sync account mismatch');
        const updatedAt = parseTimestamp(data?.updatedAt);
        if (!Number.isFinite(updatedAt) || updatedAt <= 0) throw new Error('Missing sync timestamp');
        return { updatedAt };
    }); },
};

/** One non-overlapping poll loop per subscription, with immediate resume checks. */
export const client = {
    subscribe(_channel, callback) {
        let stopped = false, timer = null, pending = null, last = null;
        const owner = readStoredUser()?.$id;
        const poll = () => {
            if (stopped || pending || !owner || readStoredUser()?.$id !== owner) return pending;
            pending = (async () => {
                try {
                    const { data } = await http.get('/v1/sync');
                    if (stopped || readStoredUser()?.$id !== owner) return;
                    const doc = ownDocument(data, owner), stamp = extractSyncUpdatedAt(data, doc);
                    if (last !== null && stamp !== last) callback({ payload: { userId: owner, updatedAt: stamp } });
                    last = stamp;
                } catch { /* Offline requests retry on the next interval or focus. */ }
            })().finally(() => { pending = null; });
            return pending;
        };
        const tick = async () => { await poll(); if (!stopped) timer = setTimeout(tick, 30000); };
        const visibility = () => { if (document.visibilityState === 'visible') poll(); };
        document.addEventListener('visibilitychange', visibility);
        tick();
        return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); };
    },
};
