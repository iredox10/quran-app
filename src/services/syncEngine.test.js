import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createStore} from 'zustand/vanilla';
import {createSyncEngine} from './syncEngine';
import {mergeStateInto} from '../utils/syncMerge';
import {diffSyncState} from '../utils/syncDelta';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function setup({storage,remote={state:{theme:'light',bookmarks:[]},updatedAt:10}}={}) {
    const values=new Map();storage ||= {get length(){return values.size;},key:index=>[...values.keys()][index],getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
    const store=createStore(set=>({theme:'light',bookmarks:[],currentUser:null,lastSyncAt:0,syncStatus:'idle',syncError:null,
        setCurrentUser:currentUser=>set({currentUser}),setSyncStatus:(syncStatus,syncError=null)=>set({syncStatus,syncError})}));
    const payload=state=>({theme:state.theme,bookmarks:state.bookmarks});
    let session={user:{$id:'u1'},version:1},authChanged=()=>{},changed=()=>{},connected=true;
    const auth={snapshot:()=>session,getCurrentUser:vi.fn(async()=>session.user),subscribe:fn=>{authChanged=fn;return()=>{};}};
    const sync={pullState:vi.fn(async()=>structuredClone(remote)),pushState:vi.fn(async(_owner,_state,{mutations})=>{
        for(const packet of mutations) remote.state=mergeStateInto(remote.state,packet.changes);
        remote.updatedAt++;return structuredClone(remote);
    })};
    const events=new EventTarget(),visibility=new EventTarget();visibility.visibilityState='visible';
    const options={store,payload,auth,sync,storage,events,visibility,online:()=>connected,subscribe:fn=>{changed=fn;return()=>{};}};
    const engine=createSyncEngine(options);
    return {engine,options,store,storage,sync,remote,events,visibility,change:event=>changed(event),
        connection:value=>{connected=value;},account:user=>{session={user:user?{$id:user}:null,version:session.version+1};authChanged();}};
}
const settle=()=>vi.advanceTimersByTimeAsync(0);
beforeEach(()=>{vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(.5);});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('durable account-owned sync engine',()=>{
    it('coalesces rapid edits and uploads only changed fields',async()=>{
        const h=setup();h.engine.start();await settle();
        h.store.setState({theme:'dark'});h.store.setState({bookmarks:[{verseKey:'1:1'}]});
        expect(h.storage.length).toBe(2);expect(h.sync.pushState).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(300);
        expect(h.sync.pushState).toHaveBeenCalledTimes(1);
        expect(h.sync.pushState.mock.calls[0][2].mutations.map(row=>row.changes)).toEqual([{theme:'dark'},{bookmarks:[{verseKey:'1:1'}]}]);
        expect(h.storage.length).toBe(0);expect(h.remote.state).toEqual({theme:'dark',bookmarks:[{verseKey:'1:1'}]});h.engine.stop();
    });
    it('keeps same-millisecond edits to one setting in their original order',async()=>{
        const h=setup();h.engine.start();await settle();
        h.store.setState({theme:'dark'});h.store.setState({theme:'light'});h.store.setState({theme:'sepia'});
        await vi.advanceTimersByTimeAsync(300);
        expect(h.sync.pushState.mock.calls[0][2].mutations.map(row=>row.changes.theme)).toEqual(['dark','light','sepia']);
        expect(h.remote.state.theme).toBe('sepia');expect(h.storage.length).toBe(0);h.engine.stop();
    });
    it('keeps edits made during a slow pull and schedules their upload',async()=>{
        const h=setup();const slow=deferred();h.sync.pullState.mockReturnValueOnce(slow.promise);
        h.engine.start();h.connection(false);h.store.setState({theme:'dark'});
        slow.resolve({state:{theme:'light',bookmarks:[{verseKey:'2:1'}]},updatedAt:12});await settle();
        expect(h.store.getState().theme).toBe('dark');expect(h.store.getState().bookmarks).toEqual([{verseKey:'2:1'}]);
        expect(h.storage.length).toBeGreaterThan(0);h.connection(true);h.events.dispatchEvent(new Event('online'));await settle();
        expect(h.remote.state.theme).toBe('dark');expect(h.storage.length).toBe(0);h.engine.stop();
    });
    it('retries the same IDs after a lost ACK and survives a remount',async()=>{
        const h=setup();h.engine.start();await settle();
        h.sync.pushState.mockRejectedValueOnce(Object.assign(new Error('offline'),{retryable:true}));
        h.store.setState({theme:'dark'});await vi.advanceTimersByTimeAsync(300);
        const first=h.sync.pushState.mock.calls[0][2].mutations[0].id;
        expect(h.storage.length).toBe(1);h.engine.stop();
        const next=createSyncEngine(h.options);next.start();await settle();
        expect(h.sync.pushState.mock.calls[1][2].mutations[0].id).toBe(first);
        expect(h.storage.length).toBe(0);expect(h.store.getState().theme).toBe('dark');next.stop();
    });
    it('never clears newer edits when an earlier upload completes',async()=>{
        const h=setup();h.engine.start();await settle();const slow=deferred();h.sync.pushState.mockReturnValueOnce(slow.promise);
        h.store.setState({theme:'dark'});await vi.advanceTimersByTimeAsync(300);
        h.store.setState({theme:'light',bookmarks:[{verseKey:'1:7'}]});
        slow.resolve({state:{theme:'dark',bookmarks:[]},updatedAt:11});await settle();await vi.advanceTimersByTimeAsync(300);
        expect(h.store.getState().theme).toBe('light');expect(h.store.getState().bookmarks).toEqual([{verseKey:'1:7'}]);
        expect(h.sync.pushState).toHaveBeenCalledTimes(2);expect(h.storage.length).toBe(0);h.engine.stop();
    });
    it('ignores the old StrictMode instance and old account responses',async()=>{
        const h=setup();const old=deferred();h.sync.pullState.mockReturnValueOnce(old.promise);
        h.engine.start();h.engine.stop();const next=createSyncEngine(h.options);next.start();await settle();
        h.account('u2');await settle();
        old.resolve({state:{theme:'old-account',bookmarks:[]},updatedAt:999});await settle();
        expect(h.store.getState().currentUser.$id).toBe('u2');expect(h.store.getState().theme).not.toBe('old-account');next.stop();
    });
    it('catches up immediately online and does not hammer an offline connection',async()=>{
        const h=setup();h.engine.start();await settle();h.connection(false);h.store.setState({theme:'dark'});
        await vi.advanceTimersByTimeAsync(60000);expect(h.sync.pushState).not.toHaveBeenCalled();expect(h.storage.length).toBe(1);
        h.connection(true);h.events.dispatchEvent(new Event('online'));await settle();
        expect(h.sync.pushState).toHaveBeenCalledTimes(1);expect(h.storage.length).toBe(0);h.engine.stop();
    });
    it('a permanently rejected packet stays saved without an infinite retry loop',async()=>{
        const h=setup();h.engine.start();await settle();h.sync.pushState.mockRejectedValue(Object.assign(new Error('too large'),{retryable:false}));
        h.store.setState({theme:'dark'});await vi.advanceTimersByTimeAsync(30000);
        expect(h.sync.pushState).toHaveBeenCalledTimes(1);expect(h.storage.length).toBe(1);expect(h.store.getState().syncStatus).toBe('error');h.engine.stop();
    });
    it('does not apply an older pull after a newer upload acknowledgment',async()=>{
        const h=setup();h.engine.start();await settle();const slow=deferred();h.sync.pullState.mockReturnValueOnce(slow.promise);
        h.engine.pull();h.store.setState({theme:'dark'});await vi.advanceTimersByTimeAsync(300);
        slow.resolve({state:{theme:'light',bookmarks:[]},updatedAt:10});await settle();
        expect(h.store.getState().theme).toBe('dark');h.engine.stop();
    });
});
it('a long history sends just the changed entry and a map sends just its changed leaf',()=>{
    const before={readingSessions:Array.from({length:500},(_,i)=>({timestamp:i,duration:60})),hifdhHistory:{old:1,today:{pages:2}}};
    const after={readingSessions:[...before.readingSessions,{timestamp:501,duration:90}],hifdhHistory:{old:1,today:{pages:3}}};
    expect(diffSyncState(before,after)).toEqual({readingSessions:[{timestamp:501,duration:90}],hifdhHistory:{today:{pages:3}}});
    expect(JSON.stringify(diffSyncState(before,after)).length).toBeLessThan(150);
});
