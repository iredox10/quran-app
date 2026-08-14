import React, { useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Sparkles, Flame, Clock, BarChart3, BookOpen } from 'lucide-react';
import { toBlob } from 'html-to-image';

export default function ShareModal({ isOpen, onClose, type, data }) {
    const cardRef = useRef(null);
    const verseArabicRef = useRef(null);
    const verseTranslationRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [verseArabicSize, setVerseArabicSize] = useState(28);
    const [verseTranslationSize, setVerseTranslationSize] = useState(14);
    const [growMode, setGrowMode] = useState(false);

    // Auto-fit long ayahs so the whole verse fits inside the card
    const runFitRef = useRef(null);
    useLayoutEffect(() => {
        if (type !== 'verse') return;
        const fitEl = (el, min, max, setSize, leading, startMax) => {
            if (!el) return true;
            let size = startMax ? max : parseFloat(el.style.fontSize) || max;
            el.style.fontSize = `${size}px`;
            el.style.lineHeight = `${Math.round(size * leading)}px`;
            // +4px slack so text decorations don't trigger a false shrink
            const overflowing = () => el.scrollHeight > el.clientHeight + 4;
            let guard = 0;
            while (overflowing() && size > min && guard++ < 100) {
                size -= 0.5;
                el.style.fontSize = `${size}px`;
                el.style.lineHeight = `${Math.round(size * leading)}px`;
            }
            setSize(size);
            return !overflowing();
        };

        const run = () => {
            if (!verseArabicRef.current) return;
            fitEl(verseTranslationRef.current, 10, 14, setVerseTranslationSize, 1.65, true);
            const fits = fitEl(verseArabicRef.current, 14, 28, setVerseArabicSize, 2.1, !growMode);
            fitEl(verseTranslationRef.current, 10, 14, setVerseTranslationSize, 1.65, false);
            // Pathologically long verses can't fit at minimum size — let the card grow instead of clipping
            if (!fits) setGrowMode(true);
        };
        runFitRef.current = run;

        run();
        document.fonts?.ready.then(() => runFitRef.current?.()).catch(() => {});
        const ro = new ResizeObserver(() => runFitRef.current?.());
        if (verseArabicRef.current?.parentElement) ro.observe(verseArabicRef.current.parentElement);
        if (verseTranslationRef.current?.parentElement) ro.observe(verseTranslationRef.current.parentElement);
        return () => ro.disconnect();
    }, [type, data?.arabic, data?.translation, growMode]);

    if (!isOpen) return null;

    const handleAction = async (actionType) => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            // Wait for all fonts to be ready so Arabic text renders in the capture
            await document.fonts?.ready;
            const blob = await toBlob(cardRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#004d40', // Match our dark teal gradient top color
                style: { margin: 0 } // Ensure no weird margins in the output
            });

            if (actionType === 'share') {
                const file = new File([blob], `quran-app-${type}.png`, { type: 'image/png' });
                const shareText = type === 'verse'
                    ? `${data?.arabic}\n\n"${data?.translation}"\n— ${data?.ref}`
                    : `My Quran Reading Progress: ${data?.streak} day streak, ${data?.todayMinutes} mins today, ${data?.totalHours} total hours!`;

                if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Quran Nur',
                        text: shareText
                    });
                } else if (typeof navigator.share === 'function') {
                    // File sharing unsupported, share text instead
                    await navigator.share({
                        title: 'Quran Nur',
                        text: shareText,
                        url: window.location.href
                    });
                } else {
                    // No Web Share API at all: save image + copy text
                    downloadBlob(blob);
                    try { await navigator.clipboard.writeText(shareText); } catch { /* clipboard may be unavailable, image is still saved */ }
                    alert('Sharing is not supported on this browser — the image was saved and the text copied to your clipboard.');
                }
            } else {
                downloadBlob(blob);
                setDownloaded(true);
                setTimeout(() => setDownloaded(false), 2000);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
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
                <div className={`flex flex-col justify-center relative z-10 pt-2 pb-4 ${growMode ? '' : 'h-full'}`}>
                    <div className="mb-6 flex shrink-0 flex-col items-center justify-center gap-2">
                        <div className="w-8 h-[1.5px] bg-[#B8924A]/60" />
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-[#B8924A]">Verse of the Day</span>
                    </div>
                    <div className={`flex w-full items-center justify-center ${growMode ? '' : 'min-h-0 flex-1 overflow-hidden'}`}>
                        <div ref={verseArabicRef} dir="rtl" className="font-arabic text-center text-white" style={{ fontSize: `${verseArabicSize}px`, lineHeight: `${Math.round(verseArabicSize * 2.1)}px`, maxHeight: growMode ? 'none' : '100%', overflow: 'hidden' }}>
                            {data?.arabic}
                        </div>
                    </div>
                    <div className="mt-3 flex w-full shrink-0 items-center justify-center overflow-hidden" style={{ maxHeight: growMode ? 'none' : '30%' }}>
                        <div ref={verseTranslationRef} className="text-center italic leading-[1.65] text-white/90 font-body px-1" style={{ fontSize: `${verseTranslationSize}px`, lineHeight: `${Math.round(verseTranslationSize * 1.65)}px`, maxHeight: growMode ? 'none' : '100%', overflow: 'hidden' }}>
                            "{data?.translation}"
                        </div>
                    </div>
                    <div className="mt-4 text-center font-mono text-[0.65rem] text-[#B8924A] tracking-widest shrink-0">
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
                        style={{ height: growMode ? 'auto' : 'min(540px, calc(100vh - 170px))', alignSelf: growMode ? 'flex-start' : 'auto' }}
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
                            
                            <button
                                onClick={() => handleAction('share')}
                                disabled={isGenerating}
                                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#B8924A] text-white py-2.5 text-sm font-semibold transition-all hover:bg-[#a3803e] disabled:opacity-70"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                                Share
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
