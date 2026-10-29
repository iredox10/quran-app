import {beforeEach,describe,it,expect,vi,afterEach} from 'vitest';
import {useAppStore,getSyncPayload} from './useAppStore';
import {mergeStateInto} from '../utils/syncMerge';
beforeEach(()=>useAppStore.setState({bookmarks:[],bookmark:null,bookmarkRemovals:{},recentlyRead:[]}));
afterEach(()=>vi.restoreAllMocks());
describe('reader bookmark actions use the shared library',()=>{
    it('the actual reader button updates both the library and home bookmark',()=>{
        vi.spyOn(Date,'now').mockReturnValue(1000);
        useAppStore.getState().setBookmark('2:255','Al-Baqarah',2);
        const s=useAppStore.getState();
        expect(s.bookmarks.map(b=>b.verseKey)).toEqual(['2:255']);
        expect(s.bookmark.verseKey).toBe('2:255');
        expect(getSyncPayload(s).bookmarks).toEqual(s.bookmarks);
    });
    it('removing a bookmark survives an old device snapshot and permits a later re-add',()=>{
        const now=vi.spyOn(Date,'now').mockReturnValue(1000);
        useAppStore.getState().setBookmark('2:255','Al-Baqarah',2);
        const old=getSyncPayload(useAppStore.getState());
        now.mockReturnValue(2000);useAppStore.getState().setBookmark('2:255','Al-Baqarah',2);
        const removed=getSyncPayload(useAppStore.getState());
        expect(mergeStateInto(removed,old).bookmarks).toEqual([]);
        expect(mergeStateInto(removed,old).bookmark).toBeNull();
        now.mockReturnValue(3000);useAppStore.getState().setBookmark('2:255','Al-Baqarah',2);
        expect(mergeStateInto(removed,getSyncPayload(useAppStore.getState())).bookmarks).toHaveLength(1);
    });
    it('adding a second bookmark preserves the first and chooses the newest for home',()=>{
        const now=vi.spyOn(Date,'now').mockReturnValue(1000);
        useAppStore.getState().setBookmark('1:2','Al-Fatihah',1);
        now.mockReturnValue(2000);useAppStore.getState().setBookmark('2:255','Al-Baqarah',2);
        expect(useAppStore.getState().bookmarks).toHaveLength(2);
        expect(useAppStore.getState().bookmark.verseKey).toBe('2:255');
    });
});
it('does not associate a previous chapter with a verse from the newly opened chapter',()=>{
    useAppStore.getState().addRecentlyRead(8,'Al-Anfal','10:1');
    expect(useAppStore.getState().recentlyRead).toEqual([]);
    useAppStore.getState().addRecentlyRead(10,'Yunus','10:1');
    expect(useAppStore.getState().recentlyRead[0]).toMatchObject({chapterId:10,verseKey:'10:1'});
});
