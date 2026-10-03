import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Folder, History, Search, SearchX, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { normalizeQuery, parseVerseKey, timeAgo } from '../utils/library';
import AddToCollectionModal from '../components/library/AddToCollectionModal';

const FOCUSABLE =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--h-cream)]';

const ICON_BTN = `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-transparent text-[var(--text-secondary)] transition-colors hover:border-[var(--h-bone-dark)] hover:bg-[var(--h-bone)] hover:text-[var(--text-primary)] ${FOCUSABLE}`;

function RecentRow({ item, onSave, onRemove }) {
    const { ayahNumber } = parseVerseKey(item.verseKey);
    const href = item.verseKey ? `/surah/${item.chapterId}?verse=${item.verseKey}` : `/surah/${item.chapterId}`;
    const name = item.chapterName || `Surah ${item.chapterId}`;
    const resumeLabel = item.verseKey && ayahNumber !== null ? `Resume at verse ${ayahNumber}` : 'From the beginning';

    return (
        <div className="flex items-center gap-1.5 rounded-[16px] border-[1.5px] border-transparent bg-[var(--h-white)] px-3 py-2.5 transition-colors hover:border-[var(--h-bone-dark)] md:px-4">
            <Link
                to={href}
                aria-label={`Open ${name} — ${resumeLabel}`}
                className={`group flex min-w-0 flex-1 items-center gap-3 rounded-[12px] px-1 py-1 no-underline text-inherit ${FOCUSABLE}`}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--h-teal-soft)] font-mono text-[0.8rem] font-bold text-[var(--h-teal)]">
                    {item.chapterId}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate font-ui text-[1rem] font-bold text-[var(--text-primary)]">{name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        <span>{resumeLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{timeAgo(item.timestamp)}</span>
                    </div>
                </div>
                <ArrowRight
                    size={16}
                    className="shrink-0 text-[var(--text-secondary)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--accent-primary)]"
                />
            </Link>
            {item.verseKey && (
                <button
                    type="button"
                    onClick={() => onSave(item)}
                    aria-label={`Save ${name} resume point to a collection`}
                    className={ICON_BTN}
                >
                    <Folder size={16} />
                </button>
            )}
            <button
                type="button"
                onClick={() => onRemove(item.chapterId)}
                aria-label={`Remove ${name} from reading history`}
                className={ICON_BTN}
            >
                <X size={16} />
            </button>
        </div>
    );
}

export default function RecentSurahs() {
    const { recentlyRead, removeRecentlyRead, clearRecentlyRead, confirm, setNavHeaderTitle } = useAppStore();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [modalVerse, setModalVerse] = useState(null);

    useEffect(() => {
        setNavHeaderTitle('Recently Read');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const items = useMemo(() => recentlyRead || [], [recentlyRead]);

    const filtered = useMemo(() => {
        const q = normalizeQuery(query);
        if (!q) return items;
        return items.filter((item) => {
            const name = String(item.chapterName || '').toLowerCase();
            if (name.includes(q)) return true;
            return q === String(item.chapterId) || q === `surah ${item.chapterId}` || q === `surah${item.chapterId}`;
        });
    }, [items, query]);

    const uniqueSurahs = useMemo(() => new Set(items.map((i) => i.chapterId)).size, [items]);
    const lastOpenedAt = items[0]?.timestamp ?? null;
    const trimmedQuery = query.trim();

    const handleBack = useCallback(() => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/');
    }, [navigate]);

    const handleClearAll = useCallback(async () => {
        const ok = await confirm('Clear your reading history?');
        if (ok) clearRecentlyRead();
    }, [confirm, clearRecentlyRead]);

    const handleSave = useCallback((item) => {
        if (!item?.verseKey) return;
        setModalVerse({
            verseKey: item.verseKey,
            surahName: item.chapterName || `Surah ${item.chapterId}`,
            chapterId: item.chapterId,
        });
    }, []);

    const handleRemove = useCallback((chapterId) => removeRecentlyRead(chapterId), [removeRecentlyRead]);

    const renderBody = () => {
        if (items.length === 0) {
            return (
                <div className="py-14 text-center">
                    <BookOpen size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                    <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">Nothing read yet</h3>
                    <p className="mx-auto max-w-[380px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                        Surahs you open will appear here so you can pick up right where you left off.
                    </p>
                    <Link
                        to="/"
                        className={`mt-5 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--accent-primary)] bg-[var(--accent-primary)] px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-widest text-white no-underline transition-colors hover:bg-[var(--accent-hover)] hover:text-white ${FOCUSABLE}`}
                    >
                        <BookOpen size={13} /> Start reading
                    </Link>
                </div>
            );
        }
        if (filtered.length === 0 && trimmedQuery) {
            return (
                <div className="py-14 text-center">
                    <SearchX size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                    <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                        No results for &ldquo;{trimmedQuery}&rdquo;
                    </h3>
                    <p className="mx-auto max-w-[380px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                        Try a different surah name or number.
                    </p>
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className={`mt-5 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] ${FOCUSABLE}`}
                    >
                        <X size={13} /> Clear search
                    </button>
                </div>
            );
        }
        return (
            <div className="flex flex-col gap-2.5">
                {filtered.map((item) => (
                    <RecentRow key={item.chapterId} item={item} onSave={handleSave} onRemove={handleRemove} />
                ))}
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-[1200px] px-4 pb-20 text-[var(--text-primary)]">
            <div className="pt-6">
                <button
                    type="button"
                    onClick={handleBack}
                    className={`mb-4 inline-flex items-center gap-1.5 rounded-full font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)] ${FOCUSABLE}`}
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div className="mb-6 text-center">
                    <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Reading History
                    </span>
                    <h1 className="font-ui text-[1.75rem] font-bold text-[var(--text-primary)]">Recently Read</h1>
                    <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">
                        Jump back into any surah — resume at the exact verse you left.
                    </p>
                </div>

                <div className="mb-6 rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:max-w-md">
                            <div className="rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-3">
                                <div className="font-ui text-[1.2rem] font-bold leading-none text-[var(--text-primary)]">
                                    {uniqueSurahs}
                                </div>
                                <div className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                    {uniqueSurahs === 1 ? 'Surah' : 'Surahs'}
                                </div>
                            </div>
                            <div className="rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-3">
                                <div className="font-ui text-[1.2rem] font-bold leading-none text-[var(--text-primary)]">
                                    {lastOpenedAt ? timeAgo(lastOpenedAt) : '—'}
                                </div>
                                <div className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                    Last opened
                                </div>
                            </div>
                        </div>

                        {items.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                aria-label="Clear all reading history"
                                className={`inline-flex w-fit items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[#dc2626] hover:text-[#dc2626] ${FOCUSABLE}`}
                            >
                                <Trash2 size={13} /> Clear all
                            </button>
                        )}
                    </div>

                    <div className="relative w-full">
                        <Search
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Filter by surah name..."
                            aria-label="Filter recently read surahs"
                            className="w-full rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] py-2.5 pl-11 pr-10 font-ui text-[0.9rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)]"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label="Clear filter"
                                className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--h-bone)] hover:text-[var(--text-primary)] ${FOCUSABLE}`}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="mb-4 flex items-baseline justify-between px-1">
                        <div className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            <History size={13} /> History
                        </div>
                        <div className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
                        </div>
                    </div>
                    {renderBody()}
                </div>
            </div>

            <AddToCollectionModal
                open={modalVerse !== null}
                verse={modalVerse}
                onClose={() => setModalVerse(null)}
                onAdded={() => setModalVerse(null)}
            />
        </div>
    );
}
