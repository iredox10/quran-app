import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ChevronLeft } from 'lucide-react';

import { getVersesByPage, getTajweedVersesByPage, getChapters } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { getMushafById, isTajweedEnabledForMushaf } from '../config/mushaf';
import { sanitizeTajweedHtml } from '../utils/quranText';

import VerseRow from '../components/VerseRow';
import MushafPageView from '../components/MushafPageView';
import AudioSetupModal from '../components/AudioSetupModal';

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

    // App State
    const {
        translationId, reciterId, fontSize,
        readingMode,
        bookmark, setBookmark, addRecentlyRead,
        mushafId, arabicFont, tajweedEnabled, tafsirId,
        setNavHeaderTitle,
        setIsPlaying, isPlaying, audioPlaylist, setAudioPlaylist,
        audioTrackIndex, audioSettings, updateAudioSettings,
        isPlayerVisible, setIsPlayerVisible, playTriggerCount,
        customAudioBaseUrl, localAudioDirHandle
    } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    // Queries
    const { data: pageData, isLoading: isPageLoading } = useQuery({
        queryKey: ['pageVerses', pageNumber, translationId, reciterId, mushafId],
        queryFn: () => getVersesByPage(pageNumber, translationId, reciterId, mushafId),
        placeholderData: keepPreviousData,
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
            acc[v.verse_key] = sanitizeTajweedHtml(v.text_uthmani_tajweed.replace(/<span class=end>.*?<\/span>/g, ''));
            return acc;
        }, {});
    }, [tajweedData]);

    const verses = pageData?.verses || [];
    const maxPageNumber = mushaf.pageCount || 604;

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
                let url = v.audio?.url ? `https://verses.quran.com/${v.audio.url}` : null;
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

    // Handle Top Level Keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && pageNumber > 1) navigate(`/page/${pageNumber - 1}`);
            if (e.key === 'ArrowLeft' && pageNumber < maxPageNumber) navigate(`/page/${pageNumber + 1}`);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pageNumber, maxPageNumber, navigate]);

    // Swipe gestures
    const swipeDirectionRef = useRef(0);
    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            if (pageNumber < maxPageNumber) {
                swipeDirectionRef.current = 1;
                navigate(`/page/${pageNumber + 1}`);
            }
        },
        onSwipedRight: () => {
            if (pageNumber > 1) {
                swipeDirectionRef.current = -1;
                navigate(`/page/${pageNumber - 1}`);
            }
        },
        preventDefaultTouchmoveEvent: false,
        trackTouch: true,
        trackMouse: false,
        delta: 40,
        swipeDuration: 500
    });

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    const handleNextPage = () => {
        if (pageNumber < maxPageNumber) {
            scrollToTop();
            swipeDirectionRef.current = 1;
            navigate(`/page/${pageNumber + 1}`);
        }
    };

    const handlePrevPage = () => {
        if (pageNumber > 1) {
            scrollToTop();
            swipeDirectionRef.current = -1;
            navigate(`/page/${pageNumber - 1}`);
        }
    };

    // Auto-smooth top-scroll when verses change (avoids jank)
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pageNumber]);

    return (
        <div
            {...swipeHandlers}
            className="surah-container container stretch-reading"
            style={{ overflow: 'hidden' }}
        >
            <Helmet>
                <title>{`Page ${pageNumber} - ${mushaf?.name || ''} - The Noble Qur'an`}</title>
            </Helmet>

            <AnimatePresence mode="wait" initial={false} custom={swipeDirectionRef.current}>
                <motion.div
                    key={pageNumber}
                    custom={swipeDirectionRef.current}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={pageTransition}
                    style={{ willChange: 'transform, opacity' }}
                >
                    <div className="surah-hero-card" style={{ padding: 'clamp(1rem, 3vw, 2rem) 1.5rem', marginBottom: '2rem' }}>
                        <div className="surah-bg-glow" />
                        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
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
                                marginBottom: '0.5rem'
                            }}>
                                {mushaf.name} Mushaf
                            </div>
                            <h1 style={{
                                fontSize: 'clamp(2rem, 5vw, 3rem)',
                                fontWeight: 800,
                                margin: 0,
                                lineHeight: 1.2,
                                color: 'var(--text-primary)',
                                letterSpacing: '-1px'
                            }}>
                                Page {pageNumber}
                            </h1>
                            <p style={{
                                color: 'var(--text-muted)',
                                marginTop: '0.8rem',
                                fontSize: '1.1rem',
                                fontWeight: 500
                            }}>
                                {activeSurah ? `${activeSurah.name_simple} (${activeSurah.translated_name.name})` : 'Loading...'}
                            </p>
                        </div>
                    </div>

                    <div style={{ position: 'relative', zIndex: 5, paddingBottom: '4rem' }}>
                        {mushaf.renderMode === 'qcf-page' && !readingMode ? (
                            isPageLoading && verses.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '10vh 0', color: 'var(--text-muted)' }}>
                                    <span className="ui-text">Loading page {pageNumber}...</span>
                                </div>
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
                            <div style={{
                                display: readingMode ? 'inline-block' : 'block',
                                textAlign: readingMode ? 'justify' : 'left',
                                direction: readingMode ? 'rtl' : 'ltr',
                                width: '100%',
                            }}>
                                {isPageLoading && verses.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '10vh 0', color: 'var(--text-muted)' }}>
                                        <span className="ui-text">Loading page {pageNumber}...</span>
                                    </div>
                                ) : (
                                    verses.map((verse) => {
                                        const chId = verse.verse_key.split(':')[0];
                                        const chapterContext = chapters?.find(c => c.id.toString() === chId) || { id: parseInt(chId), name_simple: `Surah ${chId}` };

                                        return (
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
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Bottom Navigation */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '3rem',
                paddingBottom: '2rem'
            }}>
                <button
                    onClick={handleNextPage}
                    disabled={pageNumber >= maxPageNumber}
                    className="interactive-hover"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '1rem 1.5rem', borderRadius: '16px', border: 'none',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        cursor: pageNumber >= maxPageNumber ? 'not-allowed' : 'pointer',
                        opacity: pageNumber >= maxPageNumber ? 0.5 : 1,
                        fontWeight: 600, fontSize: '0.95rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <ChevronLeft size={20} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next</span>
                        <span>Page {pageNumber + 1 > maxPageNumber ? maxPageNumber : pageNumber + 1}</span>
                    </div>
                </button>

                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                    {pageNumber} / {maxPageNumber}
                </div>

                <button
                    onClick={handlePrevPage}
                    disabled={pageNumber <= 1}
                    className="interactive-hover"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '1rem 1.5rem', borderRadius: '16px', border: 'none',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
                        opacity: pageNumber <= 1 ? 0.5 : 1,
                        fontWeight: 600, fontSize: '0.95rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Previous</span>
                        <span>Page {pageNumber - 1 < 1 ? 1 : pageNumber - 1}</span>
                    </div>
                    <ChevronRight size={20} />
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
        </div>
    );
}

