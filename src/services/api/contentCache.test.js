import { beforeEach, describe, expect, it, vi } from 'vitest';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('axios', () => ({ default: { create: () => ({ get }) } }));
vi.mock('../../utils/offlineCache', () => ({ getOfflineCacheData: vi.fn(), setOfflineCacheEntry: vi.fn() }));
import { getOfflineCacheData, setOfflineCacheEntry } from '../../utils/offlineCache';
import { getChapters, getChapter, getVerses } from './quranApi';

beforeEach(() => {
    vi.resetAllMocks();
    getOfflineCacheData.mockResolvedValue(null);
    setOfflineCacheEntry.mockResolvedValue(undefined);
});
describe('public Quran content cache', () => {
    it('opens cached Quran content without waiting for a slow or unavailable network', async () => {
        getOfflineCacheData.mockResolvedValue({ chapters: [{ id: 114 }] });
        get.mockImplementation(() => new Promise(() => {}));
        expect(await getChapters()).toEqual([{ id: 114 }]);
        expect(get).not.toHaveBeenCalled();
    });
    it('shares concurrent chapter metadata requests between the reader and chapter list', async () => {
        get.mockResolvedValue({ data: { chapters: [{ id: 114, name_simple: 'An-Nas' }] } });
        const [chapters, chapter] = await Promise.all([getChapters(), getChapter(114)]);
        expect(chapter).toEqual(chapters[0]);
        expect(get).toHaveBeenCalledTimes(1);
    });
    it('keeps a successful response readable when browser storage is full', async () => {
        get.mockResolvedValue({ data: { chapters: [{ id: 114 }] } });
        setOfflineCacheEntry.mockRejectedValue(new Error('QuotaExceededError'));
        expect(await getChapters()).toEqual([{ id: 114 }]);
    });
    it('surfaces uncached network failures and allows the next request to retry', async () => {
        get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { chapters: [{ id: 1 }] } });
        await expect(getChapters()).rejects.toThrow('offline');
        expect(await getChapters()).toEqual([{ id: 1 }]);
    });
    it('keeps selected translations isolated in persistent cache lookups', async () => {
        getOfflineCacheData.mockResolvedValue({ verses: [{ verse_key: '114:1', text_uthmani: 'قُلْ' }], pagination: {} });
        await getVerses(114, 20);
        await getVerses(114, 85);
        const keys = getOfflineCacheData.mock.calls.map(([key]) => key);
        expect(keys[0]).toContain('translations=20');
        expect(keys[1]).toContain('translations=85');
        expect(get).not.toHaveBeenCalled();
    });
});
