import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, ChevronLeft, Minus, Pause, Play, Plus, Target, X, Loader2 } from 'lucide-react';

import { getVersesByPage, getTajweedVersesByPage, getChapters } from '../services/api/quranApi';
import { JUZ_STARTS, getJuzByPage, getHizbByPage } from '../data/quranNavigation';
import { useAppStore } from '../store/useAppStore';
import { getMushafById, isTajweedEnabledForMushaf } from '../config/mushaf';
import { sanitizeTajweedHtml } from '../utils/quranText';
import { saukaService } from '../services/saukaService';

import VerseRow from '../components/VerseRow';
import MushafPageView from '../components/MushafPageView';
import AudioSetupModal from '../components/AudioSetupModal';
import MinimalHeader from '../components/ui/MinimalHeader';

const pageTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 1,
};

const pageVariants = {
    enter: (direction) => ({
        x: direction > 0 ? '100%' : '-100%',
        opacity: 0,
        position: 'absolute',
        width: '100%',
    }),
    center: {
        x: 0,
        opacity: 1,
        position: 'relative',
    },
    exit: (direction) => ({
        x: direction > 0 ? '-100%' : '100%',
        opacity: 0,
        position: 'absolute',
        width: '100%',
    }),
};

export default function Page() {
    const { id } = useParams();
    const pageNumber = parseInt(id) || 1;
    const location = useLocation();
    const navigate = useNavigate();
    
    // Sauka Context
    const { backToSauka, saukaAssignmentId, saukaPartNumber, saukaUnit, saukaStartPage, saukaEndPage } = location.state || {};
    const [isSaukaCompleting, setIsSaukaCompleting] = useState(false);

    const handleSaukaComplete = async () => {
        setIsSaukaCompleting(true);
        try {
            await saukaService.completeJuz(saukaAssignmentId, backToSauka);
            // Clear progress on completion
            useAppStore.getState().clearSaukaProgress(saukaAssignmentId);
            navigate(`/sauka/${backToSauka}`);
        } catch (e) {
            console.error(e);
            alert('Failed to mark complete');
            setIsSaukaCompleting(false);
        }
    };

    // Save Sauka Progress
    useEffect(() => {
        if (backToSauka && saukaAssignmentId) {
            useAppStore.getState().setSaukaProgress(saukaAssignmentId, pageNumber);
        }
    }, [pageNumber, backToSauka, saukaAssignmentId]);

    // App State
    const {
        translationId, reciterId, fontSize,
        readingMode,
        bookmark, setBookmark, addRecentlyRead,
        mushafId, arabicFont, tajweedEnabled, tafsirId,
        setNavHeaderTitle,
        autoScroll, setAutoScroll, autoScrollSpeed, setAutoScrollSpeed,
        isAutoScrollPaused, setIsAutoScrollPaused,
        setIsPlaying, isPlaying, audioPlaylist, setAudioPlaylist,
        audioTrackIndex, audioSettings, updateAudioSettings,
        isPlayerVisible, setIsPlayerVisible, playTriggerCount,
        customAudioBaseUrl, localAudioDirHandle
    } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    // Queries
    const { data: pageData, isLoading: isPageLoading, isFetching: isPageFetching } = useQuery({
        queryKey: ['pageVerses', pageNumber, translationId, reciterId, mushafId],
        queryFn: () => getVersesByPage(pageNumber, translationId, reciterId, mushafId),
    });

    const { data: tajweedData } = useQuery({
        queryKey: ['tajweedPage', pageNumber, mushafId],
        queryFn: () => getTajweedVersesByPage(pageNumber),
        enabled: isTajweedActive && mushaf.tajweedSource === 'uthmani_html',
    });

    const { data: chapters } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
        staleTime: Infinity,
    });

    const tajweedMap = React.useMemo(() => {
        if (!tajweedData) return {};
        return tajweedData.reduce((acc, v) => {
            acc[v.verse_key] = sanitizeTajweedHtml(v.text_uthmani_tajweed);
            return acc;
        }, {});
    }, [tajweedData]);

    const verses = pageData?.verses || [];
    const maxPageNumber = mushaf.pageCount || 604;
    const minPageLimit = backToSauka && saukaStartPage ? saukaStartPage : 1;
    const maxPageLimit = backToSauka && saukaEndPage ? saukaEndPage : maxPageNumber;
    const queryClient = useQueryClient();

    // Prefetch the next 5 pages
    useEffect(() => {
        for (let i = 1; i <= 5; i++) {
            const nextPg = pageNumber + i;
            if (nextPg <= maxPageLimit) {
                queryClient.prefetchQuery({
                    queryKey: ['pageVerses', nextPg, translationId, reciterId, mushafId],
                    queryFn: () => getVersesByPage(nextPg, translationId, reciterId, mushafId),
                    staleTime: 1000 * 60 * 30, // Keep fresh for 30 minutes
                });
                
                if (isTajweedActive && mushaf.tajweedSource === 'uthmani_html') {
                    queryClient.prefetchQuery({
                        queryKey: ['tajweedPage', nextPg, mushafId],
                        queryFn: () => getTajweedVersesByPage(nextPg),
                        staleTime: 1000 * 60 * 30,
                    });
                }
            }
        }
    }, [pageNumber, maxPageLimit, translationId, reciterId, mushafId, isTajweedActive, mushaf.tajweedSource, queryClient]);

    const activeSurahId = verses.length > 0 ? verses[0].verse_key.split(':')[0] : null;
    const activeSurah = chapters?.find(c => c.id.toString() === activeSurahId);

    useEffect(() => {
        if (activeSurah) {
            setNavHeaderTitle(`${activeSurah.name_simple} • Page ${pageNumber}`);
        } else {
            setNavHeaderTitle(`Page ${pageNumber}`);
        }
    }, [activeSurah, pageNumber, setNavHeaderTitle]);

    // Audio Playback State Let's setup modal
    const [showAudioSetup, setShowAudioSetup] = useState(false);
    const [pendingPlaylist, setPendingPlaylist] = useState([]);

    const isCurrentPagePlaying = audioPlaylist.length > 0 && String(audioPlaylist[0]?.pageNumber) === String(pageNumber);
    const activeAudioVerseKey = isPlayerVisible && isCurrentPagePlaying && audioPlaylist[audioTrackIndex]
        ? audioPlaylist[audioTrackIndex].verseKey
        : null;

    const handlePlayClick = useCallback(() => {
        if (!verses || verses.length === 0) return;

        if (isCurrentPagePlaying) {
            // Already playing this page— toggle play/pause and show player
            setIsPlaying(!isPlaying);
            setIsPlayerVisible(true);
        } else {
            // Setup the playlist for this page's verses
            const playlist = verses.map(v => {
                let url = v.audio?.url ? (v.audio.url.startsWith('http') ? v.audio.url : `https://verses.quran.com/${v.audio.url}`) : null;
                const [surahNum, ayahNum] = v.verse_key.split(':');
                const fileName = `${String(surahNum).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;

                if (localAudioDirHandle) {
                    url = `local-audio://${fileName}`;
                } else if (customAudioBaseUrl) {
                    url = `${customAudioBaseUrl.replace(/\/$/, '')}/${fileName}`;
                }

                return {
                    pageNumber: pageNumber,
                    surahId: parseInt(surahNum),
                    verseKey: v.verse_key,
                    verseNumber: v.verse_number,
                    url
                };
            }).filter(v => v.url);

            if (playlist.length > 0) {
                setPendingPlaylist(playlist);
                updateAudioSettings({ startRange: 0, endRange: playlist.length - 1 });
                setShowAudioSetup(true);
            }
        }
    }, [verses, isCurrentPagePlaying, isPlaying, pageNumber, localAudioDirHandle, customAudioBaseUrl, setIsPlaying, setIsPlayerVisible, updateAudioSettings]);

    const handleStartPlaying = () => {
        if (pendingPlaylist.length === 0) return;
        setAudioPlaylist(pendingPlaylist, audioSettings.startRange ?? 0);
        setIsPlaying(true);
        setIsPlayerVisible(true);
        setShowAudioSetup(false);
    };

    const mountPlayTriggerRef = useRef(playTriggerCount);
    useEffect(() => {
        if (playTriggerCount === mountPlayTriggerRef.current) return;
        handlePlayClick();
        mountPlayTriggerRef.current = playTriggerCount;
    }, [playTriggerCount, handlePlayClick]);

    const scrollToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    const handleNextPage = useCallback(() => {
        if (pageNumber < maxPageLimit) {
            scrollToTop();
            swipeDirectionRef.current = -1;
            navigate(`/page/${pageNumber + 1}`, { state: location.state });
        }
    }, [pageNumber, maxPageLimit, navigate, location.state, scrollToTop]);

    const handlePrevPage = useCallback(() => {
        if (pageNumber > minPageLimit) {
            scrollToTop();
            swipeDirectionRef.current = 1;
            navigate(`/page/${pageNumber - 1}`, { state: location.state });
        }
    }, [pageNumber, minPageLimit, navigate, location.state, scrollToTop]);

    // Handle Top Level Keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') handlePrevPage();
            if (e.key === 'ArrowLeft') handleNextPage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextPage, handlePrevPage]);

    const scrollRafRef = useRef(null);
    const lastScrollTimestampRef = useRef(null);
    const scrollRemainderRef = useRef(0);

    useEffect(() => {
        if (!autoScroll) {
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
            lastScrollTimestampRef.current = null;
            scrollRemainderRef.current = 0;
            return;
        }

        const speedMap = { 1: 5, 2: 10, 3: 18, 4: 36, 5: 60, 6: 108, 7: 180 };
        const pxPerSecond = speedMap[autoScrollSpeed] || 60;

        const tick = (timestamp) => {
            if (lastScrollTimestampRef.current == null) {
                lastScrollTimestampRef.current = timestamp;
            }

            const deltaMs = timestamp - lastScrollTimestampRef.current;
            lastScrollTimestampRef.current = timestamp;

            if (!isAutoScrollPaused) {
                const nextDistance = scrollRemainderRef.current + (pxPerSecond * deltaMs) / 1000;
                const wholePixels = Math.trunc(nextDistance);

                scrollRemainderRef.current = nextDistance - wholePixels;

                if (wholePixels !== 0) {
                    window.scrollBy(0, wholePixels);
                }
            }

            if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 10) {
                setAutoScroll(false);
                return;
            }

            scrollRafRef.current = requestAnimationFrame(tick);
        };

        scrollRafRef.current = requestAnimationFrame(tick);

        return () => {
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
            lastScrollTimestampRef.current = null;
            scrollRemainderRef.current = 0;
        };
    }, [autoScroll, autoScrollSpeed, isAutoScrollPaused, setAutoScroll]);

    useEffect(() => {
        return () => setAutoScroll(false);
    }, [setAutoScroll]);

    // Swipe gestures
    const swipeDirectionRef = useRef(0);
    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handlePrevPage(),
        onSwipedRight: () => handleNextPage(),
        preventDefaultTouchmoveEvent: false,
        trackTouch: true,
        trackMouse: false,
        delta: 40,
        swipeDuration: 500
    });



    // Auto-smooth top-scroll when verses change (avoids jank)
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pageNumber]);

    return (
        <div
            {...swipeHandlers}
            className="surah-container container stretch-reading overflow-hidden"
        >
            <Helmet>
                <title>{`Page ${pageNumber} - ${mushaf?.name || ''} - The Noble Qur'an`}</title>
            </Helmet>

            <AnimatePresence initial={false} custom={swipeDirectionRef.current}>
                <motion.div
                    key={pageNumber}
                    custom={swipeDirectionRef.current}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={pageTransition}
                    className="will-change-[transform,opacity]"
                >
                    <MinimalHeader
                        title={`Page ${pageNumber}`}
                        pillPrimary={activeSurah?.name_simple}
                        pillSecondary={`Juz ${getJuzByPage(pageNumber).id} • Hizb ${getHizbByPage(pageNumber).id}`}
                    />

                    {/* Context bar — shown at top when reading from a sauka */}
                    {backToSauka && saukaAssignmentId && (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 p-3 sm:p-4 rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
                            <div className="min-w-0 w-full sm:w-auto flex-1">
                                <div className="flex items-center gap-[0.4rem] mb-[0.15rem] text-[var(--text-primary)] font-bold text-[0.88rem]">
                                    <Target size={13} aria-hidden="true" />
                                    <span>Sauka Group Reading</span>
                                </div>
                                <div className="text-[var(--text-muted)] text-[0.76rem]">
                                    Currently reading: {saukaUnit} {saukaPartNumber}
                                </div>
                            </div>
                            <div className="flex gap-2 items-center w-full sm:w-auto">
                                <button
                                    type="button"
                                    disabled={isSaukaCompleting}
                                    onClick={handleSaukaComplete}
                                    className="flex-1 sm:flex-none justify-center min-h-9 px-4 py-2 rounded-full bg-[var(--h-teal)] text-white font-bold inline-flex items-center gap-2 text-[0.82rem] border-none cursor-pointer disabled:opacity-50"
                                >
                                    {isSaukaCompleting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} aria-hidden="true" />}
                                    Mark as Complete
                                </button>
                                <Link
                                    to={`/sauka/${backToSauka}`}
                                    className="flex-1 sm:flex-none justify-center min-h-9 px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold inline-flex items-center gap-2 text-[0.78rem] no-underline"
                                >
                                    ← Back to Sauka
                                </Link>
                            </div>
                        </div>
                    )}

                    <div className="relative z-[5] pb-16">
                        {mushaf.renderMode === 'qcf-page' && !readingMode ? (
                            isPageLoading && verses.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-[15vh] gap-6"
                                >
                                    <div className="relative flex items-center justify-center">
                                        <motion.img 
                                            src="/logo-192.png" 
                                            alt="Loading" 
                                            className="w-14 h-14 object-contain relative z-10"
                                            animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.8, 1, 0.8] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                        />
                                        <motion.div
                                            animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.15, 0.5, 0.15] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--accent-primary)] rounded-full blur-[12px] z-0"
                                        />
                                    </div>
                                    
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="font-ui font-medium text-[1.2rem] text-[var(--text-primary)] tracking-wide">
                                            Loading Page {pageNumber}
                                        </span>
                                        <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                            Preparing verses
                                        </span>
                                    </div>
                                </motion.div>
                            ) : (
                                <MushafPageView
                                    verses={verses}
                                    mushaf={mushaf}
                                    arabicFont={arabicFont}
                                    fontSize={fontSize}
                                    activeAudioVerseKey={activeAudioVerseKey}
                                />
                            )
                        ) : (
                            <div className="w-full" style={{
                                display: readingMode ? 'inline-block' : 'block',
                                textAlign: readingMode ? 'justify' : 'left',
                                direction: readingMode ? 'rtl' : 'ltr',
                            }}>
                                {isPageLoading && verses.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-[15vh] gap-6"
                                    >
                                        <div className="relative flex items-center justify-center">
                                            <motion.img 
                                                src="/logo-192.png" 
                                                alt="Loading" 
                                                className="w-14 h-14 object-contain relative z-10"
                                                animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.8, 1, 0.8] }}
                                                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                            />
                                            <motion.div
                                                animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.15, 0.5, 0.15] }}
                                                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--accent-primary)] rounded-full blur-[12px] z-0"
                                            />
                                        </div>
                                        
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="font-ui font-medium text-[1.2rem] text-[var(--text-primary)] tracking-wide">
                                                Loading Page {pageNumber}
                                            </span>
                                            <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                                Preparing verses
                                            </span>
                                        </div>
                                    </motion.div>
                                ) : (
                                    verses.map((verse) => {
                                        const chId = verse.verse_key.split(':')[0];
                                        const chapterContext = chapters?.find(c => c.id.toString() === chId) || { id: parseInt(chId), name_simple: `Surah ${chId}` };

                                        return (
                                            <React.Fragment key={verse.id}>
                                                {verse.verse_number === 1 && (
                                                    <div style={{ display: 'block', width: '100%', textAlign: 'center', direction: 'ltr' }} className="my-12">
                                                        <MinimalHeader
                                                            overline={`Surah ${chapterContext.id}`}
                                                            title={chapterContext.name_simple}
                                                            pillPrimary={chapterContext.translated_name?.name}
                                                            pillSecondary={`${chapterContext.verses_count} Ayahs`}
                                                        />
                                                        {chapterContext.id !== 1 && chapterContext.id !== 9 && (
                                                            <div
                                                                className="quran-text text-center mt-10 mb-4 text-[var(--accent-primary)]"
                                                                style={{
                                                                    fontSize: `clamp(1.5rem, ${fontSize * 0.4 + 1.5}rem, 4rem)`,
                                                                    fontFamily: arabicFont,
                                                                    direction: 'rtl'
                                                                }}
                                                            >
                                                                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <VerseRow
                                                    key={verse.id}
                                                    verse={verse}
                                                    readingMode={readingMode}
                                                    chapter={chapterContext}
                                                    bookmark={bookmark}
                                                    setBookmark={setBookmark}
                                                    addRecentlyRead={addRecentlyRead}
                                                    fontSize={fontSize}
                                                    arabicFont={arabicFont}
                                                    tajweedEnabled={isTajweedActive}
                                                    tajweedMap={tajweedMap}
                                                    activeTafsir={null}
                                                    setActiveTafsir={() => { }}
                                                    isTafsirFetching={false}
                                                    tafsirs={[]}
                                                    tafsirId={tafsirId}
                                                    showPageDivider={false} // since it's exactly 1 page
                                                    mushaf={mushaf}
                                                    isAudioPlaying={activeAudioVerseKey === verse.verse_key}
                                                />
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Old planner bar removed — now shown at top */}

            <div className="flex justify-between items-center mt-12 mb-8 pt-8 border-t border-[var(--border-color)]">
                <button
                    onClick={handleNextPage}
                    disabled={pageNumber >= maxPageLimit}
                    className="group flex items-center gap-3 bg-transparent border-none p-2 cursor-pointer transition-opacity duration-200"
                    style={{
                        opacity: pageNumber >= maxPageLimit ? 0.3 : 1,
                        cursor: pageNumber >= maxPageLimit ? 'not-allowed' : 'pointer',
                    }}
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors">
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </div>
                    <div className="hidden sm:flex flex-col items-start text-left">
                        <span className="font-mono text-[0.65rem] tracking-[0.15em] text-[var(--text-muted)] uppercase mb-[0.15rem]">Next Page</span>
                        <span className="font-ui font-bold text-[var(--text-primary)] text-[1.05rem] leading-none">
                            {pageNumber + 1 > maxPageLimit ? maxPageLimit : pageNumber + 1}
                        </span>
                    </div>
                </button>

                <div className="flex flex-col items-center">
                    <span className="font-mono text-[0.65rem] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-[0.2rem]">
                        Page
                    </span>
                    <span className="font-ui font-extrabold text-[var(--text-primary)] text-[1.2rem] leading-none">
                        {pageNumber} <span className="text-[var(--text-muted)] text-[0.95rem] font-medium tracking-normal">/ {maxPageNumber}</span>
                    </span>
                </div>

                <button
                    onClick={handlePrevPage}
                    disabled={pageNumber <= minPageLimit}
                    className="group flex items-center gap-3 bg-transparent border-none p-2 cursor-pointer transition-opacity duration-200"
                    style={{
                        opacity: pageNumber <= minPageLimit ? 0.3 : 1,
                        cursor: pageNumber <= minPageLimit ? 'not-allowed' : 'pointer',
                    }}
                >
                    <div className="hidden sm:flex flex-col items-end text-right">
                        <span className="font-mono text-[0.65rem] tracking-[0.15em] text-[var(--text-muted)] uppercase mb-[0.15rem]">Previous Page</span>
                        <span className="font-ui font-bold text-[var(--text-primary)] text-[1.05rem] leading-none">
                            {pageNumber - 1 < minPageLimit ? minPageLimit : pageNumber - 1}
                        </span>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors">
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </div>
                </button>
            </div>

            <AudioSetupModal
                isOpen={showAudioSetup}
                onClose={() => setShowAudioSetup(false)}
                pendingPlaylist={pendingPlaylist}
                audioSettings={audioSettings}
                updateAudioSettings={updateAudioSettings}
                handleStartPlaying={handleStartPlaying}
            />

            <AnimatePresence>
                {autoScroll && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.25 }}
                        className="fixed left-0 right-0 mx-auto w-fit z-[100]"
                        style={{
                            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                        }}
                    >
                        <div className="flex items-center gap-3 px-4 py-[0.6rem] rounded-full bg-[var(--glass-bg)] backdrop-blur-lg border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
                            <div className="flex gap-1">
                                <button
                                    className="btn-icon w-7 h-7 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                                    onClick={() => window.scrollBy({ top: -200, behavior: 'smooth' })}
                                    aria-label="Scroll up"
                                >
                                    <ArrowLeft size={14} className="rotate-90" />
                                </button>
                                <button
                                    className="btn-icon w-7 h-7 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                                    onClick={() => window.scrollBy({ top: 200, behavior: 'smooth' })}
                                    aria-label="Scroll down"
                                >
                                    <ArrowRight size={14} className="rotate-90" />
                                </button>
                            </div>

                            <div className="w-px h-6 bg-[var(--border-color)]" />

                            <button
                                className="btn-icon w-7 h-7 border border-[var(--border-color)] rounded-full"
                                onClick={() => setAutoScrollSpeed(Math.max(1, autoScrollSpeed - 1))}
                                aria-label="Decrease auto-scroll speed"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="font-mono text-[0.8rem] font-bold text-[var(--text-primary)] min-w-[40px] text-center">
                                {autoScrollSpeed}x
                            </span>
                            <button
                                className="btn-icon w-7 h-7 border border-[var(--border-color)] rounded-full"
                                onClick={() => setAutoScrollSpeed(Math.min(7, autoScrollSpeed + 1))}
                                aria-label="Increase auto-scroll speed"
                            >
                                <Plus size={14} />
                            </button>

                            <button
                                className="btn-icon w-8 h-8 text-[var(--accent-primary)]"
                                style={{
                                    background: isAutoScrollPaused ? 'var(--accent-light)' : 'transparent',
                                }}
                                onClick={() => setIsAutoScrollPaused(!isAutoScrollPaused)}
                                aria-label={isAutoScrollPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
                            >
                                {isAutoScrollPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                            </button>

                            <div className="w-px h-6 bg-[var(--border-color)]" />

                            <button
                                onClick={() => setAutoScroll(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[rgba(239,68,68,0.1)] text-[rgb(239,68,68)] border-none cursor-pointer"
                                aria-label="Stop auto-scroll"
                                title="Stop auto-scroll"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
