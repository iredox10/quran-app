import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { X, Hand } from 'lucide-react';

export default function GestureTip({ id, title, description, animation = 'swipe-left' }) {
    const { dismissedGestureTips, dismissGestureTip } = useAppStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!dismissedGestureTips?.includes(id)) {
            const timer = setTimeout(() => setIsVisible(true), 2000); // show after 2s
            return () => clearTimeout(timer);
        }
    }, [id, dismissedGestureTips]);

    if (!isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        dismissGestureTip(id);
    };

    const getAnimationVariants = () => {
        if (animation === 'swipe-left') {
            return {
                initial: { x: 20, opacity: 0 },
                animate: { 
                    x: [20, -20, 20], 
                    opacity: [0.5, 1, 0.5], 
                    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } 
                }
            };
        }
        if (animation === 'swipe-right') {
            return {
                initial: { x: -20, opacity: 0 },
                animate: { 
                    x: [-20, 20, -20], 
                    opacity: [0.5, 1, 0.5], 
                    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } 
                }
            };
        }
        if (animation === 'double-tap') {
             return {
                initial: { scale: 0.8, opacity: 0 },
                animate: { 
                    scale: [1, 0.8, 1, 0.8, 1], 
                    opacity: 1, 
                    transition: { repeat: Infinity, duration: 1.5 } 
                }
            };
        }
        return { initial: { opacity: 0 }, animate: { opacity: 1 } };
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 50, x: '-50%' }}
                className="fixed bottom-24 left-1/2 z-50 w-[90%] max-w-sm bg-slate-900/95 dark:bg-[#1A1A18]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-4"
            >
                <button 
                    onClick={handleDismiss} 
                    className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                >
                    <X size={16} />
                </button>
                <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white overflow-hidden">
                        <motion.div {...getAnimationVariants()}>
                            <Hand size={24} className="opacity-80" />
                        </motion.div>
                    </div>
                    <div className="flex-1 pr-4">
                        <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
                        <p className="text-white/70 text-xs leading-relaxed">{description}</p>
                    </div>
                </div>
                <button 
                    onClick={handleDismiss}
                    className="w-full mt-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl transition-colors"
                >
                    Got it
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
