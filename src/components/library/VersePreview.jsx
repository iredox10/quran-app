import { useQuery } from '@tanstack/react-query';
import { getVerses } from '../../services/api/quranApi';
import {
    buildVersePreviewParams,
    extractVerse,
    extractVerseText,
    isValidVerseKey,
    versePreviewQueryKey,
} from '../../utils/verseLookup';

/**
 * VersePreview — renders the Arabic text + translation of a single ayah.
 *
 * PROPS CONTRACT (fixed across agents — do not change):
 *   verseKey  — '2:255'
 *   chapterId — 2
 *   surahName — 'Al-Baqara' (used as fallback / query label)
 *   compact   — boolean, tighter typography for list rows
 *
 * Never throws and never breaks the parent layout: skeletons while loading,
 * `null` when the key is invalid or the fetch fails (offline without cache) —
 * the surrounding card still renders its surah/ayah header.
 */

const warnedKeys = new Set();

function logPreviewFailure(verseKey) {
    if (warnedKeys.has(verseKey)) return;
    warnedKeys.add(verseKey);
    if (typeof console !== 'undefined') {
        console.warn(`[VersePreview] could not load ${verseKey}; hiding preview`);
    }
}

/** Pulse blocks sized like the real content so the card does not jump on load. */
function PreviewSkeleton({ compact }) {
    if (compact) {
        return (
            <div aria-hidden="true" className="space-y-[6px]">
                <div className="ml-auto h-[1.85rem] w-[95%] rounded-[4px] bg-[var(--bg-secondary)] animate-pulse" />
                <div className="ml-auto h-[1.85rem] w-[78%] rounded-[4px] bg-[var(--bg-secondary)] animate-pulse" />
                <div className="h-[1.05rem] w-full rounded-[4px] bg-[var(--bg-secondary)] animate-pulse" />
                <div className="h-[1.05rem] w-[62%] rounded-[4px] bg-[var(--bg-secondary)] animate-pulse" />
            </div>
        );
    }
    return (
        <div aria-hidden="true" className="space-y-2">
            <div className="ml-auto h-[2.85rem] w-[92%] rounded-[6px] bg-[var(--bg-secondary)] animate-pulse" />
            <div className="h-[1.35rem] w-full rounded-[6px] bg-[var(--bg-secondary)] animate-pulse" />
            <div className="h-[1.35rem] w-[72%] rounded-[6px] bg-[var(--bg-secondary)] animate-pulse" />
        </div>
    );
}

export default function VersePreview({ verseKey, chapterId, surahName, compact = false }) {
    const valid = isValidVerseKey(verseKey);
    const params = valid ? buildVersePreviewParams(verseKey) : null;

    // Hooks always run — the invalid-key / error paths return null AFTER them.
    const { data, isLoading, isError } = useQuery({
        queryKey: versePreviewQueryKey(chapterId ?? params?.chapterId ?? null, verseKey),
        queryFn: async () => {
            const p = buildVersePreviewParams(verseKey);
            if (!p) return [];
            try {
                const result = await getVerses(
                    p.chapterId,
                    p.translationId,
                    p.reciterId,
                    p.page,
                    p.mushafId,
                    p.perPage
                );
                return Array.isArray(result?.verses) ? result.verses : [];
            } catch (error) {
                logPreviewFailure(verseKey);
                throw error;
            }
        },
        staleTime: 5 * 60_000,
        retry: 1,
        enabled: valid,
    });

    if (!valid || isError) return null;
    if (isLoading) return <PreviewSkeleton compact={compact} />;

    const text = extractVerseText(extractVerse(data, verseKey));
    if (!text || (!text.arabic && !text.translation)) return null;

    const label = surahName ? `${surahName} — ayah ${verseKey}` : `Ayah ${verseKey}`;

    return (
        <div
            aria-label={label}
            className={`min-w-0 ${compact ? 'overflow-hidden space-y-[6px]' : 'space-y-2'}`}
        >
            {text.arabic ? (
                <p
                    dir="rtl"
                    lang="ar"
                    className={`font-arabic text-right break-words text-[var(--text-primary)] ${
                        compact
                            ? 'text-[1.05rem] leading-[1.85] line-clamp-2'
                            : 'text-[1.45rem] leading-[2.1]'
                    }`}
                >
                    {text.arabic}
                </p>
            ) : null}
            {text.translation ? (
                <p
                    className={`break-words text-[var(--text-secondary)] ${
                        compact
                            ? 'text-[0.75rem] leading-[1.45] line-clamp-2'
                            : 'text-[0.85rem] leading-[1.6]'
                    }`}
                >
                    {text.translation}
                </p>
            ) : null}
        </div>
    );
}
