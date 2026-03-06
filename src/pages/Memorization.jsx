import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVerses, getChapter } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { Mic, EyeOff, Eye, Repeat, ArrowLeft, ArrowRight, X, Play, Pause, ShieldAlert, Award, Languages, Layers, RefreshCw, Clock } from 'lucide-react';

const toArabicNumerals = (num) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).split('').map(char => arabicNumbers[parseInt(char)]).join('');
};

const DELAY_OPTIONS = [0, 1, 2, 3, 5, 10];

export default function Memorization() {
    const { id } = useParams(); // Surah ID
    const navigate = useNavigate();
    const { setNavHeaderTitle, arabicFont, fontSize, translationId } = useAppStore();

    const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
    const [isBlurred, setIsBlurred] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);
    const [ayahsPerSwipe, setAyahsPerSwipe] = useState(1);

    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioVerseIndex, setAudioVerseIndex] = useState(0); // 0 to ayahsPerSwipe - 1
    const [loopMode, setLoopMode] = useState(0); // 0 = No loop, 1 = Loop 3x, 2 = Infinite Loop
    const [loopCount, setLoopCount] = useState(0);
    const [ayahRepeatMode, setAyahRepeatMode] = useState(0); // 0 = 1x, 1 = 3x, 2 = 5x, 3 = Infinite
    const [currentAyahPlayCount, setCurrentAyahPlayCount] = useState(0);
    const [ayahDelay, setAyahDelay] = useState(0); // Uses DELAY_OPTIONS values in seconds
    const delayTimeoutRef = React.useRef(null);
    const audioRef = React.useRef(null);

    // Stop audio when user flips pages manually
    useEffect(() => {
        setIsPlayingAudio(false);
        setAudioVerseIndex(0);
        setLoopCount(0);
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
            let targetRepeat = 1;
            if (ayahRepeatMode === 1) targetRepeat = 3;
            else if (ayahRepeatMode === 2) targetRepeat = 5;
            else if (ayahRepeatMode === 3) targetRepeat = Infinity;

            // Repeat current ayah if target not reached
            if (currentAyahPlayCount + 1 < targetRepeat) {
                setCurrentAyahPlayCount(prev => prev + 1);
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
                if (loopMode === 1) { // 3x Loop Range
                    if (loopCount < 2) {
                        setLoopCount(prev => prev + 1);
                        setAudioVerseIndex(0);
                    } else {
                        setIsPlayingAudio(false);
                        setLoopCount(0);
                        setAudioVerseIndex(0);
                    }
                } else if (loopMode === 2) { // Infinite Loop Range
                    setAudioVerseIndex(0);
                } else {
                    // No loop
                    setIsPlayingAudio(false);
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

    const cycleLoopMode = () => {
        setLoopMode(prev => (prev + 1) % 3);
        setLoopCount(0); // Reset count on mode switch
    };

    const getLoopLabel = () => {
        if (loopMode === 0) return "No Range Loop";
        if (loopMode === 1) return `Range 3x (${loopCount + 1}/3)`;
        return "Range ∞";
    };

    const cycleAyahRepeatMode = () => {
        setAyahRepeatMode(prev => (prev + 1) % 4);
        setCurrentAyahPlayCount(0);
    };

    const getAyahRepeatLabel = () => {
        if (ayahRepeatMode === 0) return "Ayah 1x";
        if (ayahRepeatMode === 1) return `Ayah 3x (${currentAyahPlayCount + 1}/3)`;
        if (ayahRepeatMode === 2) return `Ayah 5x (${currentAyahPlayCount + 1}/5)`;
        return "Ayah ∞";
    };

    const { data: chapter, isLoading: isChapterLoading } = useQuery({
        queryKey: ['memorizeChapter', id],
        queryFn: () => getChapter(id),
    });

    const { data: versesResponse, isLoading: isVersesLoading } = useQuery({
        queryKey: ['memorizeVerses', id, translationId],
        queryFn: () => getVerses(id, translationId, 7, 1),
    });

    useEffect(() => {
        if (chapter) {
            setNavHeaderTitle(`Hifdh Mode: ${chapter.name_simple}`);
        } else {
            setNavHeaderTitle(`Hifdh Mode: Surah ${id}`);
        }
        return () => setNavHeaderTitle(null);
    }, [id, chapter, setNavHeaderTitle]);

    const verses = versesResponse?.verses || [];
    const currentVerses = verses.slice(currentVerseIndex, currentVerseIndex + ayahsPerSwipe);

    const handleNext = () => {
        if (currentVerseIndex + ayahsPerSwipe < verses.length) {
            setCurrentVerseIndex(p => p + ayahsPerSwipe);
        }
        setIsBlurred(false);
    };

    const handlePrev = () => {
        if (currentVerseIndex - ayahsPerSwipe >= 0) {
            setCurrentVerseIndex(p => p - ayahsPerSwipe);
        } else {
            setCurrentVerseIndex(0);
        }
        setIsBlurred(false);
    };

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

    if (isVersesLoading || isChapterLoading) {
        return <div className="container" style={{ textAlign: 'center', paddingTop: '10vh' }}>Loading Hifdh Mode...</div>;
    }

    if (verses.length === 0) return null;

    return (
        <div style={{ position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

            {/* Hidden Audio Player for Memorization Sequence */}
            {currentVerses[audioVerseIndex]?.audio?.url && (
                <audio
                    ref={audioRef}
                    src={`https://verses.quran.com/${currentVerses[audioVerseIndex].audio.url}`}
                    onEnded={handleAudioEnded}
                />
            )}

            {/* Top Controls */}
            <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                    className="btn-icon"
                    onClick={toggleAudio}
                    style={{ background: isPlayingAudio ? 'var(--accent-light)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: isPlayingAudio ? 'var(--accent-primary)' : 'inherit' }}
                    title={isPlayingAudio ? "Pause Audio" : "Play selected Ayahs"}
                >
                    {isPlayingAudio ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <div
                    onClick={cycleAyahRepeatMode}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: ayahRepeatMode > 0 ? 'var(--accent-light)' : 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid var(--border-color)', color: ayahRepeatMode > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.3s' }}>
                    <RefreshCw size={16} /> <span style={{ fontSize: '0.875rem' }}>{getAyahRepeatLabel()}</span>
                </div>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: ayahDelay > 0 ? 'var(--accent-light)' : 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid var(--border-color)', color: ayahDelay > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    <Clock size={16} />
                    <select
                        value={ayahDelay}
                        onChange={(e) => setAyahDelay(Number(e.target.value))}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            outline: 'none',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                        }}
                    >
                        {DELAY_OPTIONS.map(delay => (
                            <option key={delay} value={delay} style={{ color: 'black' }}>
                                {delay === 0 ? "No Delay" : `Delay ${delay}s`}
                            </option>
                        ))}
                    </select>
                </div>
                <div
                    onClick={cycleLoopMode}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: loopMode > 0 ? 'var(--accent-light)' : 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid var(--border-color)', color: loopMode > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.3s' }}>
                    <Repeat size={16} /> <span style={{ fontSize: '0.875rem' }}>{getLoopLabel()}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <Layers size={16} />
                    <select
                        value={ayahsPerSwipe}
                        onChange={(e) => {
                            setAyahsPerSwipe(Number(e.target.value));
                            setCurrentVerseIndex(0);
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
                    </select>
                </div>
            </div>

            {/* Central Verse Display */}
            <div className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '2rem 0' }}>
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
                        maxWidth: '800px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem'
                    }}
                    onClick={() => isBlurred && setIsBlurred(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {currentVerses.map((verse, idx) => (
                            <div key={verse.id}>
                                <div className="quran-text" style={{
                                    fontSize: `${(fontSize * 0.4) + 2.5}rem`,
                                    fontFamily: arabicFont,
                                    lineHeight: 2.2,
                                    color: (isPlayingAudio && audioVerseIndex === idx) ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    transition: 'color 0.3s ease'
                                }}>
                                    {verse.text_uthmani} <span style={{ fontSize: '0.5em', color: 'var(--accent-primary)', padding: '0 8px', verticalAlign: 'middle' }}>{toArabicNumerals(verse.verse_key.split(':')[1])}</span>
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
                                                fontSize: `${(fontSize * 0.1) + 1}rem`,
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

                    <div style={{
                        marginTop: '1rem',
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.9rem',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Surah {chapter?.name_simple}</span>
                        <span>•</span>
                        <span>Page {currentVerses[0]?.page_number}</span>
                        <span>•</span>
                        <span>Verses {currentVerses[0]?.verse_key.split(':')[1]}{currentVerses.length > 1 ? ` - ${currentVerses[currentVerses.length - 1]?.verse_key.split(':')[1]}` : ''}</span>
                    </div>
                </motion.div>

                {/* Left/Right Nav */}
                <button onClick={handlePrev} disabled={currentVerseIndex === 0} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: currentVerseIndex === 0 ? 'default' : 'pointer', opacity: currentVerseIndex === 0 ? 0.2 : 0.6 }}>
                    <ArrowLeft size={32} />
                </button>
                <button onClick={handleNext} disabled={currentVerseIndex + ayahsPerSwipe >= verses.length} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: currentVerseIndex + ayahsPerSwipe >= verses.length ? 'default' : 'pointer', opacity: currentVerseIndex + ayahsPerSwipe >= verses.length ? 0.2 : 0.6 }}>
                    <ArrowRight size={32} />
                </button>
            </div>

            {/* Floating Mic Control */}
            <div style={{ position: 'fixed', bottom: '4rem', left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleMicToggle}
                    animate={isRecording ? { scale: [1, 1.1, 1], boxShadow: ["0px 0px 0px rgba(198,168,124,0)", "0px 0px 30px rgba(198,168,124,0.6)", "0px 0px 0px rgba(198,168,124,0)"] } : {}}
                    transition={{ repeat: isRecording ? Infinity : 0, duration: 1.5 }}
                    style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        backgroundColor: isRecording ? '#dc2626' : 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-lg)',
                        cursor: 'pointer'
                    }}
                >
                    <Mic size={32} />
                </motion.button>
                {isRecording && <div style={{ position: 'absolute', width: '100%', textAlign: 'center', bottom: '-30px', color: '#dc2626', fontWeight: 600, fontSize: '0.875rem' }}>Listening...</div>}
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
