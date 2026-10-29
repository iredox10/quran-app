import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

/**
 * The frozen /v1 content mapping is pure; mock the heavy collaborators so no
 * Dexie/quran.com surface is touched from tests.
 */
vi.mock('../../utils/offlineCache', () => ({
    getOfflineCacheData: vi.fn(),
    setOfflineCacheEntry: vi.fn(),
}));
vi.mock('../../config/mushaf', () => ({
    getMushafById: vi.fn(() => ({
        id: 'madani-standard',
        verseField: 'text_uthmani',
        scriptField: 'text_uthmani',
        apiMushafId: 'quran-uthmani',
    })),
}));

const loadMapper = async () => {
    const apiConfig = await import('../apiConfig');
    const quranApi = await import('./quranApi');
    return { useRenderApi: apiConfig.useRenderApi, mapRenderContentPath: quranApi.mapRenderContentPath };
};

describe('quranApi.mapRenderContentPath (frozen /v1 content endpoints)', () => {
    beforeEach(() => {
        vi.resetModules();
    });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('maps all web content paths to Heroku, including pages and metadata', async () => {
        vi.stubEnv('VITE_USE_RENDER_API', 'false');
        const { useRenderApi, mapRenderContentPath } = await loadMapper();
        expect(useRenderApi).toBe(true);
        expect(mapRenderContentPath('/chapters')).toBe('/v1/chapters');
        expect(mapRenderContentPath('/verses/by_chapter/2')).toBe('/v1/verses/2');
        expect(mapRenderContentPath('/verses/by_page/1')).toBe('/v1/pages/1');
        expect(mapRenderContentPath('/tafsirs/169/by_page/241')).toBe('/v1/tafsir/169/by_page/241');
        expect(mapRenderContentPath('/juzs')).toBe('/v1/juzs');
        expect(mapRenderContentPath('/foot_notes/15')).toBe('/v1/footnotes/15');
        expect(mapRenderContentPath('/chapter_recitations/7/2')).toBe('/v1/chapter-audio/7/2');
        expect(() => mapRenderContentPath('/unknown')).toThrow('Unsupported');
    });
    it('sends the selected edition using the backend query contract', async () => {
        const { backendContentParams } = await import('./quranApi');
        expect(backendContentParams({ translations: 85, words: true, mushaf: 19, page: 2, per_page: 50, audio: 7 }))
            .toEqual({ translation: 85, words: 1, mushaf: 19, page: 2, per_page: 50, tajweed: 1 });
    });
});
