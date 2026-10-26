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

    it('flag off (default) → never remaps, quran.com paths stay byte-identical', async () => {
        vi.stubEnv('VITE_USE_RENDER_API', 'false');
        const { useRenderApi, mapRenderContentPath } = await loadMapper();
        expect(useRenderApi).toBe(false);
        expect(mapRenderContentPath('/chapters')).toBeNull();
        expect(mapRenderContentPath('/verses/by_chapter/2')).toBeNull();
        expect(mapRenderContentPath('/tafsirs/169/by_chapter/36')).toBeNull();
    });

    it('flag on → remaps exactly the frozen contract endpoints, leaves the rest alone', async () => {
        vi.stubEnv('VITE_USE_RENDER_API', 'true');
        const { useRenderApi, mapRenderContentPath } = await loadMapper();
        expect(useRenderApi).toBe(true);
        expect(mapRenderContentPath('/chapters')).toBe('/v1/chapters');
        expect(mapRenderContentPath('/verses/by_chapter/2')).toBe('/v1/verses/2');
        expect(mapRenderContentPath('/tafsirs/169/by_chapter/36')).toBe('/v1/tafsir/169/by_chapter/36');
        expect(mapRenderContentPath('/tafsirs/169/by_page/241')).toBe('/v1/tafsir/169/by_page/241');
        // Not in contract-content.md → intentionally untouched (stays on quran.com).
        expect(mapRenderContentPath('/verses/by_page/1')).toBeNull();
        expect(mapRenderContentPath('/quran/verses/uthmani_tajweed')).toBeNull();
        expect(mapRenderContentPath('/juzs')).toBeNull();
        expect(mapRenderContentPath('/foot_notes/15')).toBeNull();
        expect(mapRenderContentPath('/chapter_recitations/7/2')).toBeNull();
    });
});
