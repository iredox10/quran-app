import React, { useEffect, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getChapter, getVerses, getChapterAudio, getChapterTafsirs, getTajweedVerses } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, Play, Pause, BookOpen, Bookmark, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

export default function Surah() {
    const { id } = useParams();
    const {
        translationId, reciterId, fontSize,
        readingMode, setReadingMode,
        bookmarks, toggleBookmark,
        setLastRead,
        setAudio, setIsPlaying, currentAudioUrl, isPlaying,
        arabicFont, tajweedEnabled
    } = useAppStore();

    const { data: chapter, isLoading: isChapterLoading } = useQuery({
        queryKey: ['chapter', id],
        queryFn: () => getChapter(id),
    });

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

    const { data: tafsirs } = useQuery({
        queryKey: ['tafsirs', id],
        queryFn: () => getChapterTafsirs(id),
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

    const isCurrentAudio = currentAudioUrl === audioData?.audio_url;

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

    const verses = versesResponse?.pages.flatMap(page => page.verses) || [];

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

            <div style={{
                padding: '3rem',
                background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-surface))',
                borderRadius: '24px',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                marginBottom: '3rem',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                overflow: 'hidden'
            }}>
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

                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
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
                        fontSize: `${fontSize * 0.5 + 2}rem`,
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
                        const isBookmarked = (bookmarks || []).includes(verse.verse_key);
                        const prevVerse = index > 0 ? verses[index - 1] : null;
                        const showPageDivider = verse.page_number && (!prevVerse || prevVerse.page_number !== verse.page_number);

                        const pageDivider = showPageDivider ? (
                            <div
                                key={`page-${verse.page_number}`}
                                data-page={verse.page_number}
                                className="page-divider"
                                style={{
                                    display: readingMode ? 'block' : 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem 0',
                                    margin: readingMode ? '1.5rem 0' : '0',
                                    direction: 'ltr',
                                    width: '100%'
                                }}
                            >
                                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--accent-primary), transparent)' }} />
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'var(--accent-primary)',
                                    backgroundColor: 'var(--accent-light)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    whiteSpace: 'nowrap',
                                    fontFamily: "'Outfit', sans-serif"
                                }}>
                                    Page {verse.page_number}
                                </span>
                                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--accent-primary), transparent)' }} />
                            </div>
                        ) : null;

                        if (readingMode) {
                            return (
                                <React.Fragment key={verse.id}>
                                    {pageDivider}
                                    <span className="quran-text tajweed-text" style={{
                                        fontSize: `${fontSize * 0.5 + 2}rem`,
                                        marginRight: '0.5rem',
                                        display: 'inline',
                                        fontFamily: arabicFont
                                    }}>
                                        {tajweedEnabled && tajweedMap[verse.verse_key]
                                            ? <span dangerouslySetInnerHTML={{ __html: tajweedMap[verse.verse_key] }} />
                                            : verse.text_uthmani
                                        }
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '1.2em',
                                            height: '1.2em',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.4em',
                                            margin: '0 0.5rem',
                                            position: 'relative',
                                            bottom: '0.3em'
                                        }}>
                                            {verse.verse_key.split(':')[1]}
                                        </span>
                                    </span>
                                </React.Fragment>
                            );
                        }

                        // Translation Mode
                        return (
                            <React.Fragment key={verse.id}>
                                {pageDivider}
                                <div style={{
                                    borderBottom: '1px solid var(--border-color)',
                                    padding: '2.5rem 0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5rem',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--accent-light)',
                                                color: 'var(--accent-primary)',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem'
                                            }}>
                                                {verse.verse_key.split(':')[1]}
                                            </div>
                                            <button
                                                className="btn-icon"
                                                style={{ color: isBookmarked ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                                onClick={() => toggleBookmark(verse.verse_key)}
                                                title="Bookmark Verse"
                                            >
                                                <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                style={{ color: activeTafsir?.verse_key === verse.verse_key ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                                title="Read Tafsir"
                                                onClick={() => {
                                                    if (activeTafsir?.verse_key === verse.verse_key) {
                                                        setActiveTafsir(null);
                                                    } else {
                                                        const tafsirObj = tafsirs?.find((t) => t.verse_key === verse.verse_key);
                                                        setActiveTafsir({
                                                            verse_key: verse.verse_key,
                                                            text: tafsirObj ? tafsirObj.text : 'Tafsir is not available for this individual verse at the moment.'
                                                        });
                                                    }
                                                }}
                                            >
                                                <Info size={20} />
                                            </button>
                                        </div>

                                        {/* Arabic Text */}
                                        <div
                                            className="quran-text tajweed-text"
                                            style={{
                                                flex: 1,
                                                textAlign: 'right',
                                                paddingLeft: '2rem',
                                                fontSize: `${fontSize * 0.5 + 2}rem`,
                                                lineHeight: 2.2,
                                                fontFamily: arabicFont
                                            }}
                                        >
                                            {tajweedEnabled && tajweedMap[verse.verse_key]
                                                ? <span dangerouslySetInnerHTML={{ __html: tajweedMap[verse.verse_key] }} />
                                                : verse.text_uthmani
                                            }
                                        </div>
                                    </div>

                                    {/* Translation */}
                                    <div className="text-english" style={{
                                        paddingRight: '60px',
                                        fontSize: `${fontSize * 0.1 + 1.1}rem`,
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.6
                                    }}>
                                        {verse.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '')} {/* Strip basic HTML from translations */}
                                    </div>

                                    {/* Tafsir Inline Block */}
                                    <AnimatePresence>
                                        {activeTafsir?.verse_key === verse.verse_key && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{
                                                    marginTop: '1.5rem',
                                                    padding: '1.5rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '12px',
                                                    borderLeft: '4px solid var(--accent-primary)',
                                                    position: 'relative'
                                                }}>
                                                    <button
                                                        onClick={() => setActiveTafsir(null)}
                                                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
                                                        Tafsir Ibn Kathir (Abridged)
                                                    </h4>
                                                    <div
                                                        className="tafsir-content quran-tafsir-html"
                                                        style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.8 }}
                                                        dangerouslySetInnerHTML={{ __html: activeTafsir.text }}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </React.Fragment>
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
