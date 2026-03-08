import { useAppStore } from '../store/useAppStore';
import { X, Check, DownloadCloud, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { getChapters, getVerses, getTajweedVerses } from '../services/api/quranApi';
import { useState } from 'react';
import { getMushafById, getMushafFontOptions, isTajweedEnabledForMushaf, MUSHAFS } from '../config/mushaf';

const RECITERS = [
    { id: 7, name: 'Mishary Rashid Alafasy' },
    { id: 1, name: 'AbdulBaset AbdulSamad' },
    { id: 3, name: 'Abdur-Rahman as-Sudais' },
    { id: 4, name: 'Abu Bakr al-Shatri' }
];

const TRANSLATIONS = [
    { id: 85, name: 'English — M.A.S. Abdel Haleem' },
    { id: 20, name: 'English — Saheeh International' },
    { id: 22, name: 'English — A. Yusuf Ali' },
    { id: 84, name: 'English — Mufti Taqi Usmani' },
    { id: 32, name: 'Hausa — Abubakar Mahmoud Gumi' },
    { id: 234, name: 'Urdu — Fatah Muhammad Jalandhari' }
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
        offlineDataStatus, setOfflineStatus
    } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const mushafFonts = getMushafFontOptions(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    const [syncProgress, setSyncProgress] = useState(0);

    const handleSyncQuran = async () => {
        try {
            setOfflineStatus('syncing');
            setSyncProgress(0);

            // 1. Chapters
            const chapters = await getChapters();
            setSyncProgress(5);

            // 2. Loop through all 114 chapters
            // We do this surah by surah with a tiny break to avoid flooding
            for (let i = 0; i < chapters.length; i++) {
                const chapterId = chapters[i].id;

                // Fetch basic verses (Arabic + current Translation)
                await getVerses(chapterId, translationId, reciterId, 1, mushafId);

                // Fetch tajweed verses
                if (mushaf.tajweedSource === 'uthmani_html' && isTajweedActive) {
                    await getTajweedVerses(chapterId);
                }

                setSyncProgress(5 + Math.floor((i / chapters.length) * 95));

                // Tiny break every 5 chapters to keep UI thread happy
                if (i % 5 === 0) {
                    await new Promise(r => setTimeout(r, 50));
                }
            }

            setOfflineStatus('completed');
            setSyncProgress(100);
        } catch (error) {
            console.error("Sync failed", error);
            setOfflineStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999
                }}
                onClick={onClose}
            />
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 'min(400px, 85vw)',
                backgroundColor: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-color)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Preferences</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Theme */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Theme</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {['light', 'dark'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => { if (theme !== t) toggleTheme(); }}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: `1px solid ${theme === t ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                        backgroundColor: theme === t ? 'var(--accent-light)' : 'var(--bg-primary)',
                                        color: theme === t ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        fontWeight: 500,
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Quran Appearance</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {MUSHAFS.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedMushaf(item.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: '1rem',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: mushafId === item.id ? 'var(--accent-light)' : 'transparent',
                                        color: mushafId === item.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.description}</div>
                                    </div>
                                    {mushafId === item.id && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Size (Arabic) */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Arabic Font Size</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, minWidth: '18px' }}>A</span>
                            <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="settings-slider"
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '18px' }}>A</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', minWidth: '20px', textAlign: 'center' }}>{fontSize}</span>
                        </div>
                    </div>

                    {/* Font Size (Translation) */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Translation Font Size</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, minWidth: '18px' }}>A</span>
                            <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={translationFontSize || 2}
                                onChange={(e) => setTranslationFontSize(Number(e.target.value))}
                                className="settings-slider"
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '18px' }}>A</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', minWidth: '20px', textAlign: 'center' }}>{translationFontSize || 2}</span>
                        </div>
                    </div>

                    {/* Tajweed Rules */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Tajweed Rules</h3>
                        <button
                            disabled={!mushaf.supportsTajweedToggle}
                            onClick={() => {
                                if (mushaf.supportsTajweedToggle) {
                                    setTajweed(!tajweedEnabled);
                                }
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: isTajweedActive ? 'var(--accent-light)' : 'transparent',
                                color: isTajweedActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                                textAlign: 'left',
                                opacity: mushaf.supportsTajweedToggle ? 1 : 0.6,
                                cursor: mushaf.supportsTajweedToggle ? 'pointer' : 'default'
                            }}
                        >
                            <div>
                                <span style={{ fontWeight: 500 }}>{mushaf.forcesTajweed ? 'Included in this Mushaf' : 'Color-coded Tajweed'}</span>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {mushaf.supportsTajweedToggle
                                        ? 'Highlight letters with tajweed color rules'
                                        : 'This Mushaf does not expose the current tajweed overlay pipeline'}
                                </p>
                            </div>
                            <div style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                backgroundColor: isTajweedActive ? 'var(--accent-primary)' : 'var(--border-color)',
                                position: 'relative',
                                transition: 'background-color 0.2s ease',
                                flexShrink: 0
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isTajweedActive ? '22px' : '2px',
                                    transition: 'left 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                        </button>
                    </div>

                    {/* Arabic Font */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Arabic Font</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                            Compatible with {mushaf.name}. Fonts are filtered by the selected Mushaf profile.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {mushafFonts.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setArabicFont(f.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: arabicFontId === f.id ? 'var(--accent-light)' : 'transparent',
                                        color: arabicFontId === f.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        textAlign: 'left',
                                        fontFamily: f.family
                                    }}
                                >
                                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>{f.name}</span>
                                    {arabicFontId === f.id && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reciter */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Reciter</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {RECITERS.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setReciter(r.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: reciterId === r.id ? 'var(--accent-light)' : 'transparent',
                                        color: reciterId === r.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span>{r.name}</span>
                                    {reciterId === r.id && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Translation */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Translation</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {TRANSLATIONS.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTranslation(t.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: translationId === t.id ? 'var(--accent-light)' : 'transparent',
                                        color: translationId === t.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span>{t.name}</span>
                                    {translationId === t.id && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tafsir Source */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Tafsir Source</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {TAFSIRS.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTafsirId(t.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: tafsirId === t.id ? 'var(--accent-light)' : 'transparent',
                                        color: tafsirId === t.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div>
                                        <span style={{ fontWeight: 500 }}>{t.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({t.lang})</span>
                                    </div>
                                    {tafsirId === t.id && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Offline Support */}
                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', flexShrink: 0, borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', backgroundColor: 'var(--bg-primary)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DownloadCloud size={18} /> Offline Support
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                        Make all 114 Surahs available for reading without an internet connection.
                    </p>

                    {offlineDataStatus === 'completed' ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '8px',
                            color: '#22c55e',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}>
                            <CheckCircle size={20} /> Quran Text is Offline
                            <button
                                onClick={() => setOfflineStatus('idle')}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Re-sync
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleSyncQuran}
                            disabled={offlineDataStatus === 'syncing'}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '12px',
                                background: offlineDataStatus === 'syncing' ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                                color: offlineDataStatus === 'syncing' ? 'var(--text-muted)' : 'white',
                                border: 'none',
                                fontWeight: 600,
                                cursor: offlineDataStatus === 'syncing' ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {offlineDataStatus === 'syncing' ? (
                                <>
                                    <RefreshCw size={18} className="spin" />
                                    Downloading ({syncProgress}%)
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        height: '4px',
                                        width: `${syncProgress}%`,
                                        backgroundColor: 'var(--accent-primary)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </>
                            ) : (
                                <>
                                    <DownloadCloud size={18} />
                                    Download Quran Text
                                </>
                            )}
                        </button>
                    )}

                    {offlineDataStatus === 'error' && (
                        <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <AlertCircle size={14} /> Something went wrong. Try again.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
