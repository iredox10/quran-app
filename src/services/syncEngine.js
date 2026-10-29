import { mergeStateInto, slimStatePayload } from '../utils/syncMerge';
import { diffSyncState } from '../utils/syncDelta';

/**
 * Persistent immutable mutations survive refreshes, offline tabs, and lost ACKs.
 * Multiple tabs may replay the same packet: backend mutation IDs make that safe.
 */
export function createSyncEngine({store,payload,auth,sync,subscribe,storage=globalThis.localStorage,
    events=globalThis.window,visibility=globalThis.document,online=()=>globalThis.navigator?.onLine!==false,
    namespace='quran-sync-v2',cancelled=error=>error?.code==='ERR_CANCELED'}) {
    let stopped=true,context=null,suppress=false,unAuth=()=>{},unStore=()=>{};
    const encode=value=>JSON.parse(JSON.stringify(slimStatePayload(value)));
    const snapshot=()=>encode(payload(store.getState()));
    const fields=new Set(Object.keys(payload(store.getState())));
    const prefix=owner=>`${namespace}:${owner}:`;
    const current=ctx=>!stopped && context===ctx && auth.snapshot().user?.$id===ctx.owner && auth.snapshot().version===ctx.version;
    const status=(ctx,value,error=null)=>{if(current(ctx)) store.getState().setSyncStatus(value,error);};
    const readPackets=ctx=>{
        const packets=[];
        for(let i=0;i<storage.length;i++) {
            const key=storage.key(i); if(!key?.startsWith(prefix(ctx.owner))) continue;
            try {
                const packet=JSON.parse(storage.getItem(key));
                if(packet?.id && packet.owner===ctx.owner && packet.changes && typeof packet.changes==='object') packets.push({...packet,key});
            } catch { /* A malformed entry cannot block other saved mutations. */ }
        }
        return packets.sort((a,b)=>a.at-b.at || a.id.localeCompare(b.id));
    };
    const enqueue=(ctx,changes)=>{
        if(!current(ctx) || !Object.keys(changes).length) return;
        const id=globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        // Keep consecutive edits ordered even when the clock has millisecond precision.
        ctx.packetTime=readPackets(ctx).reduce((time,packet)=>Math.max(time,packet.at+1),Math.max(Date.now(),ctx.packetTime+1));
        const packet={id,owner:ctx.owner,at:ctx.packetTime,changes:encode(changes)};
        try {storage.setItem(prefix(ctx.owner)+id,JSON.stringify(packet));}
        catch { // Zustand still retains the local data; report a full storage device honestly.
            ctx.memory.push(packet); status(ctx,'error','Device storage is full. Keep this tab open until your backup finishes.');
        }
        ctx.firstDirtyAt ||= Date.now(); ctx.pushBlocked=false; schedulePush(ctx);
    };
    const pending=ctx=>[...readPackets(ctx),...ctx.memory];
    const schedulePush=(ctx,delay=300)=>{
        if(!current(ctx)) return;
        clearTimeout(ctx.pushTimer);
        const wait=Math.min(delay,Math.max(0,2000-(Date.now()-(ctx.firstDirtyAt || Date.now()))));
        ctx.pushTimer=setTimeout(()=>flush(ctx),wait);
    };
    const retry=(ctx,kind)=>{
        if(!current(ctx) || !online()) {status(ctx,'pending');return;}
        const count=ctx[kind+'Failures']++;
        const delay=Math.min(30000,1000*2**Math.min(count,5))*(0.8+Math.random()*0.4);
        clearTimeout(ctx[kind+'Timer']);
        ctx[kind+'Timer']=setTimeout(()=>kind==='push'?flush(ctx):pull(ctx),delay);
    };
    const apply=(ctx,remote,beforeRequest)=>{
        if(!current(ctx) || !remote?.state || remote.updatedAt<ctx.known) return;
        const local=snapshot();
        const edited=diffSyncState(beforeRequest,local);
        const queued=pending(ctx).reduce((state,packet)=>mergeStateInto(state,packet.changes),{});
        const allowed=Object.fromEntries(Object.entries(remote.state).filter(([key])=>fields.has(key)));
        let merged=mergeStateInto(store.getState(),allowed);
        merged=mergeStateInto(mergeStateInto(merged,queued),edited);
        ctx.known=remote.updatedAt;
        suppress=true;
        try {store.setState({...merged,lastSyncAt:ctx.known});} finally {suppress=false;}
        // A fresh device can have local progress too. Publish only the missing union.
        const expected=encode(mergeStateInto(remote.state,queued));
        enqueue(ctx,diffSyncState(expected,snapshot()));
    };
    async function flush(ctx=context) {
        if(!ctx || !current(ctx) || ctx.pushing) return ctx?.pushPromise;
        if(!online()) {status(ctx,'pending');return;}
        clearTimeout(ctx.pushTimer);
        const packets=pending(ctx);
        if(!packets.length) {ctx.firstDirtyAt=0;status(ctx,'idle');return;}
        // Bound each batch: small packets over a slow uplink, one compact ACK back.
        let size=0; const batch=[];
        for(const packet of packets) {
            const bytes=JSON.stringify(packet.changes).length;
            if(batch.length && (batch.length>=32 || size+bytes>256000)) break;
            batch.push(packet);size+=bytes;
        }
        ctx.pushing=true; const before=snapshot();status(ctx,'pushing');
        ctx.pushPromise=(async()=>{
            try {
                const result=await sync.pushState(ctx.owner,{}, {mutations:batch.map(({id,changes})=>({id,changes}))});
                if(!current(ctx)) return;
                for(const packet of batch) if(packet.key) storage.removeItem(packet.key);
                const acknowledged=new Set(batch.map(packet=>packet.id));ctx.memory=ctx.memory.filter(packet=>!acknowledged.has(packet.id));
                ctx.pushFailures=0;ctx.known=Math.max(ctx.known,result.updatedAt);
                apply(ctx,result,before);
                if(!result.state) store.setState({lastSyncAt:ctx.known});
                ctx.firstDirtyAt=0;status(ctx,'idle');
            } catch(error) {
                if(!current(ctx) || cancelled(error)) return;
                if(error.retryable===false) {ctx.pushBlocked=true;status(ctx,'error',error.message);}
                else {status(ctx,'pending');retry(ctx,'push');}
            } finally {
                ctx.pushing=false;
                if(current(ctx) && !ctx.pushBlocked && ctx.pushFailures===0 && pending(ctx).length) schedulePush(ctx,0);
            }
        })();
        return ctx.pushPromise;
    }
    async function pull(ctx=context) {
        if(!ctx || !current(ctx) || !online()) return;
        if(ctx.pulling) {ctx.pullAgain=true;return ctx.pullPromise;}
        ctx.pulling=true;const before=snapshot();status(ctx,ctx.pushing?'pushing':'pulling');
        ctx.pullPromise=(async()=>{
            try {
                const remote=await sync.pullState(ctx.owner,{updatedAt:ctx.known});
                if(!current(ctx)) return;
                ctx.pullFailures=0;
                if(remote?.state) apply(ctx,remote,before);
                else if(!remote?.unchanged && ctx.known===0) enqueue(ctx,before);
                status(ctx,ctx.pushing?'pushing':pending(ctx).length?'pending':'idle');
            } catch(error) {
                if(!current(ctx) || cancelled(error)) return;
                if(error.retryable===false) status(ctx,'error',error.message);
                else {status(ctx,'pending');retry(ctx,'pull');}
            } finally {
                ctx.pulling=false;
                if(current(ctx) && ctx.pullAgain) {ctx.pullAgain=false;ctx.pullTimer=setTimeout(()=>pull(ctx),100);}
            }
        })();
        return ctx.pullPromise;
    }
    const detach=()=>{
        if(!context) return;
        for(const timer of ['pushTimer','pullTimer']) clearTimeout(context[timer]);
        context.detach?.();context=null;
    };
    const selectSession=(_user,metadata={})=>{
        if(stopped) return;
        const session=auth.snapshot(),owner=session.user?.$id;
        if(context?.owner===owner && context?.version===session.version) { if(metadata.signedIn && context) {pull(context);flush(context);} return; }
        detach();
        suppress=true;
        try {store.getState().setCurrentUser(session.user);store.setState({lastSyncAt:0,syncStatus:'idle',syncError:null});} finally {suppress=false;}
        if(!owner) return;
        const ctx={owner,version:session.version,known:0,pushing:false,pulling:false,pullAgain:false,pushFailures:0,pullFailures:0,memory:[],firstDirtyAt:0,packetTime:0};
        context=ctx;
        // Old deployments saved a pending marker but kept the payload in Zustand.
        try { const marker=JSON.parse(storage.getItem('quran-app-sync-pending'));if(marker?.userId===owner) {enqueue(ctx,snapshot());storage.removeItem('quran-app-sync-pending');} } catch { /* No old marker. */ }
        pull(ctx);flush(ctx);
        ctx.detach=subscribe(event=>{
            if(!current(ctx) || (event?.payload?.userId && event.payload.userId!==owner)) return;
            const stamp=event?.payload?.updatedAt;
            if(event?.payload?.snapshot) apply(ctx,event.payload.snapshot,snapshot());
            else if(event?.payload?.reconnected) {pull(ctx);flush(ctx);}
            else if(!stamp || stamp>ctx.known) {clearTimeout(ctx.pullTimer);ctx.pullTimer=setTimeout(()=>pull(ctx),100);}
        });
    };
    const resume=()=>{
        if(!context || !online()) return;
        if(visibility?.visibilityState==='hidden') {flush(context);return;}
        pull(context);flush(context);
    };
    const storageChange=event=>{if(context && event.key?.startsWith(prefix(context.owner))) schedulePush(context,50);};
    return {
        start() {
            if(!stopped) return;
            stopped=false;
            unAuth=auth.subscribe(selectSession);
            unStore=store.subscribe((state,previous)=>{
                if(suppress || !context || !current(context)) return;
                const changes=diffSyncState(encode(payload(previous)),encode(payload(state)));
                enqueue(context,changes);
            });
            events?.addEventListener('online',resume);events?.addEventListener('focus',resume);events?.addEventListener('storage',storageChange);
            visibility?.addEventListener('visibilitychange',resume);
            selectSession();
            auth.getCurrentUser().then(()=>{if(!stopped) selectSession();}).catch(()=>{});
        },
        stop() {
            stopped=true;detach();unAuth();unStore();
            events?.removeEventListener('online',resume);events?.removeEventListener('focus',resume);events?.removeEventListener('storage',storageChange);
            visibility?.removeEventListener('visibilitychange',resume);
        },
        flush:()=>flush(),pull:()=>pull(),
    };
}
