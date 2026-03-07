import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getChapter, getVerses, getChapterAudio, getChapterTafsirs, getTajweedVerses } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, ArrowRight, Play, Pause, BookOpen, Bookmark, Info, X, Download, CloudCheck, RefreshCw, ChevronsDown, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import VerseRow from '../components/VerseRow';

// VerseRow is now imported from components
export default function Surah() {
    const { id } = useParams();
    const location = useLocation();
    const {
        translationId, reciterId, fontSize, translationFontSize,
        readingMode, setReadingMode,
        bookmark, setBookmark,
        addRecentlyRead,
        setAudio, setIsPlaying, currentAudioUrl, isPlaying,
        arabicFont, tajweedEnabled,
        tafsirId,
        downloadedSurahs, addDownloadedSurah,
        setNavHeaderTitle,
        autoScroll, setAutoScroll, autoScrollSpeed, setAutoScrollSpeed
    } = useAppStore();

    const { data: chapter, isLoading: isChapterLoading } = useQuery({
        queryKey: ['chapter', id],
        queryFn: () => getChapter(id),
    });

    useEffect(() => {
        if (chapter) {
            const queryParams = new URLSearchParams(location.search);
            const initialVerse = queryParams.get('verse');
            addRecentlyRead(chapter.id, chapter.name_simple, initialVerse);
            setNavHeaderTitle(chapter.name_simple);
        }
    }, [chapter, addRecentlyRead, location.search, setNavHeaderTitle]);

    // Cleanup header on unmount
    useEffect(() => {
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const {
        data: versesResponse,
        isLoading: isVersesLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['verses', id, translationId, reciterId],
        queryFn: ({ pageParam = 1 }) => getVerses(id, translationId, reciterId, pageParam),
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
                return lastPage.pagination.current_page + 1;
            }
            return undefined;
        },
    });

    const { data: audioData } = useQuery({
        queryKey: ['chapterAudio', id, reciterId],
        queryFn: () => getChapterAudio(id, reciterId),
    });

    const { data: tafsirs, isFetching: isTafsirFetching } = useQuery({
        queryKey: ['tafsirs', id, tafsirId],
        queryFn: () => getChapterTafsirs(id, tafsirId),
    });

    const [activeTafsir, setActiveTafsir] = useState(null); // stores { verse_key, text }

    const { data: tajweedData } = useQuery({
        queryKey: ['tajweed', id],
        queryFn: () => getTajweedVerses(id),
        enabled: tajweedEnabled,
    });

    // Build a lookup map: verse_key -> tajweed HTML
    const tajweedMap = React.useMemo(() => {
        if (!tajweedData) return {};
        return tajweedData.reduce((acc, v) => {
            // Strip the embedded end-of-ayah marker as we provide our own styled one
            acc[v.verse_key] = v.text_uthmani_tajweed.replace(/<span class=end>.*?<\/span>/g, '');
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

    const handlePlayClick = () => {
        if (!audioData) return;

        if (currentAudioUrl === audioData.audio_url) {
            setIsPlaying(!isPlaying);
        } else {
            setAudio(audioData.audio_url);
            setIsPlaying(true);
        }
    };

    const isDownloaded = (downloadedSurahs || []).includes(id);
    const [isDownloading, setIsDownloading] = useState(false);

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
            window.scrollBy(0, pxPerFrame);
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
    }, [autoScroll, autoScrollSpeed, setAutoScroll]);

    // Stop auto-scroll when leaving the page
    useEffect(() => {
        return () => setAutoScroll(false);
    }, [setAutoScroll]);

    const isCurrentAudio = currentAudioUrl === audioData?.audio_url;

    const verses = versesResponse?.pages.flatMap(page => page.verses) || [];
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
                element.style.backgroundColor = 'var(--accent-light)';
                setTimeout(() => {
                    element.style.backgroundColor = 'transparent';
                }, 2000);
            }
        }
    }, [location.search, verses, isVersesLoading]);

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
        <div className="container">
            <Helmet>
                <title>{chapter ? `${chapter.name_simple} - The Noble Qur'an` : "Surah - The Noble Qur'an"}</title>
                <meta name="description" content={`Read and listen to ${chapter?.name_simple} (${chapter?.translated_name.name}) online with translations and Tafsir.`} />
            </Helmet>

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
                                tajweedEnabled={tajweedEnabled}
                                tajweedMap={tajweedMap}
                                activeTafsir={activeTafsir}
                                setActiveTafsir={setActiveTafsir}
                                isTafsirFetching={isTafsirFetching}
                                tafsirId={tafsirId}
                                showPageDivider={showPageDivider}
                                tafsirs={tafsirs}
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
                            <Link
                                to={`/surah/${parseInt(id) - 1}`}
                                className="interactive-hover"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                    textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600,
                                    border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center'
                                }}
                            >
                                <ArrowLeft size={18} /> Previous Surah
                            </Link>
                        ) : <div style={{ flex: 1 }} />}

                        {parseInt(id) < 114 ? (
                            <Link
                                to={`/surah/${parseInt(id) + 1}`}
                                className="interactive-hover"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                    textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600,
                                    border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center'
                                }}
                            >
                                Next Surah <ArrowRight size={18} />
                            </Link>
                        ) : <div style={{ flex: 1 }} />}
                    </div>
                )}
            </div>

            {/* Floating Auto-scroll Control */}
            <AnimatePresence>
                {autoScroll && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            position: 'fixed',
                            bottom: '100px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '9999px',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: 'var(--glass-border)',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <ChevronsDown size={16} color="var(--accent-primary)" />
                        <button
                            className="btn-icon"
                            style={{ width: '28px', height: '28px', border: '1px solid var(--border-color)', borderRadius: '50%' }}
                            onClick={() => setAutoScrollSpeed(Math.max(1, autoScrollSpeed - 1))}
                        >
                            <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', minWidth: '50px', textAlign: 'center' }}>
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
                            onClick={() => setAutoScroll(false)}
                            style={{
                                padding: '0.3rem 0.75rem',
                                borderRadius: '9999px',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Stop
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
