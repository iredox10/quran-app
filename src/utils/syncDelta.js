/** Small, mergeable mutations: unchanged history never rides every upload. */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keyed = {bookmarks:'verseKey',collections:'id',planners:'id',hifdhGoals:'id',archivedPlanners:'id',readingSessions:'timestamp',recentlyRead:'chapterId',pomodoroHistory:'completedAt'};
const equal = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const noChange=Symbol('unchanged');
function difference(before,after,field) {
    if(after===undefined || equal(before,after)) return noChange;
    if(Array.isArray(before) && Array.isArray(after)) {
        const key=keyed[field];
        const id=item => key ? item?.[key] : JSON.stringify(item);
        const previous=new Map(before.map(item=>[id(item),item]));
        const changed=after.filter(item=>!previous.has(id(item)) || !equal(previous.get(id(item)),item));
        return changed.length ? changed : noChange;
    }
    if(object(before) && object(after)) {
        const changed={};
        for(const key of Object.keys(after)) {
            const value=difference(before[key],after[key],key);
            if(value!==noChange) changed[key]=value;
        }
        return Object.keys(changed).length ? changed : noChange;
    }
    return after;
}
export function diffSyncState(before,after) {
    const delta=difference(before || {},after || {},'');
    return delta===noChange ? {} : delta;
}
