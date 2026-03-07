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
        setAudioTrackIndex, updateAudioSettings, setIsPlaying, stopAudio,
        isPlayerVisible, setIsPlayerVisible
    } = useAppStore();

    const audioRef = useRef(null);
    const delayTimeoutRef = useRef(null);
    const prevIsPlayingRef = useRef(false);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentAyaLoopCount, setCurrentAyaLoopCount] = useState(0);
    const [currentSelectionLoopCount, setCurrentSelectionLoopCount] = useState(0);

    const hasAudio = !!(currentAudioUrl || audioPlaylist.length > 0);
    const activeUrl = audioPlaylist.length > 0 ? audioPlaylist[audioTrackIndex]?.url : currentAudioUrl;
    const currentTitle = audioPlaylist.length > 0
        ? `Ayah ${audioPlaylist[audioTrackIndex]?.verseNumber || '...'}`
        : 'Recitation';

    // Scroll to & highlight current verse while playing
    useEffect(() => {
        if (isPlaying && audioSettings.scrollWhilePlaying && audioPlaylist.length > 0) {
            const currentVerse = audioPlaylist[audioTrackIndex];
            if (currentVerse?.verseKey) {
                const el = document.getElementById(`verse-${currentVerse.verseKey}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [audioTrackIndex, isPlaying, audioPlaylist, audioSettings.scrollWhilePlaying]);

    // Auto-show player only on false→true transition
    useEffect(() => {
        const wasPlaying = prevIsPlayingRef.current;
        prevIsPlayingRef.current = isPlaying;
        if (!wasPlaying && isPlaying && hasAudio) {
            setIsPlayerVisible(true);
        }
    }, [isPlaying, hasAudio, setIsPlayerVisible]);

    // Sync with audio element
    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.playbackRate = audioSettings.playbackSpeed;
        if (isPlaying && activeUrl) {
            if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
            audioRef.current.play().catch(e => { console.error('Audio failed', e); setIsPlaying(false); });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, activeUrl, audioSettings.playbackSpeed]);

    const handleStop = () => { stopAudio(); setIsPlayerVisible(false); setIsSettingsOpen(false); };

    const handleEnded = () => {
        if (currentAudioUrl) { setIsPlaying(false); return; }
        if (!audioPlaylist.length) return;

        const playNext = (idx) => {
            if (audioSettings.delayBetweenAyas > 0) {
                audioRef.current?.pause();
                delayTimeoutRef.current = setTimeout(() => setAudioTrackIndex(idx), audioSettings.delayBetweenAyas * 1000);
            } else { setAudioTrackIndex(idx); }
        };

        if (audioSettings.repeatAya === -1 || currentAyaLoopCount + 1 < audioSettings.repeatAya) {
            setCurrentAyaLoopCount(p => p + 1);
            if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
            return;
        }

        setCurrentAyaLoopCount(0);
        const endRange = audioSettings.endRange ?? audioPlaylist.length - 1;
        const startRange = audioSettings.startRange ?? 0;

        if (audioTrackIndex >= endRange) {
            if (audioSettings.repeatSelection === -1 || currentSelectionLoopCount + 1 < audioSettings.repeatSelection) {
                setCurrentSelectionLoopCount(p => p + 1);
                playNext(startRange);
            } else {
                setCurrentSelectionLoopCount(0);
                setIsPlaying(false);
                setAudioTrackIndex(startRange);
            }
        } else {
            playNext(audioTrackIndex + 1);
        }
    };

    const handleNext = () => {
        const end = audioSettings.endRange ?? audioPlaylist.length - 1;
        if (audioTrackIndex < end) { setAudioTrackIndex(audioTrackIndex + 1); setCurrentAyaLoopCount(0); }
    };

    const handlePrev = () => {
        const start = audioSettings.startRange ?? 0;
        if (audioTrackIndex > start) { setAudioTrackIndex(audioTrackIndex - 1); setCurrentAyaLoopCount(0); }
        else if (audioRef.current) audioRef.current.currentTime = 0;
    };

    return (
        <>
            {/* ── Floating Player Pill ── */}
            <AnimatePresence>
                {isPlayerVisible && (
                    <motion.div
                        key="player-pill"
                        initial={{ y: 100, opacity: 0, x: '-50%' }}
                        animate={{ y: 0, opacity: 1, x: '-50%' }}
                        exit={{ y: 100, opacity: 0, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{
                            position: 'fixed', bottom: '2rem', left: '50%',
                            transform: 'translateX(-50%)',
                            width: 'calc(100vw - 1rem)', maxWidth: '480px',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: 'var(--glass-bg)',
                            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                            border: 'var(--glass-border)', zIndex: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                            borderRadius: '9999px', boxShadow: 'var(--shadow-xl)'
                        }}
                    >
                        {hasAudio && <audio ref={audioRef} src={activeUrl || ''} onEnded={handleEnded} />}

                        {!hasAudio ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <Music size={16} />
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        Open a Surah & press Play
                                    </span>
                                </div>
                                <button className="btn-icon" onClick={() => setIsPlayerVisible(false)} style={{ width: '28px', height: '28px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Track info (truncates if too long) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-light)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                        <Music size={16} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {currentTitle}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', opacity: isPlaying ? 1 : 0.7, whiteSpace: 'nowrap' }}>
                                            {isPlaying ? 'Playing' : 'Paused'}
                                        </span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flexShrink: 0 }}>
                                    {audioPlaylist.length > 0 && <button className="btn-icon" onClick={handlePrev} style={{ width: '28px', height: '28px' }}><SkipBack size={16} /></button>}
                                    <button className="btn-primary" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0.2rem' }} onClick={() => setIsPlaying(!isPlaying)}>
                                        {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                                    </button>
                                    <button className="btn-icon" onClick={handleStop} style={{ width: '28px', height: '28px', color: 'var(--accent-primary)' }} title="Stop"><Square size={14} fill="currentColor" /></button>
                                    {audioPlaylist.length > 0 && <button className="btn-icon" onClick={handleNext} style={{ width: '28px', height: '28px' }}><SkipForward size={16} /></button>}
                                </div>

                                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.15rem', flexShrink: 0 }} />

                                {/* Settings & Close */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flexShrink: 0 }}>
                                    {audioPlaylist.length > 0 && (
                                        <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} style={{ width: '28px', height: '28px', color: isSettingsOpen ? 'var(--accent-primary)' : 'var(--text-muted)' }} title="Audio Settings">
                                            <Settings2 size={16} />
                                        </button>
                                    )}
                                    <button className="btn-icon" onClick={handleStop} style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }} aria-label="Close Player">
                                        <X size={16} />
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Audio Settings Bottom Drawer (shown during playback) ── */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsSettingsOpen(false)}
                            style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                        />
                        {/* Bottom Drawer — outer row handles centering via flex */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                            style={{
                                position: 'fixed',
                                bottom: 0, left: 0, right: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                zIndex: 999,
                            }}
                        >
                            {/* Inner card */}
                            <div style={{
                                width: '100%', maxWidth: '520px',
                                maxHeight: '85vh',
                                display: 'flex', flexDirection: 'column',
                                background: 'var(--bg-surface)',
                                borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                                boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
                                border: '1px solid var(--border-color)',
                                borderBottom: 'none',
                                overflow: 'hidden',
                            }}>
                                {/* Drag handle */}
                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem', paddingBottom: '0.25rem', flexShrink: 0 }}>
                                    <div style={{ width: '40px', height: '5px', borderRadius: '9999px', background: 'var(--border-color)' }} />
                                </div>

                                {/* Header */}
                                <div style={{ padding: '0 1.5rem 1rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>Audio Settings</h3>
                                    <button className="btn-icon" onClick={() => setIsSettingsOpen(false)} style={{ background: 'var(--bg-secondary)', width: '32px', height: '32px' }}>
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Scrollable body */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem', display: 'grid', gap: '1rem' }}>
                                    {/* Range */}
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Ayah</label>
                                            <select className="form-input" value={audioSettings.startRange ?? 0} onChange={(e) => updateAudioSettings({ startRange: Number(e.target.value) })}>
                                                {audioPlaylist.map((v, i) => <option key={v.verseKey || i} value={i}>{v.verseKey}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Ayah</label>
                                            <select className="form-input" value={audioSettings.endRange ?? audioPlaylist.length - 1} onChange={(e) => updateAudioSettings({ endRange: Number(e.target.value) })}>
                                                {audioPlaylist.map((v, i) => <option key={v.verseKey || i} value={i}>{v.verseKey}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Repeats */}
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Repeat Ayah</label>
                                            <select className="form-input" value={audioSettings.repeatAya} onChange={(e) => updateAudioSettings({ repeatAya: Number(e.target.value) })}>
                                                {REPEAT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === -1 ? '∞ Infinite' : `${opt}×`}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Repeat Selection</label>
                                            <select className="form-input" value={audioSettings.repeatSelection} onChange={(e) => updateAudioSettings({ repeatSelection: Number(e.target.value) })}>
                                                {REPEAT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === -1 ? '∞ Infinite' : `${opt}×`}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Advanced */}
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Delay (sec)</label>
                                            <select className="form-input" value={audioSettings.delayBetweenAyas} onChange={(e) => updateAudioSettings({ delayBetweenAyas: Number(e.target.value) })}>
                                                {DELAY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 0 ? 'None' : `${opt}s`}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Speed</label>
                                            <select className="form-input" value={audioSettings.playbackSpeed} onChange={(e) => updateAudioSettings({ playbackSpeed: Number(e.target.value) })}>
                                                {SPEED_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}×</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Auto-scroll toggle */}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
                                        <input type="checkbox" checked={audioSettings.scrollWhilePlaying} onChange={(e) => updateAudioSettings({ scrollWhilePlaying: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Auto-scroll while playing</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highlights and scrolls to each Ayah</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
