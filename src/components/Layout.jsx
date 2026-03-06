import { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Moon, Sun, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalAudioPlayer from './GlobalAudioPlayer';
import SettingsDrawer from './SettingsDrawer';

export default function Layout() {
    const { theme, toggleTheme, navHeaderTitle } = useAppStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        // Apply theme to document element for global CSS variables
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Premium Top Navigation
    return (
        <div className="layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: 'var(--bg-surface)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: 'var(--glass-border)'
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Link to="/" style={{ textDecoration: 'none' }}>
                            <span style={{
                                fontWeight: 700,
                                fontSize: '1.5rem',
                                color: 'var(--accent-primary)',
                                letterSpacing: '-0.5px'
                            }}>
                                Qur'an
                            </span>
                        </Link>
                        {navHeaderTitle && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>/</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{navHeaderTitle}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                padding: '2rem 0',
                paddingBottom: '100px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
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
