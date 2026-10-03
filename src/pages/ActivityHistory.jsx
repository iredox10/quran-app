import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, X, BookOpen, Layers, Target, Headphones, History, SearchX } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getChapters } from '../services/api/quranApi';
import PeriodTabs from '../components/progress/PeriodTabs';
import { HISTORY_TABS, TYPE_META, summarize, formatDuration, rangeTitle } from '../utils/activity';
import { filterSessions, groupSessionsByDay, sessionTime } from '../utils/historyFilter';

const MAX_ROWS = 100;

const TYPE_ICONS = {
    reading: BookOpen,
    memorizing: Layers,
    pomodoro: Target,
    listening: Headphones,
};

const FALLBACK_META = { label: 'Session', color: '#c6a87c' };

function SessionRow({ session, resolveChapter }) {
    const meta = TYPE_META[session.type] || FALLBACK_META;
    const Icon = TYPE_ICONS[session.type] || BookOpen;
    const chapter = session.chapterId ? resolveChapter(session.chapterId) : null;

    let title = meta.label;
    if (session.chapterId !== undefined && session.chapterId !== null && session.chapterId !== '') {
        const surahName = chapter ? (chapter.name_simple || chapter.name_arabic) : null;
        title += ` · ${surahName || `Surah ${session.chapterId}`}`;
    }

    const timeLabel = session.timestamp
        ? new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Logged';

    return (
        <div className="group flex gap-4">
            <div
                className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--h-cream)] shadow-sm"
                style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
            >
                <Icon size={14} />
            </div>
            <div className="flex flex-1 items-center justify-between rounded-[16px] border-[1.5px] border-transparent bg-[var(--h-white)] px-4 py-2 transition-colors group-hover:border-[var(--h-bone-dark)] group-hover:bg-[var(--h-bone)]">
                <div>
                    <div className="font-ui text-[0.95rem] font-bold text-[var(--text-primary)]">{title}</div>
                    <div className="mt-0.5 font-mono text-[0.65rem] text-[var(--text-secondary)]">{timeLabel}</div>
                </div>
                <div className="font-ui text-[0.9rem] font-bold text-[var(--text-secondary)]">
                    {formatDuration(session.duration)}
                </div>
            </div>
        </div>
    );
}

export default function ActivityHistory() {
    const { setNavHeaderTitle, readingSessions } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('Activity History');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const sessions = useMemo(() => readingSessions || [], [readingSessions]);
    const now = useMemo(() => new Date(), []);
    const [range, setRange] = useState('week');
    const [query, setQuery] = useState('');

    const { data: chapters = [] } = useQuery({ queryKey: ['chapters'], queryFn: getChapters, staleTime: Infinity });

    const resolveChapter = useCallback(
        (chapterId) => chapters.find((c) => String(c.id) === String(chapterId)) || null,
        [chapters]
    );

    const filtered = useMemo(
        () => filterSessions(sessions, { range, query, chapterNameResolver: resolveChapter, now }),
        [sessions, range, query, resolveChapter, now]
    );
    const groups = useMemo(() => groupSessionsByDay(filtered, now), [filtered, now]);
    const stats = useMemo(() => summarize(filtered), [filtered]);

    const trimmedQuery = query.trim();
    const hasAnyActivity = sessions.length > 0;
    const hasResults = filtered.length > 0;
    const capped = filtered.length > MAX_ROWS;

    const visibleGroups = useMemo(() => {
        if (!capped) return groups;
        let remaining = MAX_ROWS;
        const out = [];
        for (const group of groups) {
            if (remaining <= 0) break;
            const take = Math.min(group.sessions.length, remaining);
            remaining -= take;
            out.push(take === group.sessions.length ? group : { ...group, sessions: group.sessions.slice(0, take) });
        }
        return out;
    }, [groups, capped]);

    const summaryChips = [
        { label: 'Total time', value: formatDuration(stats.seconds) },
        { label: 'Sessions', value: String(stats.count) },
        { label: 'Active days', value: String(stats.activeDays) },
    ];

    const renderBody = () => {
        if (!hasAnyActivity) {
            return (
                <div className="py-14 text-center">
                    <History size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                    <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">No activity yet</h3>
                    <p className="mx-auto max-w-[380px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                        Reading, memorizing, focus and listening sessions you log will show up here.
                    </p>
                </div>
            );
        }
        if (!hasResults && trimmedQuery) {
            return (
                <div className="py-14 text-center">
                    <SearchX size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                    <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                        No results for &ldquo;{trimmedQuery}&rdquo;
                    </h3>
                    <p className="mx-auto max-w-[380px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                        Try a different surah name or activity type.
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
        if (!hasResults) {
            return (
                <div className="py-14 text-center">
                    <Search size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
                    <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">No activity in this period</h3>
                    <p className="mx-auto max-w-[380px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
                        Pick another range above or check All Time.
                    </p>
                </div>
            );
        }
        return (
            <>
                {visibleGroups.map((group) => (
                    <section key={group.key} className="mb-5 last:mb-0">
                        <div className="mb-2 flex items-baseline justify-between px-1">
                            <h2 className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                {group.label}
                            </h2>
                            <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                                {formatDuration(group.totalSeconds)} · {group.sessions.length}{' '}
                                {group.sessions.length === 1 ? 'session' : 'sessions'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-3">
                            {group.sessions.map((session, i) => (
                                <SessionRow
                                    key={`${group.key}-${sessionTime(session)}-${i}`}
                                    session={session}
                                    resolveChapter={resolveChapter}
                                />
                            ))}
                        </div>
                    </section>
                ))}
                {capped && (
                    <div className="mt-4 rounded-[16px] border-[1.5px] border-dashed border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        Showing first {MAX_ROWS} of {filtered.length} sessions — refine your search to narrow it down
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="mx-auto max-w-[1200px] px-4 pb-20 text-[var(--text-primary)]">
            <div className="pt-6">
                <Link
                    to="/progress"
                    className="mb-4 inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)]"
                >
                    <ArrowLeft size={14} /> Back to Analytics
                </Link>

                <div className="mb-6 text-center">
                    <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Session Log
                    </span>
                    <h1 className="font-ui text-[1.75rem] font-bold text-[var(--text-primary)]">Activity History</h1>
                    <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">
                        Every reading, memorizing, focus and listening session — searchable.
                    </p>
                </div>

                <div className="mb-6 rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <PeriodTabs tabs={HISTORY_TABS} value={range} onChange={setRange} ariaLabel="Select history range" />
                        <div className="relative w-full md:w-80">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search surah or activity type..."
                                aria-label="Search activity"
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

                    <div className="grid grid-cols-3 gap-3">
                        {summaryChips.map((chip) => (
                            <div
                                key={chip.label}
                                className="rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-3"
                            >
                                <div className="font-ui text-[1.2rem] font-bold leading-none text-[var(--text-primary)]">
                                    {chip.value}
                                </div>
                                <div className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                    {chip.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="mb-4 flex items-baseline justify-between px-1">
                        <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            Sessions · {rangeTitle(range, now)}
                        </div>
                        <div className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
                        </div>
                    </div>
                    {renderBody()}
                </div>
            </div>
        </div>
    );
}
