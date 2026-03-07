import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Play, Pause, X, Music, SkipBack, SkipForward, Square, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DELAY_OPTIONS = [0, 1, 2, 3, 5, 10];
const REPEAT_OPTIONS = [1, 2, 3, 5, 10, -1];
const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function GlobalAudioPlayer() {
    const {
        currentAudioUrl, audioPlaylist, audioTrackIndex, isPlaying, audioSettings,
        setAudioTrackIndex, updateAudioSettings, setIsPlaying, stopAudio
    } = useAppStore();

    const audioRef = useRef(null);
    const delayTimeoutRef = useRef(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentAyaLoopCount, setCurrentAyaLoopCount] = useState(0);
    const [currentSelectionLoopCount, setCurrentSelectionLoopCount] = useState(0);

    // Auto-scroll logic happens locally or via store? 
    // The user requested "scroll while playing". We can just highlight and scroll to the verse.
    useEffect(() => {
        if (isPlaying && audioSettings.scrollWhilePlaying && audioPlaylist.length > 0) {
            const currentVerse = audioPlaylist[audioTrackIndex];
            if (currentVerse?.verseKey) {
                const element = document.getElementById(`verse-${currentVerse.verseKey}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.style.transition = 'background-color 0.5s';
                    element.style.backgroundColor = 'var(--accent-light)';
                    setTimeout(() => {
                        if (element) element.style.backgroundColor = 'transparent';
                    }, 2000);
                }
            }
        }
    }, [audioTrackIndex, isPlaying, audioPlaylist, audioSettings.scrollWhilePlaying]);

    const activeUrl = audioPlaylist.length > 0 ? audioPlaylist[audioTrackIndex]?.url : currentAudioUrl;

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = audioSettings.playbackSpeed;
            if (isPlaying && activeUrl) {
                if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
                audioRef.current.play().catch(e => {
                    console.error("Audio playback failed", e);
                    setIsPlaying(false);
                });
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, activeUrl, audioSettings.playbackSpeed]);

    // Handle end of track
    const handleEnded = () => {
        if (currentAudioUrl) {
            // Legacy single file ended
            setIsPlaying(false);
            return;
        }

        // Playlist logic
        if (audioPlaylist.length === 0) return;

        // Reset play logic helper
        const playNext = (index) => {
            if (audioSettings.delayBetweenAyas > 0) {
                audioRef.current?.pause(); // ensure paused during delay
                delayTimeoutRef.current = setTimeout(() => {
                    setAudioTrackIndex(index);
                }, audioSettings.delayBetweenAyas * 1000);
            } else {
                setAudioTrackIndex(index);
            }
        };

        // 1. Check Aya Repeat
        if (audioSettings.repeatAya === -1 || currentAyaLoopCount + 1 < audioSettings.repeatAya) {
            setCurrentAyaLoopCount(prev => prev + 1);
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
            return;
        }

        // Aya repeats finished, move to next
        setCurrentAyaLoopCount(0);

        const endRange = audioSettings.endRange !== null ? audioSettings.endRange : audioPlaylist.length - 1;
        const startRange = audioSettings.startRange !== null ? audioSettings.startRange : 0;

        // 2. Check if we reached end of selection
        if (audioTrackIndex >= endRange || audioTrackIndex >= audioPlaylist.length - 1) {
            // Evaluate selection repeat
            if (audioSettings.repeatSelection === -1 || currentSelectionLoopCount + 1 < audioSettings.repeatSelection) {
                setCurrentSelectionLoopCount(prev => prev + 1);
                playNext(startRange);
            } else {
                // Completely finished
                setCurrentSelectionLoopCount(0);
                setIsPlaying(false);
                setAudioTrackIndex(startRange);
            }
        } else {
            // Just move to next track
            playNext(audioTrackIndex + 1);
        }
    };

    const handleNext = () => {
        if (audioPlaylist.length === 0) return;
        const endRange = audioSettings.endRange !== null ? audioSettings.endRange : audioPlaylist.length - 1;
        if (audioTrackIndex < endRange) {
            setAudioTrackIndex(audioTrackIndex + 1);
            setCurrentAyaLoopCount(0);
        }
    };

    const handlePrev = () => {
        if (audioPlaylist.length === 0) return;
        const startRange = audioSettings.startRange !== null ? audioSettings.startRange : 0;
        if (audioTrackIndex > startRange) {
            setAudioTrackIndex(audioTrackIndex - 1);
            setCurrentAyaLoopCount(0);
        } else {
            // Restart current track if at beginning
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
    };

    if (!currentAudioUrl && audioPlaylist.length === 0) return null;

    const currentTitle = audioPlaylist.length > 0
        ? `Ayah ${audioPlaylist[audioTrackIndex]?.verseNumber || '...'}`
        : 'Recitation';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0, x: '-50%' }}
                animate={{ y: 0, opacity: 1, x: '-50%' }}
                exit={{ y: 100, opacity: 0, x: '-50%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    width: 'max-content',
                    maxWidth: '96vw',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--glass-bg)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: 'var(--glass-border)',
                    zIndex: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    borderRadius: '9999px',
                    boxShadow: 'var(--shadow-xl)'
                }}
            >
                <audio
                    ref={audioRef}
                    src={activeUrl || ''}
                    onEnded={handleEnded}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        background: 'var(--accent-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent-primary)',
                        flexShrink: 0
                    }}>
                        <Music size={18} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginRight: '0.5rem', minWidth: '60px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                            {currentTitle}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', opacity: isPlaying ? 1 : 0.7 }}>
                            {isPlaying ? 'Playing...' : 'Paused'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {audioPlaylist.length > 0 && (
                        <button className="btn-icon" onClick={handlePrev} style={{ width: '32px', height: '32px' }}>
                            <SkipBack size={18} />
                        </button>
                    )}

                    <button
                        className="btn-primary"
                        style={{
                            width: '40px', height: '40px', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%'
                        }}
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '4px' }} />}
                    </button>

                    <button
                        className="btn-icon"
                        onClick={stopAudio}
                        style={{ width: '32px', height: '32px', color: 'var(--accent-primary)' }}
                        title="Stop"
                    >
                        <Square size={16} fill="currentColor" />
                    </button>

                    {audioPlaylist.length > 0 && (
                        <button className="btn-icon" onClick={handleNext} style={{ width: '32px', height: '32px' }}>
                            <SkipForward size={18} />
                        </button>
                    )}
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {audioPlaylist.length > 0 && (
                        <button
                            className="btn-icon"
                            onClick={() => setIsSettingsOpen(true)}
                            style={{
                                width: '32px', height: '32px',
                                color: isSettingsOpen ? 'var(--accent-primary)' : 'var(--text-muted)'
                            }}
                            title="Audio Settings"
                        >
                            <Settings2 size={18} />
                        </button>
                    )}
                    <button
                        className="btn-icon"
                        onClick={stopAudio}
                        style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }}
                        aria-label="Close Player"
                    >
                        <X size={18} />
                    </button>
                </div>
            </motion.div>

            {/* Settings Modal/Drawer */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSettingsOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, zIndex: 998,
                                background: 'rgba(0, 0, 0, 0.5)',
                            }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed', bottom: '5rem', left: '50%',
                                transform: 'translateX(-50%)', width: '90%', maxWidth: '400px',
                                background: 'var(--bg-surface)', zIndex: 999,
                                borderRadius: '24px', padding: '1.5rem',
                                boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)',
                                display: 'flex', flexDirection: 'column', gap: '1.5rem',
                                transformOrigin: 'bottom'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>Audio Settings</h3>
                                <button className="btn-icon" onClick={() => setIsSettingsOpen(false)} style={{ background: 'var(--bg-secondary)', width: '32px', height: '32px' }}>
                                    <X size={16} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {/* Range Selection */}
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Ayah</label>
                                        <select
                                            className="form-input"
                                            value={audioSettings.startRange !== null ? audioSettings.startRange : 0}
                                            onChange={(e) => updateAudioSettings({ startRange: Number(e.target.value) })}
                                        >
                                            {audioPlaylist.map((v, i) => (
                                                <option key={i} value={i}>{v.verseKey}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Ayah</label>
                                        <select
                                            className="form-input"
                                            value={audioSettings.endRange !== null ? audioSettings.endRange : audioPlaylist.length - 1}
                                            onChange={(e) => updateAudioSettings({ endRange: Number(e.target.value) })}
                                        >
                                            {audioPlaylist.map((v, i) => (
                                                <option key={i} value={i}>{v.verseKey}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Repeats */}
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Repeat Ayah</label>
                                        <select
                                            className="form-input"
                                            value={audioSettings.repeatAya}
                                            onChange={(e) => updateAudioSettings({ repeatAya: Number(e.target.value) })}
                                        >
                                            {REPEAT_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt === -1 ? 'Infinite' : `${opt}x`}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Repeat Selection</label>
                                        <select
                                            className="form-input"
                                            value={audioSettings.repeatSelection}
                                            onChange={(e) => updateAudioSettings({ repeatSelection: Number(e.target.value) })}
                                        >
                                            {REPEAT_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt === -1 ? 'Infinite' : `${opt}x`}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Advanced */}
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Delay (Sec)</label>
                                        <select
                                            className="form-input"
                                            value={audioSettings.delayBetweenAyas}
                                            onChange={(e) => updateAudioSettings({ delayBetweenAyas: Number(e.target.value) })}
                                        >
                                            {DELAY_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}s</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Speed</label>
                                        <select
                                            className="form-input"
                                            value={audioSettings.playbackSpeed}
                                            onChange={(e) => updateAudioSettings({ playbackSpeed: Number(e.target.value) })}
                                        >
                                            {SPEED_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}x</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Scroll Toggle */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={audioSettings.scrollWhilePlaying}
                                        onChange={(e) => updateAudioSettings({ scrollWhilePlaying: e.target.checked })}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                                    />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>Auto-scroll along with audio</span>
                                </label>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
}
