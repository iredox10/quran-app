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
                backgroundColor: '#FAF7F0', // Match our --h-cream or paper color
                style: { margin: 0 } // Ensure no weird margins in the output
            });

            if (actionType === 'share' && navigator.canShare) {
                const file = new File([blob], `quran-app-${type}.png`, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Quran App',
                        text: type === 'verse' ? 'Verse of the Day from the Quran App' : "My Quran Reading Progress!"
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
                <div className="flex flex-col h-full justify-center">
                    <div className="mb-4 flex items-center justify-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#B8924A]">
                        <Sparkles size={14} /> Verse of the Day
                    </div>
                    <div className="font-arabic text-center text-[1.8rem] leading-[2.2] text-[#2B3F3C] mb-6" dir="rtl">
                        {data?.arabic}
                    </div>
                    <div className="text-center text-[0.95rem] italic leading-[1.6] text-[#4D5F5C] mb-6 font-body">
                        {data?.translation}
                    </div>
                    <div className="text-center font-mono text-[0.75rem] text-[#8E9B97]">
                        — {data?.ref}
                    </div>
                </div>
            );
        }

        if (type === 'progress') {
            return (
                <div className="flex flex-col h-full justify-center">
                    <div className="mb-8 text-center">
                        <h3 className="font-ui text-[1.5rem] font-bold text-[#2B3F3C] mb-1">My Reading Progress</h3>
                        <p className="font-body text-[0.9rem] text-[#8E9B97]">Consistent steps on the path of knowledge.</p>
                    </div>
                    <div className="flex gap-3 mb-6">
                        <div className="flex-1 rounded-[14px] bg-[#EDE8DA] border border-[#DDD7C7] p-4 text-center">
                            <div className="mb-2 flex justify-center"><Flame size={20} color="#ef4444" /></div>
                            <div className="font-ui text-2xl font-bold text-[#2B3F3C]">{data?.streak}</div>
                            <div className="font-mono text-[0.6rem] uppercase tracking-wider text-[#8E9B97] mt-1">Day Streak</div>
                        </div>
                        <div className="flex-1 rounded-[14px] bg-[#EDE8DA] border border-[#DDD7C7] p-4 text-center">
                            <div className="mb-2 flex justify-center"><Clock size={20} color="#2E4F4A" /></div>
                            <div className="font-ui text-2xl font-bold text-[#2B3F3C]">{data?.todayMinutes}</div>
                            <div className="font-mono text-[0.6rem] uppercase tracking-wider text-[#8E9B97] mt-1">Mins Today</div>
                        </div>
                    </div>
                    <div className="rounded-[14px] bg-[#EDE8DA] border border-[#DDD7C7] p-4 text-center">
                        <div className="mb-2 flex justify-center"><BarChart3 size={20} color="#B8924A" /></div>
                        <div className="font-ui text-2xl font-bold text-[#2B3F3C]">{data?.totalHours}</div>
                        <div className="font-mono text-[0.6rem] uppercase tracking-wider text-[#8E9B97] mt-1">Total Hours Read</div>
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
                    className="absolute inset-0 bg-[rgba(43,63,60,0.6)] backdrop-blur-sm cursor-pointer"
                />

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-[400px] flex flex-col gap-4 z-10"
                >
                    {/* The Card to be captured */}
                    <div 
                        ref={cardRef}
                        className="w-full aspect-[4/5] bg-[#FAF7F0] rounded-[24px] overflow-hidden relative shadow-xl p-8 flex flex-col"
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#2E4F4A] via-[#B8924A] to-[#2E4F4A]" />
                        <span className="pointer-events-none absolute -right-4 -top-6 select-none text-[8rem] opacity-[0.03] text-[#B8924A] font-arabic" aria-hidden="true">﷽</span>
                        
                        <div className="flex-1">
                            {renderCardContent()}
                        </div>

                        {/* Footer / Branding */}
                        <div className="mt-8 pt-4 border-t border-[#DDD7C7] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-[#2E4F4A] flex items-center justify-center">
                                    <BookOpen size={12} color="white" />
                                </div>
                                <span className="font-ui font-bold text-[#2B3F3C] text-sm">Quran App</span>
                            </div>
                            <span className="font-mono text-[0.6rem] text-[#8E9B97]">quranapp.com</span>
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
