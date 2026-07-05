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
            className="mb-6 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-[#C6A87C] dark:to-[#8c7450] p-1 shadow-lg"
        >
            <div className="bg-white dark:bg-[#1A1A18] rounded-[16px] p-5 relative overflow-hidden">
                <button 
                    onClick={() => setIsDismissed(true)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-[#EFECE4] transition-colors"
                >
                    <X size={16} />
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-[#C6A87C]/20 flex items-center justify-center text-emerald-600 dark:text-[#C6A87C]">
                        <img src="/logo-192.png" alt="Quran App Logo" className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-[#EFECE4] text-base leading-tight">Getting Started</h3>
                        <p className="text-xs text-slate-500 dark:text-[#B0ABA5] font-medium">{completedCount} of {ALL_TOURS.length} tours completed</p>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-emerald-500 dark:bg-[#C6A87C] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    {ALL_TOURS.map(tour => {
                        const isCompleted = completedTours?.includes(tour.id);
                        return (
                            <Link 
                                key={tour.id} 
                                to={tour.path}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                    isCompleted 
                                        ? 'border-emerald-100 dark:border-white/5 bg-emerald-50/50 dark:bg-white/5' 
                                        : 'border-slate-100 dark:border-white/10 hover:border-emerald-200 dark:hover:border-[#C6A87C]/50 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{tour.icon}</span>
                                    <span className={`text-sm font-semibold ${isCompleted ? 'text-emerald-700 dark:text-[#C6A87C]' : 'text-slate-700 dark:text-[#EFECE4]'}`}>
                                        {tour.label}
                                    </span>
                                </div>
                                {isCompleted ? (
                                    <CheckCircle2 size={18} className="text-emerald-500 dark:text-[#C6A87C]" />
                                ) : (
                                    <ChevronRight size={16} className="text-slate-400" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
