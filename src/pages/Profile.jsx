import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { User, Settings, Bookmark, Folder, Download, Moon, Sun, ChevronRight, HardDrive, LogOut, CloudUpload, CloudDownload, Mail, Lock, Loader2 } from 'lucide-react';
import { authService, syncService } from '../services/appwrite';
import './Profile.css';

export default function Profile() {
    const store = useAppStore();
    const {
        setNavHeaderTitle,
        setIsSettingsOpen,
        bookmarks,
        collections,
        downloadedSurahs,
        theme,
        toggleTheme
    } = store;

    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState(null); // 'pushing', 'pulling', 'success', 'error'
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        setNavHeaderTitle('Profile');
        checkUser();
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const checkUser = async () => {
        setIsLoading(true);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setIsLoading(false);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError('');
        try {
            if (authMode === 'register') {
                await authService.register(email, password, name);
                await authService.login(email, password);
            } else {
                await authService.login(email, password);
            }
            await checkUser();
            setEmail('');
            setPassword('');
            setName('');
        } catch (error) {
            setAuthError(error.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await authService.logout();
            setUser(null);
        } catch (error) {
            console.error('Logout error', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePushSync = async () => {
        if (!user) return;
        setSyncStatus('pushing');
        try {
            const state = useAppStore.getState();
            // We use partialized state exactly how persist middleware handles it
            const dataToSync = {
                theme: state.theme,
                translationId: state.translationId,
                reciterId: state.reciterId,
                fontSize: state.fontSize,
                translationFontSize: state.translationFontSize,
                readingMode: state.readingMode,
                mushafId: state.mushafId,
                arabicFontId: state.arabicFontId,
                tajweedEnabled: state.tajweedEnabled,
                tafsirId: state.tafsirId,
                bookmark: state.bookmark,
                bookmarks: state.bookmarks,
                memorizedAyahs: state.memorizedAyahs,
                memorizedSurahs: state.memorizedSurahs,
                collections: state.collections,
                recentlyRead: state.recentlyRead,
                readingSessions: state.readingSessions,
                pomodoroProfiles: state.pomodoroProfiles,
                activePomodoroProfileId: state.activePomodoroProfileId,
                pomodoroHistory: state.pomodoroHistory,
                pomodoroCompletedFocusCount: state.pomodoroCompletedFocusCount,
                planners: state.planners,
                activePlannerId: state.activePlannerId,
                downloadedSurahs: state.downloadedSurahs,
            };

            await syncService.pushState(user.$id, dataToSync);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus(null), 3000);
        } catch (error) {
            console.error(error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus(null), 3000);
        }
    };

    const handlePullSync = async () => {
        if (!user) return;
        setSyncStatus('pulling');
        try {
            const remoteState = await syncService.pullState(user.$id);
            if (remoteState) {
                useAppStore.setState(remoteState);
            }
            setSyncStatus('success');
            setTimeout(() => setSyncStatus(null), 3000);
        } catch (error) {
            console.error(error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus(null), 3000);
        }
    };

    if (isLoading && !user && !authError && email === '') {
        return (
            <div className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
            </div>
        );
    }

    return (
        <div className="profile-container container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                {!user ? (
                    <div className="profile-card">
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', background: 'var(--accent-light)',
                                borderRadius: '50%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--accent-primary)'
                            }}>
                                <User size={40} />
                            </div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Cloud Sync</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '0.4rem', maxWidth: '400px', margin: '0.5rem auto 0' }}>
                                Sign in to save your bookmarks, reading progress, and settings to the cloud. Access them from any device.
                            </p>
                        </div>

                        <form onSubmit={handleAuth} className="auth-form">
                            {authError && (
                                <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.2rem', fontWeight: 600 }}>
                                    {authError}
                                </div>
                            )}

                            {authMode === 'register' && (
                                <input
                                    type="text"
                                    placeholder="Your Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="auth-input"
                                    required
                                />
                            )}
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="auth-input"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password (min 8 chars)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="auth-input"
                                minLength={8}
                                required
                            />

                            <button type="submit" className="auth-btn" disabled={isLoading}>
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
                                className="auth-switch"
                            >
                                {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <>
                        {/* Logged in Header Info */}
                        <div className="profile-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    boxShadow: '0 8px 24px rgba(var(--accent-primary-rgb, 14, 165, 233), 0.3)',
                                    flexShrink: 0
                                }}>
                                    <User size={40} />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '0.2rem' }}>
                                        {user.name || 'Quran Student'}
                                    </h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontWeight: 500 }}>{user.email}</p>
                                </div>
                            </div>

                            <button onClick={handleLogout} className="btn-outline" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: 'rgb(239, 68, 68)', flexShrink: 0 }} disabled={isLoading}>
                                <LogOut size={18} /> Logout
                            </button>
                        </div>

                        {/* Data Sync Panel */}
                        <div className="data-sync-card">
                            <div className="data-sync-info">
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Cloud Synchronization</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                    Keep your bookmarks, planners, and app settings synced across all your devices seamlessly.
                                </p>

                                <AnimatePresence mode="wait">
                                    {syncStatus === 'pushing' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Loader2 size={16} className="animate-spin" /> Saving data securely to cloud...</motion.div>}
                                    {syncStatus === 'pulling' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Loader2 size={16} className="animate-spin" /> Fetching data from cloud...</motion.div>}
                                    {syncStatus === 'success' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem' }}>Sync completed successfully!</motion.div>}
                                    {syncStatus === 'error' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: 'rgb(239, 68, 68)', fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem' }}>Failed to sync. Please try again later.</motion.div>}
                                </AnimatePresence>
                            </div>
                            <div className="data-sync-actions">
                                <button onClick={handlePullSync} disabled={!!syncStatus} className="btn-outline">
                                    <CloudDownload size={20} /> Restore
                                </button>
                                <button onClick={handlePushSync} disabled={!!syncStatus} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none' }} className="btn-outline">
                                    <CloudUpload size={20} /> Backup
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Statistics Grid */}
                <div className="stat-grid">
                    <div className="settings-list" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Bookmark size={26} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bookmarks.length}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Bookmarks</span>
                    </div>
                    <div className="settings-list" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Folder size={26} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{collections.length}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Collections</span>
                    </div>
                    <div className="settings-list" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Download size={26} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{downloadedSurahs.length}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Downloads</span>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '1.25rem', paddingLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Preferences
                </h2>

                {/* Actions / Settings list */}
                <div className="settings-list">
                    <button onClick={toggleTheme} className="settings-item">
                        <div className="settings-item-title">
                            <div className="settings-item-icon">
                                {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Appearance</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {theme === 'light' ? 'Light' : 'Dark'}
                            <ChevronRight size={20} />
                        </div>
                    </button>

                    <button onClick={() => setIsSettingsOpen(true)} className="settings-item">
                        <div className="settings-item-title">
                            <div className="settings-item-icon">
                                <Settings size={24} />
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Reading Settings</span>
                        </div>
                        <ChevronRight size={20} color="var(--text-muted)" />
                    </button>

                    <Link to="/offline-library" className="settings-item">
                        <div className="settings-item-title">
                            <div className="settings-item-icon">
                                <HardDrive size={24} />
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Offline Library</span>
                        </div>
                        <ChevronRight size={20} color="var(--text-muted)" />
                    </Link>
                </div>

            </motion.div>
        </div>
    );
}
