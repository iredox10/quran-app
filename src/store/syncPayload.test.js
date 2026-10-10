import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, getSyncPayload, getSyncableState } from './useAppStore';

const resetStore = () => {
    useAppStore.setState({ userSetSettings: {}, fontSize: 2, theme: 'light' });
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
});
