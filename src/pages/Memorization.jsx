import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVerses, getChapter, getTajweedVerses } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { Mic, EyeOff, Eye, Repeat, ArrowLeft, ArrowRight, X, Play, Pause, ShieldAlert, Award, Languages, Layers, RefreshCw, Clock, Bookmark, FolderPlus, Plus, Folder, Settings2, CheckCircle } from 'lucide-react';
import { getMushafById, isTajweedEnabledForMushaf } from '../config/mushaf';
import { getVerseArabicText, sanitizeTajweedHtml } from '../utils/quranText';
import { getLocalAudioUrl } from '../utils/localAudio';



const DELAY_OPTIONS = [0, 1, 2, 3, 5, 10];
const RANGE_LOOP_OPTIONS = [1, 2, 3, 5, 10, -1];
const AYAH_REPEAT_OPTIONS = [1, 2, 3, 5, 10, -1];

export default function Memorization() {
    const { id } = useParams(); // Surah ID
    const navigate = useNavigate();
    const {
        setNavHeaderTitle, arabicFont, fontSize, translationFontSize, translationId, mushafId,
        bookmarks, toggleBookmark, collections, addCollection, addToCollection,
        tajweedEnabled, logReadingSession,
        memorizedAyahs, memorizedSurahs, toggleMemorizedAyah, toggleMemorizedSurah,
        customAudioBaseUrl, localAudioDirHandle
    } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    // Track memorization session duration
    useEffect(() => {
        const startTime = Date.now();
        return () => {
            const duration = Math.round((Date.now() - startTime) / 1000);
            if (duration >= 10) {
                logReadingSession(duration, 'memorizing', Number(id));
            }
        };
    }, [id, logReadingSession]);

    const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
    const [isBlurred, setIsBlurred] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);
    const [ayahsPerSwipe, setAyahsPerSwipe] = useState(1);
    const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [showUI, setShowUI] = useState(true);
    const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);

    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioVerseIndex, setAudioVerseIndex] = useState(0); // 0 to ayahsPerSwipe - 1
    const [rangeLoopTarget, setRangeLoopTarget] = useState(1); // 1 = play once, -1 = Infinite
    const [rangeLoopCurrent, setRangeLoopCurrent] = useState(0);
    const [ayahRepeatTarget, setAyahRepeatTarget] = useState(1); // 1 = play once, -1 = Infinite
    const [currentAyahPlayCount, setCurrentAyahPlayCount] = useState(0);
    const [ayahDelay, setAyahDelay] = useState(0); // Uses DELAY_OPTIONS values in seconds

    const [resolvedAudioUrl, setResolvedAudioUrl] = useState(null);
    const delayTimeoutRef = React.useRef(null);
    const audioRef = React.useRef(null);

    // Stop audio when user flips pages manually
    useEffect(() => {
        setIsPlayingAudio(false);
        setAudioVerseIndex(0);
        setRangeLoopCurrent(0);
        setCurrentAyahPlayCount(0);
        if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
        if (audioRef.current) {
            audioRef.current.pause();
        }
    }, [currentVerseIndex, ayahsPerSwipe]);

    useEffect(() => {
        if (isPlayingAudio && audioRef.current) {
            audioRef.current.play().catch(e => {
                console.error("Audio playback error", e);
                setIsPlayingAudio(false);
            });
        }
    }, [isPlayingAudio, audioVerseIndex, currentVerseIndex]); // Depend on currentVerseIndex to ensure changes propagate

    const handleAudioEnded = () => {
        const nextAction = () => {
            // Repeat current ayah if target not reached
            if (ayahRepeatTarget === -1 || currentAyahPlayCount + 1 < ayahRepeatTarget) {
                if (ayahRepeatTarget !== -1) setCurrentAyahPlayCount(prev => prev + 1);
                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(e => console.error(e));
                }
                return;
            }

            // Move to next ayah, reset local play count
            setCurrentAyahPlayCount(0);

            if (audioVerseIndex < currentVerses.length - 1) {
                setAudioVerseIndex(prev => prev + 1);
            } else {
                // Reached end of selection mode range
                if (rangeLoopTarget === -1) { // Infinite Loop Range
                    setAudioVerseIndex(0);
                } else if (rangeLoopCurrent + 1 < rangeLoopTarget) { // Loop Range
                    setRangeLoopCurrent(prev => prev + 1);
                    setAudioVerseIndex(0);
                } else {
                    // Finished loops
                    setIsPlayingAudio(false);
                    setRangeLoopCurrent(0);
                    setAudioVerseIndex(0);
                }
            }
        };

        if (ayahDelay > 0) {
            if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
            delayTimeoutRef.current = setTimeout(nextAction, ayahDelay * 1000);
        } else {
            nextAction();
        }
    };

    const toggleAudio = () => {
        if (isPlayingAudio) {
            setIsPlayingAudio(false);
            if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
            if (audioRef.current) audioRef.current.pause();
        } else {
            setIsPlayingAudio(true);
            if (audioVerseIndex >= currentVerses.length) setAudioVerseIndex(0);
        }
    };

    const { data: chapter, isLoading: isChapterLoading } = useQuery({
        queryKey: ['memorizeChapter', id],
        queryFn: () => getChapter(id),
    });

    const { data: versesResponse, isLoading: isVersesLoading } = useQuery({
        queryKey: ['memorizeVerses', id, translationId, mushafId],
        queryFn: () => getVerses(id, translationId, 7, 1, mushafId),
    });

    const { data: tajweedData } = useQuery({
        queryKey: ['memorizeTajweed', id, mushafId],
        queryFn: () => getTajweedVerses(id),
        enabled: isTajweedActive && mushaf.tajweedSource === 'uthmani_html',
    });

    const tajweedMap = React.useMemo(() => {
        if (!tajweedData) return {};
        return tajweedData.reduce((acc, v) => {
            acc[v.verse_key] = sanitizeTajweedHtml(v.text_uthmani_tajweed.replace(/<span class=end>.*?<\/span>/g, ''));
            return acc;
        }, {});
    }, [tajweedData]);

    useEffect(() => {
        if (chapter) {
            setNavHeaderTitle(`Hifdh Mode: ${chapter.name_simple}`);
        } else {
            setNavHeaderTitle(`Hifdh Mode: Surah ${id}`);
        }
        return () => setNavHeaderTitle(null);
    }, [id, chapter, setNavHeaderTitle]);

    useEffect(() => {
        let hideTimer;
        const handleActivity = () => {
            setShowUI(true);
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => setShowUI(false), 3000);
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('click', handleActivity);
        handleActivity(); // trigger immediately

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('click', handleActivity);
            if (hideTimer) clearTimeout(hideTimer);
        };
    }, []);

    const verses = versesResponse?.verses || [];

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const verseKey = queryParams.get('verse');
        if (verseKey && verses.length > 0) {
            const index = verses.findIndex(v => v.verse_key === verseKey);
            if (index !== -1) {
                setCurrentVerseIndex(index);
            }
        }
    }, [verses]);

    let currentVerses = [];
    if (verses.length > 0) {
        if (ayahsPerSwipe === -1) {
            let startIdx = currentVerseIndex;
            const currentPage = verses[startIdx].page_number;
            // Ensure we are exactly at the start of the page
            while (startIdx > 0 && verses[startIdx - 1].page_number === currentPage) {
                startIdx--;
            }
            let endIdx = startIdx;
            while (endIdx < verses.length && verses[endIdx].page_number === currentPage) {
                endIdx++;
            }
            currentVerses = verses.slice(startIdx, endIdx);
        } else {
            currentVerses = verses.slice(currentVerseIndex, currentVerseIndex + ayahsPerSwipe);
        }
    }

    const handleNext = () => {
        const step = ayahsPerSwipe === -1 ? currentVerses.length : ayahsPerSwipe;
        if (currentVerseIndex + step < verses.length) {
            setCurrentVerseIndex(p => p + step);
        }
        setIsBlurred(false);
    };

    const handlePrev = () => {
        if (ayahsPerSwipe === -1) {
            if (currentVerseIndex > 0) {
                const prevPage = verses[currentVerseIndex - 1].page_number;
                let newIndex = currentVerseIndex - 1;
                while (newIndex > 0 && verses[newIndex - 1].page_number === prevPage) {
                    newIndex--;
                }
                setCurrentVerseIndex(newIndex);
            }
        } else {
            if (currentVerseIndex - ayahsPerSwipe >= 0) {
                setCurrentVerseIndex(p => p - ayahsPerSwipe);
            } else {
                setCurrentVerseIndex(0);
            }
        }
        setIsBlurred(false);
    };

    // Keyboard and Swipe Navigation
    useEffect(() => {
        const surahId = Number(id);

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            }
            // ArrowUp / ArrowDown are left to default browser scroll behavior
        };

        let touchStartX = 0;
        let touchStartY = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        };

        const handleTouchEnd = (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const SWIPE_THRESHOLD = 50;

            // Only handle horizontal swipes — vertical is left to natural page scroll
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
                // Horizontal swipe → navigate ayahs
                if (deltaX < 0) {
                    handleNext();
                } else {
                    handlePrev();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [currentVerseIndex, verses.length, ayahsPerSwipe, id, navigate]);

    const handleMicToggle = () => {
        if (isRecording) {
            setIsRecording(false);
            // Simulate processing then showing analysis modal
            setTimeout(() => {
                setShowAnalysis(true);
            }, 800);
        } else {
            setIsRecording(true);
        }
    };

    // Build the audio URL depending on custom settings
    const activeAudioVerse = currentVerses[audioVerseIndex];
    let audioUrl = activeAudioVerse?.audio?.url ? `https://verses.quran.com/${activeAudioVerse.audio.url}` : null;

    if (activeAudioVerse) {
        const [surahNum, ayahNum] = activeAudioVerse.verse_key.split(':');
        const fileName = `${String(surahNum).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;

        if (localAudioDirHandle) {
            audioUrl = `local-audio://${fileName}`;
        } else if (customAudioBaseUrl) {
            audioUrl = `${customAudioBaseUrl.replace(/\/$/, '')}/${fileName}`;
        }
    }

    // Resolve local-audio:// to object URL if needed
    useEffect(() => {
        if (!audioUrl) {
            setResolvedAudioUrl(null);
            return;
        }

        if (audioUrl.startsWith('local-audio://') && localAudioDirHandle) {
            const fileName = audioUrl.replace('local-audio://', '');
            getLocalAudioUrl(localAudioDirHandle, fileName).then(url => {
                setResolvedAudioUrl(url || audioUrl); // fallback
            });
        } else {
            setResolvedAudioUrl(audioUrl);
        }
    }, [audioUrl, localAudioDirHandle]);


    if (isVersesLoading || isChapterLoading) {
        return <div className="container" style={{ textAlign: 'center', paddingTop: '10vh' }}>Loading Hifdh Mode...</div>;
    }

    if (verses.length === 0) return null;

    return (
        <div style={{ position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

            {/* Hidden Audio Player for Memorization Sequence */}
            {resolvedAudioUrl && (
                <audio
                    ref={audioRef}
                    src={resolvedAudioUrl}
                    onEnded={handleAudioEnded}
                    onError={(e) => {
                        console.error('Audio playback error', e);
                        setIsPlayingAudio(false);
                    }}
                />
            )}

            {/* Top Controls */}
            <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', opacity: showUI ? 1 : 0, transition: 'opacity 0.4s', pointerEvents: showUI ? 'auto' : 'none' }}>

                <div style={{ position: 'relative' }}>
                    <button
                        className="btn-icon"
                        onClick={() => setIsAudioSettingsOpen(!isAudioSettingsOpen)}
                        style={{
                            background: (ayahRepeatTarget !== 1 || ayahDelay > 0 || rangeLoopTarget !== 1) ? 'var(--accent-light)' : 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            color: (ayahRepeatTarget !== 1 || ayahDelay > 0 || rangeLoopTarget !== 1) ? 'var(--accent-primary)' : 'inherit'
                        }}
                        title="Audio Repeat Settings"
                    >
                        <Settings2 size={20} />
                    </button>

                    <AnimatePresence>
                        {isAudioSettingsOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                style={{
                                    position: 'absolute',
                                    top: '120%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '240px',
                                    background: 'var(--bg-surface)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '1rem',
                                    zIndex: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>Repeat Settings</h4>
                                    <button
                                        onClick={() => setIsAudioSettingsOpen(false)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Ayah Repeat Option */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <RefreshCw size={14} /> Ayah
                                    </div>
                                    <select
                                        value={ayahRepeatTarget}
                                        onChange={(e) => {
                                            setAyahRepeatTarget(Number(e.target.value));
                                            setCurrentAyahPlayCount(0);
                                        }}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '8px',
                                            padding: '4px 8px',
                                            fontSize: '0.8rem',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {AYAH_REPEAT_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt === 1 ? "1x" : opt === -1 ? "Infinite" : `${opt}x`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Delay Option */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <Clock size={14} /> Delay
                                    </div>
                                    <select
                                        value={ayahDelay}
                                        onChange={(e) => setAyahDelay(Number(e.target.value))}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '8px',
                                            padding: '4px 8px',
                                            fontSize: '0.8rem',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {DELAY_OPTIONS.map(delay => (
                                            <option key={delay} value={delay}>
                                                {delay === 0 ? "None" : `${delay}s`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Range Loop Option */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <Repeat size={14} /> Range
                                    </div>
                                    <select
                                        value={rangeLoopTarget}
                                        onChange={(e) => {
                                            setRangeLoopTarget(Number(e.target.value));
                                            setRangeLoopCurrent(0);
                                        }}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '8px',
                                            padding: '4px 8px',
                                            fontSize: '0.8rem',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {RANGE_LOOP_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt === 1 ? "1x" : opt === -1 ? "Infinite" : `${opt}x`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <button
                    className="btn-icon"
                    onClick={() => setIsBlurred(!isBlurred)}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                    title={isBlurred ? "Reveal Text" : "Mask Text (Test Memory)"}
                >
                    {isBlurred ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
                <button
                    className="btn-icon"
                    onClick={() => setShowTranslation(!showTranslation)}
                    style={{ background: showTranslation ? 'var(--accent-light)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: showTranslation ? 'var(--accent-primary)' : 'inherit' }}
                    title={showTranslation ? "Hide Translation" : "Show Translation"}
                >
                    <Languages size={20} />
                </button>
                <div
                    onClick={() => setIsCollectionsOpen(!isCollectionsOpen)}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <FolderPlus size={16} /> <span style={{ fontSize: '0.875rem' }}>Collections</span>

                    <AnimatePresence>
                        {isCollectionsOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    position: 'absolute',
                                    top: '120%',
                                    left: 0,
                                    width: '240px',
                                    background: 'var(--bg-surface)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '1rem',
                                    zIndex: 100,
                                    textAlign: 'left'
                                }}
                            >
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Add to Collection</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
                                    {(collections || []).map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                currentVerses.forEach(v => {
                                                    addToCollection(c.id, v.verse_key, chapter?.name_simple, chapter?.id);
                                                });
                                                setIsCollectionsOpen(false);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '0.5rem',
                                                background: 'none',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s',
                                                width: '100%'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <Folder size={14} /> {c.name}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="New collection..."
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            fontSize: '0.8rem',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (newCollectionName.trim()) {
                                                const newId = Date.now();
                                                addCollection(newCollectionName.trim(), newId);
                                                currentVerses.forEach(v => {
                                                    addToCollection(newId, v.verse_key, chapter?.name_simple, chapter?.id);
                                                });
                                                setNewCollectionName('');
                                                setIsCollectionsOpen(false);
                                            }
                                        }}
                                        style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <Layers size={16} />
                    <select
                        value={ayahsPerSwipe}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setAyahsPerSwipe(val);
                            if (val === -1 && verses.length > 0) {
                                const currentPage = verses[currentVerseIndex].page_number;
                                let startIdx = currentVerseIndex;
                                while (startIdx > 0 && verses[startIdx - 1].page_number === currentPage) {
                                    startIdx--;
                                }
                                setCurrentVerseIndex(startIdx);
                            } else {
                                setCurrentVerseIndex(0);
                            }
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            outline: 'none',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value={1} style={{ color: 'black' }}>1 Ayah</option>
                        <option value={3} style={{ color: 'black' }}>3 Ayahs</option>
                        <option value={5} style={{ color: 'black' }}>5 Ayahs</option>
                        <option value={10} style={{ color: 'black' }}>10 Ayahs</option>
                        <option value={-1} style={{ color: 'black' }}>By Page</option>
                    </select>
                </div>
            </div>

            {/* Central Verse Display */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '2rem 0', width: '100%', padding: '0 1.5rem', boxSizing: 'border-box' }}>
                <motion.div
                    key={`${currentVerseIndex}-${ayahsPerSwipe}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                        textAlign: 'center',
                        filter: isBlurred ? 'blur(8px)' : 'none',
                        transition: 'filter 0.3s ease',
                        cursor: isBlurred ? 'pointer' : 'default',
                        width: '100%',
                        maxWidth: '800px',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2rem'
                    }}
                    onClick={() => isBlurred && setIsBlurred(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
                        {currentVerses.map((verse, idx) => (
                            <div key={verse.id}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', minHeight: '64px' }}>
                                    <div className="quran-text tajweed-text" style={{
                                        fontSize: `clamp(${0.9 + fontSize * 0.15}rem, ${fontSize * 1.2}vw, ${fontSize * 0.4 + 1.5}rem)`,
                                        fontFamily: arabicFont,
                                        lineHeight: 2.2,
                                        color: (isPlayingAudio && audioVerseIndex === idx) ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        transition: 'color 0.3s ease',
                                        textAlign: 'center',
                                        direction: 'rtl'
                                    }}>
                                        {isTajweedActive && tajweedMap?.[verse.verse_key]
                                            ? <span dangerouslySetInnerHTML={{ __html: tajweedMap[verse.verse_key] }} />
                                            : getVerseArabicText(verse, mushaf)
                                        }
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        opacity: isBlurred ? 0 : 1,
                                        transition: 'all 0.3s'
                                    }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleBookmark(verse.verse_key, chapter?.name_simple, chapter?.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: bookmarks?.find(b => b.verseKey === verse.verse_key) ? 'var(--accent-primary)' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                padding: '0.5rem',
                                            }}
                                            title="Bookmark Ayah"
                                        >
                                            <Bookmark size={24} fill={bookmarks?.find(b => b.verseKey === verse.verse_key) ? 'currentColor' : 'none'} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMemorizedAyah(verse.verse_key);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: (memorizedAyahs || []).includes(verse.verse_key) ? 'var(--status-success, #10b981)' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                padding: '0.5rem',
                                            }}
                                            title="Mark Ayah as Memorized"
                                        >
                                            <CheckCircle size={24} fill={(memorizedAyahs || []).includes(verse.verse_key) ? 'currentColor' : 'none'} color={(memorizedAyahs || []).includes(verse.verse_key) ? 'white' : 'currentColor'} />
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {showTranslation && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -10 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -10 }}
                                            className="text-english"
                                            style={{
                                                marginTop: '1.5rem',
                                                padding: '1.5rem',
                                                background: 'var(--bg-surface)',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-secondary)',
                                                fontSize: `${(translationFontSize || 2) * 0.15 + 0.75}rem`,
                                                lineHeight: 1.6,
                                                boxShadow: 'var(--shadow-sm)',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {verse.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '')}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Left/Right Nav */}
            <button onClick={handlePrev} disabled={currentVerseIndex === 0} style={{ position: 'fixed', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: currentVerseIndex === 0 ? 'default' : 'pointer', opacity: showUI ? (currentVerseIndex === 0 ? 0.2 : 0.6) : 0, transition: 'opacity 0.4s', pointerEvents: showUI ? 'auto' : 'none', zIndex: 10 }}>
                <ArrowLeft size={32} />
            </button>
            <button onClick={handleNext} disabled={currentVerseIndex + currentVerses.length >= verses.length} style={{ position: 'fixed', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: currentVerseIndex + currentVerses.length >= verses.length ? 'default' : 'pointer', opacity: showUI ? (currentVerseIndex + currentVerses.length >= verses.length ? 0.2 : 0.6) : 0, transition: 'opacity 0.4s', pointerEvents: showUI ? 'auto' : 'none', zIndex: 10 }}>
                <ArrowRight size={32} />
            </button>

            {/* Surah Info Bar - Positioned at bottom center, below play button */}
            <div style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                flexWrap: 'wrap',
                opacity: showUI ? 1 : 0,
                transition: 'opacity 0.4s',
                pointerEvents: showUI ? 'auto' : 'none',
                zIndex: 30
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Surah {chapter?.name_simple}</span>
                    <button
                        onClick={() => chapter?.id && toggleMemorizedSurah(chapter.id)}
                        style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            color: (memorizedSurahs || []).includes(chapter?.id) ? 'var(--status-success, #10b981)' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center',
                            marginLeft: '4px'
                        }}
                        title={(memorizedSurahs || []).includes(chapter?.id) ? "Surah Memorized" : "Mark Surah as Memorized"}
                    >
                        <Award size={18} fill={(memorizedSurahs || []).includes(chapter?.id) ? 'currentColor' : 'none'} />
                    </button>
                </div>
                <span>•</span>
                <span>Page {currentVerses[0]?.page_number}</span>
                <span>•</span>
                <span>Verses {currentVerses[0]?.verse_key.split(':')[1]}{currentVerses.length > 1 ? ` - ${currentVerses[currentVerses.length - 1]?.verse_key.split(':')[1]}` : ''}</span>
            </div>

            {/* Floating Play Control */}
            <div style={{ position: 'fixed', bottom: '6rem', left: '50%', transform: 'translateX(-50%)', zIndex: 40, opacity: showUI ? 1 : 0, transition: 'opacity 0.4s', pointerEvents: showUI ? 'auto' : 'none' }}>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleAudio}
                    animate={isPlayingAudio ? { scale: [1, 1.1, 1], boxShadow: ["0px 0px 0px rgba(198,168,124,0)", "0px 0px 30px rgba(198,168,124,0.6)", "0px 0px 0px rgba(198,168,124,0)"] } : {}}
                    transition={{ repeat: isPlayingAudio ? Infinity : 0, duration: 1.5 }}
                    style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        backgroundColor: isPlayingAudio ? 'var(--accent-hover)' : 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-lg)',
                        cursor: 'pointer'
                    }}
                >
                    {isPlayingAudio ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: '4px' }} />}
                </motion.button>
            </div>

            {/* AI Recitation Analysis Modal */}
            <AnimatePresence>
                {showAnalysis && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(26, 26, 24, 0.4)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="glass-panel"
                            style={{
                                width: '90%',
                                maxWidth: '500px',
                                background: 'var(--bg-primary)',
                                padding: '2.5rem',
                                borderRadius: '24px',
                                boxShadow: 'var(--shadow-lg)',
                                border: '1px solid var(--accent-light)',
                                position: 'relative'
                            }}
                        >
                            <button onClick={() => setShowAnalysis(false)} className="btn-icon" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
                                <X size={20} />
                            </button>

                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Analysis Results</h3>
                                <div style={{
                                    width: '120px', height: '120px',
                                    borderRadius: '50%',
                                    background: 'conic-gradient(var(--accent-primary) 92%, var(--bg-surface) 0)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
                                }}>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>92<span style={{ fontSize: '1rem' }}>%</span></span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accuracy</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Detected Errors</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', borderLeft: '4px solid #dc2626' }}>
                                    <ShieldAlert size={20} color="#dc2626" style={{ marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Missed Ghunnah</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Verses {currentVerses.map(v => v.verse_key.split(':')[1]).join(', ')}</div>
                                        <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <Play size={14} /> Listen to Expert
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', borderLeft: '4px solid var(--accent-primary)' }}>
                                    <Award size={20} color="var(--accent-primary)" style={{ marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Perfect Makhraj</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pronunciation of 'Qaaf' was excellent.</div>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
