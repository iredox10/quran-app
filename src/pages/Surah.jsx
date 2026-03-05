import React, { useEffect, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getChapter, getVerses, getChapterAudio, getChapterTafsirs, getTajweedVerses } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, Play, Pause, BookOpen, Bookmark, Info, X, Download, CloudCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import VerseRow from '../components/VerseRow';

// VerseRow is now imported from components
export default function Surah() {
    const { id } = useParams();
    const location = useLocation();
    const {
        translationId, reciterId, fontSize,
        readingMode, setReadingMode,
        bookmark, setBookmark,
        addRecentlyRead,
        setAudio, setIsPlaying, currentAudioUrl, isPlaying,
        arabicFont, tajweedEnabled,
        tafsirId,
        downloadedSurahs, addDownloadedSurah
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
        }
    }, [chapter, addRecentlyRead]);

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
            acc[v.verse_key] = v.text_uthmani_tajweed;
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

    const isCurrentAudio = currentAudioUrl === audioData?.audio_url;

    const verses = versesResponse?.pages.flatMap(page => page.verses) || [];

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const verseKey = queryParams.get('verse');
        if (verseKey && verses.length > 0) {
            // Find the verse in currently loaded pages
            const element = document.getElementById(`verse-${verseKey}`);
            if (element) {
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

            <div
                className="surah-header"
                style={{
                    padding: '3rem',
                    background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-surface))',
                    borderRadius: '24px',
                    textAlign: 'center',
                    marginBottom: '3rem',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-lg)'
                }}
            >
                {/* Subtle decorative background Arabic text */}
                <div style={{
                    fontFamily: "'Amiri Quran', serif",
                    fontSize: '12rem',
                    position: 'absolute',
                    opacity: 0.03,
                    top: '-2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}>
                    {chapter?.name_arabic}
                </div>

                <h1
                    className="surah-title"
                    style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}
                >
                    {chapter?.name_simple}
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {chapter?.translated_name.name} • {chapter?.verses_count} Ayahs • {chapter?.revelation_place}
                </p>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1rem'
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
                        {isDownloading ? (
                            <RefreshCw size={18} className="spin" />
                        ) : isDownloaded ? (
                            <CloudCheck size={18} />
                        ) : (
                            <Download size={18} />
                        )}
                        {isDownloading ? 'Downloading...' : isDownloaded ? 'Offline Ready' : 'Download for Offline'}
                    </button>
                    <button
                        className="btn-primary"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                        onClick={() => setReadingMode(!readingMode)}
                    >
                        <BookOpen size={18} style={{ marginRight: '8px' }} />
                        {readingMode ? 'Translation Mode' : 'Reading Mode'}
                    </button>
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
            </div>
        </div>
    );
}
