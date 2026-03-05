import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
    persist(
        (set) => ({
            theme: 'light', // 'light' or 'dark'
            translationId: 131, // Default: Clear Quran
            reciterId: 7, // Default: Mishary
            fontSize: 2, // 1, 2, 3, 4

            toggleTheme: () => set((state) => ({
                theme: state.theme === 'light' ? 'dark' : 'light'
            })),

            setTranslation: (id) => set({ translationId: id }),
            setReciter: (id) => set({ reciterId: id }),
            setFontSize: (size) => set({ fontSize: size }),

            // Audio State (transient, shouldn't really be persisted for long-term if we only want settings, but for now we put it here or separate store)
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
                fontSize: state.fontSize
            }), // Persist only settings
        }
    )
);
