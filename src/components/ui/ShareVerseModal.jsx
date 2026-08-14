import React, { useRef, useState } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { getVerseArabicText } from '../../utils/quranText';

const ShareVerseModal = ({ verse, chapter, mushaf = 1, onClose }) => {
    const cardRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Strip HTML from translation (if any)
    const stripHtml = (html) => {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const arabicText = getVerseArabicText(verse, mushaf);
    const translationText = stripHtml(verse.translations?.[0]?.text);
    const verseNumber = verse.verse_key.split(':')[1];
    const surahName = chapter?.name_simple || `Surah ${verse.verse_key.split(':')[0]}`;

    const generateImageBlob = async () => {
        if (!cardRef.current) return null;
        try {
            // Wait for all fonts to be ready so Arabic text renders in the capture
            await document.fonts?.ready;
            // Use a higher pixel ratio to ensure the resulting image is high quality
            const blob = await htmlToImage.toBlob(cardRef.current, {
                pixelRatio: 3,
                cacheBust: true,
                style: {
                    margin: '0',
                    borderRadius: '0', // Optional: remove border radius for the actual exported image if desired, but rounded is nice.
                }
            });
            return blob;
        } catch (err) {
            console.error("Error generating image:", err);
            return null;
        }
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        const blob = await generateImageBlob();
        setIsGenerating(false);
        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Quran_${verse.verse_key}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            alert("Failed to generate image.");
        }
    };

    const handleShare = async () => {
        setIsGenerating(true);
        const blob = await generateImageBlob();
        setIsGenerating(false);

        if (!blob) {
            alert("Failed to generate image.");
            return;
        }

        const file = new File([blob], `Quran_${verse.verse_key}.png`, { type: 'image/png' });
        const shareText = `${arabicText}\n\n"${translationText}"\n— ${surahName} ${verseNumber}`;

        try {
            // Check if Web Share API is available and supports files
            if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Quran ${verse.verse_key}`,
                    files: [file]
                });
            } else if (typeof navigator.share === 'function') {
                // File sharing unsupported, share the verse as text instead
                await navigator.share({
                    title: `Quran ${verse.verse_key}`,
                    text: shareText,
                    url: window.location.href
                });
            } else {
                // No Web Share API at all: save image + copy text
                handleDownload();
                try { await navigator.clipboard.writeText(shareText); } catch { /* clipboard may be unavailable, image is still saved */ }
                alert('Sharing is not supported on this browser — the verse card was saved and the text copied to your clipboard.');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Share failed:', error);
            // Fallback to download
            handleDownload();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
                    <h3 className="font-bold text-[var(--text-primary)]">Share Verse</h3>
                    <button onClick={onClose} className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="p-6 overflow-y-auto flex-1 bg-[var(--bg-secondary)] flex justify-center">
                    
                    {/* The Card to be converted to image */}
                    <div 
                        ref={cardRef}
                        className="relative w-full max-w-[400px] overflow-hidden rounded-[24px] bg-[#141716] p-8 shadow-2xl"
                        style={{
                            background: 'linear-gradient(145deg, #181d1c 0%, #0f1211 100%)',
                        }}
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#1e7e72] opacity-10 blur-3xl mix-blend-screen"></div>
                        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#c6a87c] opacity-10 blur-3xl mix-blend-screen"></div>
                        
                        <div className="relative z-10 flex h-full flex-col items-center text-center">
                            
                            {/* Logo / App Name */}
                            <div className="mb-6 flex flex-col items-center gap-3 text-[#c6a87c]/80">
                                <img src="/logo-192.png" alt="Quran Nur Logo" className="h-16 w-16 object-contain drop-shadow-[0_0_15px_rgba(198,168,124,0.2)]" />
                                <span className="font-['Outfit',sans-serif] text-[0.7rem] font-bold tracking-[0.25em] uppercase opacity-80">Quran Nur</span>
                            </div>

                            {/* Arabic Verse */}
                            <p 
                                className="mb-8 w-full font-arabic text-3xl leading-[1.8] text-white/95 text-center break-words"
                                style={{ direction: 'rtl', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                            >
                                {arabicText}
                            </p>

                            {/* Translation */}
                            {translationText && (
                                <p className="mb-8 w-full text-[0.95rem] italic leading-relaxed text-white/70">
                                    "{translationText}"
                                </p>
                            )}

                            {/* Reference */}
                            <div className="mt-auto pt-4 border-t border-white/10 w-full flex justify-center">
                                <p className="font-['Outfit',sans-serif] text-sm font-semibold text-[#c6a87c]">
                                    {surahName} — {verseNumber}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 border-t border-[var(--border-color)] p-4 bg-[var(--bg-surface)]">
                    <button 
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        Save Image
                    </button>
                    <button 
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-[var(--accent-primary)]/20"
                    >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                        Share
                    </button>
                </div>
                
            </div>
        </div>
    );
};

export default ShareVerseModal;
