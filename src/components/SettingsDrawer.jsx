import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import {
    ArrowLeft,
    Check,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    HardDrive,
    Moon,
    Sun,
    Type,
    WifiOff,
    Cloud,
    UploadCloud,
    DownloadCloud,
    LogOut,
    RefreshCw,
} from 'lucide-react';
import { getMushafById, getMushafFontOptions, isTajweedEnabledForMushaf, MUSHAFS } from '../config/mushaf';
import { saveLocalAudioDirHandle } from '../utils/localAudio';
import { getOfflinePackStats } from '../utils/offlineLibrary';
import { authService, syncService } from '../services/appwrite';
import { getSyncableState } from '../store/useAppStore';

const RECITERS = [
    { id: 7, name: 'Mishary Rashid Alafasy' },
    { id: 1, name: 'AbdulBaset AbdulSamad' },
    { id: 3, name: 'Abdur-Rahman as-Sudais' },
    { id: 4, name: 'Abu Bakr al-Shatri' }
];

const TRANSLATIONS = [
    { id: 85, name: 'English - M.A.S. Abdel Haleem' },
    { id: 20, name: 'English - Saheeh International' },
    { id: 22, name: 'English - A. Yusuf Ali' },
    { id: 84, name: 'English - Mufti Taqi Usmani' },
    { id: 32, name: 'Hausa - Abubakar Mahmoud Gumi' },
    { id: 234, name: 'Urdu - Fatah Muhammad Jalandhari' }
];

const TAFSIRS = [
    { id: 169, name: 'Ibn Kathir (Abridged)', lang: 'English' },
    { id: 168, name: "Ma'arif al-Qur'an", lang: 'English' },
    { id: 817, name: 'Tazkirul Quran', lang: 'English' },
    { id: 16, name: 'Tafsir al-Muyassar', lang: 'Arabic' },
    { id: 14, name: 'Tafsir Ibn Kathir', lang: 'Arabic' },
    { id: 15, name: 'Tafsir al-Tabari', lang: 'Arabic' },
    { id: 93, name: 'Al-Tafsir al-Wasit', lang: 'Arabic' }
];

const DRAWER_VIEWS = {
    root: 'root',
    mushaf: 'mushaf',
    translation: 'translation',
    reciter: 'reciter',
    arabicFont: 'arabicFont',
    tafsir: 'tafsir',
    sync: 'sync',
};

function sectionTitleStyle() {
    return {
        fontSize: '0.78rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: '0.85rem'
    };
}

function cardStyle() {
    return {
        border: '1px solid rgba(0,0,0,0.06)',
        background: 'var(--bg-primary)',
        borderRadius: '18px',
        boxShadow: 'var(--shadow-sm)'
    };
}

function rowButtonStyle() {
    return {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.05rem',
        textAlign: 'left',
        color: 'var(--text-primary)',
    };
}

function SelectionRow({ label, value, hint, onClick, borderless = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                ...rowButtonStyle(),
                borderBottom: borderless ? 'none' : '1px solid rgba(0,0,0,0.06)',
            }}
        >
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: value || hint ? '0.2rem' : 0 }}>{label}</div>
                {value && <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>}
                {!value && hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{hint}</div>}
            </div>
            <ChevronRight size={18} color="var(--text-muted)" aria-hidden="true" />
        </button>
    );
}

function SegmentedOption({ active, icon, label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: 1,
                minHeight: '44px',
                padding: '0.8rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                background: active ? 'var(--accent-light)' : 'var(--bg-primary)',
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'rgba(198, 168, 124, 0.35)' : 'rgba(0,0,0,0.06)'}`,
                fontWeight: 600,
            }}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

function ToggleRow({ label, hint, checked, onToggle, disabled = false }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onToggle()}
            style={{
                ...rowButtonStyle(),
                padding: '0.95rem 1.05rem',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'default' : 'pointer',
            }}
        >
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{hint}</div>
            </div>
            <div
                aria-hidden="true"
                style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '999px',
                    backgroundColor: checked ? 'var(--accent-primary)' : 'rgba(0,0,0,0.12)',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease'
                }}
            >
                <div
                    style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        position: 'absolute',
                        top: '2px',
                        left: checked ? '22px' : '2px',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
            </div>
        </button>
    );
}

function PickerOption({ title, subtitle, active, onClick, sampleStyle }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                width: '100%',
                padding: '1rem 1.05rem',
                borderRadius: '16px',
                border: `1px solid ${active ? 'rgba(198, 168, 124, 0.35)' : 'rgba(0,0,0,0.06)'}`,
                background: active ? 'var(--accent-light)' : 'var(--bg-primary)',
                color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                textAlign: 'left'
            }}
        >
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, ...(sampleStyle || {}) }}>{title}</div>
                {subtitle && <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{subtitle}</div>}
            </div>
            {active && <Check size={18} aria-hidden="true" />}
        </button>
    );
}

function CloudSyncView({ currentUser, setCurrentUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [syncStatus, setSyncStatus] = useState('');
    const [syncLoading, setSyncLoading] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const user = await authService.getCurrentUser();
                setCurrentUser(user);
            } catch {
                setCurrentUser(null);
            }
        };
        if (!currentUser) checkUser();
    }, [currentUser, setCurrentUser]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLoginMode) {
                await authService.login(email, password);
            } else {
                await authService.register(email, password, name);
                await authService.login(email, password); // auto login after register
            }
            const user = await authService.getCurrentUser();
            setCurrentUser(user);
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await authService.logout();
            setCurrentUser(null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePush = async () => {
        if (!currentUser) return;
        setSyncLoading(true);
        setSyncStatus('Pushing to cloud...');
        try {
            const state = getSyncableState(useAppStore.getState());
            const result = await syncService.pushState(currentUser.$id, state);
            useAppStore.setState({ lastSyncAt: result.updatedAt });
            setSyncStatus('Successfully backed up to cloud! ✅');
            setTimeout(() => setSyncStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setSyncStatus('Failed to push data ❌');
        } finally {
            setSyncLoading(false);
        }
    };

    const handlePull = async () => {
        if (!currentUser) return;
        if (!window.confirm("Warning: This will overwrite your local data with the cloud data. Proceed?")) return;
        
        setSyncLoading(true);
        setSyncStatus('Pulling from cloud...');
        try {
            const remoteData = await syncService.pullState(currentUser.$id);
            if (remoteData && remoteData.state) {
                useAppStore.setState({ ...remoteData.state, lastSyncAt: remoteData.updatedAt });
                setSyncStatus('Successfully restored from cloud! ✅');
            } else {
                setSyncStatus('No cloud backup found.');
            }
            setTimeout(() => setSyncStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setSyncStatus('Failed to pull data ❌');
        } finally {
            setSyncLoading(false);
        }
    };

    if (currentUser) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ ...cardStyle(), padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name || 'User'}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.email}</div>
                    </div>
                    <button 
                        type="button" 
                        onClick={handleLogout} 
                        disabled={loading}
                        style={{ padding: '0.5rem', color: 'var(--text-muted)', background: 'transparent' }}
                        aria-label="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>

                <div style={{ ...cardStyle(), padding: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Cloud Backup</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                            Securely back up your bookmarks, memorization progress, planners, and reading history.
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={handlePush}
                            disabled={syncLoading}
                            style={{
                                width: '100%',
                                minHeight: '46px',
                                borderRadius: '14px',
                                background: 'var(--accent-primary)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.55rem',
                                fontWeight: 600,
                                opacity: syncLoading ? 0.7 : 1
                            }}
                        >
                            <UploadCloud size={18} aria-hidden="true" />
                            <span>{syncLoading ? 'Syncing...' : 'Backup to Cloud'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePull}
                            disabled={syncLoading}
                            style={{
                                width: '100%',
                                minHeight: '46px',
                                borderRadius: '14px',
                                border: '1px solid var(--accent-primary)',
                                background: 'transparent',
                                color: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.55rem',
                                fontWeight: 600,
                                opacity: syncLoading ? 0.7 : 1
                            }}
                        >
                            <DownloadCloud size={18} aria-hidden="true" />
                            <span>Restore from Cloud</span>
                        </button>
                    </div>

                    {syncStatus && (
                        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.84rem', color: syncStatus.includes('Failed') ? '#ef4444' : 'var(--text-secondary)' }}>
                            {syncStatus}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...cardStyle(), padding: '1.25rem 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>
                    <Cloud size={24} />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>Cloud Sync</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.4 }}>
                    Create an account to securely back up and sync your reading progress across devices.
                </p>
            </div>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {!isLoginMode && (
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                )}
                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                <input
                    type="password"
                    placeholder="Password (min 8 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '0.84rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        minHeight: '46px',
                        borderRadius: '12px',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        fontWeight: 600,
                        marginTop: '0.5rem',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setError('');
                        }}
                        style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', background: 'transparent', textDecoration: 'underline' }}
                    >
                        {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function SettingsDrawer({ isOpen, onClose }) {
    const navigate = useNavigate();
    const {
        theme, toggleTheme,
        fontSize, setFontSize,
        translationFontSize, setTranslationFontSize,
        reciterId, setReciter,
        translationId, setTranslation,
        mushafId, setSelectedMushaf,
        arabicFontId, setArabicFont,
        tajweedEnabled, setTajweed,
        tafsirId, setTafsirId,
        localAudioDirHandle, setLocalAudioDirHandle,
        currentUser, setCurrentUser
    } = useAppStore();

    const mushaf = getMushafById(mushafId);
    const mushafFonts = getMushafFontOptions(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    const [activeView, setActiveView] = useState(DRAWER_VIEWS.root);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (isOpen && isMounted) {
            setTimeout(() => {
                if (isMounted) setActiveView(DRAWER_VIEWS.root);
            }, 0);
        }
        return () => { isMounted = false; };
    }, [isOpen]);

    const selectedTranslation = useMemo(
        () => TRANSLATIONS.find((item) => item.id === translationId),
        [translationId]
    );
    const selectedReciter = useMemo(
        () => RECITERS.find((item) => item.id === reciterId),
        [reciterId]
    );
    const selectedTafsir = useMemo(
        () => TAFSIRS.find((item) => item.id === tafsirId),
        [tafsirId]
    );
    const selectedFont = useMemo(
        () => mushafFonts.find((item) => item.id === arabicFontId),
        [arabicFontId, mushafFonts]
    );

    const { data: offlineStats } = useQuery({
        queryKey: ['offline-pack-stats', translationId, reciterId, mushafId],
        queryFn: () => getOfflinePackStats({ translationId, reciterId, mushafId }),
        enabled: isOpen,
    });

    const handleSelectAudioFolder = async () => {
        try {
            if (!('showDirectoryPicker' in window)) {
                alert('Your browser does not support local folder selection.');
                return;
            }

            const handle = await window.showDirectoryPicker({ mode: 'read' });
            await saveLocalAudioDirHandle(handle);
            setLocalAudioDirHandle(handle);
        } catch (error) {
            console.error('Failed to get directory', error);
        }
    };

    const closeLabel = activeView === DRAWER_VIEWS.root ? 'Close settings' : 'Back to settings';

    const renderPickerView = () => {
        if (activeView === DRAWER_VIEWS.mushaf) {
            return {
                title: 'Choose Mushaf',
                content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {MUSHAFS.map((item) => (
                            <PickerOption
                                key={item.id}
                                title={item.name}
                                subtitle={item.description}
                                active={item.id === mushafId}
                                onClick={() => {
                                    setSelectedMushaf(item.id);
                                    setActiveView(DRAWER_VIEWS.root);
                                }}
                            />
                        ))}
                    </div>
                )
            };
        }

        if (activeView === DRAWER_VIEWS.translation) {
            return {
                title: 'Choose Translation',
                content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {TRANSLATIONS.map((item) => (
                            <PickerOption
                                key={item.id}
                                title={item.name}
                                active={item.id === translationId}
                                onClick={() => {
                                    setTranslation(item.id);
                                    setActiveView(DRAWER_VIEWS.root);
                                }}
                            />
                        ))}
                    </div>
                )
            };
        }

        if (activeView === DRAWER_VIEWS.reciter) {
            return {
                title: 'Choose Reciter',
                content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {RECITERS.map((item) => (
                            <PickerOption
                                key={item.id}
                                title={item.name}
                                active={item.id === reciterId}
                                onClick={() => {
                                    setReciter(item.id);
                                    setActiveView(DRAWER_VIEWS.root);
                                }}
                            />
                        ))}
                    </div>
                )
            };
        }

        if (activeView === DRAWER_VIEWS.arabicFont) {
            return {
                title: 'Choose Arabic Font',
                content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {mushafFonts.map((item) => (
                            <PickerOption
                                key={item.id}
                                title={item.name}
                                subtitle={`Compatible with ${mushaf.name}`}
                                active={item.id === arabicFontId}
                                sampleStyle={{ fontFamily: item.family }}
                                onClick={() => {
                                    setArabicFont(item.id);
                                    setActiveView(DRAWER_VIEWS.root);
                                }}
                            />
                        ))}
                    </div>
                )
            };
        }

        if (activeView === DRAWER_VIEWS.tafsir) {
            return {
                title: 'Choose Tafsir',
                content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {TAFSIRS.map((item) => (
                            <PickerOption
                                key={item.id}
                                title={item.name}
                                subtitle={item.lang}
                                active={item.id === tafsirId}
                                onClick={() => {
                                    setTafsirId(item.id);
                                    setActiveView(DRAWER_VIEWS.root);
                                }}
                            />
                        ))}
                    </div>
                )
            };
        }

        if (activeView === DRAWER_VIEWS.sync) {
            return {
                title: 'Cloud Sync',
                content: <CloudSyncView currentUser={currentUser} setCurrentUser={setCurrentUser} />
            };
        }

        return null;
    };

    if (!isOpen) return null;

    const pickerView = renderPickerView();

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.46)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 999,
                }}
            />

            <aside
                aria-label="Reading settings"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 'min(420px, 92vw)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderLeft: '1px solid rgba(0,0,0,0.06)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-lg)',
                    overscrollBehavior: 'contain',
                }}
            >
                <div
                    style={{
                        padding: '1rem 1rem 0.9rem 1rem',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        background: 'var(--bg-secondary)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
                        {activeView !== DRAWER_VIEWS.root && (
                            <button
                                type="button"
                                className="btn-icon"
                                onClick={() => setActiveView(DRAWER_VIEWS.root)}
                                aria-label={closeLabel}
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {pickerView?.title || 'Reading Settings'}
                            </h2>
                            {activeView === DRAWER_VIEWS.root && (
                                <p style={{ marginTop: '0.15rem', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                                    Keep the essentials close. Move deeper only when needed.
                                </p>
                            )}
                        </div>
                    </div>

                    <button type="button" className="btn-icon" onClick={onClose} aria-label="Close settings">
                        <span aria-hidden="true" style={{ fontSize: '1.25rem', lineHeight: 1 }}>x</span>
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', WebkitOverflowScrolling: 'touch' }}>
                    {pickerView ? (
                        pickerView.content
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <section>
                                <div style={sectionTitleStyle()}>Theme</div>
                                <div style={{ ...cardStyle(), padding: '0.35rem', display: 'flex', gap: '0.4rem' }}>
                                    <SegmentedOption
                                        active={theme === 'light'}
                                        icon={<Sun size={16} aria-hidden="true" />}
                                        label="Light"
                                        onClick={() => theme !== 'light' && toggleTheme()}
                                    />
                                    <SegmentedOption
                                        active={theme === 'dark'}
                                        icon={<Moon size={16} aria-hidden="true" />}
                                        label="Dark"
                                        onClick={() => theme !== 'dark' && toggleTheme()}
                                    />
                                </div>
                            </section>

                            <section>
                                <div style={sectionTitleStyle()}>Quick Settings</div>
                                <div style={cardStyle()}>
                                    <SelectionRow label="Mushaf" value={mushaf.name} onClick={() => setActiveView(DRAWER_VIEWS.mushaf)} />
                                    <SelectionRow label="Translation" value={selectedTranslation?.name} onClick={() => setActiveView(DRAWER_VIEWS.translation)} />
                                    <SelectionRow label="Reciter" value={selectedReciter?.name} onClick={() => setActiveView(DRAWER_VIEWS.reciter)} />
                                    <SelectionRow 
                                        label="Cloud Sync" 
                                        hint={currentUser ? `Signed in as ${currentUser.name || currentUser.email}` : "Backup your reading progress"} 
                                        onClick={() => setActiveView(DRAWER_VIEWS.sync)} 
                                    />
                                    <div style={{ padding: '1rem 1.05rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.65rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>Arabic Size</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Adjust Quran text without opening another view</div>
                                            </div>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                                <Type size={16} aria-hidden="true" />
                                                <span>{fontSize}</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="8"
                                            step="1"
                                            value={fontSize}
                                            onChange={(e) => setFontSize(Number(e.target.value))}
                                            className="settings-slider"
                                            aria-label="Arabic font size"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div style={sectionTitleStyle()}>Reading</div>
                                <div style={cardStyle()}>
                                    <ToggleRow
                                        label="Tajweed"
                                        hint={mushaf.supportsTajweedToggle ? 'Show color cues while keeping the reader minimal' : 'Not available for this Mushaf'}
                                        checked={isTajweedActive}
                                        disabled={!mushaf.supportsTajweedToggle}
                                        onToggle={() => setTajweed(!tajweedEnabled)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvanced((value) => !value)}
                                        style={{
                                            ...rowButtonStyle(),
                                            padding: '0.95rem 1.05rem',
                                            borderTop: '1px solid rgba(0,0,0,0.06)',
                                        }}
                                        aria-expanded={showAdvanced}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Advanced</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Arabic font, tafsir, offline tools & audio folder</div>
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            color="var(--text-muted)"
                                            aria-hidden="true"
                                            style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                                        />
                                    </button>
                                </div>
                            </section>

                            {showAdvanced && (
                                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <div style={sectionTitleStyle()}>Advanced Reading</div>
                                        <div style={cardStyle()}>
                                            <SelectionRow label="Arabic Font" value={selectedFont?.name || 'Default'} onClick={() => setActiveView(DRAWER_VIEWS.arabicFont)} />
                                            <SelectionRow label="Tafsir" value={selectedTafsir ? `${selectedTafsir.name} - ${selectedTafsir.lang}` : ''} onClick={() => setActiveView(DRAWER_VIEWS.tafsir)} />
                                            <div style={{ padding: '1rem 1.05rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.65rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>Translation Size</div>
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Keep the translation subtle or more readable</div>
                                                    </div>
                                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{translationFontSize || 2}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="8"
                                                    step="1"
                                                    value={translationFontSize || 2}
                                                    onChange={(e) => setTranslationFontSize(Number(e.target.value))}
                                                    className="settings-slider"
                                                    aria-label="Translation font size"
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div style={sectionTitleStyle()}>Audio</div>
                                        <div style={{ ...cardStyle(), padding: '1rem 1.05rem' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Local Offline Audio</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '0.95rem' }}>
                                                Connect a folder of ayah MP3 files for native offline playback.
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSelectAudioFolder}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '46px',
                                                    borderRadius: '14px',
                                                    border: localAudioDirHandle ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(0,0,0,0.06)',
                                                    background: localAudioDirHandle ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)',
                                                    color: localAudioDirHandle ? '#22c55e' : 'var(--text-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.55rem',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {localAudioDirHandle ? <CheckCircle size={18} aria-hidden="true" /> : <FolderOpen size={18} aria-hidden="true" />}
                                                <span>{localAudioDirHandle ? 'Folder Connected' : 'Choose Audio Folder'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <div style={sectionTitleStyle()}>Offline</div>
                                        <div style={{ ...cardStyle(), padding: '1rem 1.05rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.95rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                                        <HardDrive size={16} aria-hidden="true" />
                                                        <span>Offline Library</span>
                                                    </div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                                                        Manage downloadable Quran packs and keep your reading setup available offline.
                                                    </div>
                                                </div>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.65rem', borderRadius: '999px', background: navigator.onLine ? 'var(--bg-secondary)' : 'rgba(239, 68, 68, 0.12)', color: navigator.onLine ? 'var(--text-secondary)' : '#ef4444', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                                                    <WifiOff size={13} aria-hidden="true" />
                                                    {navigator.onLine ? 'Online' : 'Offline'}
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.95rem' }}>
                                                <div style={{ padding: '0.9rem', borderRadius: '14px', background: 'var(--bg-secondary)' }}>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.25rem' }}>Quran text</div>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.92rem' }}>
                                                        {offlineStats?.quranText?.downloaded ? offlineStats.quranText.sizeLabel : 'Not downloaded'}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '0.9rem', borderRadius: '14px', background: 'var(--bg-secondary)' }}>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.25rem' }}>Tajweed</div>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.92rem' }}>
                                                        {offlineStats?.tajweed?.downloaded ? offlineStats.tajweed.sizeLabel : 'Not downloaded'}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    navigate('/offline-library');
                                                }}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '46px',
                                                    borderRadius: '14px',
                                                    background: 'var(--accent-primary)',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.55rem',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <CheckCircle size={18} aria-hidden="true" />
                                                <span>Open Offline Library</span>
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
