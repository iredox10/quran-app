import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    ArrowRight,
    Bookmark,
    BookOpen,
    Check,
    ChevronDown,
    ChevronUp,
    FolderOpen,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getChapters } from '../services/api/quranApi';
import VersePreview from '../components/library/VersePreview';
import {
    parseVerseKey,
    searchBookmarks,
    sortBookmarks,
    groupBySurah,
    validateCollectionName,
    collectionStats,
    timeAgo,
    normalizeQuery,
} from '../utils/library';

const MICRO = 'font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)]';
const CARD = 'rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6';
const CHIP = 'rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors';
const CHIP_ACTIVE = 'inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]';

function VerseRow({ item, chapterName, bookmarked, onToggleBookmark, onRemove }) {
    const [showText, setShowText] = useState(false);
    const { ayahNumber, chapterId } = parseVerseKey(item.verseKey);
    const resolvedChapterId = chapterId ?? item.chapterId;
    const previewId = `verse-text-${String(item.verseKey).replace(':', '-')}`;

    return (
        <div className="rounded-[16px] border-[1.5px] border-transparent bg-[var(--h-white)] px-4 py-3 transition-colors hover:border-[var(--h-bone-dark)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate font-ui text-[0.95rem] font-bold text-[var(--text-primary)]">
                        {chapterName || item.surahName}
                    </div>
                    <div className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Ayah {ayahNumber ?? '—'} · {item.verseKey}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setShowText((prev) => !prev)}
                        aria-expanded={showText}
                        aria-controls={previewId}
                        aria-label={`${showText ? 'Hide' : 'Show'} text for ${item.verseKey}`}
                        className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--h-bone)] hover:text-[var(--text-primary)]"
                    >
                        {showText ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    <button
                        type="button"
                        onClick={() => onToggleBookmark(item)}
                        aria-pressed={bookmarked}
                        aria-label={`${bookmarked ? 'Remove bookmark from' : 'Bookmark'} ${item.verseKey}`}
                        title={bookmarked ? 'Remove bookmark' : 'Bookmark this ayah'}
                        className={`rounded-full p-2 transition-colors hover:bg-[var(--h-bone)] ${
                            bookmarked ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
                        }`}
                    >
                        <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
                    </button>

                    <button
                        type="button"
                        onClick={() => onRemove(item)}
                        aria-label={`Remove ${item.verseKey} from this collection`}
                        title="Remove from collection"
                        className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[rgba(220,38,38,0.1)] hover:text-[#dc2626]"
                    >
                        <X size={15} />
                    </button>

                    <Link
                        to={`/surah/${resolvedChapterId}?verse=${item.verseKey}`}
                        aria-label={`Open ${item.verseKey} in the Quran`}
                        title="Open in Surah"
                        className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--h-bone)] hover:text-[var(--accent-primary)]"
                    >
                        <ArrowRight size={15} />
                    </Link>
                </div>
            </div>

            {showText && (
                <div id={previewId} className="mt-3 border-t-[1.5px] border-[var(--h-bone-dark)] pt-3">
                    <VersePreview
                        verseKey={item.verseKey}
                        chapterId={resolvedChapterId}
                        surahName={chapterName || item.surahName}
                        compact
                    />
                </div>
            )}
        </div>
    );
}

export default function CollectionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        collections,
        bookmarks,
        renameCollection,
        deleteCollection,
        removeFromCollection,
        addToCollection,
        toggleBookmark,
        confirm,
        setNavHeaderTitle,
    } = useAppStore();

    const [isRenaming, setIsRenaming] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [nameError, setNameError] = useState(null);
    const [addQuery, setAddQuery] = useState('');
    const [addOpenOverride, setAddOpenOverride] = useState(null);
    const renameInputRef = useRef(null);

    const collection = useMemo(
        () => (collections || []).find((c) => String(c.id) === String(id)) || null,
        [collections, id]
    );
    const collectionName = collection?.name;
    const items = useMemo(() => collection?.items || [], [collection]);
    const itemCount = items.length;

    const { data: chapters = [] } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
        staleTime: Infinity,
    });

    const resolveChapter = useCallback(
        (chapterId) => chapters.find((c) => String(c.id) === String(chapterId)) || null,
        [chapters]
    );
    const resolveChapterName = useCallback(
        (chapterId) => resolveChapter(chapterId)?.name_simple || null,
        [resolveChapter]
    );

    const stats = useMemo(() => collectionStats(collection), [collection]);
    const groups = useMemo(() => groupBySurah(items), [items]);

    const bookmarkedKeys = useMemo(() => new Set((bookmarks || []).map((b) => b.verseKey)), [bookmarks]);
    const itemKeys = useMemo(() => new Set(items.map((item) => item.verseKey)), [items]);
    const availableBookmarks = useMemo(
        () => sortBookmarks((bookmarks || []).filter((b) => !itemKeys.has(b.verseKey)), 'surah'),
        [bookmarks, itemKeys]
    );
    const filteredCandidates = useMemo(
        () => searchBookmarks(availableBookmarks, addQuery, resolveChapterName),
        [availableBookmarks, addQuery, resolveChapterName]
    );

    const hasSearch = normalizeQuery(addQuery).length > 0;
    const addPanelOpen = addOpenOverride ?? itemCount === 0;
    const firstItem = items[0];
    const firstChapterId = firstItem
        ? parseVerseKey(firstItem.verseKey).chapterId ?? firstItem.chapterId ?? null
        : null;

    useEffect(() => {
        setNavHeaderTitle(collectionName || 'Collection');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle, collectionName]);

    useEffect(() => {
        if (isRenaming) renameInputRef.current?.focus();
    }, [isRenaming]);

    const handleBack = () => {
        if (location.key === 'default' || window.history.length <= 1) navigate('/collections');
        else navigate(-1);
    };

    const startRename = () => {
        setDraftName(collectionName || '');
        setNameError(null);
        setIsRenaming(true);
    };

    const cancelRename = () => {
        setIsRenaming(false);
        setNameError(null);
    };

    const commitRename = () => {
        const error = validateCollectionName(draftName, {
            existingNames: (collections || []).map((c) => c.name),
            ignoreName: collectionName,
        });
        if (error) {
            setNameError(error);
            return;
        }
        renameCollection(collection.id, draftName);
        setIsRenaming(false);
        setNameError(null);
    };

    const handleDelete = async () => {
        const ok = await confirm(`Delete "${collectionName}" and its ${stats.verseCount} verses? This cannot be undone.`);
        if (!ok) return;
        deleteCollection(collection.id);
        navigate('/collections');
    };

    const handleRemove = async (item) => {
        const ok = await confirm(`Remove ${item.verseKey} (${item.surahName}) from "${collectionName}"?`);
        if (!ok) return;
        removeFromCollection(collection.id, item.verseKey);
    };

    const handleToggleBookmark = (item) => {
        const { chapterId } = parseVerseKey(item.verseKey);
        toggleBookmark(item.verseKey, item.surahName, chapterId ?? item.chapterId ?? null);
    };

    const addVersesSection = collection ? (
        <section
            aria-labelledby="add-verses-heading"
            className={`${CARD} ${itemCount === 0 ? 'mb-6' : ''}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setAddOpenOverride(!addPanelOpen)}
                    aria-expanded={addPanelOpen}
                    aria-controls="add-verses-panel"
                    className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-left transition-colors hover:text-[var(--accent-primary)]"
                >
                    <span id="add-verses-heading" className={MICRO}>
                        Add verses
                    </span>
                    <span className="rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-2.5 py-0.5 font-mono text-[0.6rem] font-bold text-[var(--text-primary)]">
                        {availableBookmarks.length}
                    </span>
                    {addPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {!addPanelOpen && (
                    <span className={MICRO}>Bookmarked ayahs not yet in this collection</span>
                )}
            </div>

            {addPanelOpen && (
                <div id="add-verses-panel" className="mt-4">
                    <div className="relative mb-4 w-full">
                        <Search
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                        />
                        <input
                            type="text"
                            value={addQuery}
                            onChange={(e) => setAddQuery(e.target.value)}
                            placeholder="Search your bookmarks..."
                            aria-label="Search bookmarks to add"
                            className="w-full rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] py-2.5 pl-11 pr-10 font-ui text-[0.9rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)]"
                        />
                        {hasSearch && (
                            <button
                                type="button"
                                onClick={() => setAddQuery('')}
                                aria-label="Clear bookmark search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--h-bone)] hover:text-[var(--text-primary)]"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {(bookmarks || []).length === 0 ? (
                        <div className="py-8 text-center">
                            <Bookmark size={30} className="mx-auto mb-3 text-[var(--accent-primary)]/60" />
                            <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                                No bookmarks yet. Bookmark ayahs while reading the Quran and they will show up
                                here, ready to add to this collection.
                            </p>
                        </div>
                    ) : availableBookmarks.length === 0 ? (
                        <div className="py-8 text-center">
                            <Check size={30} className="mx-auto mb-3 text-[var(--accent-primary)]/60" />
                            <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                                Every bookmarked ayah is already in this collection. Bookmark more verses while
                                reading to grow it further.
                            </p>
                        </div>
                    ) : filteredCandidates.length === 0 && hasSearch ? (
                        <div className="py-8 text-center">
                            <Search size={30} className="mx-auto mb-3 text-[var(--accent-primary)]/60" />
                            <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                                No bookmarks match &ldquo;{addQuery.trim()}&rdquo;.
                            </p>
                            <button type="button" onClick={() => setAddQuery('')} className={`${CHIP_ACTIVE} mt-4`}>
                                <X size={13} /> Clear search
                            </button>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {filteredCandidates.map((b) => {
                                const { chapterId, ayahNumber } = parseVerseKey(b.verseKey);
                                const resolvedId = chapterId ?? b.chapterId;
                                const name = resolveChapter(resolvedId)?.name_simple || b.surahName;
                                return (
                                    <li
                                        key={b.verseKey}
                                        className="flex items-center justify-between gap-3 rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate font-ui text-[0.9rem] font-bold text-[var(--text-primary)]">
                                                {name}
                                            </div>
                                            <div className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                                Ayah {ayahNumber ?? '—'}
                                                {b.createdAt ? ` · ${timeAgo(b.createdAt)}` : ''}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => addToCollection(collection.id, b.verseKey, b.surahName, resolvedId)}
                                            aria-label={`Add ${b.verseKey} to ${collectionName}`}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)]"
                                        >
                                            <Plus size={13} /> Add
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </section>
    ) : null;

    return (
        <div className="mx-auto max-w-[1200px] px-4 pb-20 text-[var(--text-primary)]">
            <div className="pt-6">
                <button
                    type="button"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="mb-4 inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)]"
                >
                    <ArrowLeft size={14} /> Back
                </button>

                {!collection ? (
                    <div className={`${CARD} py-14 text-center`}>
                        <FolderOpen size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                        <h1 className="mb-2 font-ui text-[1.25rem] font-bold text-[var(--text-primary)]">
                            Collection not found
                        </h1>
                        <p className="mx-auto mb-6 max-w-[380px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                            This collection may have been deleted, or the link is no longer valid. Your other
                            collections are still safe and sound.
                        </p>
                        <Link
                            to="/collections"
                            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-5 py-2.5 font-mono text-[0.62rem] uppercase tracking-widest text-[var(--text-secondary)] no-underline transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                        >
                            <ArrowLeft size={13} /> Back to Collections
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className={`${CARD} mb-6`}>
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 flex-1">
                                    <span className={`${MICRO} block`}>Collection</span>

                                    {isRenaming ? (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                commitRename();
                                            }}
                                            className="mt-2"
                                        >
                                            <label htmlFor="collection-name-input" className="sr-only">
                                                Collection name
                                            </label>
                                            <input
                                                id="collection-name-input"
                                                ref={renameInputRef}
                                                type="text"
                                                value={draftName}
                                                onChange={(e) => {
                                                    setDraftName(e.target.value);
                                                    if (nameError) setNameError(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        e.preventDefault();
                                                        cancelRename();
                                                    }
                                                }}
                                                maxLength={60}
                                                aria-invalid={Boolean(nameError)}
                                                aria-describedby={nameError ? 'collection-name-error' : undefined}
                                                className="w-full max-w-[440px] rounded-[14px] border-[1.5px] border-[var(--accent-primary)] bg-[var(--h-white)] px-3 py-2 font-ui text-[1.35rem] font-bold text-[var(--text-primary)] outline-none"
                                            />
                                            {nameError && (
                                                <p
                                                    id="collection-name-error"
                                                    role="alert"
                                                    className="mt-1.5 text-[0.75rem] text-[#dc2626]"
                                                >
                                                    {nameError}
                                                </p>
                                            )}
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    type="submit"
                                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-[var(--accent-primary)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                                                >
                                                    <Check size={13} /> Save
                                                </button>
                                                <button type="button" onClick={cancelRename} className={CHIP}>
                                                    Cancel · Esc
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="mt-1 flex items-center gap-2">
                                            <h1 className="font-ui text-[1.6rem] font-bold leading-tight break-words text-[var(--text-primary)]">
                                                {collectionName}
                                            </h1>
                                            <button
                                                type="button"
                                                onClick={startRename}
                                                aria-label={`Rename ${collectionName}`}
                                                title="Rename collection"
                                                className="shrink-0 rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--h-bone)] hover:text-[var(--accent-primary)]"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <div className="min-w-[110px] rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-3">
                                            <div className="font-ui text-[1.2rem] font-bold leading-none text-[var(--text-primary)]">
                                                {stats.verseCount}
                                            </div>
                                            <div className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                                {stats.verseCount === 1 ? 'Verse' : 'Verses'}
                                            </div>
                                        </div>
                                        <div className="min-w-[110px] rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-3">
                                            <div className="font-ui text-[1.2rem] font-bold leading-none text-[var(--text-primary)]">
                                                {stats.surahCount}
                                            </div>
                                            <div className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                                {stats.surahCount === 1 ? 'Surah' : 'Surahs'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    aria-label="Delete this collection"
                                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[#dc2626] transition-colors hover:border-[#dc2626] hover:bg-[rgba(220,38,38,0.1)]"
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                            </div>

                            {itemCount > 0 && firstChapterId !== null && (
                                <Link
                                    to={`/memorize/${firstChapterId}`}
                                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--accent-primary)] px-5 py-3.5 font-ui text-[0.95rem] font-bold text-white no-underline transition-opacity hover:opacity-90"
                                >
                                    <BookOpen size={17} /> Launch Hifdh
                                </Link>
                            )}
                        </div>

                        {itemCount === 0 && addVersesSection}

                        <div className={`${CARD} ${itemCount > 0 ? 'mb-6' : ''}`}>
                            <div className="mb-4 flex items-baseline justify-between px-1">
                                <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                    Verses
                                </span>
                                <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                                    {stats.verseCount} {stats.verseCount === 1 ? 'ayah' : 'ayahs'}
                                </span>
                            </div>

                            {itemCount === 0 ? (
                                <div className="py-10 text-center">
                                    <FolderOpen size={38} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                                    <h3 className="mb-2 font-ui text-[1.1rem] font-bold text-[var(--text-primary)]">
                                        This collection is empty
                                    </h3>
                                    <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                                        Group the ayahs you want to work on in one place. Add your bookmarked verses
                                        with the panel above, then launch a focused Hifdh session whenever you are
                                        ready.
                                    </p>
                                </div>
                            ) : (
                                groups.map((group) => {
                                    const canonical = resolveChapter(group.chapterId)?.name_simple;
                                    return (
                                        <section key={group.chapterId} className="mb-5 last:mb-0">
                                            <div className="mb-2 flex items-baseline justify-between px-1">
                                                <h2 className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                                    Surah {canonical || group.surahName}
                                                </h2>
                                                <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                                                    {group.items.length} {group.items.length === 1 ? 'ayah' : 'ayahs'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {group.items.map((item) => (
                                                    <VerseRow
                                                        key={item.verseKey}
                                                        item={item}
                                                        chapterName={resolveChapter(parseVerseKey(item.verseKey).chapterId ?? item.chapterId)?.name_simple}
                                                        bookmarked={bookmarkedKeys.has(item.verseKey)}
                                                        onToggleBookmark={handleToggleBookmark}
                                                        onRemove={handleRemove}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })
                            )}
                        </div>

                        {itemCount > 0 && addVersesSection}
                    </>
                )}
            </div>
        </div>
    );
}
