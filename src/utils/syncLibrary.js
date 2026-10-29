/** Bookmarks share one list; removal dates survive retries and offline devices. */
export function normalizeSyncLibrary(state) {
    const out={...state};
    if(Array.isArray(out.bookmarks)) {
        const stamp=row=>Number(row.createdAt ?? row.timestamp ?? 0);
        out.bookmarks=out.bookmarks.filter(row=>Number(out.bookmarkRemovals?.[row.verseKey] ?? -1)<stamp(row));
        if('bookmark' in out) out.bookmark=out.bookmarks.reduce((latest,row)=>!latest || stamp(row)>stamp(latest) ||
            (stamp(row)===stamp(latest) && row.verseKey>latest.verseKey) ? row : latest,null);
    }
    if(Array.isArray(out.recentlyRead)) out.recentlyRead=out.recentlyRead.map(row=>row.verseKey && Number(row.verseKey.split(':')[0])!==Number(row.chapterId) ? {...row,verseKey:null} : row);
    return out;
}
export function toggleSavedBookmark(state,verseKey,surahName,chapterId,now=Date.now()) {
    const exists=(state.bookmarks || []).some(row=>row.verseKey===verseKey);
    const removals={...state.bookmarkRemovals};
    if(exists) removals[verseKey]=now;
    const bookmarks=exists ? state.bookmarks.filter(row=>row.verseKey!==verseKey) :
        [...(state.bookmarks || []),{verseKey,surahName,chapterId:chapterId ?? Number(verseKey.split(':')[0]),createdAt:Math.max(now,Number(removals[verseKey] || 0)+1)}];
    const out=normalizeSyncLibrary({bookmark:null,bookmarks,bookmarkRemovals:removals});
    return out;
}
