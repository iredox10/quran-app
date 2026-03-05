import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVersesByPage, getTajweedVersesByPage } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import VerseRow from '../components/VerseRow';

export default function Page() {
    const { id } = useParams();
    const pageNumber = parseInt(id) || 1;
    const navigate = useNavigate();
    const location = useLocation();

    const {
        translationId, reciterId, fontSize,
        readingMode, setReadingMode,
        bookmark, setBookmark, addRecentlyRead,
        arabicFont, tajweedEnabled, tafsirId
    } = useAppStore();

    const [activeTafsir, setActiveTafsir] = useState(null);

    const { data: pageData, isLoading: isPageLoading } = useQuery({
        queryKey: ['pageVerses', pageNumber, translationId, reciterId],
        queryFn: () => getVersesByPage(pageNumber, translationId, reciterId),
        keepPreviousData: true,
    });

    const { data: tajweedData } = useQuery({
        queryKey: ['tajweedPage', pageNumber],
        queryFn: () => getTajweedVersesByPage(pageNumber),
        enabled: tajweedEnabled,
    });

    const tajweedMap = React.useMemo(() => {
        if (!tajweedData) return {};
        return tajweedData.reduce((acc, v) => {
            acc[v.verse_key] = v.text_uthmani_tajweed;
            return acc;
        }, {});
    }, [tajweedData]);

    const verses = pageData?.verses || [];

    // Touch handlers for swipe
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && pageNumber < 604) {
            navigate(`/page/${pageNumber + 1}`);
        }
        if (isRightSwipe && pageNumber > 1) {
            navigate(`/page/${pageNumber - 1}`);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && pageNumber > 1) {
                navigate(`/page/${pageNumber - 1}`);
            } else if (e.key === 'ArrowLeft' && pageNumber < 604) {
                navigate(`/page/${pageNumber + 1}`);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pageNumber, navigate]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pageNumber]);

    // Handle initial scrolling
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const verseKey = queryParams.get('verse');
        if (verseKey && verses.length > 0) {
            const element = document.getElementById(`verse-${verseKey}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.backgroundColor = 'var(--accent-light)';
                setTimeout(() => {
                    element.style.backgroundColor = 'transparent';
                }, 2000);
            }
        }
    }, [location.search, verses, isPageLoading]);


    if (isPageLoading && verses.length === 0) return (
        <div className="container" style={{ textAlign: 'center', padding: '10vh 0', color: 'var(--text-muted)' }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginBottom: '1rem' }}
            />
            <h2>Loading Page {pageNumber}...</h2>
        </div>
    );

    return (
        <div
            className="container"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ position: 'relative', minHeight: '80vh', paddingBottom: '6rem' }}
        >
            <Helmet>
                <title>{`Page ${pageNumber} - The Noble Qur'an`}</title>
                <meta name="description" content={`Read page ${pageNumber} of the Noble Qur'an online with translations and Tafsir.`} />
            </Helmet>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <Link
                    to="/"
                    className="interactive-hover"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}
                >
                    <ArrowLeft size={18} /> Back Home
                </Link>

                <button
                    className="btn-primary"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem' }}
                    onClick={() => setReadingMode(!readingMode)}
                >
                    <BookOpen size={18} style={{ marginRight: '8px' }} />
                    {readingMode ? 'Translation Mode' : 'Reading Mode'}
                </button>
            </div>

            <div
                className="surah-header"
                style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '16px', textAlign: 'center', marginBottom: '3rem', border: '1px solid var(--border-color)' }}
            >
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Page {pageNumber}
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Swipe or use arrows to navigate pages</p>
            </div>

            <div style={{
                display: readingMode ? 'inline-block' : 'block',
                textAlign: readingMode ? 'justify' : 'left',
                direction: readingMode ? 'rtl' : 'ltr',
                lineHeight: readingMode ? 2.5 : 'inherit',
                width: '100%'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pageNumber}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {verses.map((verse, index) => {
                            const prevVerse = index > 0 ? verses[index - 1] : null;
                            const showPageDivider = false; // We are already in page view.

                            // Mock chapter since page endpoint doesn't return full chapter object
                            // We can use the surah number from verse_key (e.g. "2:255" -> Surah 2)
                            const chId = verse.verse_key.split(':')[0];
                            const chapter = { id: parseInt(chId), name_simple: `Surah ${chId}` };

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
                                    isTafsirFetching={false} // Would need custom hook if we add tafsir by page
                                    tafsirs={[]}
                                    tafsirId={tafsirId}
                                    showPageDivider={showPageDivider}
                                />
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '1rem',
                zIndex: 50,
                background: 'var(--bg-primary)',
                padding: '0.5rem',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <button
                    className="btn-icon"
                    onClick={() => pageNumber > 1 && navigate(`/page/${pageNumber - 1}`)}
                    disabled={pageNumber <= 1}
                    style={{ opacity: pageNumber <= 1 ? 0.3 : 1, width: '40px', height: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '50%' }}
                >
                    <ChevronLeft size={24} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: 600 }}>
                    {pageNumber} / 604
                </div>
                <button
                    className="btn-icon"
                    onClick={() => pageNumber < 604 && navigate(`/page/${pageNumber + 1}`)}
                    disabled={pageNumber >= 604}
                    style={{ opacity: pageNumber >= 604 ? 0.3 : 1, width: '40px', height: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '50%' }}
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
}
