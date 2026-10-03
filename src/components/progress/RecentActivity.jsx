import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../../services/api/quranApi';
import { History, BookOpen, Layers, Target, Headphones, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration } from '../../utils/activity';

export default function RecentActivity({ limit = 5 }) {
    const { readingSessions } = useAppStore();
    const sessions = readingSessions || [];

    const { data: chapters = [] } = useQuery({ queryKey: ['chapters'], queryFn: getChapters, staleTime: Infinity });

    const recentActivity = useMemo(() => {
        return [...sessions].sort((a, b) => {
            const timeA = a.timestamp || new Date(a.date).getTime();
            const timeB = b.timestamp || new Date(b.date).getTime();
            return timeB - timeA;
        }).slice(0, limit);
    }, [sessions, limit]);

    return (
        <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                    <History size={18} className="text-[var(--accent-primary)]" /> Recent Activity
                </div>
                <Link
                    to="/progress/activity"
                    aria-label="See all activity"
                    className="group inline-flex items-center gap-1 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                >
                    See all
                    <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>
            {recentActivity.length > 0 ? (
                <div className="flex flex-col relative before:absolute before:inset-y-2 before:left-[19px] before:w-0.5 before:bg-[var(--h-bone-dark)]">
                    {recentActivity.map((session, i) => {
                        const dateObj = new Date(session.timestamp || session.date + 'T00:00:00');
                        const timeLabel = session.timestamp ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged';
                        const dateLabel = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                        let icon = <BookOpen size={14} />;
                        let color = "text-[#10b981]";
                        let bg = "bg-[#10b981]/10";
                        let title = "Reading Session";

                        if (session.type === 'pomodoro') {
                            icon = <Target size={14} />;
                            color = "text-[#8b5cf6]";
                            bg = "bg-[#8b5cf6]/10";
                            title = "Focus Session";
                        } else if (session.type === 'memorizing') {
                            icon = <Layers size={14} />;
                            color = "text-[#3b82f6]";
                            bg = "bg-[#3b82f6]/10";
                            title = "Memorization";
                        } else if (session.type === 'listening') {
                            icon = <Headphones size={14} />;
                            color = "text-[#f59e0b]";
                            bg = "bg-[#f59e0b]/10";
                            title = "Listening";
                        }

                        if (session.chapterId) {
                            const chapter = chapters.find(c => c.id === parseInt(session.chapterId));
                            if (chapter) {
                                title += ` - ${chapter.name_simple}`;
                            } else {
                                title += ` - Surah ${session.chapterId}`;
                            }
                        }

                        return (
                            <div key={i} className="flex gap-4 relative py-3 group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-[1.5px] border-[var(--h-cream)] shadow-sm z-10 ${bg} ${color}`}>
                                    {icon}
                                </div>
                                <div className="flex-1 flex justify-between items-center bg-[var(--h-white)] px-4 py-2 rounded-[16px] group-hover:bg-[var(--h-bone)] transition-colors border-[1.5px] border-transparent group-hover:border-[var(--h-bone-dark)]">
                                    <div>
                                        <div className="font-ui text-[0.95rem] font-bold text-[var(--text-primary)]">{title}</div>
                                        <div className="font-mono text-[0.65rem] text-[var(--text-secondary)] mt-0.5">{dateLabel} • {timeLabel}</div>
                                    </div>
                                    <div className="font-ui font-bold text-[0.9rem] text-[var(--text-secondary)]">
                                        {formatDuration(session.duration)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-8 text-center text-[0.85rem] text-[var(--text-secondary)]">No recent activity found.</div>
            )}
        </div>
    );
}
