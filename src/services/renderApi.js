/** Heroku sessions and compact, account-scoped sync transport. */
import axios from 'axios';
import { mergeStateInto } from '../utils/syncMerge';
import { apiBaseUrl } from './apiConfig';
export const databaseId = 'heroku';
export const collectionId = 'user_sync';
export const isRenderConfigured = true;
export const TOKEN_KEYS = Object.fromEntries(['access','refresh','user','session'].map(key => [key,`quran-nur.api.${apiBaseUrl}.${key}`]));
const stored = key => { try { return localStorage.getItem(key); } catch { return null; } };
export const normalizeUser = user => {
    const id = user?.$id || user?.id || user?._id || user?.sub;
    return id ? {$id:id,id,email:user.email ?? null,name:user.name ?? null} : null;
};
const readSession = () => {
    try {
        const value = JSON.parse(stored(TOKEN_KEYS.session));
        if (value?.user && value.refreshToken) return {...value,user:normalizeUser(value.user)};
        const user = normalizeUser(JSON.parse(stored(TOKEN_KEYS.user)));
        return user ? {user,accessToken:stored(TOKEN_KEYS.access),refreshToken:stored(TOKEN_KEYS.refresh),id:`legacy:${user.$id}`} : null;
    } catch { return null; }
};
let sessionVersion = 0, authAttempt = 0, sessionAbort = new AbortController();
let observedOwner = readSession()?.user?.$id ?? null;
let refreshInFlight = null, signInFlight = null;
const listeners = new Set();
export class SessionChangedError extends Error {
    constructor() { super('This request belongs to an earlier session.'); this.name='CanceledError'; this.code='ERR_CANCELED'; }
}
export const isSyncCancellation = error => error?.code === 'ERR_CANCELED' || axios.isCancel(error);
const invalidate = () => { sessionVersion++; sessionAbort.abort(); sessionAbort = new AbortController(); };
const notify = (user,metadata = {}) => listeners.forEach(callback => { try { callback(user,metadata); } catch { console.warn('Authentication listener failed'); } });
const commit = (value,metadata = {}) => {
    const owner = value?.user?.$id ?? null;
    if (owner !== observedOwner) { invalidate(); observedOwner = owner; }
    if (value) {
        // Keep the old fields readable during the rolling frontend deployment.
        localStorage.setItem(TOKEN_KEYS.access,value.accessToken);
        localStorage.setItem(TOKEN_KEYS.refresh,value.refreshToken);
        localStorage.setItem(TOKEN_KEYS.user,JSON.stringify(value.user));
        localStorage.setItem(TOKEN_KEYS.session,JSON.stringify(value)); // Atomic cross-tab commit.
    } else {
        for (const key of Object.values(TOKEN_KEYS)) localStorage.removeItem(key);
    }
    notify(value?.user ?? null,metadata);
};
const clearTokens = () => { authAttempt++; invalidate(); observedOwner=null; commit(null,{signedOut:true}); };
const persistSession = (data,{attempt,sessionId} = {}) => {
    const user = normalizeUser(data?.user);
    if (!user || typeof data.accessToken !== 'string' || !data.accessToken || typeof data.refreshToken !== 'string' || !data.refreshToken) throw new Error('Incomplete authentication response');
    if ((attempt !== undefined && attempt !== authAttempt) || (sessionId !== undefined && sessionId !== readSession()?.id)) throw new SessionChangedError();
    const id = sessionId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    commit({user,accessToken:data.accessToken,refreshToken:data.refreshToken,id},{signedIn:attempt !== undefined});
    return user;
};
export class ApiError extends Error {
    constructor(error) {
        const code = error?.response?.data?.error;
        const messages = {account_requires_recovery:'This account already exists. Use Forgot password to verify your email.',email_exists:'An account already exists for this email.',invalid_credentials:'Check your email and password.',recovery_not_configured:'Password recovery is temporarily unavailable.',audio_too_large:'Voice notes must be smaller than 5 MB.',forbidden:'You do not have access to this group.',assignment_claimed:'Someone has already claimed this part.',unauthorized:'Please sign in again.',sync_too_large:'Your backup is too large. Please reduce older history and retry.'};
        super(messages[code] || code?.replaceAll('_',' ') || (error?.response ? 'The request could not be completed.' : 'Unable to connect. Please try again.'));
        this.code=code; this.status=error?.response?.status;
        this.retryable=!this.status || this.status===408 || this.status===429 || this.status>=500;
        this.response=error?.response ? {status:this.status,data:{error:code}} : undefined;
    }
}
const publicHttp = axios.create({baseURL:apiBaseUrl,timeout:30000,headers:{Accept:'application/json'}});
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
    if (/^\d+$/.test(String(value))) return Number(value);
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
    const session = readSession();
    if (!session?.refreshToken) return Promise.reject(new ApiError({response:{status:401,data:{error:'unauthorized'}}}));
    if (refreshInFlight?.id === session.id) return refreshInFlight.promise;
    const refresh = async () => {
        const latest = readSession();
        if (latest?.id !== session.id) throw new SessionChangedError();
        if (latest.accessToken !== session.accessToken) return latest.user;
        try {
            const {data} = await publicHttp.post('/auth/refresh',{refreshToken:latest.refreshToken});
            if (normalizeUser(data?.user)?.$id !== session.user.$id) throw new SessionChangedError();
            return persistSession(data,{sessionId:session.id});
        } catch (error) {
            if (error?.response?.status===401 && readSession()?.id===session.id) clearTokens();
            if (isSyncCancellation(error)) throw error;
            throw error instanceof ApiError ? error : new ApiError(error);
        }
    };
    const promise = (globalThis.navigator?.locks ? navigator.locks.request(`quran-auth:${apiBaseUrl}`,refresh) : refresh())
        .finally(() => { if (refreshInFlight?.promise===promise) refreshInFlight=null; });
    refreshInFlight={id:session.id,promise};
    return promise;
};
export const http = axios.create({baseURL:apiBaseUrl,timeout:30000,headers:{Accept:'application/json'}});
const publicContent = /^\/v1\/(?:chapters|verses|pages|tafsir|packs|reciters|juzs|footnotes|chapter-audio)(?:\/|[?]|$)/;
http.interceptors.request.use(config => {
    const session = readSession();
    if (!publicContent.test(config.url || '') && config.url !== '/v1/sauka/public') {
        config.sessionVersion ??= sessionVersion;
        if (config.sessionVersion !== sessionVersion) throw new SessionChangedError();
        config.signal ??= sessionAbort.signal;
    }
    if (session?.accessToken) config.headers.Authorization=`Bearer ${session.accessToken}`;
    return config;
});
http.interceptors.response.use(response => {
    if (response.config.sessionVersion !== undefined && response.config.sessionVersion !== sessionVersion) throw new SessionChangedError();
    return response;
},async error => {
    if (isSyncCancellation(error)) throw error;
    const {config,response} = error;
    if (config?.sessionVersion !== undefined && config.sessionVersion !== sessionVersion) throw new SessionChangedError();
    if (response?.status===401 && config && !config.retriedAfterRefresh && readSession()?.refreshToken) {
        config.retriedAfterRefresh=true;
        if (config.headers.Authorization===`Bearer ${readSession().accessToken}`) await refreshSession();
        return http(config);
    }
    throw error instanceof ApiError ? error : new ApiError(error);
});
async function signIn(path,body) {
    const attempt=++authAttempt;
    const job=(async () => {
        try { const {data}=await publicHttp.post(path,body); return persistSession(data,{attempt}); }
        catch(error) { if (isSyncCancellation(error)) throw error; throw new ApiError(error); }
    })();
    signInFlight=job;
    try { return await job; } finally { if(signInFlight===job) signInFlight=null; }
}
export const authService = {
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    snapshot() { const session=readSession(); return {user:session?.user ?? null,version:sessionVersion,id:session?.id}; },
    async getCurrentUser() {
        if(signInFlight) { try { await signInFlight; } catch { /* Use the current committed session. */ } }
        const session=readSession();
        if(!session?.refreshToken) return null;
        if(!isAccessTokenUsable(session.accessToken)) { try { await refreshSession(); } catch { /* Offline sessions remain resumable. */ } }
        return readSession()?.user ?? null;
    },
    async accessToken() {
        const session=readSession();
        if(!session?.refreshToken) return null;
        if(!isAccessTokenUsable(session.accessToken)) await refreshSession();
        return readSession()?.accessToken;
    },
    refresh:refreshSession,
    login(email,password) { return signIn('/auth/login',{email:email.trim(),password}); },
    register(email,password,name) { return signIn('/auth/register',{email:email.trim(),password,...(name?.trim()?{name:name.trim()}:{})}); },
    async sendPasswordRecovery(email) { try { return (await publicHttp.post('/auth/recovery',{email:email.trim()})).data; } catch(error) { throw new ApiError(error); } },
    async logout() { clearTokens(); },
};
if (typeof window !== 'undefined') window.addEventListener('storage',event => {
    if(event.key !== TOKEN_KEYS.session && event.key !== null) return;
    const owner=readSession()?.user?.$id ?? null;
    if(owner !== observedOwner) { invalidate(); observedOwner=owner; }
    notify(readSession()?.user ?? null,{external:true});
});

const ownDocument = (body,userId) => {
    const doc=pickSyncDoc(body);
    if(doc?.userId && doc.userId !== userId) throw new Error('Sync account mismatch');
    return doc;
};
const requireOwner = userId => {
    const user=readSession()?.user;
    if(!user || (userId && user.$id !== userId)) throw new SessionChangedError();
    return user.$id;
};
let pullInFlight=null, cachedSnapshot=null;
const snapshotFrom = (data,owner) => {
    const body=ownDocument(data,owner),state=parseSyncState(body);
    if(state==null) return null;
    const updatedAt=extractSyncUpdatedAt(data,body);
    if(!Number.isFinite(updatedAt) || updatedAt<=0) throw new Error('Missing sync timestamp');
    if(!state || typeof state!=='object' || Array.isArray(state)) throw new Error('Invalid sync state');
    return {state,updatedAt};
};
export const syncService = {
    pullState(userId,{updatedAt=0}={}) {
        const owner=requireOwner(userId),version=sessionVersion;
        if(pullInFlight?.owner===owner && pullInFlight.version===version) return pullInFlight.promise;
        const promise=http.get('/v1/sync?compact=1',{
            headers:updatedAt>0 ? {'If-None-Match':`"sync-${updatedAt}"`} : {},
            validateStatus:status => status===304 || (status>=200 && status<300),
        }).then(({data,status}) => {
            if(status===304) return {unchanged:true,updatedAt,...(cachedSnapshot?.owner===owner && cachedSnapshot.version===version ? cachedSnapshot.value : {})};
            const result=snapshotFrom(data,owner);
            if(result && (!cachedSnapshot || result.updatedAt>=cachedSnapshot.value.updatedAt || cachedSnapshot.owner!==owner)) cachedSnapshot={owner,version,value:result};
            return result;
        })
            .finally(() => { if(pullInFlight?.promise===promise) pullInFlight=null; });
        pullInFlight={owner,version,promise}; return promise;
    },
    async pushState(userId,stateData,{mutationId,mutations}={}) {
        const owner=requireOwner(userId);
        const id=mutationId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        let data;
        try { ({data}=await http.patch('/v1/sync',mutations ? {userId:owner,mutations} : {userId:owner,mutationId:id,changes:stateData})); }
        catch(error) {
            // Rolling deployments can briefly serve the previous backend release.
            if(![404,405].includes(error?.status)) throw error;
            for(let attempt=0;attempt<3;attempt++) {
                const previous=(await http.get('/v1/sync?compact=1')).data;
                const remote=parseSyncState(ownDocument(previous,owner)) || {};
                try {
                    ({data}=await http.put('/v1/sync',{userId:owner,stateData:JSON.stringify(mergeStateInto(remote,mutations ? mutations.reduce((state,row)=>mergeStateInto(state,row.changes),{}) : stateData)),baseUpdatedAt:extractSyncUpdatedAt(previous,previous) || 0})); break;
                } catch(conflict) { if(conflict.status!==409 || attempt===2) throw conflict; }
            }
        }
        if(data?.userId !== owner) throw new Error('Sync account mismatch');
        const updatedAt=parseTimestamp(data?.updatedAt ?? data?.lastSyncAt);
        if(!Number.isFinite(updatedAt) || updatedAt<=0) throw new Error('Missing sync timestamp');
        const snapshot=snapshotFrom(data,owner);
        return {updatedAt,...(snapshot?{state:snapshot.state}:{})};
    },
};

/** WebSockets deliver changes immediately; a small conditional poll repairs missed events. */
export const client = {
    subscribe(_channel,callback) {
        let stopped=false,socket=null,pollTimer=null,reconnectTimer=null,heartbeat=null,watchdog=null,failures=0,polling=false,connecting=false,last=0;
        const {user,version}=authService.snapshot(); const owner=user?.$id;
        const active=() => !stopped && authService.snapshot().version===version && authService.snapshot().user?.$id===owner;
        const visible=() => typeof document==='undefined' || document.visibilityState!=='hidden';
        const online=() => globalThis.navigator?.onLine !== false;
        const emit=(stamp,snapshot) => { if(active() && Number(stamp)>last) { last=Number(stamp); callback({payload:{userId:owner,updatedAt:last,snapshot}}); } };
        const poll=async () => {
            if(!active() || !visible() || !online() || polling) return;
            polling=true;
            try {
                const result=await syncService.pullState(owner,{updatedAt:last});
                if(result && !result.unchanged) emit(result.updatedAt,result);
            } catch { /* Durable uploads and the next reconnect survive outages. */ }
            finally { polling=false; }
        };
        const tick=async () => { await poll(); if(active()) pollTimer=setTimeout(tick,socket?.readyState===1?60000:15000); };
        const connect=async () => {
            if(!active() || !visible() || !online() || connecting || (socket && socket.readyState<2) || typeof WebSocket==='undefined') return;
            connecting=true;
            clearTimeout(reconnectTimer);
            try {
                const token=await authService.accessToken();
                if(!active() || !token) return;
                const ws=new WebSocket(`${apiBaseUrl.replace(/^http/,'ws')}/ws`,['quran-nur',`bearer.${token}`]);
                socket=ws;
                watchdog=setTimeout(() => { if(ws.readyState!==1) ws.close(); },15000);
                ws.onopen=() => {
                    if(!active()) { ws.close(); return; }
                    clearTimeout(watchdog); failures=0;
                    callback({payload:{userId:owner,reconnected:true}});
                    heartbeat=setInterval(() => {
                        if(ws.readyState!==1) return;
                        ws.send('ping');
                        clearTimeout(watchdog); watchdog=setTimeout(() => ws.close(),10000);
                    },20000);
                };
                ws.onmessage=event => {
                    if(!active()) return;
                    if(event.data==='pong') { clearTimeout(watchdog); return; }
                    try { const data=JSON.parse(event.data); if(data.type==='sync.updated') emit(data.changedAt); } catch { /* Ignore non-protocol frames. */ }
                };
                ws.onerror=() => ws.close();
                ws.onclose=event => {
                    if(socket!==ws) return;
                    socket=null;clearInterval(heartbeat);clearTimeout(watchdog);
                    if(!active()) return;
                    const retry=async () => { if(event.code===1008) { try { await authService.refresh(); } catch { /* Offline retry. */ } } connect(); };
                    reconnectTimer=setTimeout(retry,Math.min(30000,1000*2**Math.min(failures++,5))*(0.8+Math.random()*0.4));
                };
            } catch { if(active()) reconnectTimer=setTimeout(connect,5000); } finally { connecting=false; }
        };
        const resume=() => { if(!active()) return; if(visible() && online()) { poll(); if(!socket || socket.readyState>1) connect(); } };
        if(typeof document!=='undefined') document.addEventListener('visibilitychange',resume);
        if(typeof window!=='undefined') { window.addEventListener('online',resume); window.addEventListener('focus',resume); }
        connect(); tick();
        return () => { stopped=true;clearTimeout(pollTimer);clearTimeout(reconnectTimer);clearInterval(heartbeat);clearTimeout(watchdog);socket?.close();
            if(typeof document!=='undefined') document.removeEventListener('visibilitychange',resume);
            if(typeof window!=='undefined') {window.removeEventListener('online',resume);window.removeEventListener('focus',resume);} };
    },
};
