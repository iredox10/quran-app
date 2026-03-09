import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';

export default function AudioSetupModal({
    isOpen,
    onClose,
    pendingPlaylist,
    audioSettings,
    updateAudioSettings,
    handleStartPlaying
}) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, backdropFilter: 'blur(4px)' }}
                    />
                    {/* Bottom Drawer */}
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
                            zIndex: 1101,
                        }}
                    >
                        <div style={{
                            width: '100%',
                            maxWidth: '520px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-surface)',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
                            border: '1px solid var(--border-color)',
                            borderBottom: 'none',
                            overflow: 'hidden',
                        }}>
                            {/* Drag handle */}
                            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem', paddingBottom: '0.25rem', flexShrink: 0 }}>
                                <div style={{ width: '40px', height: '5px', borderRadius: '9999px', background: 'var(--border-color)' }} />
                            </div>
                            {/* Sticky Header */}
                            <div style={{ padding: '0 1.5rem 1rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Audio Setup</h3>
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                            Configure before playing · {pendingPlaylist.length} Ayahs
                                        </p>
                                    </div>
                                    <button className="btn-icon" onClick={onClose} style={{ background: 'var(--bg-secondary)', width: '36px', height: '36px', flexShrink: 0 }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable settings body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                {/* Range */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                                        Ayah Range
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>From</label>
                                            <select
                                                className="form-input"
                                                value={audioSettings.startRange ?? 0}
                                                onChange={(e) => updateAudioSettings({ startRange: Number(e.target.value) })}
                                            >
                                                {pendingPlaylist.map((v, i) => (
                                                    <option key={v.verseKey} value={i}>{v.verseKey}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>To</label>
                                            <select
                                                className="form-input"
                                                value={audioSettings.endRange ?? pendingPlaylist.length - 1}
                                                onChange={(e) => updateAudioSettings({ endRange: Number(e.target.value) })}
                                            >
                                                {pendingPlaylist.map((v, i) => (
                                                    <option key={v.verseKey} value={i}>{v.verseKey}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Repeat */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                                        Repeat
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Each Ayah</label>
                                            <select className="form-input" value={audioSettings.repeatAya} onChange={(e) => updateAudioSettings({ repeatAya: Number(e.target.value) })}>
                                                {[1, 2, 3, 5, 10, -1].map(opt => <option key={opt} value={opt}>{opt === -1 ? '∞ Infinite' : `${opt}×`}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Full Selection</label>
                                            <select className="form-input" value={audioSettings.repeatSelection} onChange={(e) => updateAudioSettings({ repeatSelection: Number(e.target.value) })}>
                                                {[1, 2, 3, 5, 10, -1].map(opt => <option key={opt} value={opt}>{opt === -1 ? '∞ Infinite' : `${opt}×`}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                                        Advanced
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Delay Between Ayahs</label>
                                            <select className="form-input" value={audioSettings.delayBetweenAyas} onChange={(e) => updateAudioSettings({ delayBetweenAyas: Number(e.target.value) })}>
                                                {[0, 1, 2, 3, 5, 10].map(opt => <option key={opt} value={opt}>{opt === 0 ? 'None' : `${opt}s`}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Playback Speed</label>
                                            <select className="form-input" value={audioSettings.playbackSpeed} onChange={(e) => updateAudioSettings({ playbackSpeed: Number(e.target.value) })}>
                                                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(opt => <option key={opt} value={opt}>{opt}×</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Auto-scroll toggle */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={audioSettings.scrollWhilePlaying ?? true}
                                        onChange={(e) => updateAudioSettings({ scrollWhilePlaying: e.target.checked })}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', flexShrink: 0 }}
                                    />
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Auto-scroll while playing</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highlights and scrolls to each Ayah</div>
                                    </div>
                                </label>

                            </div>

                            {/* Pinned Start Playing button */}
                            <div style={{ padding: '1rem 1.5rem 1.5rem', flexShrink: 0 }}>
                                <button
                                    className="btn-primary"
                                    onClick={handleStartPlaying}
                                    style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <Play size={20} fill="currentColor" />
                                    Start Playing
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
