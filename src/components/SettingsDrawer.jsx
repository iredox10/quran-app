import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
    ArrowLeft,
    Check,
    ChevronDown,
    ChevronRight,
    Moon,
    Sun,
    Type,
    HardDrive,
    Trash2,
    Download,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { getMushafById, getMushafFontOptions, isTajweedEnabledForMushaf, MUSHAFS } from '../config/mushaf';
import { getOfflinePackStats, deleteOfflinePack, syncQuranTextPack, syncTajweedPack, syncPagePack } from '../utils/offlineLibrary';
import { getOfflineCacheStats, deleteOfflineCacheByPrefix } from '../utils/offlineCache';
import { getSyncState } from '../services/syncService';
import { isAppwriteConfigured } from '../services/appwrite/client';

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

export default function SettingsDrawer({ isOpen, onClose }) {
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
    } = useAppStore();

    const mushaf = getMushafById(mushafId);
    const mushafFonts = getMushafFontOptions(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    const [activeView, setActiveView] = useState(DRAWER_VIEWS.root);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [offlinePacks, setOfflinePacks] = useState({});
    const [cacheStats, setCacheStats] = useState({ count: 0, approximateBytes: 0 });
    const [downloadingPack, setDownloadingPack] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const syncState = getSyncState();
    const syncConfigured = isAppwriteConfigured();

    useEffect(() => {
        let isMounted = true;
        if (isOpen && isMounted) {
            setTimeout(() => {
                if (isMounted) setActiveView(DRAWER_VIEWS.root);
            }, 0);
        }
        return () => { isMounted = false; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;

        async function loadStats() {
            try {
                const { mushafId, translationId, reciterId } = useAppStore.getState();
                const packs = await getOfflinePackStats({ translationId, reciterId, mushafId });
                const cache = await getOfflineCacheStats();
                if (isMounted) {
                    setOfflinePacks(packs);
                    setCacheStats(cache);
                }
            } catch (e) {
                console.warn('Failed to load offline stats:', e);
            }
        }
        loadStats();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            isMounted = false;
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
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

    async function handleDownloadPack(packId) {
        if (!isOnline || downloadingPack) return;
        setDownloadingPack(packId);
        setDownloadProgress({ current: 0, total: 1, label: 'Starting...' });
        try {
            const { mushafId, translationId, reciterId, tafsirId } = useAppStore.getState();
            const onProgress = (p) => setDownloadProgress(p);
            if (packId === 'quranText') await syncQuranTextPack({ translationId, reciterId, mushafId, onProgress });
            else if (packId === 'tajweed') await syncTajweedPack({ onProgress });
            else if (packId === 'pagePack') await syncPagePack({ onProgress });
            else if (packId === 'translation') await syncTranslationPack({ translationId, onProgress });
            else if (packId === 'tafsir') await syncTafsirPack({ tafsirId, onProgress });
            const packs = await getOfflinePackStats({ translationId, reciterId, mushafId });
            setOfflinePacks(packs);
        } catch (e) {
            console.error('Failed to download pack:', e);
        }
        setDownloadingPack(null);
        setDownloadProgress(null);
    }

    async function handleDeletePack(packId) {
        try {
            await deleteOfflinePack(packId);
            const { mushafId, translationId, reciterId } = useAppStore.getState();
            const packs = await getOfflinePackStats({ translationId, reciterId, mushafId });
            setOfflinePacks(packs);
        } catch (e) {
            console.error('Failed to delete pack:', e);
        }
    }

    async function handleClearCache() {
        try {
            await deleteOfflineCacheByPrefix('');
            setCacheStats({ count: 0, approximateBytes: 0 });
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    }

    function formatBytes(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }
        return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    }

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
                                <div style={sectionTitleStyle()}>Offline & Storage</div>
                                <div style={cardStyle()}>
                                    <div style={{ padding: '1rem 1.05rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isOnline ? <Wifi size={16} color="#22c55e" /> : <WifiOff size={16} color="var(--text-muted)" />}
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{isOnline ? 'Online' : 'Offline'}</span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {cacheStats.count} cached · {formatBytes(cacheStats.approximateBytes)}
                                            </span>
                                        </div>
                                        {syncConfigured && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                Sync: {syncState.syncStatus}
                                            </div>
                                        )}
                                        <button
                                            onClick={handleClearCache}
                                            style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                        >
                                            <Trash2 size={12} /> Clear API Cache
                                        </button>
                                    </div>

                                    {['quranText', 'tajweed', 'pagePack', 'translation', 'tafsir'].map((packId) => {
                                        const pack = offlinePacks[packId];
                                        if (!pack) return null;
                                        const isDownloading = downloadingPack === packId;
                                        const progress = isDownloading ? downloadProgress : null;

                                        return (
                                            <div key={packId} style={{ padding: '0.85rem 1.05rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pack.title || packId}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                            {pack.downloaded ? `${pack.entryCount} items · ${pack.sizeLabel}` : 'Not downloaded'}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {pack.downloaded && (
                                                            <button
                                                                onClick={() => handleDeletePack(packId)}
                                                                style={{ padding: '0.35rem 0.6rem', background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDownloadPack(packId)}
                                                            disabled={!isOnline || isDownloading}
                                                            style={{ padding: '0.35rem 0.6rem', background: isOnline ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '0.72rem', fontWeight: 600, cursor: isOnline ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '3px' }}
                                                        >
                                                            {isDownloading ? <Download size={11} className="spin" /> : <Download size={11} />}
                                                            {isDownloading ? '...' : 'Download'}
                                                        </button>
                                                    </div>
                                                </div>
                                                {progress && (
                                                    <div style={{ marginTop: '0.35rem' }}>
                                                        <div style={{ height: '3px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${(progress.current / progress.total) * 100}%`, background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{progress.label}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                                </section>
                            )}

                            <div style={{ textAlign: 'center', margin: '1.5rem 0 1rem 0' }}>
                                <a 
                                    href="https://iredox.tech" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ 
                                        color: 'var(--text-muted)', 
                                        fontSize: '0.8rem', 
                                        textDecoration: 'none',
                                        fontWeight: 500,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    built by iredox.tech
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
