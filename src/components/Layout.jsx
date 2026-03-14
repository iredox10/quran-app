import { useCallback, useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getLocalAudioDirHandle } from '../utils/localAudio';
import { Moon, Sun, Settings, TrendingUp, LayoutDashboard, Bookmark, ArrowLeft, BookOpen, ChevronsDown, Volume2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalAudioPlayer from './GlobalAudioPlayer';
import SettingsDrawer from './SettingsDrawer';
import NavigationModal from './NavigationModal';
import AutoSyncManager from './AutoSyncManager';

export default function Layout() {
    const {
        theme, toggleTheme, navHeaderTitle, readingMode, setReadingMode,
        autoScroll, setAutoScroll,
        setLocalAudioDirHandle,
        isPlayerVisible, setIsPlayerVisible,
        audioPlaylist, currentAudioUrl, isPlaying,
        incrementPlayTrigger,
        isSettingsOpen, setIsSettingsOpen,
        pomodoroIsRunning, tickPomodoro,
    } = useAppStore();
    const [showHeader, setShowHeader] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isNavModalOpen, setIsNavModalOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    const isSurahPage = /^\/surah\/\d+/.test(location.pathname);
    const isMemorizePage = /^\/memorize\/\d+/.test(location.pathname);
    const isPagePage = /^\/page\/\d+/.test(location.pathname);
    const isImmersivePage = isSurahPage || isMemorizePage || isPagePage;
    const hasAudio = audioPlaylist.length > 0 || !!currentAudioUrl;
    const shouldReturnToPlanner = Boolean(location.state?.backToPlanner);
    const shouldForceHomeBack = isSurahPage || isMemorizePage;

    const navigateHomeAtTop = useCallback((replace = false) => {
        navigate('/', {
            replace,
            state: {
                scrollToTop: Date.now(),
            },
        });
    }, [navigate]);

    const handleImmersiveBack = () => {
        if (shouldForceHomeBack) {
            navigateHomeAtTop(true);
            return;
        }

        if (shouldReturnToPlanner) {
            navigate('/planner');
            return;
        }

        navigate('/');
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        // Load the local audio directory handle from IndexedDB if it exists
        getLocalAudioDirHandle().then(handle => {
            if (handle) setLocalAudioDirHandle(handle);
        }).catch(err => console.warn('Could not load local directory handle', err));
    }, [setLocalAudioDirHandle]);

    useEffect(() => {
        if (!pomodoroIsRunning) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            tickPomodoro();
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [pomodoroIsRunning, tickPomodoro]);

    useEffect(() => {
        if (!shouldForceHomeBack) {
            return undefined;
        }

        const state = window.history.state || {};
        if (!state.quranBackTrap || state.quranBackTrapPath !== location.pathname) {
            window.history.pushState(
                {
                    ...state,
                    quranBackTrap: true,
                    quranBackTrapPath: location.pathname,
                },
                ''
            );
        }

        const handlePopState = () => {
            navigateHomeAtTop(true);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [location.pathname, navigateHomeAtTop, shouldForceHomeBack]);

    useEffect(() => {
        let hideTimer;

        const handleActivity = () => {
            setShowHeader(true);
            if (isMemorizePage) {
                if (hideTimer) clearTimeout(hideTimer);
                hideTimer = setTimeout(() => {
                    setShowHeader(false);
                }, 3000);
            }
        };

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (!isMemorizePage) {
                // Normal Surah scroll behavior
                if (currentScrollY > lastScrollY && currentScrollY > 100) {
                    setShowHeader(false);
                } else {
                    setShowHeader(true);
                }
            } else {
                // Memorization mode scroll just triggers activity
                handleActivity();
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        if (isMemorizePage) {
            window.addEventListener('mousemove', handleActivity);
            window.addEventListener('touchstart', handleActivity);
            window.addEventListener('click', handleActivity);
            handleActivity(); // Initialize the timer immediately
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (isMemorizePage) {
                window.removeEventListener('mousemove', handleActivity);
                window.removeEventListener('touchstart', handleActivity);
                window.removeEventListener('click', handleActivity);
                if (hideTimer) clearTimeout(hideTimer);
            }
        };
    }, [lastScrollY, isMemorizePage]);

    // Ensure header is visible when location changes
    useEffect(() => {
        setShowHeader(true);
    }, [location.pathname]);

    return (
        <div className="layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                backgroundColor: 'var(--bg-surface)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: 'var(--glass-border)',
                transform: `translateY(${showHeader ? '0' : '-100%'})`,
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: showHeader ? '0 4px 20px rgba(0,0,0,0.06)' : 'none',
                pointerEvents: showHeader ? 'auto' : 'none',
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px' }}>

                    {/* Left: back/logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {isImmersivePage ? (
                            <>
                                <button className="btn-icon" onClick={handleImmersiveBack} style={{ flexShrink: 0 }} aria-label="Go back">
                                    <ArrowLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setIsNavModalOpen(true)}
                                    style={{
                                        background: 'none', border: 'none', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                    className="interactive-hover"
                                >
                                    <span style={{
                                        fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                        {navHeaderTitle || 'Page'}
                                    </span>
                                    <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                                </button>
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

                        {/* Content controls */}
                        {(isSurahPage || isPagePage) && (
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

                        {/* Non-surah nav links removed since they are now in the bottom nav */}

                        {/* === Audio Player Toggle — hidden on main tabs and hifdh pages === */}
                        {!location.pathname.startsWith('/memorize') &&
                            !['/', '/progress', '/profile'].includes(location.pathname) && (
                                <button
                                    id="audio-player-toggle"
                                    className="btn-icon"
                                    onClick={() => {
                                        if (isSurahPage || isPagePage) {
                                            // Trigger playback (Surah.jsx or Page.jsx listens)
                                            incrementPlayTrigger();
                                        } else {
                                            // On other pages: just show/hide the player
                                            setIsPlayerVisible(!isPlayerVisible);
                                        }
                                    }}
                                    title={(isSurahPage || isPagePage) ? 'Play / Pause' : isPlayerVisible ? 'Hide Player' : 'Show Player'}
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
                            )}

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

            <main style={{ flex: 1, padding: '2rem 0', paddingTop: 'calc(56px + 2.5rem)', paddingBottom: '90px' }}>
                <Outlet />
            </main>

            <AutoSyncManager />
            <GlobalAudioPlayer />
            <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <NavigationModal isOpen={isNavModalOpen} onClose={() => setIsNavModalOpen(false)} />
        </div>
    );
}
