import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { HelpCircle } from 'lucide-react';

export default function ConfirmModal() {
    const { globalConfirm, resolveConfirm } = useAppStore();

    return (
        <AnimatePresence>
            {globalConfirm !== null && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => resolveConfirm(false)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-sm rounded-3xl bg-[var(--h-cream)] p-6 shadow-2xl border border-[var(--h-bone-dark)] overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--h-teal)] opacity-5 blur-[40px] rounded-full pointer-events-none" />
                        
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--h-gold)]/10 text-[var(--h-gold)]">
                                <HelpCircle size={28} strokeWidth={2.5} />
                            </div>
                            
                            <h3 className="mb-2 font-[var(--font-ui)] text-xl font-bold text-[var(--h-ink)]">
                                Are you sure?
                            </h3>
                            
                            <p className="text-[0.95rem] text-[var(--h-ink-mid)] leading-relaxed mb-6 px-2">
                                {globalConfirm.message}
                            </p>
                            
                            <div className="flex w-full gap-3">
                                <button
                                    onClick={() => resolveConfirm(false)}
                                    className="flex-1 rounded-xl bg-[var(--h-bone)] px-4 py-3.5 font-bold text-[var(--h-ink-mid)] transition-all hover:bg-[var(--h-bone-dark)] active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => resolveConfirm(true)}
                                    className="flex-1 rounded-xl bg-[var(--h-teal)] px-4 py-3.5 font-bold text-white transition-all hover:bg-[var(--h-teal-mid)] active:scale-95 shadow-md"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
