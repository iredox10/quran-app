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
const DECORATIVE_PAGES = new Set([1, 2]); // Al-Fatihah + first page of Al-Baqarah
const MUSHAF_ASPECT_RATIO = 0.75; // width / height — standard mushaf page

// ─── Decorative Page Content (Pages 1 & 2) ──────────────────────────────────
const DecorativePageContent = React.memo(({ pageNumber, mushaf, arabicFont, fontSize, mushafFontPx }) => {
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
                        mushafFontPx={mushafFontPx}
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
const StandardPageContent = React.memo(({ pageNumber, mushaf, arabicFont, fontSize, mushafFontPx }) => {
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
                        mushafFontPx={mushafFontPx}
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
const PageWrapper = React.forwardRef(({ number, isActive, mushaf, arabicFont, fontSize, mushafFontPx }, ref) => {
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
                        mushafFontPx={mushafFontPx}
                    />
                ) : (
                    <StandardPageContent
                        pageNumber={number}
                        mushaf={mushaf}
                        arabicFont={arabicFont}
                        fontSize={fontSize}
                        mushafFontPx={mushafFontPx}
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

    // ── Viewport tracking for responsive sizing ──
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
    });

    useEffect(() => {
        let timer;
        const handleResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setViewport({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }, 150);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const isMobile = viewport.width < viewport.height;

    // ── Pages array mapping for LTR Swipe with RTL visual layout ──
    // By using rtl={false}, Swipe Left = Next, Swipe Right = Prev.
    // To maintain Arabic reading order (Right page first, Left page second),
    // we map the internal pages array so standard spreads show correctly.
    const pages = useMemo(() => {
        const arr = [];
        if (isMobile) {
            // Portrait (single page view): Natural order. Swipe Left goes to next internal page.
            for (let i = 1; i <= TOTAL_PAGES; i++) {
                arr.push(i);
            }
        } else {
            // Landscape (two page spread): Even indices (1, 3, 5) are Left, Odd (2, 4, 6) are Right.
            // We want [Right=1, Left=2], [Right=3, Left=4], etc.
            for (let i = 1; i <= TOTAL_PAGES; i += 2) {
                if (i + 1 <= TOTAL_PAGES) {
                    arr.push(i + 1); // Rendered on Left
                }
                arr.push(i);     // Rendered on Right
            }
        }
        return arr;
    }, [isMobile]);

    // ── Active logical page tracking ──
    const [activeLogicalPage, setActiveLogicalPage] = useState(startingPage);

    // ── Compute internal FlipBook index for the active logical page ──
    const initialFlipbookIndex = useMemo(() => {
        const pageIndexInArray = pages.findIndex(p => p === activeLogicalPage);
        return pageIndexInArray !== -1 ? pageIndexInArray + 1 : 1; // +1 for the Front Cover at index 0
    }, [pages, activeLogicalPage]);

    const [activeFlipbookIdx, setActiveFlipbookIdx] = useState(initialFlipbookIndex);

    // Sync active internal index when layout changes (Mobile <-> Desktop)
    useEffect(() => {
        setActiveFlipbookIdx(initialFlipbookIndex);
    }, [initialFlipbookIndex]);

    // ── Page flip handler ──
    const onPage = useCallback((e) => {
        const flipbookIdx = e.data;
        setActiveFlipbookIdx(flipbookIdx);

        // Update the active logical page based on what is currently shown
        const pagesIdx = Math.max(0, flipbookIdx - 1);
        if (pages[pagesIdx]) {
            // In Desktop, the spread shows two pages. We always consider the lowest page number in the spread as active
            // so if they rotate to portrait, they don't skip a page.
            if (!isMobile && pages[pagesIdx + 1]) {
                setActiveLogicalPage(Math.min(pages[pagesIdx], pages[pagesIdx + 1]));
            } else {
                setActiveLogicalPage(pages[pagesIdx]);
            }
        }
    }, [pages, isMobile]);

    // ── Pre-compute active indices for lazy rendering (±4 pages around current) ──
    const activeIndices = useMemo(() => {
        const pagesIdx = Math.max(0, activeFlipbookIdx - 1);
        const set = new Set();
        for (let i = pagesIdx - 4; i <= pagesIdx + 5; i++) {
            if (i >= 0 && i < TOTAL_PAGES) {
                set.add(i);
            }
        }
        return set;
    }, [activeFlipbookIdx]);

    // ── Responsive book dimensions ──
    // With size="stretch", these props only define the page aspect ratio —
    // the book scales to fill its container. Using the viewport's own ratio
    // makes the spread fill exactly 100vw x 100vh with no side margins.
    const bookDimensions = useMemo(() => {
        if (isMobile) {
            return {
                width: viewport.width,
                height: viewport.height,
            };
        } else {
            return {
                width: viewport.width / 2,
                height: viewport.height,
            };
        }
    }, [isMobile, viewport.width, viewport.height]);

    // ── Mushaf text pixel size ──
    // The page now fills the whole viewport, but the Arabic text must keep
    // its natural mushaf proportions (width = height * 0.75) so it fits on
    // the page without being clipped. Using px (instead of cqi) anchors the
    // text to the natural width regardless of how wide the page is.
    const mushafFontPx = useMemo(
        () => {
            const naturalWidth = Math.min(bookDimensions.width, bookDimensions.height * MUSHAF_ASPECT_RATIO);
            return (fontSize * 0.2 + 3.5) / 100 * naturalWidth;
        },
        [bookDimensions, fontSize]
    );

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
                key={`${isMobile}-${Math.round(viewport.width)}x${Math.round(viewport.height)}`}
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
                rtl={false} // We handle RTL visual layout manually so we get standard LTR Swipe gestures (Swipe Left = Next)
                startPage={initialFlipbookIndex}
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

                {/* All 604 mapped pages */}
                {pages.map((pageNum, idx) => (
                    <PageWrapper
                        key={`${pageNum}-${idx}`}
                        number={pageNum}
                        isActive={activeIndices.has(idx)}
                        mushaf={mushaf}
                        arabicFont={arabicFont}
                        fontSize={fontSize}
                        mushafFontPx={mushafFontPx}
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
