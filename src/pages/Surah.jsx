import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getChapter, getVerses, getChapterAudio, getChapterTafsirs, getTajweedVerses } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, ArrowRight, Play, Pause, BookOpen, Bookmark, Info, X, Download, CloudCheck, RefreshCw, ChevronsDown, Minus, Plus, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useSwipeable } from 'react-swipeable';
import VerseRow from '../components/VerseRow';
import { getMushafById, isTajweedEnabledForMushaf } from '../config/mushaf';
import { sanitizeTajweedHtml } from '../utils/quranText';

// VerseRow is now imported from components
export default function Surah() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const didRegisterReadRef = React.useRef(null);
    const {
        translationId, reciterId, fontSize, translationFontSize,
        readingMode, setReadingMode,
        bookmark, setBookmark,
        addRecentlyRead,
        setAudio, setIsPlaying, currentAudioUrl, isPlaying,
        audioPlaylist, setAudioPlaylist, audioTrackIndex,
        audioSettings, updateAudioSettings,
        mushafId,
        arabicFont, tajweedEnabled,
        tafsirId,
        downloadedSurahs, addDownloadedSurah,
        setNavHeaderTitle,
        autoScroll, setAutoScroll, autoScrollSpeed, setAutoScrollSpeed,
        isAutoScrollPaused, setIsAutoScrollPaused,
        isPlayerVisible, setIsPlayerVisible,
        playTriggerCount,
        logReadingSession
    } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    // Audio setup modal state
    const [showAudioSetup, setShowAudioSetup] = useState(false);
    const [pendingPlaylist, setPendingPlaylist] = useState([]);

    const { data: chapter, isLoading: isChapterLoading } = useQuery({
        queryKey: ['chapter', id],
        queryFn: () => getChapter(id),
    });

    useEffect(() => {
        if (chapter) {
            setNavHeaderTitle(chapter.name_simple);
            // Only register the read once per surah ID to avoid re-firing on every store update or re-render
            if (didRegisterReadRef.current !== chapter.id) {
                didRegisterReadRef.current = chapter.id;
                const queryParams = new URLSearchParams(location.search);
                const initialVerse = queryParams.get('verse');
                addRecentlyRead(chapter.id, chapter.name_simple, initialVerse);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapter?.id]);

    // Cleanup header on unmount
    useEffect(() => {
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    // Track reading session duration
    useEffect(() => {
        const startTime = Date.now();
        return () => {
            const duration = Math.round((Date.now() - startTime) / 1000);
            if (duration >= 10) { // Only log if spent at least 10 seconds
                logReadingSession(duration, 'reading', Number(id));
            }
        };
    }, [id, logReadingSession]);

    const {
        data: versesResponse,
        isLoading: isVersesLoading,
        isFetching: isVersesFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['verses', id, translationId, reciterId, mushafId],
        queryFn: ({ pageParam = 1 }) => getVerses(id, translationId, reciterId, pageParam, mushafId),
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
                return lastPage.pagination.current_page + 1;
            }
            return undefined;
        },
        placeholderData: keepPreviousData,
    });

    const { data: audioData } = useQuery({
        queryKey: ['chapterAudio', id, reciterId],
        queryFn: () => getChapterAudio(id, reciterId),
    });

    const { data: tafsirs, isFetching: isTafsirFetching } = useQuery({
        queryKey: ['tafsirs', id, tafsirId],
        queryFn: () => getChapterTafsirs(id, tafsirId),
        placeholderData: keepPreviousData,
    });

    const [activeTafsir, setActiveTafsir] = useState(null); // stores { verse_key, text }

    const { data: tajweedData } = useQuery({
        queryKey: ['tajweed', id, mushafId],
        queryFn: () => getTajweedVerses(id),
        enabled: isTajweedActive && mushaf.tajweedSource === 'uthmani_html',
    });

    // Build a lookup map: verse_key -> tajweed HTML
    const tajweedMap = React.useMemo(() => {
        if (!tajweedData) return {};
        return tajweedData.reduce((acc, v) => {
            // Strip the embedded end-of-ayah marker as we provide our own styled one
            acc[v.verse_key] = sanitizeTajweedHtml(v.text_uthmani_tajweed.replace(/<span class=end>.*?<\/span>/g, ''));
            return acc;
        }, {});
    }, [tajweedData]);

    const { ref: observerRef, inView } = useInView();

    // Reset active tafsir when tafsir source changes
    useEffect(() => {
        setActiveTafsir(null);
    }, [tafsirId]);

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const verses = versesResponse?.pages.flatMap(page => page.verses) || [];

    // Check if the current playing playlist is from THIS surah
    const isCurrentSurahPlaying = audioPlaylist.length > 0 && String(audioPlaylist[0]?.surahId) === String(id);
    const activeAudioVerseKey = isPlayerVisible && isCurrentSurahPlaying && audioPlaylist[audioTrackIndex]
        ? audioPlaylist[audioTrackIndex].verseKey
        : null;

    const handlePlayClick = () => {
        if (!verses || verses.length === 0) return;

        if (isCurrentSurahPlaying) {
            // Already loaded — just toggle play/pause and show player
            setIsPlaying(!isPlaying);
            setIsPlayerVisible(true);
        } else {
            // Build the playlist and show the setup modal
            const playlist = verses.map(v => ({
                surahId: id,
                verseKey: v.verse_key,
                verseNumber: v.verse_number,
                url: v.audio?.url ? `https://verses.quran.com/${v.audio.url}` : null
            })).filter(v => v.url);

            if (playlist.length > 0) {
                setPendingPlaylist(playlist);
                // Reset range to full surah when opening setup
                updateAudioSettings({ startRange: 0, endRange: playlist.length - 1 });
                setShowAudioSetup(true);
            }
        }
    };

    const handleStartPlaying = () => {
        if (pendingPlaylist.length === 0) return;
        setAudioPlaylist(pendingPlaylist, audioSettings.startRange ?? 0);
        setIsPlaying(true);
        setIsPlayerVisible(true);
        setShowAudioSetup(false);
    };

    const isDownloaded = (downloadedSurahs || []).includes(id);
    const [isDownloading, setIsDownloading] = useState(false);

    // Listen for the navbar audio button — fire handlePlayClick ONLY when count truly increments
    // Store the initial value at mount time; any change after that is a real user press.
    const mountPlayTriggerRef = React.useRef(playTriggerCount);
    useEffect(() => {
        // Ignore the initial render and any re-mount that happens with the same count
        if (playTriggerCount === mountPlayTriggerRef.current) return;
        handlePlayClick();
        mountPlayTriggerRef.current = playTriggerCount;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playTriggerCount]);


    const handleDownloadSurah = async () => {
        if (!audioData?.audio_url || isDownloading) return;

        try {
            setIsDownloading(true);
            const response = await fetch(audioData.audio_url);
            if (response.ok) {
                addDownloadedSurah(id);
            }
        } catch (error) {
            console.error("Audio download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };

    // Auto-scroll logic
    const scrollRafRef = useRef(null);

    useEffect(() => {
        if (!autoScroll) {
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
            return;
        }

        const speedMap = { 1: 0.3, 2: 0.6, 3: 1.0, 4: 1.8, 5: 3.0 };
        const pxPerFrame = speedMap[autoScrollSpeed] || 1.0;

        const tick = () => {
            if (!isAutoScrollPaused) {
                window.scrollBy(0, pxPerFrame);
            }
            // Stop at bottom
            if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 10) {
                setAutoScroll(false);
                return;
            }
            scrollRafRef.current = requestAnimationFrame(tick);
        };

        scrollRafRef.current = requestAnimationFrame(tick);

        return () => {
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        };
    }, [autoScroll, autoScrollSpeed, setAutoScroll, isAutoScrollPaused]);



    // Stop auto-scroll when leaving the page
    useEffect(() => {
        return () => setAutoScroll(false);
    }, [setAutoScroll]);

    const isCurrentAudio = currentAudioUrl === audioData?.audio_url;

    // Removed duplicate verses declaration
    const hasScrolledRef = React.useRef(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const verseKey = queryParams.get('verse');

        // Ensure we only jump to the verse once per unique verseKey, not continuously when scrolling
        if (verseKey && verses.length > 0 && hasScrolledRef.current !== verseKey) {
            const element = document.getElementById(`verse-${verseKey}`);
            if (element) {
                hasScrolledRef.current = verseKey; // Track that we've found and scrolled to it
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Briefly highlight it
                element.style.transition = 'background-color 0.5s';
                element.style.backgroundColor = 'var(--accent-light)';
                setTimeout(() => {
                    element.style.backgroundColor = 'transparent';
                }, 2000);
            } else if (hasNextPage && !isFetchingNextPage) {
                // If the element is not found, aggressively fetch the next page until it appears
                fetchNextPage();
            }
        }
    }, [location.search, verses, isVersesLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Track swipe direction so animation knows which way to slide
    const swipeDirectionRef = React.useRef(0); // -1 = going back (right swipe), 1 = going forward (left swipe)

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            if (parseInt(id) < 114) {
                swipeDirectionRef.current = 1; // forward
                navigate(`/surah/${parseInt(id) + 1}`);
            }
        },
        onSwipedRight: () => {
            if (parseInt(id) > 1) {
                swipeDirectionRef.current = -1; // backward
                navigate(`/surah/${parseInt(id) - 1}`);
            }
        },
        preventScrollOnSwipe: false,
        trackMouse: false,
        delta: 50,
    });

    // Direction-aware page variants
    const pageVariants = {
        enter: (direction) => ({
            x: direction >= 0 ? '60%' : '-60%',
            opacity: 0,
            scale: 0.96,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction) => ({
            x: direction >= 0 ? '-60%' : '60%',
            opacity: 0,
            scale: 0.96,
        }),
    };

    const pageTransition = {
        type: 'spring',
        stiffness: 280,
        damping: 30,
        mass: 0.8,
    };

    if (isChapterLoading || isVersesLoading) return (
        <div className="container" style={{ textAlign: 'center', padding: '10vh 0', color: 'var(--text-muted)' }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginBottom: '1rem' }}
            />
            <h2>Loading Ayahs...</h2>
        </div>
    );

    return (
        <div
            className="container"
            {...swipeHandlers}
            style={{ overflow: 'hidden' }} // Prevent horizontal scrollbar during animation
        >
            {/* Subtle refetch indicator — only shows when re-loading in background (not initial load) */}
            {isVersesFetching && !isVersesLoading && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, height: '3px',
                    zIndex: 2000, overflow: 'hidden', pointerEvents: 'none'
                }}>
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 0.9, ease: 'easeInOut', repeat: Infinity }}
                        style={{
                            height: '100%', width: '40%',
                            background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
                            borderRadius: '4px'
                        }}
                    />
                </div>
            )}
            <Helmet>
                <title>{chapter ? `${chapter.name_simple} - The Noble Qur'an` : "Surah - The Noble Qur'an"}</title>
                <meta name="description" content={`Read and listen to ${chapter?.name_simple} (${chapter?.translated_name.name}) online with translations and Tafsir.`} />
            </Helmet>

            <AnimatePresence mode="wait" initial={false} custom={swipeDirectionRef.current}>
                <motion.div
                    key={id}
                    custom={swipeDirectionRef.current}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={pageTransition}
                    style={{ willChange: 'transform, opacity' }}
                >
                    <Link
                        to="/"
                        className="interactive-hover"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            marginBottom: '2rem',
                            fontWeight: 600
                        }}
                    >
                        <ArrowLeft size={18} /> Back to Surahs
                    </Link>


                    <div className="surah-hero-card" style={{ padding: 'clamp(2rem, 5vw, 4rem) 1.5rem' }}>
                        <div className="surah-bg-glow" />

                        {/* Subtle decorative background Arabic text */}
                        <div style={{
                            fontFamily: "'Amiri Quran', serif",
                            fontSize: 'clamp(8rem, 25vw, 15rem)',
                            position: 'absolute',
                            opacity: 0.04,
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-primary)'
                        }}>
                            {chapter?.name_arabic}
                        </div>

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '0.4rem 1rem',
                                borderRadius: '999px',
                                background: 'var(--accent-light)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                marginBottom: '1.5rem'
                            }}>
                                Surah {chapter?.id}
                            </div>

                            <h1
                                className="surah-title"
                                style={{
                                    fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                                    fontWeight: 800,
                                    marginBottom: '0.5rem',
                                    color: 'var(--text-primary)',
                                    letterSpacing: '-1px'
                                }}
                            >
                                {chapter?.name_simple}
                            </h1>
                            <p style={{
                                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                                color: 'var(--text-secondary)',
                                marginBottom: '2rem',
                                fontWeight: 500
                            }}>
                                {chapter?.translated_name.name} • {chapter?.verses_count} Ayahs • {chapter?.revelation_place}
                            </p>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '1rem',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={handlePlayClick}
                                >
                                    {isCurrentAudio && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                    {isCurrentAudio && isPlaying ? 'Pause Audio' : 'Play Audio'}
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: isDownloaded ? 'var(--accent-light)' : 'var(--bg-primary)',
                                        color: isDownloaded ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        opacity: isDownloading ? 0.7 : 1
                                    }}
                                    onClick={handleDownloadSurah}
                                    disabled={isDownloading || isDownloaded}
                                >
                                    {isDownloading ? 'Downloading...' : isDownloaded ? 'Offline Ready' : 'Download for Offline'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '0 1rem', display: readingMode ? 'block' : 'flex', flexDirection: 'column' }}>
                        {/* Bismillah before Surah text (except Fatiha and Tawbah) */}
                        {chapter?.id !== 1 && chapter?.id !== 9 && (
                            <div className="quran-text" style={{
                                textAlign: 'center',
                                marginBottom: '3rem',
                                fontSize: `${fontSize * 0.4 + 1.5}rem`,
                                color: 'var(--accent-primary)',
                                fontFamily: arabicFont
                            }}>
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                            </div>
                        )}

                        <div style={{
                            display: readingMode ? 'inline-block' : 'block',
                            textAlign: readingMode ? 'justify' : 'left',
                            direction: readingMode ? 'rtl' : 'ltr',
                            lineHeight: readingMode ? 2.5 : 'inherit'
                        }}>
                            {verses.map((verse, index) => {
                                const prevVerse = index > 0 ? verses[index - 1] : null;
                                const showPageDivider = verse.page_number && (!prevVerse || prevVerse.page_number !== verse.page_number);

                                return (
                                    <VerseRow
                                        key={verse.id}
                                        verse={verse}
                                        readingMode={readingMode}
                                        chapter={chapter}
                                        bookmark={bookmark}
                                        setBookmark={setBookmark}
                                        addRecentlyRead={addRecentlyRead}
                                        fontSize={fontSize}
                                        translationFontSize={translationFontSize}
                                        arabicFont={arabicFont}
                                        tajweedEnabled={isTajweedActive}
                                        tajweedMap={tajweedMap}
                                        activeTafsir={activeTafsir}
                                        setActiveTafsir={setActiveTafsir}
                                        isTafsirFetching={isTafsirFetching}
                                        tafsirId={tafsirId}
                                        showPageDivider={showPageDivider}
                                        tafsirs={tafsirs}
                                        mushaf={mushaf}
                                        isAudioPlaying={activeAudioVerseKey === verse.verse_key}
                                    />
                                );
                            })}
                        </div>

                        {/* Infinite Scroll trigger area */}
                        <div ref={observerRef} style={{ padding: '2rem 0', textAlign: 'center' }}>
                            {isFetchingNextPage && (
                                <div style={{ color: 'var(--text-muted)' }}>Loading more Ayahs...</div>
                            )}
                        </div>

                        {/* Footer Navigation */}
                        {!hasNextPage && !isVersesLoading && (
                            <div style={{
                                marginTop: '3rem',
                                paddingTop: '2rem',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                paddingBottom: '2rem'
                            }}>
                                {parseInt(id) > 1 ? (
                                    <button
                                        onClick={() => { swipeDirectionRef.current = -1; navigate(`/surah/${parseInt(id) - 1}`); }}
                                        className="interactive-hover"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                            textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600,
                                            border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <ArrowLeft size={18} /> Previous Surah
                                    </button>
                                ) : <div style={{ flex: 1 }} />}

                                {parseInt(id) < 114 ? (
                                    <button
                                        onClick={() => { swipeDirectionRef.current = 1; navigate(`/surah/${parseInt(id) + 1}`); }}
                                        className="interactive-hover"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                            textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600,
                                            border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Next Surah <ArrowRight size={18} />
                                    </button>
                                ) : <div style={{ flex: 1 }} />}
                            </div>
                        )}
                    </div>

                    {/* Floating Auto-scroll Control */}
                    <AnimatePresence>
                        {autoScroll && (
                            <motion.div
                                initial={{ opacity: 0, y: 40, x: '-50%' }}
                                animate={{ opacity: 1, y: 0, x: '-50%' }}
                                exit={{ opacity: 0, y: 40, x: '-50%' }}
                                transition={{ duration: 0.25 }}
                                style={{
                                    position: 'fixed',
                                    bottom: '100px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 100,
                                }}
                            >
                                {/* Controls Panel */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '9999px',
                                    background: 'var(--glass-bg)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    border: 'var(--glass-border)',
                                    boxShadow: 'var(--shadow-xl)'
                                }}>
                                    {/* Manual scroll buttons */}
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button
                                            className="btn-icon"
                                            style={{ width: '28px', height: '28px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            onClick={() => window.scrollBy({ top: -200, behavior: 'smooth' })}
                                        >
                                            <ArrowLeft size={14} style={{ transform: 'rotate(90deg)' }} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            style={{ width: '28px', height: '28px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            onClick={() => window.scrollBy({ top: 200, behavior: 'smooth' })}
                                        >
                                            <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
                                        </button>
                                    </div>

                                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

                                    {/* Speed Control & Pause */}
                                    <button
                                        className="btn-icon"
                                        style={{ width: '28px', height: '28px', border: '1px solid var(--border-color)', borderRadius: '50%' }}
                                        onClick={() => setAutoScrollSpeed(Math.max(1, autoScrollSpeed - 1))}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', minWidth: '40px', textAlign: 'center' }}>
                                        {autoScrollSpeed}x
                                    </span>
                                    <button
                                        className="btn-icon"
                                        style={{ width: '28px', height: '28px', border: '1px solid var(--border-color)', borderRadius: '50%' }}
                                        onClick={() => setAutoScrollSpeed(Math.min(5, autoScrollSpeed + 1))}
                                    >
                                        <Plus size={14} />
                                    </button>

                                    <button
                                        className="btn-icon"
                                        style={{
                                            width: '32px', height: '32px',
                                            background: isAutoScrollPaused ? 'var(--accent-light)' : 'transparent',
                                            color: 'var(--accent-primary)'
                                        }}
                                        onClick={() => setIsAutoScrollPaused(!isAutoScrollPaused)}
                                    >
                                        {isAutoScrollPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                                    </button>

                                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

                                    <button
                                        onClick={() => setAutoScroll(false)}
                                        style={{
                                            width: '32px', height: '32px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: '50%',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: 'rgb(239, 68, 68)',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                        title="Stop Scroll"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Tafsir Bottom Drawer */}
                    <AnimatePresence>
                        {activeTafsir && (
                            <>
                                {/* Overlay */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setActiveTafsir(null)}
                                    style={{
                                        position: 'fixed',
                                        inset: 0,
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        zIndex: 999,
                                        backdropFilter: 'blur(4px)',
                                        WebkitBackdropFilter: 'blur(4px)'
                                    }}
                                />
                                {/* Drawer */}
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    style={{
                                        position: 'fixed',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'var(--bg-surface)',
                                        zIndex: 1000,
                                        borderTopLeftRadius: '24px',
                                        borderTopRightRadius: '24px',
                                        padding: '1.5rem 1.5rem 2rem 1.5rem',
                                        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.1)',
                                        maxHeight: '80vh',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderTop: '1px solid var(--border-color)'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '5px',
                                        background: 'var(--border-color)',
                                        borderRadius: '3px',
                                        margin: '0 auto 1.5rem auto'
                                    }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                            Tafsir (Ayah {activeTafsir.verse_key.split(':')[1]})
                                        </h3>
                                        <button
                                            className="btn-icon"
                                            onClick={() => setActiveTafsir(null)}
                                            style={{ background: 'var(--bg-secondary)' }}
                                            aria-label="Close Tafsir"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div
                                        className="tafsir-content"
                                        style={{
                                            overflowY: 'auto',
                                            paddingRight: '0.5rem',
                                            color: 'var(--text-secondary)',
                                            lineHeight: 1.8,
                                            fontSize: '1rem'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: activeTafsir.text }}
                                    />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* ── Audio Setup Modal (shown before playback starts) ── */}
                    <AnimatePresence>
                        {showAudioSetup && (
                            <>
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    onClick={() => setShowAudioSetup(false)}
                                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, backdropFilter: 'blur(4px)' }}
                                />
                                {/* Bottom Drawer — outer row handles centering via flex */}
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                    style={{
                                        position: 'fixed',
                                        bottom: 0, left: 0, right: 0,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        zIndex: 1101,
                                    }}
                                >
                                    {/* Inner card — constrained width */}
                                    <div style={{
                                        width: '100%',
                                        maxWidth: '520px',
                                        maxHeight: '85vh',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        background: 'var(--bg-surface)',
                                        borderTopLeftRadius: '24px',
                                        borderTopRightRadius: '24px',
                                        boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
                                        border: '1px solid var(--border-color)',
                                        borderBottom: 'none',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Drag handle */}
                                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem', paddingBottom: '0.25rem', flexShrink: 0 }}>
                                            <div style={{ width: '40px', height: '5px', borderRadius: '9999px', background: 'var(--border-color)' }} />
                                        </div>
                                        {/* Sticky Header */}
                                        <div style={{ padding: '0 1.5rem 1rem', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Audio Setup</h3>
                                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                        Configure before playing · {pendingPlaylist.length} Ayahs
                                                    </p>
                                                </div>
                                                <button className="btn-icon" onClick={() => setShowAudioSetup(false)} style={{ background: 'var(--bg-secondary)', width: '36px', height: '36px', flexShrink: 0 }}>
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Scrollable settings body */}
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                            {/* Range */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                                                    Ayah Range
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>From</label>
                                                        <select
                                                            className="form-input"
                                                            value={audioSettings.startRange ?? 0}
                                                            onChange={(e) => updateAudioSettings({ startRange: Number(e.target.value) })}
                                                        >
                                                            {pendingPlaylist.map((v, i) => (
                                                                <option key={v.verseKey} value={i}>{v.verseKey}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>To</label>
                                                        <select
                                                            className="form-input"
                                                            value={audioSettings.endRange ?? pendingPlaylist.length - 1}
                                                            onChange={(e) => updateAudioSettings({ endRange: Number(e.target.value) })}
                                                        >
                                                            {pendingPlaylist.map((v, i) => (
                                                                <option key={v.verseKey} value={i}>{v.verseKey}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Repeat */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                                                    Repeat
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Each Ayah</label>
                                                        <select className="form-input" value={audioSettings.repeatAya} onChange={(e) => updateAudioSettings({ repeatAya: Number(e.target.value) })}>
                                                            {[1, 2, 3, 5, 10, -1].map(opt => <option key={opt} value={opt}>{opt === -1 ? '∞ Infinite' : `${opt}×`}</option>)}
                                                        </select>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Full Selection</label>
                                                        <select className="form-input" value={audioSettings.repeatSelection} onChange={(e) => updateAudioSettings({ repeatSelection: Number(e.target.value) })}>
                                                            {[1, 2, 3, 5, 10, -1].map(opt => <option key={opt} value={opt}>{opt === -1 ? '∞ Infinite' : `${opt}×`}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Advanced */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                                                    Advanced
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Delay Between Ayahs</label>
                                                        <select className="form-input" value={audioSettings.delayBetweenAyas} onChange={(e) => updateAudioSettings({ delayBetweenAyas: Number(e.target.value) })}>
                                                            {[0, 1, 2, 3, 5, 10].map(opt => <option key={opt} value={opt}>{opt === 0 ? 'None' : `${opt}s`}</option>)}
                                                        </select>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Playback Speed</label>
                                                        <select className="form-input" value={audioSettings.playbackSpeed} onChange={(e) => updateAudioSettings({ playbackSpeed: Number(e.target.value) })}>
                                                            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(opt => <option key={opt} value={opt}>{opt}×</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Auto-scroll toggle */}
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={audioSettings.scrollWhilePlaying}
                                                    onChange={(e) => updateAudioSettings({ scrollWhilePlaying: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', flexShrink: 0 }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Auto-scroll while playing</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highlights and scrolls to each Ayah</div>
                                                </div>
                                            </label>

                                        </div>{/* end scrollable body */}

                                        {/* Pinned Start Playing button */}
                                        <div style={{ padding: '1rem 1.5rem 1.5rem', flexShrink: 0 }}>
                                            <button
                                                className="btn-primary"
                                                onClick={handleStartPlaying}
                                                style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                            >
                                                <Play size={20} fill="currentColor" />
                                                Start Playing
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
