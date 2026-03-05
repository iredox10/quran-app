import { useAppStore } from '../store/useAppStore';
import { X, Check } from 'lucide-react';

const RECITERS = [
    { id: 7, name: 'Mishary Rashid Alafasy' },
    { id: 1, name: 'AbdulBaset AbdulSamad' },
    { id: 3, name: 'Abdur-Rahman as-Sudais' },
    { id: 4, name: 'Abu Bakr al-Shatri' }
];

const TRANSLATIONS = [
    { id: 131, name: 'English (Saheeh International)' },
    { id: 85, name: 'English (Clear Quran)' },
    { id: 39, name: 'English (Yusuf Ali)' },
    { id: 234, name: 'Urdu (Abul A\'ala Maududi)' }
];

const FONTS = [
    { id: "'KFGQPC Uthman Taha Naskh', 'Amiri Quran', serif", name: 'Uthman Taha Naskh' },
    { id: "'Amiri Quran', serif", name: 'Amiri Quran' },
    { id: "'Noto Naskh Arabic', serif", name: 'Noto Naskh Arabic' },
    { id: "'Scheherazade New', serif", name: 'Scheherazade New' }
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
        reciterId, setReciter,
        translationId, setTranslation,
        arabicFont, setArabicFont,
        tajweedEnabled, setTajweed,
        tafsirId, setTafsirId
    } = useAppStore();

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
                width: '100%',
                maxWidth: '400px',
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

                    {/* Font Size */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Font Size</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                                className="btn-icon"
                                style={{ border: '1px solid var(--border-color)' }}
                                onClick={() => setFontSize(Math.max(1, fontSize - 1))}
                            >A-</button>
                            <div style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', fontWeight: 600 }}>{fontSize}</div>
                            <button
                                className="btn-icon"
                                style={{ border: '1px solid var(--border-color)' }}
                                onClick={() => setFontSize(Math.min(4, fontSize + 1))}
                            >A+</button>
                        </div>
                    </div>

                    {/* Tajweed Rules */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Tajweed Rules</h3>
                        <button
                            onClick={() => setTajweed(!tajweedEnabled)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: tajweedEnabled ? 'var(--accent-light)' : 'transparent',
                                color: tajweedEnabled ? 'var(--accent-primary)' : 'var(--text-primary)',
                                textAlign: 'left'
                            }}
                        >
                            <div>
                                <span style={{ fontWeight: 500 }}>Color-coded Tajweed</span>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Highlight letters with tajweed color rules
                                </p>
                            </div>
                            <div style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                backgroundColor: tajweedEnabled ? 'var(--accent-primary)' : 'var(--border-color)',
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
                                    left: tajweedEnabled ? '22px' : '2px',
                                    transition: 'left 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                        </button>
                    </div>

                    {/* Arabic Font */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Arabic Font</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {FONTS.map((f) => (
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
                                        backgroundColor: arabicFont === f.id ? 'var(--accent-light)' : 'transparent',
                                        color: arabicFont === f.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        textAlign: 'left',
                                        fontFamily: f.id
                                    }}
                                >
                                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>{f.name}</span>
                                    {arabicFont === f.id && <Check size={18} />}
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
            </div>
        </>
    );
}
