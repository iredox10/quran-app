import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle2, ChevronRight, Trophy, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const ALL_TOURS = [
    { id: 'home-tour', label: 'Home Page', icon: '🏠', path: '/' },
    { id: 'surah-tour', label: 'Reading & Audio', icon: '📖', path: '/surah/1' },
    { id: 'memorization-tour', label: 'Hifdh Mode', icon: '🧠', path: '/memorize/1' },
    { id: 'planner-tour', label: 'Study Planner', icon: '📅', path: '/planner' },
    { id: 'library-tour', label: 'Library', icon: '📚', path: '/library' }
];

export default function OnboardingProgress() {
    const { completedTours } = useAppStore();
    const [isDismissed, setIsDismissed] = useState(false);

    const completedCount = ALL_TOURS.filter(t => completedTours?.includes(t.id)).length;
    const isFullyCompleted = completedCount === ALL_TOURS.length;
    
    // Auto-dismiss if fully completed
    React.useEffect(() => {
        if (isFullyCompleted) {
            const timer = setTimeout(() => setIsDismissed(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [isFullyCompleted]);

    if (isDismissed || (isFullyCompleted && completedTours?.length > 0)) return null;

    const progressPct = (completedCount / ALL_TOURS.length) * 100;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-8 relative overflow-hidden rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 shadow-[0_8px_32px_rgba(43,63,60,0.05)]"
        >
            {/* Elegant Background Watermark */}
            <img src="/logo-192.png" className="absolute -right-8 -top-8 w-48 h-48 opacity-[0.03] pointer-events-none" alt="" />

            <button 
                onClick={() => setIsDismissed(true)} 
                className="absolute right-4 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--h-ink-muted)] shadow-sm transition-colors hover:text-[var(--h-ink)] border border-[var(--h-bone)]"
            >
                <X size={14} />
            </button>
            
            <div className="relative z-10 flex flex-col gap-1 mb-6">
                <h3 className="font-ui text-[1.25rem] font-bold text-[var(--h-ink)] tracking-tight">Welcome to Quran Nur</h3>
                <p className="font-body text-[0.85rem] text-[var(--h-ink-mid)]">{completedCount} of {ALL_TOURS.length} steps completed</p>
            </div>

            <div className="relative z-10 mb-6">
                <div className="h-[4px] w-full rounded-full bg-[var(--h-bone-dark)] overflow-hidden">
                    <motion.div 
                        className="h-full rounded-full bg-gradient-to-r from-[var(--h-teal)] to-[#B8924A]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
            </div>

            <div className="relative z-10 flex flex-col gap-1">
                {ALL_TOURS.map((tour, idx) => {
                    const isCompleted = completedTours?.includes(tour.id);
                    return (
                        <Link 
                            key={tour.id} 
                            to={tour.path}
                            className="group flex items-center justify-between rounded-2xl p-2.5 transition-colors hover:bg-white/60 no-underline"
                        >
                            <div className="flex items-center gap-4">
                                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white shadow-[0_2px_8px_rgba(43,63,60,0.04)] text-base transition-transform group-hover:scale-105">
                                    {tour.icon}
                                </span>
                                <span className={`font-ui text-[0.95rem] font-semibold transition-colors ${
                                    isCompleted ? 'text-[var(--h-ink-muted)] opacity-60' : 'text-[var(--h-ink)] group-hover:text-[var(--h-teal)]'
                                }`}>
                                    {tour.label}
                                </span>
                            </div>
                            {isCompleted ? (
                                <CheckCircle2 size={18} className="text-[#B8924A] opacity-80" />
                            ) : (
                                <ChevronRight size={16} className="text-[var(--h-ink-muted)] opacity-40 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </motion.div>
    );
}
