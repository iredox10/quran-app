import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    DEFAULT_MUSHAF,
    getArabicFontByFamily,
    getArabicFontFamily,
    getCompatibleArabicFontId,
    getMushafById,
} from '../config/mushaf';

const DEFAULT_ARABIC_FONT_ID = getCompatibleArabicFontId(DEFAULT_MUSHAF.id, DEFAULT_MUSHAF.defaultFontId);
const DEFAULT_ARABIC_FONT_FAMILY = getArabicFontFamily(DEFAULT_ARABIC_FONT_ID);

export const useAppStore = create(
    persist(
        (set) => ({
            theme: 'light', // 'light' or 'dark'
            translationId: 85, // Default: M.A.S. Abdel Haleem (85)
            reciterId: 7, // Default: Mishary
            fontSize: 2, // 1, 2, 3, 4
            translationFontSize: 2, // 1, 2, 3, 4
            readingMode: false, // false = translation, true = arabic only
            mushafId: DEFAULT_MUSHAF.id,
            arabicFontId: DEFAULT_ARABIC_FONT_ID,
            arabicFont: DEFAULT_ARABIC_FONT_FAMILY,
            tajweedEnabled: false, // Show tajweed color rules
            tafsirId: 169, // Default: Ibn Kathir (Abridged) English
            offlineDataStatus: 'idle', // 'idle', 'syncing', 'completed', 'error'
            downloadedSurahs: [], // Array of chapter IDs with offline audio

            isSettingsOpen: false, // Global settings state

            bookmark: null, // { verseKey, surahName }
            bookmarks: [], // Array of { verseKey, surahName, chapterId }
            memorizedAyahs: [], // Array of verse keys '1:1'
            memorizedSurahs: [], // Array of chapter IDs
            collections: [], // Array of { id, name, items: [{ verseKey, surahName, chapterId }] }
            recentlyRead: [], // Array of { chapterId, chapterName, verseKey, timestamp }
            readingSessions: [], // Array of { date (YYYY-MM-DD), duration (seconds), type: 'reading'|'memorizing'|'listening', chapterId }
            planner: null,

            setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
            toggleTheme: () => set((state) => ({
                theme: state.theme === 'light' ? 'dark' : 'light'
            })),

            setTranslation: (id) => set({ translationId: id }),
            setReciter: (id) => set({ reciterId: id }),
            setFontSize: (size) => set({ fontSize: size }),
            setTranslationFontSize: (size) => set({ translationFontSize: size }),
            setReadingMode: (mode) => set({ readingMode: mode }),
            setSelectedMushaf: (mushafId) => set((state) => {
                const mushaf = getMushafById(mushafId);
                const nextFontId = getCompatibleArabicFontId(mushaf.id, state.arabicFontId || getArabicFontByFamily(state.arabicFont)?.id);

                return {
                    mushafId: mushaf.id,
                    arabicFontId: nextFontId,
                    arabicFont: getArabicFontFamily(nextFontId, mushaf.defaultFontId),
                    tajweedEnabled: mushaf.supportsTajweedToggle ? state.tajweedEnabled : false,
                };
            }),
            setArabicFont: (fontId) => set((state) => {
                const nextFontId = getCompatibleArabicFontId(state.mushafId, fontId);
                return {
                    arabicFontId: nextFontId,
                    arabicFont: getArabicFontFamily(nextFontId),
                };
            }),
            setTajweed: (enabled) => set((state) => {
                const mushaf = getMushafById(state.mushafId);
                return { tajweedEnabled: mushaf.supportsTajweedToggle ? enabled : false };
            }),
            setTafsirId: (id) => set({ tafsirId: id }),
            setOfflineStatus: (status) => set({ offlineDataStatus: status }),
            addDownloadedSurah: (id) => set((state) => ({
                downloadedSurahs: state.downloadedSurahs.includes(id) ? state.downloadedSurahs : [...state.downloadedSurahs, id]
            })),

            setBookmark: (verseKey, surahName, chapterId = null) => set((state) => ({
                bookmark: state.bookmark?.verseKey === verseKey ? null : { verseKey, surahName, chapterId }
            })),

            toggleBookmark: (verseKey, surahName, chapterId = null) => set((state) => {
                const exists = state.bookmarks?.find(b => b.verseKey === verseKey);
                if (exists) {
                    return { bookmarks: state.bookmarks.filter(b => b.verseKey !== verseKey) };
                } else {
                    return { bookmarks: [...(state.bookmarks || []), { verseKey, surahName, chapterId }] };
                }
            }),

            toggleMemorizedAyah: (verseKey) => set((state) => {
                const isMemorized = (state.memorizedAyahs || []).includes(verseKey);
                if (isMemorized) {
                    return { memorizedAyahs: state.memorizedAyahs.filter(k => k !== verseKey) };
                } else {
                    return { memorizedAyahs: [...(state.memorizedAyahs || []), verseKey] };
                }
            }),

            toggleMemorizedSurah: (chapterId) => set((state) => {
                const isMemorized = (state.memorizedSurahs || []).includes(chapterId);
                if (isMemorized) {
                    return { memorizedSurahs: state.memorizedSurahs.filter(id => id !== chapterId) };
                } else {
                    return { memorizedSurahs: [...(state.memorizedSurahs || []), chapterId] };
                }
            }),

            addCollection: (name, id = null) => set((state) => ({
                collections: [...(state.collections || []), { id: id || Date.now(), name, items: [] }]
            })),

            deleteCollection: (id) => set((state) => ({
                collections: (state.collections || []).filter(c => c.id !== id)
            })),

            addToCollection: (collectionId, verseKey, surahName, chapterId = null) => set((state) => ({
                collections: (state.collections || []).map(c => {
                    if (c.id === collectionId) {
                        const exists = c.items.find(item => item.verseKey === verseKey);
                        if (!exists) {
                            return { ...c, items: [...c.items, { verseKey, surahName, chapterId }] };
                        }
                    }
                    return c;
                })
            })),

            removeFromCollection: (collectionId, verseKey) => set((state) => ({
                collections: (state.collections || []).map(c => {
                    if (c.id === collectionId) {
                        return { ...c, items: c.items.filter(item => item.verseKey !== verseKey) };
                    }
                    return c;
                })
            })),

            addRecentlyRead: (chapterId, chapterName, verseKey = null) => set((state) => {
                const filtered = (state.recentlyRead || []).filter(r => r.chapterId !== chapterId);
                const newList = [{ chapterId, chapterName, verseKey, timestamp: Date.now() }, ...filtered].slice(0, 5);
                return { recentlyRead: newList };
            }),

            logReadingSession: (duration, type = 'reading', chapterId = null) => set((state) => {
                const today = new Date().toISOString().split('T')[0];
                const session = { date: today, duration, type, chapterId, timestamp: Date.now() };
                const sessions = [...(state.readingSessions || []), session].slice(-500); // Keep last 500
                return { readingSessions: sessions };
            }),

            setPlanner: (planner) => set({ planner }),
            clearPlanner: () => set({ planner: null }),
            togglePlannerDayComplete: (dayNumber) => set((state) => {
                if (!state.planner) {
                    return {};
                }

                const assignment = state.planner.assignments.find((item) => item.dayNumber === dayNumber);
                if (!assignment) {
                    return {};
                }

                const totalItems = assignment.items.length;
                const assignmentProgress = { ...(state.planner.assignmentProgress || {}) };
                const assignmentCompletedItems = { ...(state.planner.assignmentCompletedItems || {}) };
                const assignmentCompletedAt = { ...(state.planner.assignmentCompletedAt || {}) };
                const isComplete = state.planner.completedDays.includes(dayNumber);
                assignmentProgress[dayNumber] = isComplete ? 0 : totalItems;
                assignmentCompletedItems[dayNumber] = isComplete ? [] : assignment.items.map((item) => item.rangeValue);
                if (isComplete) {
                    delete assignmentCompletedAt[dayNumber];
                } else {
                    assignmentCompletedAt[dayNumber] = new Date().toISOString().split('T')[0];
                }

                const completedDays = state.planner.assignments
                    .filter((item) => (assignmentProgress[item.dayNumber] || 0) >= item.items.length)
                    .map((item) => item.dayNumber)
                    .sort((a, b) => a - b);

                return {
                    planner: {
                        ...state.planner,
                        assignmentProgress,
                        assignmentCompletedItems,
                        assignmentCompletedAt,
                        completedDays,
                    },
                };
            }),
            setPlannerAssignmentProgress: (dayNumber, completedCount) => set((state) => {
                if (!state.planner) {
                    return {};
                }

                const assignment = state.planner.assignments.find((item) => item.dayNumber === dayNumber);
                if (!assignment) {
                    return {};
                }

                const totalItems = assignment.items.length;
                const safeCompletedCount = Math.max(0, Math.min(Number(completedCount) || 0, totalItems));
                const assignmentProgress = {
                    ...(state.planner.assignmentProgress || {}),
                    [dayNumber]: safeCompletedCount,
                };
                const assignmentCompletedItems = { ...(state.planner.assignmentCompletedItems || {}) };
                assignmentCompletedItems[dayNumber] = assignment.items.slice(0, safeCompletedCount).map((item) => item.rangeValue);
                const assignmentCompletedAt = { ...(state.planner.assignmentCompletedAt || {}) };

                if (safeCompletedCount >= totalItems) {
                    assignmentCompletedAt[dayNumber] = assignmentCompletedAt[dayNumber] || new Date().toISOString().split('T')[0];
                } else {
                    delete assignmentCompletedAt[dayNumber];
                }

                const completedDays = state.planner.assignments
                    .filter((item) => (assignmentProgress[item.dayNumber] || 0) >= item.items.length)
                    .map((item) => item.dayNumber)
                    .sort((a, b) => a - b);

                return {
                    planner: {
                        ...state.planner,
                        assignmentProgress,
                        assignmentCompletedItems,
                        assignmentCompletedAt,
                        completedDays,
                    },
                };
            }),
            markPlannerItemComplete: (dayNumber, rangeValue) => set((state) => {
                if (!state.planner) {
                    return {};
                }

                const assignment = state.planner.assignments.find((item) => item.dayNumber === dayNumber);
                if (!assignment) {
                    return {};
                }

                const assignmentCompletedItems = { ...(state.planner.assignmentCompletedItems || {}) };
                const existing = Array.isArray(assignmentCompletedItems[dayNumber]) ? assignmentCompletedItems[dayNumber] : [];
                const nextCompletedItems = Array.from(new Set([...existing, rangeValue])).filter((value) =>
                    assignment.items.some((item) => item.rangeValue === value)
                );

                assignmentCompletedItems[dayNumber] = nextCompletedItems;

                const assignmentProgress = {
                    ...(state.planner.assignmentProgress || {}),
                    [dayNumber]: nextCompletedItems.length,
                };

                const assignmentCompletedAt = { ...(state.planner.assignmentCompletedAt || {}) };
                if (nextCompletedItems.length >= assignment.items.length) {
                    assignmentCompletedAt[dayNumber] = assignmentCompletedAt[dayNumber] || new Date().toISOString().split('T')[0];
                }

                const completedDays = state.planner.assignments
                    .filter((item) => {
                        const completedItems = assignmentCompletedItems[item.dayNumber] || [];
                        return completedItems.length >= item.items.length;
                    })
                    .map((item) => item.dayNumber)
                    .sort((a, b) => a - b);

                return {
                    planner: {
                        ...state.planner,
                        assignmentProgress,
                        assignmentCompletedItems,
                        assignmentCompletedAt,
                        completedDays,
                    },
                };
            }),

            // Advanced Audio State
            currentAudioUrl: null, // Legacy single file support
            audioPlaylist: [], // Array of { url, verseKey, verseNumber }
            audioTrackIndex: 0,
            isPlaying: false,

            // Advanced Audio Settings (Persisted)
            audioSettings: {
                startRange: null,
                endRange: null,
                reciterId: 7,
                repeatSelection: 1, // 1 = play once, -1 = infinite loop
                repeatAya: 1, // 1 = play once, -1 = infinite
                delayBetweenAyas: 0, // seconds
                playbackSpeed: 1.0,
                scrollWhilePlaying: true,
            },

            // Auto-scroll (transient)
            autoScroll: false,
            isAutoScrollPaused: false,
            autoScrollSpeed: 3, // 1-7
            setAutoScroll: (val) => set({ autoScroll: val, isAutoScrollPaused: false }),
            setIsAutoScrollPaused: (val) => set({ isAutoScrollPaused: val }),
            setAutoScrollSpeed: (speed) => set({ autoScrollSpeed: speed }),

            navHeaderTitle: null,
            setNavHeaderTitle: (title) => set({ navHeaderTitle: title }),

            setAudio: (url) => set({ currentAudioUrl: url, audioPlaylist: [] }),
            setAudioPlaylist: (playlist, startIndex = 0) => set({
                audioPlaylist: playlist,
                audioTrackIndex: startIndex,
                currentAudioUrl: null,
            }),
            setAudioTrackIndex: (index) => set({ audioTrackIndex: index }),
            updateAudioSettings: (newSettings) => set((state) => ({
                audioSettings: { ...state.audioSettings, ...newSettings }
            })),
            setIsPlaying: (playing) => set({ isPlaying: playing }),
            stopAudio: () => set({ isPlaying: false, currentAudioUrl: null, audioPlaylist: [] }),

            // Player visibility
            isPlayerVisible: false,
            setIsPlayerVisible: (val) => set({ isPlayerVisible: val }),

            // Trigger to tell Surah.jsx to start playing (cross-component signal)
            playTriggerCount: 0,
            incrementPlayTrigger: () => set((state) => ({ playTriggerCount: state.playTriggerCount + 1 })),

            // Custom Offline Audio Base URL
            customAudioBaseUrl: '',
            setCustomAudioBaseUrl: (val) => set({ customAudioBaseUrl: val }),

            // Native File System Handle for Offline Audio
            localAudioDirHandle: null,
            setLocalAudioDirHandle: (handle) => set({ localAudioDirHandle: handle }),
        }),
        {
            name: 'quran-app-storage',
            partialize: (state) => ({
                theme: state.theme,
                translationId: state.translationId,
                reciterId: state.reciterId,
                fontSize: state.fontSize,
                translationFontSize: state.translationFontSize || 2,
                readingMode: state.readingMode,
                mushafId: state.mushafId || DEFAULT_MUSHAF.id,
                arabicFontId: state.arabicFontId || DEFAULT_ARABIC_FONT_ID,
                arabicFont: state.arabicFont,
                tajweedEnabled: state.tajweedEnabled,
                tafsirId: state.tafsirId,
                bookmark: state.bookmark,
                bookmarks: state.bookmarks || [],
                memorizedAyahs: state.memorizedAyahs || [],
                memorizedSurahs: state.memorizedSurahs || [],
                collections: state.collections || [],
                recentlyRead: state.recentlyRead || [],
                readingSessions: state.readingSessions || [],
                planner: state.planner || null,
                offlineDataStatus: state.offlineDataStatus,
                downloadedSurahs: state.downloadedSurahs || [],
                customAudioBaseUrl: state.customAudioBaseUrl || '',
                audioSettings: state.audioSettings || {
                    startRange: null, endRange: null, reciterId: 7,
                    repeatSelection: 1, repeatAya: 1, delayBetweenAyas: 0,
                    playbackSpeed: 1.0, scrollWhilePlaying: true
                }
            }), // Persist settings and user data
        }
    )
);
