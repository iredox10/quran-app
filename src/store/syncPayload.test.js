import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, getSyncPayload, getSyncableState } from './useAppStore';

const resetStore = () => {
    useAppStore.setState({
        userSetSettings: {},
        theme: 'light',
        translationId: 85,
        reciterId: 7,
        fontSize: 2,
        translationFontSize: 2,
        readingMode: false,
        tajweedEnabled: false,
        wordTooltipBehavior: 'tajweed',
        tafsirId: 169,
        dailyReadingGoal: 20,
        intentionPromptEnabled: true,
        customAudioBaseUrl: '',
    });
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
