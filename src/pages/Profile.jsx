import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { User, Settings, Bookmark, Folder, Moon, Sun, Cloud, CloudOff, RefreshCw, LogIn, LogOut, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getSyncState, pushFullState, onSyncChange } from '../services/syncService';
import { signInAnonymously, signInWithEmail, signUpWithEmail, signOut } from '../services/appwrite/auth';
import { isAppwriteConfigured } from '../services/appwrite/client';
import { triggerImmediateSync } from '../services/syncSubscriber';
import './Profile.css';

const SYNC_STATUS_CONFIG = {
    idle: { label: 'Local Only', icon: CloudOff, color: 'var(--text-muted)' },
    disabled: { label: 'Sync Disabled', icon: CloudOff, color: 'var(--text-muted)' },
    initializing: { label: 'Initializing...', icon: Loader2, color: 'var(--accent-primary)' },
    pulling: { label: 'Pulling data...', icon: Loader2, color: 'var(--accent-primary)' },
    pushing: { label: 'Saving...', icon: Loader2, color: 'var(--accent-primary)' },
    syncing: { label: 'Syncing...', icon: Loader2, color: 'var(--accent-primary)' },
    synced: { label: 'Synced', icon: CheckCircle, color: '#22c55e' },
    error: { label: 'Sync Error', icon: AlertCircle, color: '#ef4444' },
};

export default function Profile() {
    const store = useAppStore();
    const {
        setNavHeaderTitle,
        setIsSettingsOpen,
        bookmarks,
        collections,
        memorizedAyahs,
        theme,
        toggleTheme,
        readingSessions,
    } = store;

    const [syncState, setSyncState] = useState(getSyncState());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [authMode, setAuthMode] = useState('none');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        setNavHeaderTitle('Profile');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    useEffect(() => {
        const unsub = onSyncChange((state) => setSyncState(state));
        return unsub;
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const syncConfigured = isAppwriteConfigured();
    const statusConfig = SYNC_STATUS_CONFIG[syncState.syncStatus] || SYNC_STATUS_CONFIG.idle;
    const StatusIcon = statusConfig.icon;
    const totalMemorized = memorizedAyahs?.length || 0;
    const totalReadingTime = (readingSessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
    const readingMinutes = Math.round(totalReadingTime / 60);

    const handleAnonymousSignIn = async () => {
        setAuthLoading(true);
        setAuthError('');
        try {
            const { user } = await signInAnonymously();
            setUser(user);
            setAuthMode('anonymous');
        } catch (e) {
            setAuthError(e.message);
        }
        setAuthLoading(false);
    };

    const handleEmailSignIn = async () => {
        if (!email || !password) return;
        setAuthLoading(true);
        setAuthError('');
        try {
            const { user } = await signInWithEmail(email, password);
            setUser(user);
            setAuthMode('email');
            setEmail('');
            setPassword('');
        } catch (e) {
            setAuthError(e.message);
        }
        setAuthLoading(false);
    };

    const handleEmailSignUp = async () => {
        if (!email || !password) return;
        setAuthLoading(true);
        setAuthError('');
        try {
            const { user } = await signUpWithEmail(email, password, userName || 'Quran Student');
            setUser(user);
            setAuthMode('email');
            setEmail('');
            setPassword('');
            setUserName('');
        } catch (e) {
            setAuthError(e.message);
        }
        setAuthLoading(false);
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setUser(null);
            setAuthMode('none');
        } catch (e) {
            setAuthError(e.message);
        }
    };

    const handleSyncNow = async () => {
        setSyncLoading(true);
        await triggerImmediateSync();
        await pushFullState();
        setSyncLoading(false);
    };

    const displayName = user?.name || user?.email || (authMode === 'anonymous' ? 'Anonymous User' : 'Quran Student');
    const displayEmail = user?.email || (authMode === 'anonymous' ? 'Local session' : null);

    return (
        <div className="profile-container container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                <div className="profile-card" style={{ padding: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                    }}>
                        <User size={36} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                            {displayName}
                        </h1>
                        {displayEmail && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{displayEmail}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <StatusIcon size={14} style={{ color: statusConfig.color }} />
                            <span style={{ color: statusConfig.color, fontSize: '0.8rem', fontWeight: 600 }}>
                                {statusConfig.label}
                            </span>
                            {!isOnline && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>· Offline</span>
                            )}
                        </div>
                    </div>
                </div>

                {syncConfigured && !user && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="settings-list" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                            Sign In to Sync
                        </h3>

                        {authError && (
                            <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                {authError}
                            </div>
                        )}

                        <button
                            onClick={handleAnonymousSignIn}
                            disabled={authLoading}
                            style={{ width: '100%', padding: '0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}
                        >
                            {authLoading && authMode === 'none' ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
                            Continue as Guest
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0.5rem 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <input
                                type="text"
                                placeholder="Name (optional)"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handleEmailSignIn}
                                    disabled={authLoading || !email || !password}
                                    style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <Mail size={14} /> Sign In
                                </button>
                                <button
                                    onClick={handleEmailSignUp}
                                    disabled={authLoading || !email || !password}
                                    style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Sign Up
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {user && (
                    <div className="settings-list" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {syncState.lastSyncAt ? `Last synced: ${new Date(syncState.lastSyncAt).toLocaleTimeString()}` : 'Not yet synced'}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={handleSyncNow}
                                disabled={syncLoading || !isOnline}
                                style={{ padding: '0.5rem 1rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                {syncLoading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                                Sync
                            </button>
                            <button
                                onClick={handleSignOut}
                                style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <LogOut size={12} /> Sign Out
                            </button>
                        </div>
                    </div>
                )}

                {!syncConfigured && (
                    <div style={{ padding: '1rem 1.5rem', background: 'var(--accent-light)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            Cloud sync is not configured. All data is stored locally on this device.
                        </p>
                    </div>
                )}

                <div className="stat-grid">
                    <div className="settings-list" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Bookmark size={26} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bookmarks?.length || 0}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Bookmarks</span>
                    </div>
                    <div className="settings-list" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Folder size={26} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{collections?.length || 0}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Collections</span>
                    </div>
                    <div className="settings-list" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Cloud size={26} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalMemorized}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Memorized</span>
                    </div>
                    <div className="settings-list" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Sun size={26} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{readingMinutes}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Minutes</span>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '1.25rem', paddingLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Preferences
                </h2>

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
                        </div>
                    </button>

                    <button onClick={() => setIsSettingsOpen(true)} className="settings-item">
                        <div className="settings-item-title">
                            <div className="settings-item-icon">
                                <Settings size={24} />
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Reading Settings</span>
                        </div>
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
