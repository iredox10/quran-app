import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getVersesByPage, getTajweedVersesByPage, getChapters } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, Bookmark, Moon, Sun, Globe, Type, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import VerseRow from '../components/VerseRow';
import MushafPageView from '../components/MushafPageView';
import { getMushafById, isTajweedEnabledForMushaf } from '../config/mushaf';
import { sanitizeTajweedHtml } from '../utils/quranText';

const EasingPage = [0.25, 1, 0.5, 1]; // Ethereal paper spring

export default function Page() {
    const { id } = useParams();
    const pageNumber = parseInt(id) || 1;
    const navigate = useNavigate();
    const location = useLocation();

    // App State
    const {
        theme, toggleTheme,
        translationId, reciterId, fontSize, setFontSize,
        readingMode, setReadingMode,
        bookmark, setBookmark, addRecentlyRead,
        mushafId, arabicFont, tajweedEnabled, tafsirId
    } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    // Local UI State
    const [isHudVisible, setIsHudVisible] = useState(false);
    const [isIndexVisible, setIsIndexVisible] = useState(false);
    const [activeTafsir, setActiveTafsir] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrubberValue, setScrubberValue] = useState(pageNumber);

    const containerRef = useRef(null);

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
            // Strip the embedded end-of-ayah marker as we provide our own styled one
            acc[v.verse_key] = sanitizeTajweedHtml(v.text_uthmani_tajweed.replace(/<span class=end>.*?<\/span>/g, ''));
            return acc;
        }, {});
    }, [tajweedData]);

    const verses = pageData?.verses || [];
    const maxPageNumber = mushaf.pageCount || 604;

    // Ambient glow logic based on time
    const currentHour = new Date().getHours();
    const isMorning = currentHour >= 5 && currentHour < 17;
    const glowClass = isMorning ? 'ambient-glow' : 'ambient-glow ambient-glow-evening';

    // Touch & Gesture Logic
    const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
    const [lastTap, setLastTap] = useState(0);

    const handleTouchStart = (e) => {
        // Only track single touch for swipes/taps
        if (e.touches.length === 1) {
            setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    };

    const handleTouchEnd = (e) => {
        if (e.changedTouches.length !== 1) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchStartPos.x - touchEndX;
        const deltaY = Math.abs(touchStartPos.y - touchEndY);

        // Define tap vs swipe
        if (Math.abs(deltaX) < 10 && deltaY < 10) {
            // It's a tap
            const now = Date.now();
            const DOUBLE_TAP_DELAY = 300;
            if (now - lastTap < DOUBLE_TAP_DELAY) {
                // Double tap - toggle HUD
                setIsHudVisible(!isHudVisible);
                setLastTap(0);
                return;
            }
            setLastTap(now);

            // Single tap edge detection for page turning
            const screenWidth = window.innerWidth;
            if (touchEndX < screenWidth * 0.25) {
                // Tap Left edge -> Next Page (Arabic reads Right to Left)
                if (pageNumber < maxPageNumber) navigate(`/page/${pageNumber + 1}`);
            } else if (touchEndX > screenWidth * 0.75) {
                // Tap Right edge -> Prev Page
                if (pageNumber > 1) navigate(`/page/${pageNumber - 1}`);
            } else if (isHudVisible) {
                // Tap center when HUD is visible closes it
                setIsHudVisible(false);
            }
        } else if (Math.abs(deltaX) > 50 && deltaY < 100) {
            // It's a swipe horizontal
            if (deltaX > 0 && pageNumber < maxPageNumber) {
                navigate(`/page/${pageNumber + 1}`); // Swipe Left -> Next Page
            } else if (deltaX < 0 && pageNumber > 1) {
                navigate(`/page/${pageNumber - 1}`); // Swipe Right -> Prev Page
            }
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && pageNumber > 1) {
                navigate(`/page/${pageNumber - 1}`);
            } else if (e.key === 'ArrowLeft' && pageNumber < maxPageNumber) {
                navigate(`/page/${pageNumber + 1}`);
            } else if (e.key === 'Escape') {
                setIsHudVisible(false);
                setIsIndexVisible(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [maxPageNumber, pageNumber, navigate]);

    useEffect(() => {
        window.scrollTo(0, 0);
        setScrubberValue(pageNumber); // Update scrubber on route change
    }, [pageNumber]);

    // Derived metadata
    const activeSurahId = verses.length > 0 ? verses[0].verse_key.split(':')[0] : null;
    const activeSurah = chapters?.find(c => c.id.toString() === activeSurahId);

    // Pinch to open index simulation via gesture hook, omitted for simplicity, instead we'll add a trigger in HUD

    return (
        <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflowX: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
            <Helmet>
                <title>{`Page ${pageNumber} - ${mushaf.name}`}</title>
            </Helmet>

            <div className={glowClass} />

            {/* Main Reading View Layout */}
            <motion.div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{
                    opacity: 1,
                    scale: isIndexVisible ? 0.8 : 1,
                    filter: isIndexVisible || isHudVisible ? 'blur(4px)' : 'blur(0px)',
                    y: isIndexVisible ? '-5%' : '0%'
                }}
                transition={{ duration: 0.6, ease: EasingPage }}
                style={{
                    width: '100%',
                    minHeight: '100vh',
                    padding: '8vh 1.5rem 10vh 1.5rem',
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                {/* Minimal Top Header (Juz / Surah Marker) */}
                <div style={{ textAlign: 'center', marginBottom: '3vh', opacity: isHudVisible || isIndexVisible ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                    <span className="ui-text" style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        {activeSurah ? activeSurah.name_simple : 'Loading...'} • Page {pageNumber} • {mushaf.name}
                    </span>
                </div>

                {mushaf.renderMode === 'qcf-page' && !readingMode ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${pageNumber}-${mushaf.id}`}
                            initial={{ opacity: 0, rotateY: 5 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: -5 }}
                            transition={{ duration: 0.5, ease: EasingPage }}
                            style={{ transformOrigin: 'left center', perspective: '1000px' }}
                        >
                            {isPageLoading && verses.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20vh 0', color: 'var(--text-muted)' }}>
                                    <span className="ui-text">Loading...</span>
                                </div>
                            ) : (
                                <MushafPageView
                                    verses={verses}
                                    mushaf={mushaf}
                                    arabicFont={arabicFont}
                                    fontSize={fontSize}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div style={{
                        display: readingMode ? 'inline-block' : 'block',
                        textAlign: readingMode ? 'justify' : 'left',
                        direction: readingMode ? 'rtl' : 'ltr',
                        width: '100%',
                        maxWidth: '800px',
                        margin: '0 auto'
                    }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pageNumber}
                                initial={{ opacity: 0, rotateY: 5 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                exit={{ opacity: 0, rotateY: -5 }}
                                transition={{ duration: 0.5, ease: EasingPage }}
                                style={{ transformOrigin: 'left center', perspective: '1000px' }}
                            >
                                {isPageLoading && verses.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20vh 0', color: 'var(--text-muted)' }}>
                                        <span className="ui-text">Loading...</span>
                                    </div>
                                ) : (
                                    verses.map((verse) => {
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
                                                tajweedEnabled={isTajweedActive}
                                                tajweedMap={tajweedMap}
                                                activeTafsir={activeTafsir}
                                                setActiveTafsir={setActiveTafsir}
                                                isTafsirFetching={false}
                                                tafsirs={[]}
                                                tafsirId={tafsirId}
                                                showPageDivider={false}
                                                mushaf={mushaf}
                                            />
                                        );
                                    })
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* The HUD */}
            <AnimatePresence>
                {isHudVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ duration: 0.4, ease: EasingPage }}
                        className="glass-panel"
                        style={{
                            position: 'fixed',
                            bottom: '5vh',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '90%',
                            maxWidth: '400px',
                            padding: '1.5rem',
                            zIndex: 50,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem'
                        }}
                    >
                        {/* Interactive Scrubber */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="ui-text" style={{ color: 'var(--text-muted)' }}>1</span>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="range"
                                    min="1"
                                    max={maxPageNumber}
                                    value={scrubberValue}
                                    onChange={(e) => setScrubberValue(parseInt(e.target.value))}
                                    onMouseUp={(e) => {
                                        navigate(`/page/${e.target.value}`);
                                    }}
                                    onTouchEnd={(e) => {
                                        navigate(`/page/${e.target.value}`);
                                    }}
                                    style={{
                                        width: '100%',
                                        accentColor: 'var(--accent-primary)',
                                        background: 'transparent'
                                    }}
                                />
                                <div style={{ position: 'absolute', top: '-25px', left: `${(scrubberValue / maxPageNumber) * 100}%`, transform: 'translateX(-50%)', background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>
                                    {scrubberValue}
                                </div>
                            </div>
                            <span className="ui-text" style={{ color: 'var(--text-muted)' }}>{maxPageNumber}</span>
                        </div>

                        {/* Quick Toggles */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="btn-icon" onClick={() => setIsIndexVisible(true)} aria-label="Surah Index">
                                <BookOpen size={20} />
                            </button>
                            <button className="btn-icon" onClick={() => setReadingMode(!readingMode)} aria-label="Toggle Translation">
                                <Globe size={20} color={readingMode ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
                            </button>
                            <button className="btn-icon" onClick={() => setFontSize(fontSize === 4 ? 1 : fontSize + 1)} aria-label="Typography">
                                <Type size={20} />
                            </button>
                            <button className="btn-icon" onClick={toggleTheme} aria-label="Toggle Theme">
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            </button>
                            <Link to="/" className="btn-icon">
                                <X size={20} />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Surah Index Overlay */}
            <AnimatePresence>
                {isIndexVisible && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.6, ease: EasingPage }}
                        style={{
                            position: 'fixed',
                            top: '15vh',
                            left: 0,
                            width: '100vw',
                            height: '85vh',
                            background: 'var(--bg-surface)',
                            borderTopLeftRadius: '32px',
                            borderTopRightRadius: '32px',
                            boxShadow: '0 -20px 40px rgba(0,0,0,0.1)',
                            zIndex: 100,
                            padding: '2rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Drag Handle & Search */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ position: 'relative', flex: 1, marginRight: '1rem' }}>
                                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    placeholder="Search Surah..."
                                    className="ui-text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                                        borderRadius: '99px',
                                        border: 'none',
                                        background: 'rgba(0,0,0,0.05)',
                                        color: 'var(--text-primary)',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <button className="btn-icon" onClick={() => setIsIndexVisible(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Surah List */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {chapters?.filter(c => c.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) || c.translated_name.name.toLowerCase().includes(searchQuery.toLowerCase())).map(chapter => (
                                <button
                                    key={chapter.id}
                                    onClick={() => {
                                        // Navigate to the first page of this surah
                                        navigate(`/surah/${chapter.id}`); // For now navigate to Surah view or calculate page
                                        setIsIndexVisible(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1.25rem 0',
                                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                                        textAlign: 'left'
                                    }}
                                    className="interactive-hover"
                                >
                                    <span style={{ width: '40px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                                        {String(chapter.id).padStart(2, '0')}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <h3 className="heading-english" style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                            {chapter.name_simple}
                                        </h3>
                                        <span className="ui-text" style={{ color: 'var(--text-muted)' }}>{chapter.translated_name.name}</span>
                                    </div>
                                    <span className="ui-text" style={{ color: 'var(--text-muted)' }}>{chapter.verses_count} Ayahs</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
