import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, getSyncPayload, getSyncableState } from './useAppStore';
import { mergeStateInto } from '../utils/syncMerge';

const resetStore = () => {
    useAppStore.setState(useAppStore.getInitialState());
};

describe('user-chosen setting tracking', () => {
    beforeEach(() => resetStore());

    it('records the settings a setter touches', () => {
        useAppStore.getState().setFontSize(4);
        useAppStore.getState().toggleTheme();
        expect(useAppStore.getState().userSetSettings).toEqual({ fontSize: true, theme: true });
    });

    it('still applies the value locally', () => {
        useAppStore.getState().setFontSize(4);
        useAppStore.getState().toggleTheme();
        expect(useAppStore.getState().fontSize).toBe(4);
        expect(useAppStore.getState().theme).toBe('dark');
    });

    it('records values chosen through mushaf and font setters', () => {
        useAppStore.getState().setArabicFont('qcf');
        const { arabicFontId, arabicFont, userSetSettings } = useAppStore.getState();
        expect(arabicFontId).toBeTruthy();
        expect(userSetSettings.arabicFontId).toBe(true);
        expect(userSetSettings.arabicFont).toBe(true);
        expect(arabicFont).toBeTruthy();
    });

    it('keeps the flags out of the sync payload', () => {
        useAppStore.getState().setWordTooltipBehavior('translation');
        expect(getSyncPayload(useAppStore.getState())).not.toHaveProperty('userSetSettings');
        expect(getSyncableState(useAppStore.getState())).not.toHaveProperty('userSetSettings');
    });

    it('omits settings the user never touched so defaults never win over the cloud', () => {
        const state = useAppStore.getState();
        const payload = getSyncPayload(state);
        const serialized = JSON.parse(JSON.stringify(payload));
        ['theme', 'translationId', 'reciterId', 'fontSize', 'translationFontSize', 'mushafId',
            'arabicFontId', 'arabicFont', 'tajweedEnabled', 'wordTooltipBehavior', 'tafsirId',
            'dailyReadingGoal', 'intentionPromptEnabled', 'customAudioBaseUrl'].forEach((field) => {
            expect(payload[field]).toBeUndefined();
            expect(serialized).not.toHaveProperty(field);
        });
        expect(serialized.bookmarks).toEqual([]);
    });

    it('pushes a value the user picked, even when it equals the default', () => {
        useAppStore.getState().setFontSize(2);
        useAppStore.getState().setWordTooltipBehavior('tajweed');
        expect(getSyncPayload(useAppStore.getState()).fontSize).toBe(2);
        expect(getSyncPayload(useAppStore.getState()).wordTooltipBehavior).toBe('tajweed');
    });

    it('pushes a non-default value that came back from a pull', () => {
        useAppStore.setState({ mushafId: 'kfgqpc_v1', arabicFontId: 'qcf-v1', arabicFont: 'QCF' });
        const payload = getSyncPayload(useAppStore.getState());
        expect(payload.mushafId).toBe('kfgqpc_v1');
        expect(payload.arabicFontId).toBe('qcf-v1');
        expect(payload.arabicFont).toBe('QCF');
        expect(payload.fontSize).toBeUndefined();
    });
});

describe('fresh web client pushing into an existing cloud doc', () => {
    beforeEach(() => resetStore());

    it('keeps the settings another device already stored', () => {
        const cloudDoc = {
            bookmarks: [{ verseKey: '2:1' }],
            fontSize: 4,
            translationFontSize: 4,
            mushafId: 'kfgqpc_v2',
            arabicFontId: 'qcf-v2',
            arabicFont: 'QCF',
            wordTooltipBehavior: 'none',
            theme: 'dark',
            reciterId: 9,
            dailyReadingGoal: 45,
        };
        const merged = mergeStateInto(cloudDoc, getSyncPayload(useAppStore.getState()));
        expect(merged.fontSize).toBe(4);
        expect(merged.translationFontSize).toBe(4);
        expect(merged.mushafId).toBe('kfgqpc_v2');
        expect(merged.arabicFontId).toBe('qcf-v2');
        expect(merged.wordTooltipBehavior).toBe('none');
        expect(merged.theme).toBe('dark');
        expect(merged.reciterId).toBe(9);
        expect(merged.dailyReadingGoal).toBe(45);
        expect(merged.bookmarks).toEqual([{ verseKey: '2:1' }]);
    });
});
