import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Moon, Sun, Settings, TrendingUp, Mic, LayoutDashboard, Bookmark, ArrowLeft, BookOpen, ChevronsDown, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalAudioPlayer from './GlobalAudioPlayer';
import SettingsDrawer from './SettingsDrawer';

export default function Layout() {
    const {
        theme, toggleTheme, navHeaderTitle, readingMode, setReadingMode,
        autoScroll, setAutoScroll,
        isPlayerVisible, setIsPlayerVisible,
        audioPlaylist, currentAudioUrl, isPlaying,
        incrementPlayTrigger
    } = useAppStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isSurahPage = /^\/surah\/\d+/.test(location.pathname);
    const hasAudio = audioPlaylist.length > 0 || !!currentAudioUrl;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <div className="layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                backgroundColor: 'var(--bg-surface)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: 'var(--glass-border)'
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px' }}>

                    {/* Left: back/logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {isSurahPage ? (
                            <>
                                <button className="btn-icon" onClick={() => navigate(-1)} style={{ flexShrink: 0 }} aria-label="Go back">
                                    <ArrowLeft size={20} />
                                </button>
                                <span style={{
                                    fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {navHeaderTitle || 'Surah'}
                                </span>
                            </>
                        ) : (
                            <>
                                <Link to="/" style={{ textDecoration: 'none' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent-primary)', letterSpacing: '-0.5px' }}>
                                        Qur'an
                                    </span>
                                </Link>
                                {navHeaderTitle && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>/</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{navHeaderTitle}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right: controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                        {/* Surah-only controls */}
                        {isSurahPage && (
                            <>
                                <button
                                    className="btn-icon"
                                    onClick={() => setAutoScroll(!autoScroll)}
                                    title={autoScroll ? 'Stop Auto-scroll' : 'Auto-scroll'}
                                    style={{
                                        color: autoScroll ? 'var(--accent-primary)' : 'var(--text-muted)',
                                        background: autoScroll ? 'var(--accent-light)' : 'transparent'
                                    }}
                                >
                                    <ChevronsDown size={20} />
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={() => setReadingMode(!readingMode)}
                                    title={readingMode ? 'Translation Mode' : 'Reading Mode'}
                                    style={{
                                        color: readingMode ? 'var(--accent-primary)' : 'var(--text-muted)',
                                        background: readingMode ? 'var(--accent-light)' : 'transparent'
                                    }}
                                >
                                    <BookOpen size={20} />
                                </button>
                            </>
                        )}

                        {/* Non-surah nav links */}
                        {!isSurahPage && (
                            <>
                                <Link to="/dashboard" className="btn-icon" title="Smart Dashboard" style={{ color: 'var(--text-muted)' }}>
                                    <LayoutDashboard size={20} />
                                </Link>
                                <Link to="/library" className="btn-icon" title="My Library" style={{ color: 'var(--text-muted)' }}>
                                    <Bookmark size={20} />
                                </Link>
                                <Link to="/memorize" className="btn-icon" title="Hifdh Mode" style={{ color: 'var(--text-muted)' }}>
                                    <Mic size={20} />
                                </Link>
                                <Link to="/progress" className="btn-icon" title="Progress Analytics" style={{ color: 'var(--text-muted)' }}>
                                    <TrendingUp size={20} />
                                </Link>
                                <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
                            </>
                        )}

                        {/* === Audio Player Toggle — ALWAYS VISIBLE === */}
                        <button
                            id="audio-player-toggle"
                            className="btn-icon"
                            onClick={() => {
                                if (isSurahPage) {
                                    // On Surah page: trigger playback (Surah.jsx listens)
                                    incrementPlayTrigger();
                                } else {
                                    // On other pages: just show/hide the player
                                    setIsPlayerVisible(!isPlayerVisible);
                                }
                            }}
                            title={isSurahPage ? 'Play / Pause' : isPlayerVisible ? 'Hide Player' : 'Show Player'}
                            style={{
                                color: hasAudio ? 'var(--accent-primary)' : 'var(--text-muted)',
                                background: (isPlayerVisible || isPlaying) ? 'var(--accent-light)' : 'transparent',
                                position: 'relative'
                            }}
                        >
                            <Volume2 size={20} />
                            {/* Pulsing dot when playing */}
                            {isPlaying && (
                                <span style={{
                                    position: 'absolute', top: '4px', right: '4px',
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: 'var(--accent-primary)',
                                    animation: 'pulse 2s infinite'
                                }} />
                            )}
                        </button>

                        {/* Theme + Settings — always visible */}
                        <button className="btn-icon" onClick={toggleTheme} aria-label="Toggle Theme">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={theme}
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                                </motion.div>
                            </AnimatePresence>
                        </button>
                        <button className="btn-icon" onClick={() => setIsSettingsOpen(true)}>
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ flex: 1, padding: '2rem 0', paddingBottom: '90px' }}>
                <Outlet />
            </main>

            <footer style={{
                borderTop: '1px solid var(--border-color)',
                padding: '2rem 0', paddingBottom: '100px',
                textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem'
            }}>
                <div className="container">
                    <p>Read, Study, and Learn The Noble Quran.</p>
                </div>
            </footer>

            <GlobalAudioPlayer />
            <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
