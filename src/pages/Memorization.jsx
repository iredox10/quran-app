import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVerses, getChapter } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { Mic, EyeOff, Eye, Repeat, ArrowLeft, ArrowRight, X, Play, ShieldAlert, Award, Languages } from 'lucide-react';

export default function Memorization() {
    const { id } = useParams(); // Surah ID
    const navigate = useNavigate();
    const { setNavHeaderTitle, arabicFont, fontSize, translationId } = useAppStore();

    const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
    const [isBlurred, setIsBlurred] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);

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
    const currentVerse = verses[currentVerseIndex];

    const handleNext = () => {
        if (currentVerseIndex < verses.length - 1) setCurrentVerseIndex(p => p + 1);
        setIsBlurred(false);
    };

    const handlePrev = () => {
        if (currentVerseIndex > 0) setCurrentVerseIndex(p => p - 1);
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

    if (!currentVerse) return null;

    return (
        <div style={{ position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

            {/* Top Controls */}
            <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
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
                    <Repeat size={16} /> <span style={{ fontSize: '0.875rem' }}>Loop 3x</span>
                </div>
            </div>

            {/* Central Verse Display */}
            <div className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <motion.div
                    key={currentVerse.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                        textAlign: 'center',
                        filter: isBlurred ? 'blur(8px)' : 'none',
                        transition: 'filter 0.3s ease',
                        cursor: isBlurred ? 'pointer' : 'default',
                        maxWidth: '800px'
                    }}
                    onClick={() => isBlurred && setIsBlurred(false)}
                >
                    <div className="quran-text" style={{ fontSize: `${(fontSize * 0.4) + 2.5}rem`, fontFamily: arabicFont, lineHeight: 2.2, color: 'var(--text-primary)' }}>
                        {currentVerse.text_uthmani}
                    </div>
                    <div style={{
                        marginTop: '2rem',
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
                        <span>Page {currentVerse.page_number}</span>
                        <span>•</span>
                        <span>Verse {currentVerse.verse_key.split(':')[1]}</span>
                    </div>

                    <AnimatePresence>
                        {showTranslation && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="text-english"
                                style={{
                                    marginTop: '2rem',
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
                                {currentVerse.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '')}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Left/Right Nav */}
                <button onClick={handlePrev} disabled={currentVerseIndex === 0} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: currentVerseIndex === 0 ? 'default' : 'pointer', opacity: currentVerseIndex === 0 ? 0.2 : 0.6 }}>
                    <ArrowLeft size={32} />
                </button>
                <button onClick={handleNext} disabled={currentVerseIndex === verses.length - 1} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: currentVerseIndex === verses.length - 1 ? 'default' : 'pointer', opacity: currentVerseIndex === verses.length - 1 ? 0.2 : 0.6 }}>
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
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Verse {currentVerse.verse_key.split(':')[1]} - Word 3</div>
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
