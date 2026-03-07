import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
    persist(
        (set) => ({
            theme: 'light', // 'light' or 'dark'
            translationId: 85, // Default: M.A.S. Abdel Haleem (131 was removed from API)
            reciterId: 7, // Default: Mishary
            fontSize: 2, // 1, 2, 3, 4
            translationFontSize: 2, // 1, 2, 3, 4
            readingMode: false, // false = translation, true = arabic only
            arabicFont: "'Scheherazade New', serif", // Default font
            tajweedEnabled: false, // Show tajweed color rules
            tafsirId: 169, // Default: Ibn Kathir (Abridged) English
            offlineDataStatus: 'idle', // 'idle', 'syncing', 'completed', 'error'
            downloadedSurahs: [], // Array of chapter IDs with offline audio

            bookmark: null, // { verseKey, surahName }
            bookmarks: [], // Array of { verseKey, surahName, chapterId }
            collections: [], // Array of { id, name, items: [{ verseKey, surahName, chapterId }] }
            recentlyRead: [], // Array of { chapterId, chapterName, verseKey, timestamp }

            toggleTheme: () => set((state) => ({
                theme: state.theme === 'light' ? 'dark' : 'light'
            })),

            setTranslation: (id) => set({ translationId: id }),
            setReciter: (id) => set({ reciterId: id }),
            setFontSize: (size) => set({ fontSize: size }),
            setTranslationFontSize: (size) => set({ translationFontSize: size }),
            setReadingMode: (mode) => set({ readingMode: mode }),
            setArabicFont: (font) => set({ arabicFont: font }),
            setTajweed: (enabled) => set({ tajweedEnabled: enabled }),
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
            autoScrollSpeed: 2, // 1-5
            setAutoScroll: (val) => set({ autoScroll: val }),
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
                arabicFont: state.arabicFont,
                tajweedEnabled: state.tajweedEnabled,
                tafsirId: state.tafsirId,
                bookmark: state.bookmark,
                bookmarks: state.bookmarks || [],
                collections: state.collections || [],
                recentlyRead: state.recentlyRead || [],
                offlineDataStatus: state.offlineDataStatus,
                downloadedSurahs: state.downloadedSurahs || [],
                audioSettings: state.audioSettings || {
                    startRange: null, endRange: null, reciterId: 7,
                    repeatSelection: 1, repeatAya: 1, delayBetweenAyas: 0,
                    playbackSpeed: 1.0, scrollWhilePlaying: true
                }
            }), // Persist settings and user data
        }
    )
);
