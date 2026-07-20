import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip-rtl';
import { useQuery } from '@tanstack/react-query';
import { getVersesByPage, getChapters } from '../services/api/quranApi';
import { getMushafById, getArabicFontFamily } from '../config/mushaf';
import { useAppStore } from '../store/useAppStore';
import MushafPageView from './MushafPageView';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getJuzByPage } from '../data/quranNavigation';

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_PAGES = 604;
const MUSHAF_ASPECT_RATIO = 4 / 3; // height / width — standard Mushaf page
const DECORATIVE_PAGES = new Set([1, 2]); // Al-Fatihah + first page of Al-Baqarah

// ─── Decorative Page Content (Pages 1 & 2) ──────────────────────────────────
const DecorativePageContent = React.memo(({ pageNumber, mushaf, arabicFont, fontSize }) => {
    const { data: chapters } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
        staleTime: Infinity,
    });

    const { data: verses, isLoading } = useQuery({
        queryKey: ['mushaf-page', pageNumber, mushaf.id],
        queryFn: () => getVersesByPage(pageNumber, 85, 7, mushaf.id),
        staleTime: Infinity,
    });

    if (isLoading || !chapters) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="animate-spin text-[var(--text-muted)]" size={32} />
            </div>
        );
    }

    if (!verses || !verses.verses || verses.verses.length === 0) {
        return null;
    }

    const chapterId = verses.verses[0]?.verse_key.split(':')[0];
    const chapter = chapterId ? chapters.find(c => c.id === Number(chapterId)) : null;

    return (
        <div className="h-full w-full p-[2cqi] bg-[#fdfaf6] dark:bg-[#1a1814] @container flex">
            <div className="flex-1 flex flex-col relative border-[0.8cqi] border-double border-[#b68d40]/70 dark:border-[#c6a87c]/40 rounded-[1.5cqi] outline outline-[0.15cqi] outline-offset-[-1cqi] outline-[#b68d40]/40 shadow-inner px-[3cqi] py-[3cqi]">

                {/* Surah Title Banner */}
                <div className="flex justify-center items-center mb-[3cqi] shrink-0">
                    <div className="relative px-[8cqi] py-[1.5cqi] border-[0.3cqi] border-[#b68d40]/60 dark:border-[#c6a87c]/50 rounded-[1.5cqi] bg-[#b68d40]/8 dark:bg-[#c6a87c]/10 shadow-sm">
                        {/* Corner ornaments */}
                        <div className="absolute -top-[0.8cqi] -right-[0.8cqi] w-[2cqi] h-[2cqi] border-t-[0.2cqi] border-r-[0.2cqi] border-[#b68d40]/50 rounded-tr-[0.5cqi]" />
                        <div className="absolute -top-[0.8cqi] -left-[0.8cqi] w-[2cqi] h-[2cqi] border-t-[0.2cqi] border-l-[0.2cqi] border-[#b68d40]/50 rounded-tl-[0.5cqi]" />
                        <div className="absolute -bottom-[0.8cqi] -right-[0.8cqi] w-[2cqi] h-[2cqi] border-b-[0.2cqi] border-r-[0.2cqi] border-[#b68d40]/50 rounded-br-[0.5cqi]" />
                        <div className="absolute -bottom-[0.8cqi] -left-[0.8cqi] w-[2cqi] h-[2cqi] border-b-[0.2cqi] border-l-[0.2cqi] border-[#b68d40]/50 rounded-bl-[0.5cqi]" />
                        <span className="font-arabic text-[#9c7530] dark:text-[#c6a87c] text-[4cqi] font-bold tracking-wider">
                            سورة {chapter?.name_arabic}
                        </span>
                    </div>
                </div>

                {/* Quran Text — centered, not justified */}
                <div className="flex-1 flex flex-col justify-center overflow-hidden min-h-0 px-[2cqi]">
                    <MushafPageView
                        verses={verses.verses}
                        mushaf={mushaf}
                        arabicFont={arabicFont}
                        fontSize={fontSize}
                        isPlain={true}
                        isDecorative={true}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-center items-center mt-[2cqi] shrink-0">
                    <div className="px-[4cqi] py-[0.5cqi] border-[0.15cqi] border-[#b68d40]/50 rounded-full font-ui text-[#9c7530] dark:text-[#c6a87c] text-[2cqi] font-bold bg-[#b68d40]/5 shadow-sm">
                        {pageNumber}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ─── Standard Page Content (Pages 3–604) ─────────────────────────────────────
const StandardPageContent = React.memo(({ pageNumber, mushaf, arabicFont, fontSize }) => {
    const { data: chapters } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
        staleTime: Infinity,
    });

    const { data: verses, isLoading } = useQuery({
        queryKey: ['mushaf-page', pageNumber, mushaf.id],
        queryFn: () => getVersesByPage(pageNumber, 85, 7, mushaf.id),
        staleTime: Infinity,
    });

    if (isLoading || !chapters) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="animate-spin text-[var(--text-muted)]" size={32} />
            </div>
        );
    }

    if (!verses || !verses.verses || verses.verses.length === 0) {
        return null;
    }

    const chapterId = verses.verses[0]?.verse_key.split(':')[0];
    const chapter = chapterId ? chapters.find(c => c.id === Number(chapterId)) : null;
    const juz = getJuzByPage(pageNumber);

    // In a Mushaf, odd pages are on the right (close to spine), even on the left
    const isRightPage = pageNumber % 2 === 1;

    return (
        <div className="h-full w-full p-[1.5cqi] bg-[#fdfaf6] dark:bg-[#1a1814] @container flex">
            <div className={`flex-1 flex flex-col relative border-[0.8cqi] border-double border-[#b68d40]/70 dark:border-[#c6a87c]/40 rounded-[1.5cqi] outline outline-[0.15cqi] outline-offset-[-1cqi] outline-[#b68d40]/40 shadow-inner ${isRightPage ? 'pl-[4cqi] pr-[2cqi]' : 'pr-[4cqi] pl-[2cqi]'} py-[1.5cqi]`}>

                {/* Header */}
                <div className="flex justify-between items-center px-[2cqi] mb-[1cqi] shrink-0">
                    <div className="px-[3cqi] py-[0.5cqi] border-[0.15cqi] border-[#b68d40]/50 rounded-full font-arabic text-[#9c7530] dark:text-[#c6a87c] text-[2.2cqi] font-bold bg-[#b68d40]/5 shadow-sm">
                        الجزء {juz?.id}
                    </div>
                    <div className="px-[3cqi] py-[0.5cqi] border-[0.15cqi] border-[#b68d40]/50 rounded-full font-arabic text-[#9c7530] dark:text-[#c6a87c] text-[2.2cqi] font-bold bg-[#b68d40]/5 shadow-sm">
                        سورة {chapter?.name_arabic}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center overflow-hidden min-h-0 px-[1cqi]">
                    <MushafPageView
                        verses={verses.verses}
                        mushaf={mushaf}
                        arabicFont={arabicFont}
                        fontSize={fontSize}
                        isPlain={true}
                        isDecorative={false}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-center items-center mt-[1cqi] shrink-0">
                    <div className="px-[4cqi] py-[0.5cqi] border-[0.15cqi] border-[#b68d40]/50 rounded-full font-ui text-[#9c7530] dark:text-[#c6a87c] text-[2cqi] font-bold bg-[#b68d40]/5 shadow-sm">
                        {pageNumber}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ─── Page Wrapper (forwardRef required by react-pageflip) ────────────────────
const PageWrapper = React.forwardRef(({ number, isActive, mushaf, arabicFont, fontSize }, ref) => {
    const isDecorative = DECORATIVE_PAGES.has(number);

    return (
        <div
            className="h-full w-full bg-[#fdfaf6] dark:bg-[#1a1814] shadow-inner"
            ref={ref}
        >
            {isActive ? (
                isDecorative ? (
                    <DecorativePageContent
                        pageNumber={number}
                        mushaf={mushaf}
                        arabicFont={arabicFont}
                        fontSize={fontSize}
                    />
                ) : (
                    <StandardPageContent
                        pageNumber={number}
                        mushaf={mushaf}
                        arabicFont={arabicFont}
                        fontSize={fontSize}
                    />
                )
            ) : (
                <div className="flex h-full w-full items-center justify-center">
                    {/* Empty placeholder to save memory for non-active pages */}
                </div>
            )}
        </div>
    );
});

// ─── Main FlipBook Component ─────────────────────────────────────────────────
export default function MushafFlipBook({ startingPage = 1 }) {
    const { mushafId, arabicFontId, fontSize, setMushafMode } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const arabicFont = getArabicFontFamily(arabicFontId, mushaf.defaultFontId);
    const flipBookRef = useRef(null);

    // ── Pages array: simple sequential 1..604 ──
    // react-pageflip-rtl handles RTL ordering internally via rtl={true}
    const pages = useMemo(() => {
        const arr = [];
        for (let i = 1; i <= TOTAL_PAGES; i++) {
            arr.push(i);
        }
        return arr;
    }, []);

    // ── Active pages for lazy loading ──
    // Use a wide ±5 window to robustly handle cover offset and RTL index remapping
    const [activePages, setActivePages] = useState(() => {
        const idx = startingPage - 1;
        const set = new Set();
        for (let i = Math.max(0, idx - 5); i <= Math.min(TOTAL_PAGES - 1, idx + 5); i++) {
            set.add(i);
        }
        return set;
    });

    // ── Viewport tracking for responsive sizing ──
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
    });

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Responsive book dimensions ──
    const isMobile = viewport.width < viewport.height;
    const bookDimensions = useMemo(() => {
        if (isMobile) {
            // Single-page mode: fill the screen
            return {
                width: viewport.width,
                height: viewport.height,
            };
        } else {
            // Desktop two-page spread: each page takes half the width
            // Constrain to Mushaf aspect ratio (height = width * 4/3)
            const maxPageWidth = Math.floor(viewport.width / 2);
            const maxPageHeight = viewport.height;

            let pageWidth = maxPageWidth;
            let pageHeight = Math.round(pageWidth * MUSHAF_ASPECT_RATIO);

            // If height exceeds viewport, scale down
            if (pageHeight > maxPageHeight) {
                pageHeight = maxPageHeight;
                pageWidth = Math.round(pageHeight / MUSHAF_ASPECT_RATIO);
            }

            return {
                width: pageWidth,
                height: pageHeight,
            };
        }
    }, [isMobile, viewport.width, viewport.height]);

    // ── Page flip handler ──
    const onPage = useCallback((e) => {
        const flipbookIdx = e.data;
        // Account for the cover page: pages array index = flipbook index - 1
        const pagesIdx = Math.max(0, flipbookIdx - 1);
        const newActive = new Set();
        // Wide ±5 window ensures both pages of the spread + prefetch are always active
        for (let i = pagesIdx - 5; i <= pagesIdx + 5; i++) {
            if (i >= 0 && i < TOTAL_PAGES) {
                newActive.add(i);
            }
        }
        setActivePages(newActive);
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[2000] flex h-[100dvh] w-[100dvw] items-center justify-center bg-[#fdfaf6] dark:bg-[#1a1814] overflow-hidden">
            {/* Close button */}
            <button
                onClick={() => setMushafMode(false)}
                className="absolute top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-[var(--text-primary)] hover:bg-black/30 backdrop-blur-md transition-all shadow-sm"
                aria-label="Exit Mushaf Mode"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <HTMLFlipBook
                key={isMobile ? 'mobile' : 'desktop'}
                width={bookDimensions.width}
                height={bookDimensions.height}
                size="stretch"
                minWidth={280}
                maxWidth={viewport.width}
                minHeight={400}
                maxHeight={viewport.height}
                maxShadowOpacity={0.5}
                showCover={true}
                mobileScrollSupport={true}
                usePortrait={isMobile}
                rtl={true}
                startPage={startingPage - 1}
                onFlip={onPage}
                className="shadow-2xl"
                ref={flipBookRef}
            >
                {/* Front cover */}
                <div className="bg-[#1c1a17] h-full w-full flex items-center justify-center rounded-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-[#c6a87c] text-3xl font-bold font-arabic">القرآن الكريم</div>
                        <div className="w-24 h-[1px] bg-[#c6a87c]/30" />
                        <div className="text-[#c6a87c]/50 text-sm font-ui">Quran Nur</div>
                    </div>
                </div>

                {/* All 604 pages — in natural order, RTL handled by the library */}
                {pages.map((pageNum, idx) => (
                    <PageWrapper
                        key={pageNum}
                        number={pageNum}
                        isActive={activePages.has(idx)}
                        mushaf={mushaf}
                        arabicFont={arabicFont}
                        fontSize={fontSize}
                    />
                ))}

                {/* Back cover */}
                <div className="bg-[#1c1a17] h-full w-full flex items-center justify-center rounded-sm">
                    <div className="text-[#c6a87c] opacity-50 font-ui">Quran Nur</div>
                </div>
            </HTMLFlipBook>
        </div>,
        document.body
    );
}
