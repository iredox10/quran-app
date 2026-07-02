import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Info, Moon, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function PageTourModal({ tourId, steps: initialSteps, pageId, visitThreshold = 1 }) {
    const { completedTours, completeTour, theme, pageVisitCounts } = useAppStore();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    
    const steps = React.useMemo(() => {
        if (tourId === 'home-tour' && theme === 'dark') {
            return [
                { title: "Night Mode Active 🌙", description: "Perfect for reading after Isha. Your eyes will thank you.", icon: Moon },
                ...initialSteps
            ];
        }
        return initialSteps;
    }, [initialSteps, tourId, theme]);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [modalHeight, setModalHeight] = useState(200);

    useEffect(() => {
        const isNotCompleted = completedTours && !completedTours.includes(tourId);
        const hasEnoughVisits = !pageId || (pageVisitCounts && pageVisitCounts[pageId] >= visitThreshold);
        
        if (isNotCompleted && hasEnoughVisits && steps && steps.length > 0) {
            const timer = setTimeout(() => setIsVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, [completedTours, tourId, steps, pageId, visitThreshold, pageVisitCounts]);

    const updateRect = () => {
        if (!isVisible || !steps || !steps[currentStep]) return;
        const step = steps[currentStep];
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                const rect = el.getBoundingClientRect();
                setTargetRect({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
            } else {
                setTargetRect(null);
            }
        } else {
            setTargetRect(null);
        }
    };

    useEffect(() => {
        if (!isVisible || !steps || !steps[currentStep]) return;
        const step = steps[currentStep];
        let retries = 0;
        let retryInterval = null;
        let timer = null;

        const findAndScroll = () => {
            if (step.target) {
                const el = document.querySelector(step.target);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    timer = setTimeout(updateRect, 400);
                    return true;
                }
                return false;
            } else {
                setTargetRect(null);
                return true;
            }
        };

        if (!findAndScroll() && step.target) {
            retryInterval = setInterval(() => {
                retries++;
                if (findAndScroll()) {
                    clearInterval(retryInterval);
                } else if (retries >= 5) {
                    clearInterval(retryInterval);
                    console.warn(`PageTourModal: Target not found: ${step.target}. Skipping step.`);
                    if (currentStep < steps.length - 1) {
                        setCurrentStep(prev => prev + 1);
                    } else {
                        setIsVisible(false);
                        completeTour(tourId);
                    }
                }
            }, 300);
        }

        return () => {
            if (retryInterval) clearInterval(retryInterval);
            if (timer) clearTimeout(timer);
        };
    }, [currentStep, isVisible, steps, tourId, completeTour]);

    useEffect(() => {
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
        };
    }, [currentStep, isVisible, steps]);

    useEffect(() => {
        if (!isVisible || !steps || !steps[currentStep]) return;
        const step = steps[currentStep];
        if (step.action && step.action.type === 'click' && step.action.target) {
            const handleActionClick = () => {
                if (currentStep < steps.length - 1) {
                    setCurrentStep((prev) => prev + 1);
                } else {
                    setIsVisible(false);
                    completeTour(tourId);
                }
            };
            
            // Try to find element immediately or retry if not found yet
            let retryInterval = null;
            const attachListener = () => {
                const el = document.querySelector(step.action.target);
                if (el) {
                    el.addEventListener('click', handleActionClick, { once: true });
                    return el;
                }
                return null;
            };

            let targetEl = attachListener();
            if (!targetEl) {
                let retries = 0;
                retryInterval = setInterval(() => {
                    retries++;
                    targetEl = attachListener();
                    if (targetEl || retries >= 10) clearInterval(retryInterval);
                }, 300);
            }

            return () => {
                if (retryInterval) clearInterval(retryInterval);
                if (targetEl) targetEl.removeEventListener('click', handleActionClick);
            };
        }
    }, [currentStep, isVisible, steps, tourId, completeTour]);

    if (!isVisible || !steps || steps.length === 0) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        completeTour(tourId);
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            handleDismiss();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const renderOverlay = () => {
        if (!targetRect) {
            return <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-all duration-500" />;
        }

        const { top, left, width, height } = targetRect;
        const pad = 10;
        const t = Math.max(0, top - pad);
        const l = Math.max(0, left - pad);
        const w = width + pad * 2;
        const h = height + pad * 2;

        const polygon = `polygon(0% 0%, 0% 100%, ${l}px 100%, ${l}px ${t}px, ${l+w}px ${t}px, ${l+w}px ${t+h}px, ${l}px ${t+h}px, ${l}px 100%, 100% 100%, 100% 0%)`;

        return (
            <div 
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-all duration-500 pointer-events-auto"
                style={{
                    WebkitClipPath: polygon,
                    clipPath: polygon
                }}
            />
        );
    };

    const getModalStyle = () => {
        if (!targetRect) {
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        const { top, left, width, height } = targetRect;
        const modalWidth = 320; 
        const pad = 10;
        
        let modalTop = top + height + pad + 16;
        let modalLeft = left + (width / 2) - (modalWidth / 2);
        
        if (modalTop + modalHeight > window.innerHeight) {
            modalTop = top - pad - modalHeight - 16;
        }
        
        if (modalTop < 16) {
            modalTop = 16;
        }

        if (modalLeft < 16) {
            modalLeft = 16;
        } else if (modalLeft + modalWidth > window.innerWidth - 16) {
            modalLeft = window.innerWidth - modalWidth - 16;
        }
        
        return {
            top: modalTop,
            left: modalLeft,
            position: 'fixed'
        };
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {renderOverlay()}
                    
                    <motion.div
                        initial={targetRect ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 50, scale: 0.95 }}
                        animate={targetRect ? { opacity: 1, scale: 1, ...getModalStyle() } : { opacity: 1, y: '-50%', x: '-50%', scale: 1, ...getModalStyle() }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed z-[65] w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#2D2D2A] rounded-2xl shadow-2xl border border-slate-100 dark:border-[rgba(255,255,255,0.05)] overflow-hidden"
                        ref={(el) => { if (el) setModalHeight(el.getBoundingClientRect().height); }}
                    >
                        <div className="p-5 relative min-h-[140px]">
                            <button
                                onClick={handleDismiss}
                                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
                                aria-label="Close tour"
                            >
                                <X size={18} />
                            </button>
                            
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center gap-3 mb-3 text-emerald-600 dark:text-[#C6A87C]">
                                        {(() => {
                                            const Icon = steps[currentStep].icon;
                                            return Icon ? (
                                                typeof Icon === 'string' ? (
                                                    <span className="text-xl shrink-0">{Icon}</span>
                                                ) : (
                                                    <Icon size={20} className="shrink-0" />
                                                )
                                            ) : (
                                                <Info size={20} className="shrink-0" />
                                            );
                                        })()}
                                        <h3 className="font-semibold text-slate-900 dark:text-[#EFECE4] leading-tight pr-6">
                                            {steps[currentStep].title}
                                        </h3>
                                    </div>
                                    
                                    {steps[currentStep].image && (
                                        <div className="mb-3 rounded-lg overflow-hidden border border-slate-100 dark:border-[rgba(255,255,255,0.05)]">
                                            <img src={steps[currentStep].image} alt={steps[currentStep].title} className="w-full h-auto object-cover" />
                                        </div>
                                    )}

                                    {Array.isArray(steps[currentStep].description) ? (
                                        <ul className="text-sm text-slate-600 dark:text-[#B0ABA5] leading-relaxed space-y-1.5 list-disc pl-4">
                                            {steps[currentStep].description.map((desc, i) => (
                                                <li key={i}>{desc}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-600 dark:text-[#B0ABA5] leading-relaxed">
                                            {steps[currentStep].description}
                                        </p>
                                    )}

                                    {steps[currentStep].link && (
                                        <button 
                                            onClick={() => {
                                                completeTour(tourId);
                                                setIsVisible(false);
                                                navigate(steps[currentStep].link);
                                            }}
                                            className="mt-3 flex w-max cursor-pointer items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-[0.75rem] font-bold text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                        >
                                            Go there <ArrowRight size={14} />
                                        </button>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#1A1A18] p-4 flex items-center justify-between border-t border-slate-100 dark:border-[rgba(255,255,255,0.05)]">
                            <div className="flex gap-1.5">
                                {steps.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={clsx(
                                            "h-1.5 rounded-full transition-all duration-300",
                                            idx === currentStep ? "w-4 bg-emerald-500 dark:bg-[#C6A87C]" : "w-1.5 bg-slate-300 dark:bg-[#4A4A45]"
                                        )}
                                    />
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {currentStep > 0 ? (
                                    <button
                                        onClick={handlePrev}
                                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-[#EFECE4] transition-colors"
                                        aria-label="Previous step"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleDismiss}
                                        className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-[#EFECE4] transition-colors"
                                    >
                                        Skip Tour
                                    </button>
                                )}
                                
                                {steps[currentStep].action?.type === 'click' ? (
                                    <div className="px-3 py-1.5 bg-emerald-100 dark:bg-[#C6A87C]/20 text-emerald-700 dark:text-[#C6A87C] text-xs font-medium rounded-lg border border-emerald-200 dark:border-[#C6A87C]/30 animate-pulse">
                                        Tap highlighted area
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-[#C6A87C] dark:hover:bg-[#b08f5c] dark:text-[#1A1A18] text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {currentStep < steps.length - 1 ? (
                                            <>
                                                Next
                                                <ChevronRight size={16} />
                                            </>
                                        ) : (
                                            "Finish"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
