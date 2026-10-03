import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Bookmark, Folder, Search, SearchX, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getChapters } from '../services/api/quranApi';
import AddToCollectionModal from '../components/library/AddToCollectionModal';
import VersePreview from '../components/library/VersePreview';
import { normalizeQuery, timeAgo, parseVerseKey, searchBookmarks, sortBookmarks, groupBySurah } from '../utils/library';

const SORT_OPTIONS = [
    { id: 'recent', label: 'Recent' },
    { id: 'surah', label: 'Surah' },
    { id: 'ayah', label: 'Ayah' },
];

function IconButton({ label, onClick, to, children, danger = false }) {
    const className = `flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] transition-colors ${
        danger
            ? 'text-[var(--text-secondary)] hover:border-[#dc2626]/50 hover:bg-[#dc2626]/10 hover:text-[#dc2626]'
            : 'text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)]'
    }`;
    if (to) {
        return (
            <Link to={to} aria-label={label} title={label} className={className}>
                {children}
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
            {children}
        </button>
    );
}

function BookmarkCard({ bookmark, resolveChapterName, onRemove, onSave }) {
    const { chapterId: parsedChapter, ayahNumber } = parseVerseKey(bookmark.verseKey);
    const chapterId = parsedChapter ?? bookmark.chapterId ?? null;
    const surahName = resolveChapterName(chapterId) || bookmark.surahName || `Surah ${chapterId}`;
    const savedAgo = timeAgo(bookmark.createdAt);
    const canJump = Number.isFinite(Number(chapterId)) && Number(chapterId) > 0;

    return (
        <article className="rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate font-ui text-[1.05rem] font-bold text-[var(--text-primary)]">{surahName}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <span>Ayah {ayahNumber ?? '—'}</span>
                        {savedAgo && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>{savedAgo}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {canJump ? (
                        <IconButton label={`Open Surah ${surahName} ayah ${ayahNumber}`} to={`/surah/${chapterId}?verse=${bookmark.verseKey}`}>
                            <ArrowRight size={15} />
                        </IconButton>
                    ) : (
                        <span
                            aria-hidden="true"
                            className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] text-[var(--text-secondary)] opacity-50"
                        >
                            <ArrowRight size={15} />
                        </span>
                    )}
                    <IconButton label={`Save ${surahName} ayah ${ayahNumber} to a collection`} onClick={() => onSave(bookmark)}>
                        <Folder size={15} />
                    </IconButton>
                    <IconButton label={`Remove ${surahName} ayah ${ayahNumber} bookmark`} onClick={() => onRemove(bookmark)} danger>
                        <Trash2 size={15} />
                    </IconButton>
                </div>
            </div>
            <div className="mt-3">
                <VersePreview verseKey={bookmark.verseKey} chapterId={chapterId} surahName={surahName} compact />
            </div>
        </article>
    );
}

export default function Bookmarks() {
    const { bookmarks, toggleBookmark, confirm, setGlobalAlert, setNavHeaderTitle } = useAppStore();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [sortMode, setSortMode] = useState('recent');
    const [collectionVerse, setCollectionVerse] = useState(null);

    useEffect(() => {
        setNavHeaderTitle('Bookmarks');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const { data: chapters = [] } = useQuery({ queryKey: ['chapters'], queryFn: getChapters, staleTime: Infinity });

    const resolveChapterName = useCallback(
        (id) => chapters.find((c) => String(c.id) === String(id))?.name_simple,
        [chapters]
    );

    const allBookmarks = useMemo(() => bookmarks || [], [bookmarks]);
    const results = useMemo(() => {
        const matched = searchBookmarks(allBookmarks, query, resolveChapterName);
        return sortBookmarks(matched, sortMode);
    }, [allBookmarks, query, sortMode, resolveChapterName]);

    const groups = useMemo(() => groupBySurah(results), [results]);

    const trimmedQuery = query.trim();
    const isSearching = normalizeQuery(query).length > 0;
    const hasBookmarks = allBookmarks.length > 0;
    const flatList = isSearching || sortMode !== 'surah';

    const handleBack = () => {
        const idx = window.history.state?.idx;
        const canGoBack = typeof idx === 'number' ? idx > 0 : window.history.length > 1;
        if (canGoBack) navigate(-1);
        else navigate('/library');
    };

    const handleRemove = async (bookmark) => {
        const ok = await confirm('Remove this bookmark?');
        if (!ok) return;
        toggleBookmark(bookmark.verseKey, bookmark.surahName, bookmark.chapterId);
        setGlobalAlert('Bookmark removed');
    };

    const handleSave = (bookmark) => {
        setCollectionVerse({
            verseKey: bookmark.verseKey,
            surahName: bookmark.surahName,
            chapterId: bookmark.chapterId ?? parseVerseKey(bookmark.verseKey).chapterId,
        });
    };

    const renderCard = (bookmark) => (
        <BookmarkCard
            key={bookmark.verseKey}
            bookmark={bookmark}
            resolveChapterName={resolveChapterName}
            onRemove={handleRemove}
            onSave={handleSave}
        />
    );

    const renderBody = () => {
        if (!hasBookmarks) {
            return (
                <div className="py-14 text-center">
                    <Bookmark size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                    <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">No bookmarks yet</h3>
                    <p className="mx-auto max-w-[400px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                        While reading, save an ayah and it will wait for you here — ready to revisit, share into a
                        collection, or jump back into.
                    </p>
                    <Link
                        to="/surah/1"
                        className="mt-5 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                    >
                        Start with Surah Al-Fatiha <ArrowRight size={13} />
                    </Link>
                </div>
            );
        }
        if (isSearching && results.length === 0) {
            return (
                <div className="py-14 text-center">
                    <SearchX size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                    <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                        No bookmarks match &apos;{trimmedQuery}&apos;
                    </h3>
                    <p className="mx-auto max-w-[400px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                        Try a surah name, an ayah number, or a verse key like 2:255.
                    </p>
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="mt-5 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                    >
                        <X size={13} /> Clear search
                    </button>
                </div>
            );
        }
        if (flatList) {
            return results.map(renderCard);
        }
        return groups.map((group) => (
            <section key={group.chapterId} className="mb-5 last:mb-0">
                <div className="mb-2.5 flex items-baseline justify-between px-1">
                    <h2 className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        {resolveChapterName(group.chapterId) || group.surahName}
                    </h2>
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        {group.items.length} {group.items.length === 1 ? 'ayah' : 'ayahs'}
                    </span>
                </div>
                <div className="flex flex-col gap-3">{group.items.map(renderCard)}</div>
            </section>
        ));
    };

    return (
        <div className="mx-auto max-w-[1200px] px-4 pb-20 text-[var(--text-primary)]">
            <div className="pt-6">
                <button
                    type="button"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="mb-4 inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)]"
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div className="mb-6 text-center">
                    <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Saved Ayahs
                    </span>
                    <h1 className="font-ui text-[1.75rem] font-bold text-[var(--text-primary)]">Bookmarks</h1>
                    <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">
                        {hasBookmarks
                            ? `${allBookmarks.length} saved ${allBookmarks.length === 1 ? 'ayah' : 'ayahs'}`
                            : 'Ayahs you save while reading will show up here.'}
                    </p>
                </div>

                <div className="mb-6 rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div role="group" aria-label="Sort bookmarks" className="flex items-center gap-2">
                            <span className="hidden font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] sm:block">
                                Sort
                            </span>
                            <div className="flex items-center gap-1 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] p-1">
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setSortMode(option.id)}
                                        aria-pressed={sortMode === option.id}
                                        className={`rounded-full px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest transition-colors ${
                                            sortMode === option.id
                                                ? 'bg-[var(--h-cream)] text-[var(--text-primary)] shadow-sm'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative w-full md:w-80">
                            <label htmlFor="bookmark-search" className="sr-only">
                                Search bookmarks
                            </label>
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                            />
                            <input
                                id="bookmark-search"
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search surah, ayah or 2:255..."
                                className="w-full rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] py-2.5 pl-11 pr-10 font-ui text-[0.9rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)]"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--h-bone)] hover:text-[var(--text-primary)]"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="mb-4 flex items-baseline justify-between px-1">
                        <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            {isSearching ? 'Search results' : 'All bookmarks'}
                        </div>
                        <div className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            {results.length} {results.length === 1 ? 'ayah' : 'ayahs'}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">{renderBody()}</div>

                    <AddToCollectionModal
                        open={collectionVerse !== null}
                        verse={collectionVerse}
                        onClose={() => setCollectionVerse(null)}
                        onAdded={() => setCollectionVerse(null)}
                    />
                </div>
            </div>
        </div>
    );
}
