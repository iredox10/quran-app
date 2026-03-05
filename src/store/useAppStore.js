import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
    persist(
        (set) => ({
            theme: 'light', // 'light' or 'dark'
            translationId: 131, // Default: Clear Quran
            reciterId: 7, // Default: Mishary
            fontSize: 2, // 1, 2, 3, 4
            readingMode: false, // false = translation, true = arabic only
            arabicFont: "'KFGQPC Uthman Taha Naskh', 'Amiri Quran', serif", // Default font
            tajweedEnabled: false, // Show tajweed color rules
            tafsirId: 169, // Default: Ibn Kathir (Abridged) English

            bookmarks: [], // Array of verse keys, e.g., ['1:1', '2:255']
            lastRead: null, // { chapterId: 1, verseKey: '1:1', chapterName: 'Al-Fatiha' }

            toggleTheme: () => set((state) => ({
                theme: state.theme === 'light' ? 'dark' : 'light'
            })),

            setTranslation: (id) => set({ translationId: id }),
            setReciter: (id) => set({ reciterId: id }),
            setFontSize: (size) => set({ fontSize: size }),
            setReadingMode: (mode) => set({ readingMode: mode }),
            setArabicFont: (font) => set({ arabicFont: font }),
            setTajweed: (enabled) => set({ tajweedEnabled: enabled }),
            setTafsirId: (id) => set({ tafsirId: id }),

            toggleBookmark: (verseKey) => set((state) => {
                const currentBookmarks = state.bookmarks || [];
                return {
                    bookmarks: currentBookmarks.includes(verseKey)
                        ? currentBookmarks.filter(k => k !== verseKey)
                        : [...currentBookmarks, verseKey]
                };
            }),

            setLastRead: (chapterId, verseKey, chapterName) => set({
                lastRead: { chapterId, verseKey, chapterName }
            }),

            // Audio State (transient)
            currentAudioUrl: null,
            isPlaying: false,

            setAudio: (url) => set({ currentAudioUrl: url }),
            setIsPlaying: (playing) => set({ isPlaying: playing }),
        }),
        {
            name: 'quran-app-storage',
            partialize: (state) => ({
                theme: state.theme,
                translationId: state.translationId,
                reciterId: state.reciterId,
                fontSize: state.fontSize,
                readingMode: state.readingMode,
                arabicFont: state.arabicFont,
                tajweedEnabled: state.tajweedEnabled,
                tafsirId: state.tafsirId,
                bookmarks: state.bookmarks || [],
                lastRead: state.lastRead
            }), // Persist settings and user data
        }
    )
);
