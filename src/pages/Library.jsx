import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, BookOpen, Folder, FolderPlus, Library as LibraryIcon, Plus, Trash2, History } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { collectionStats, parseVerseKey, timeAgo, validateCollectionName } from '../utils/library';
import PageTourModal from '../components/ui/PageTourModal';

const MotionDiv = motion.div;

const libraryTourSteps = [
    { title: "Your Library", description: "This is where your personalized Quran content lives.", icon: LibraryIcon },
    { title: "Bookmarks", target: "#bookmarks-section", description: "Quickly access specific ayahs you've bookmarked while reading.", icon: Bookmark },
    { title: "Collections", target: "#collections-section", description: "Group specific verses together into custom collections for focused Hifdh or study.", icon: Folder },
    { title: "Recently Read", target: "#recent-section", description: "Jump back into the surahs you were reading most recently.", icon: History }
];

const CARD_SHELL = 'rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-5 sm:p-6';
const VIEW_ALL = 'inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-3.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] no-underline transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]';
const ROW_CARD = 'flex items-center gap-3 rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] p-3.5 transition-colors hover:border-[var(--accent-primary)]';
const EMPTY_CARD = 'rounded-[16px] border-[1.5px] border-dashed border-[var(--h-bone-dark)] bg-[var(--h-white)] p-8 text-center';
const CHIP_BTN = 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] no-underline transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]';
const ICON_BADGE = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-[var(--h-bone-dark)]';

function SectionHeading({ icon, title, hint, tone }) {
    return (
        <div className="flex items-center gap-3">
            <span className={`${ICON_BADGE} ${tone}`}>
                {icon}
            </span>
            <div>
                <h2 className="font-ui text-xl font-bold text-[var(--text-primary)]">{title}</h2>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">{hint}</p>
            </div>
        </div>
    );
}

export default function Library() {
    const { collections, bookmarks, recentlyRead, deleteCollection, toggleBookmark, setNavHeaderTitle, addCollection } = useAppStore();
    const [newCollectionName, setNewCollectionName] = useState('');
    const [nameError, setNameError] = useState('');
    const collectionInputRef = useRef(null);

    useEffect(() => {
        setNavHeaderTitle('My Library');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const previewBookmarks = (bookmarks || []).slice(0, 3);
    const previewCollections = (collections || []).slice(0, 3);
    const previewRecent = (recentlyRead || []).slice(0, 3);
    const hasContent =
        (bookmarks && bookmarks.length > 0) ||
        (collections && collections.length > 0) ||
        (recentlyRead && recentlyRead.length > 0);

    const handleCreate = (e) => {
        e.preventDefault();
        const error = validateCollectionName(newCollectionName, {
            existingNames: (collections || []).map((c) => c.name),
        });
        if (error) {
            setNameError(error);
            return;
        }
        addCollection(newCollectionName.trim());
        setNewCollectionName('');
        setNameError('');
    };

    return (
        <div className="container pb-16">
            {hasContent && <PageTourModal tourId="library-tour" steps={libraryTourSteps} />}
            <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="mb-6">
                    <span className="block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Overview
                    </span>
                    <h1 className="font-ui text-[1.6rem] font-bold text-[var(--text-primary)]">My Library</h1>
                    <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">
                        Saved ayahs, custom collections and your recent reading — all in one place.
                    </p>
                </div>

                {/* ─── Bookmarks ─── */}
                <section id="bookmarks-section" className={`mb-6 ${CARD_SHELL}`}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <SectionHeading
                            icon={<Bookmark size={17} aria-hidden="true" />}
                            title="Bookmarks"
                            hint={`${(bookmarks || []).length} saved ${(bookmarks || []).length === 1 ? 'ayah' : 'ayahs'}`}
                            tone="bg-[var(--h-gold-soft)] text-[var(--h-gold)]"
                        />
                        <Link to="/bookmarks" aria-label="View all bookmarks" className={VIEW_ALL}>
                            View all <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                    </div>

                    {previewBookmarks.length === 0 ? (
                        <div className={EMPTY_CARD}>
                            <Bookmark size={28} className="mx-auto mb-3 text-[var(--accent-primary)] opacity-60" />
                            <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                                No bookmarks yet. While reading a surah, tap the bookmark icon in the toolbar to
                                save an ayah and it will appear here.
                            </p>
                            <Link to="/" className={`${CHIP_BTN} mt-4`}>
                                Start reading <ArrowRight size={13} aria-hidden="true" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                            {previewBookmarks.map((b) => {
                                const ayah = parseVerseKey(b.verseKey).ayahNumber;
                                const chapterId = b.chapterId || parseVerseKey(b.verseKey).chapterId;
                                return (
                                    <MotionDiv key={b.verseKey} layout className={ROW_CARD}>
                                        <Link
                                            to={`/surah/${chapterId}?verse=${b.verseKey}`}
                                            className="flex flex-1 items-center gap-3 no-underline text-inherit"
                                            aria-label={`Resume reading ${b.surahName} ayah ${ayah}`}
                                        >
                                            <span className={`${ICON_BADGE} bg-[var(--h-gold-soft)] text-[var(--h-gold)]`}>
                                                <Bookmark size={16} aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-ui text-[0.95rem] font-semibold text-[var(--text-primary)]">
                                                    {b.surahName}
                                                </span>
                                                <span className="block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                                    Ayah {ayah}
                                                </span>
                                            </span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => toggleBookmark(b.verseKey)}
                                            aria-label={`Remove bookmark for ${b.surahName} ayah ${ayah}`}
                                            className="btn-icon shrink-0 bg-[rgba(220,38,38,0.1)] text-[#dc2626]"
                                        >
                                            <Trash2 size={16} aria-hidden="true" />
                                        </button>
                                    </MotionDiv>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ─── Collections ─── */}
                <section id="collections-section" className={`mb-6 ${CARD_SHELL}`}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <SectionHeading
                            icon={<Folder size={17} aria-hidden="true" />}
                            title="Collections"
                            hint={`${(collections || []).length} ${(collections || []).length === 1 ? 'collection' : 'collections'}`}
                            tone="bg-[var(--h-teal-soft)] text-[var(--h-teal)]"
                        />
                        <Link to="/collections" aria-label="View all collections" className={VIEW_ALL}>
                            View all <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                    </div>

                    <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-start gap-2" noValidate>
                        <label className="sr-only" htmlFor="new-collection-name">New collection name</label>
                        <input
                            id="new-collection-name"
                            ref={collectionInputRef}
                            type="text"
                            placeholder="New collection name..."
                            value={newCollectionName}
                            onChange={(e) => {
                                setNewCollectionName(e.target.value);
                                if (nameError) setNameError('');
                            }}
                            aria-invalid={Boolean(nameError)}
                            aria-describedby={nameError ? 'new-collection-error' : undefined}
                            className="min-w-[220px] flex-1 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-3 font-ui text-[0.9rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)]"
                        />
                        <button type="submit" className="btn-primary flex cursor-pointer items-center gap-1.5 text-[0.9rem]">
                            <Plus size={16} aria-hidden="true" /> Create
                        </button>
                        {nameError && (
                            <p id="new-collection-error" role="alert" className="w-full text-[0.75rem] text-[#dc2626]">
                                {nameError}
                            </p>
                        )}
                    </form>

                    {previewCollections.length === 0 ? (
                        <div className={EMPTY_CARD}>
                            <FolderPlus size={32} className="mx-auto mb-3 text-[var(--accent-primary)] opacity-60" />
                            <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                                No collections yet. Group related ayahs together for focused hifdh or study —
                                name one above to get started.
                            </p>
                            <button type="button" onClick={() => collectionInputRef.current?.focus()} className={`${CHIP_BTN} mt-4`}>
                                <FolderPlus size={13} aria-hidden="true" /> Create your first collection
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                            {previewCollections.map((c) => {
                                const { verseCount, surahCount } = collectionStats(c);
                                return (
                                    <MotionDiv key={c.id} layout className={ROW_CARD}>
                                        <Link
                                            to={`/collections/${c.id}`}
                                            className="flex min-w-0 flex-1 items-center gap-3 no-underline text-inherit"
                                            aria-label={`Open collection ${c.name}`}
                                        >
                                            <span className={`${ICON_BADGE} bg-[var(--h-teal-soft)] text-[var(--h-teal)]`}>
                                                <Folder size={16} aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-ui text-[0.95rem] font-semibold text-[var(--text-primary)]">
                                                    {c.name}
                                                </span>
                                                <span className="block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                                    {verseCount} verses · {surahCount} surahs
                                                </span>
                                            </span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => deleteCollection(c.id)}
                                            aria-label={`Delete collection ${c.name}`}
                                            className="btn-icon shrink-0 bg-[rgba(220,38,38,0.1)] text-[#dc2626]"
                                        >
                                            <Trash2 size={16} aria-hidden="true" />
                                        </button>
                                    </MotionDiv>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ─── Recently Read ─── */}
                <section id="recent-section" className={CARD_SHELL}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <SectionHeading
                            icon={<History size={17} aria-hidden="true" />}
                            title="Recently Read"
                            hint={`${(recentlyRead || []).length} recent ${(recentlyRead || []).length === 1 ? 'surah' : 'surahs'}`}
                            tone="bg-[var(--h-teal-soft)] text-[var(--h-teal)]"
                        />
                        <Link to="/recent" aria-label="View all recently read surahs" className={VIEW_ALL}>
                            View all <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                    </div>

                    {previewRecent.length === 0 ? (
                        <div className={EMPTY_CARD}>
                            <BookOpen size={28} className="mx-auto mb-3 text-[var(--accent-primary)] opacity-60" />
                            <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                                Nothing here yet. Open any surah and your place is saved automatically, so you can
                                pick up right where you left off.
                            </p>
                            <Link to="/" className={`${CHIP_BTN} mt-4`}>
                                Browse the Quran <ArrowRight size={13} aria-hidden="true" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                            {previewRecent.map((item) => (
                                <Link
                                    key={item.chapterId}
                                    to={
                                        item.verseKey
                                            ? `/surah/${item.chapterId}?verse=${item.verseKey}`
                                            : `/surah/${item.chapterId}`
                                    }
                                    aria-label={`Resume reading ${item.chapterName}`}
                                    className="flex flex-col gap-1 rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] p-4 no-underline text-inherit transition-all duration-150 hover:-translate-y-px hover:border-[var(--h-teal)]"
                                >
                                    <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--h-teal-soft)] font-mono text-[0.72rem] font-bold text-[var(--h-teal)]">
                                        {item.chapterId}
                                    </span>
                                    <span className="truncate font-ui text-[0.95rem] font-semibold text-[var(--text-primary)]">
                                        {item.chapterName}
                                    </span>
                                    {item.verseKey && (
                                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                            Ayah {parseVerseKey(item.verseKey).ayahNumber}
                                        </span>
                                    )}
                                    <span className="text-[0.68rem] text-[var(--text-secondary)]">
                                        {timeAgo(item.timestamp)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </MotionDiv>
        </div>
    );
}
