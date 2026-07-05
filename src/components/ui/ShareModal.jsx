import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Sparkles, Flame, Clock, BarChart3, BookOpen } from 'lucide-react';
import { toBlob } from 'html-to-image';

export default function ShareModal({ isOpen, onClose, type, data }) {
    const cardRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    if (!isOpen) return null;

    const handleAction = async (actionType) => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            // Wait a tick for fonts to be perfectly ready if needed, though they usually are
            await new Promise(res => setTimeout(res, 100));
            const blob = await toBlob(cardRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#004d40', // Match our dark teal gradient top color
                style: { margin: 0 } // Ensure no weird margins in the output
            });

            if (actionType === 'share' && navigator.canShare) {
                const file = new File([blob], `quran-app-${type}.png`, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Quran Nur',
                        text: type === 'verse' ? 'Verse of the Day from Quran Nur' : "My Quran Reading Progress!"
                    });
                } else {
                    downloadBlob(blob);
                }
            } else {
                downloadBlob(blob);
                setDownloaded(true);
                setTimeout(() => setDownloaded(false), 2000);
            }
        } catch (error) {
            console.error('Failed to generate image', error);
            alert('Something went wrong while generating the image.');
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadBlob = (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quran-app-${type}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderCardContent = () => {
        if (type === 'verse') {
            return (
                <div className="flex flex-col h-full justify-center relative z-10 pt-2 pb-4">
                    <div className="mb-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-[1.5px] bg-[#B8924A]/60" />
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-[#B8924A]">Verse of the Day</span>
                    </div>
                    <div className="font-arabic text-center text-[clamp(1.4rem,6vw,1.8rem)] leading-[2.1] text-white mb-6" dir="rtl">
                        {data?.arabic}
                    </div>
                    <div className="text-center text-[0.9rem] italic leading-[1.65] text-white/90 mb-6 font-body px-1">
                        "{data?.translation}"
                    </div>
                    <div className="text-center font-mono text-[0.65rem] text-[#B8924A] tracking-widest mt-auto">
                        — {data?.ref} —
                    </div>
                </div>
            );
        }

        if (type === 'progress') {
            return (
                <div className="flex flex-col h-full justify-center relative z-10 py-4">
                    <div className="mb-8 text-center">
                        <div className="w-12 h-[1.5px] bg-[#B8924A]/60 mx-auto mb-3" />
                        <h3 className="font-ui text-[1.25rem] font-bold text-white tracking-[0.08em] mb-1.5 uppercase">Reading Progress</h3>
                        <p className="font-body text-[0.85rem] text-[#B8924A] italic">Consistent steps on the path of knowledge.</p>
                    </div>
                    <div className="flex gap-2.5 mb-2.5">
                        <div className="flex-1 rounded-[14px] bg-white/5 border border-white/10 p-4 text-center backdrop-blur-sm">
                            <div className="mb-1.5 flex justify-center"><Flame size={20} className="text-[#B8924A]" /></div>
                            <div className="font-ui text-2xl font-bold text-white">{data?.streak}</div>
                            <div className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/60 mt-1">Day Streak</div>
                        </div>
                        <div className="flex-1 rounded-[14px] bg-white/5 border border-white/10 p-4 text-center backdrop-blur-sm">
                            <div className="mb-1.5 flex justify-center"><Clock size={20} className="text-[#B8924A]" /></div>
                            <div className="font-ui text-2xl font-bold text-white">{data?.todayMinutes}</div>
                            <div className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/60 mt-1">Mins Today</div>
                        </div>
                    </div>
                    <div className="rounded-[14px] bg-white/5 border border-white/10 p-4 text-center backdrop-blur-sm">
                        <div className="mb-1.5 flex justify-center"><BarChart3 size={20} className="text-[#B8924A]" /></div>
                        <div className="font-ui text-2xl font-bold text-white">{data?.totalHours}</div>
                        <div className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/60 mt-1">Total Hours Read</div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-[rgba(15,23,21,0.85)] backdrop-blur-md cursor-pointer"
                />

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-[380px] flex flex-col gap-4 z-10 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
                >
                    {/* The Card to be captured */}
                    <div 
                        ref={cardRef}
                        className="w-full min-h-[420px] bg-gradient-to-br from-[#004d40] to-[#002620] rounded-[24px] relative shadow-[0_16px_40px_rgba(0,0,0,0.4)] p-6 md:p-8 flex flex-col border border-[#B8924A]/20"
                    >
                        {/* Decorative Background Elements */}
                        <img src="/logo-192.png" className="absolute -top-10 -right-10 w-56 h-56 opacity-[0.03] pointer-events-none" alt="" />
                        <div className="absolute inset-2.5 rounded-[18px] border border-[#B8924A]/10 pointer-events-none" />
                        
                        <div className="flex-1 flex flex-col relative z-10">
                            {renderCardContent()}
                        </div>

                        {/* Footer / Branding */}
                        <div className="mt-4 pt-4 border-t border-[#B8924A]/20 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <img src="/logo-192.png" alt="Quran Nur Logo" className="w-5 h-5 object-contain opacity-90" />
                                <span className="font-ui font-bold text-white text-xs uppercase tracking-[0.1em]">Quran Nur</span>
                            </div>
                            <span className="font-mono text-[0.55rem] tracking-[0.15em] text-[#B8924A] uppercase">quranapp.com</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-2">
                        <button 
                            onClick={onClose}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 backdrop-blur-md border border-white/10"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="flex flex-1 gap-2 bg-white/10 p-1.5 rounded-full backdrop-blur-md border border-white/10">
                            <button
                                onClick={() => handleAction('download')}
                                disabled={isGenerating}
                                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white text-[#2B3F3C] py-2.5 text-sm font-semibold transition-all hover:bg-white/90 disabled:opacity-70"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : (downloaded ? <Sparkles size={16} /> : <Download size={16} />)}
                                {downloaded ? 'Saved!' : 'Save Image'}
                            </button>
                            
                            {navigator.canShare && (
                                <button
                                    onClick={() => handleAction('share')}
                                    disabled={isGenerating}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#B8924A] text-white py-2.5 text-sm font-semibold transition-all hover:bg-[#a3803e] disabled:opacity-70"
                                >
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                                    Share
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
