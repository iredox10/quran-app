import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../services/api/quranApi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Search, Bookmark, DownloadCloud, X, Hash, Layers3, LibraryBig, Rows3 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { HIZB_STARTS, JUZ_STARTS, PAGE_GROUPS } from '../data/quranNavigation';
import PomodoroWidget from '../components/PomodoroWidget';

const BROWSE_MODES = [
    { id: 'surah', label: 'Surah', icon: BookOpen },
    { id: 'page', label: 'Page', icon: Rows3 },
    { id: 'juz', label: 'Juz', icon: LibraryBig },
    { id: 'hizb', label: 'Hizb', icon: Layers3 },
];

function getBrowseItems(mode, chapters) {
    if (mode === 'page') {
        return PAGE_GROUPS.map((item) => ({
            key: `page-${item.id}`,
            title: `Page ${item.pageNumber}`,
            subtitle: 'Open Mushaf page view',
            meta: `Page ${String(item.pageNumber).padStart(3, '0')}`,
            to: `/page/${item.pageNumber}`,
            arabic: null,
            prefix: null, // to replace chapter.id block
        }));
    }

    if (mode === 'juz') {
        return JUZ_STARTS.map((item) => ({
            key: `juz-${item.id}`,
            title: `Juz ${item.id}`,
            subtitle: `Starts at ${item.verseKey}`,
            meta: `Page ${item.pageNumber}`,
            to: `/page/${item.pageNumber}`,
            arabic: `الجزء ${item.id}`,
            prefix: item.id,
        }));
    }

    if (mode === 'hizb') {
        return HIZB_STARTS.map((item) => ({
            key: `hizb-${item.id}`,
            title: `Hizb ${item.id}`,
            subtitle: `Starts at ${item.verseKey}`,
            meta: `Page ${item.pageNumber}`,
            to: `/page/${item.pageNumber}`,
            arabic: `حزب ${item.id}`,
            prefix: item.id,
        }));
    }

    return (chapters || []).map((chapter) => ({
        key: `surah-${chapter.id}`,
        title: chapter.name_simple,
        subtitle: `${chapter.translated_name.name}`,
        meta: `${chapter.verses_count} Ayahs`,
        to: `/surah/${chapter.id}`,
        arabic: chapter.name_arabic,
        prefix: chapter.id,
    }));
}

export default function Home() {
    const { recentlyRead, bookmark } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [browseMode, setBrowseMode] = useState('surah');

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

    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        // Only show if NOT standalone and NOT dismissed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        const dismissed = localStorage.getItem('hideInstallCard');

        if (!isStandalone && !dismissed) {
            setIsInstallable(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const dismissInstall = (e) => {
        e.stopPropagation();
        localStorage.setItem('hideInstallCard', 'true');
        setIsInstallable(false);
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsInstallable(false);
            }
        } else {
            // Fallback for iOS or unsupported browsers
            const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIos) {
                alert("To install on iOS: Tap the Share icon below, then select 'Add to Home Screen'.");
            } else {
                alert("You can install this app from your browser menu. Look for 'Install App' or 'Add to Home Screen'.");
            }
        }
    };

    const { data: chapters, isLoading, error } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
    });

    const browseItems = useMemo(() => getBrowseItems(browseMode, chapters), [browseMode, chapters]);

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return browseItems;
        }

        return browseItems.filter((item) => {
            return [item.title, item.subtitle, item.meta, item.arabic]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [browseItems, searchQuery]);

    if (isLoading) return (
        <div className="container" style={{ textAlign: 'center', padding: '10vh 0', color: 'var(--text-muted)' }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginBottom: '1rem' }}
            />
            <h2>Loading Surahs...</h2>
        </div>
    );

    if (error) return (
        <div className="container" style={{ textAlign: 'center', color: 'red' }}>
            <h2>Error fetching data. Please try again later.</h2>
        </div>
    );

    return (
        <div className="container">
            <Helmet>
                <title>The Noble Qur'an - Read, Study, Learn</title>
                <meta name="description" content="A beautiful, fully-featured web application for reading and studying the Noble Qur'an. Featuring dark mode, authentic fonts, audio playback, and multi-language translations." />
            </Helmet>

            <AnimatePresence>
                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            padding: '1rem',
                            background: 'var(--accent-light)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '12px',
                            color: 'var(--accent-primary)',
                            textAlign: 'center',
                            marginBottom: '1rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s infinite' }} />
                        Offline Mode — Using Cached Data
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isInstallable && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="interactive-hover install-card-banner"
                        onClick={handleInstallClick}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1.25rem',
                            background: 'var(--accent-primary)',
                            backgroundImage: 'linear-gradient(135deg, var(--accent-primary), #4ade80)',
                            borderRadius: '16px',
                            color: '#000',
                            marginBottom: '2rem',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-md)',
                        }}
                    >
                        <button
                            onClick={dismissInstall}
                            style={{
                                position: 'absolute', top: '8px', right: '8px',
                                background: 'transparent', border: 'none', color: 'rgba(0,0,0,0.5)',
                                cursor: 'pointer', padding: '4px',
                            }}
                            aria-label="Dismiss banner"
                        >
                            <X size={16} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
                                <DownloadCloud size={24} color="#000" />
                            </div>
                            <div style={{ paddingRight: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Install App</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 500, opacity: 0.85 }}>
                                    Read offline, faster load times, and native feel.
                                </p>
                            </div>
                        </div>
                        <span style={{ fontWeight: 700, padding: '6px 12px', background: '#000', color: '#fff', borderRadius: '999px', fontSize: '0.8rem' }}>
                            Install
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem', marginBottom: '3rem' }}>

                <section>
                    <PomodoroWidget />
                </section>

                {/* Recently Read */}
                {recentlyRead && recentlyRead.length > 0 && (
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={20} color="var(--accent-primary)" /> Recently Read
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                            {recentlyRead.map((item) => (
                                <Link
                                    key={item.chapterId}
                                    to={item.verseKey ? `/surah/${item.chapterId}?verse=${item.verseKey}` : `/surah/${item.chapterId}`}
                                    className="interactive-hover"
                                    style={{
                                        minWidth: '180px',
                                        padding: '1rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '16px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Surah {item.chapterId}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{item.chapterName}</span>
                                    {item.verseKey && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verse {item.verseKey.split(':')[1]}</span>}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Bookmark (Single reading position) */}
                {bookmark && (
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bookmark size={20} color="var(--accent-primary)" /> My Bookmark
                        </h2>
                        <Link
                            to={`/surah/${bookmark.chapterId || bookmark.verseKey.split(':')[0]}?verse=${bookmark.verseKey}`}
                            className="interactive-hover"
                            style={{
                                display: 'inline-flex',
                                minWidth: '220px',
                                padding: '1.25rem',
                                background: 'var(--accent-light)',
                                border: '1px solid var(--accent-primary)',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                color: 'inherit',
                                flexDirection: 'column',
                                gap: '0.25rem'
                            }}
                        >
                            <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>{bookmark.surahName}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verse {bookmark.verseKey.split(':')[1]}</span>
                        </Link>
                    </section>
                )}
            </div>

            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <BookOpen size={24} color="var(--accent-primary)" />
                                Browse the Quran
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                Select a Surah, Page, Juz, or Hizb to begin reading.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {BROWSE_MODES.map((mode) => {
                                const Icon = mode.icon;
                                const active = browseMode === mode.id;
                                return (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setBrowseMode(mode.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            minHeight: '42px',
                                            padding: '0.65rem 0.95rem',
                                            borderRadius: '999px',
                                            border: `1px solid ${active ? 'rgba(198, 168, 124, 0.35)' : 'rgba(0,0,0,0.06)'}`,
                                            background: active ? 'var(--accent-light)' : 'var(--bg-secondary)',
                                            color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Icon size={16} aria-hidden="true" />
                                        <span>{mode.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-secondary)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        padding: '1rem 1.5rem',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                    }} className="search-container">
                        <Search size={20} color="var(--text-muted)" style={{ marginRight: '1rem' }} />
                        <input
                            type="text"
                            placeholder={`Search ${browseMode}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label={`Search ${browseMode}`}
                            style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '1.1rem', fontFamily: 'inherit' }}
                        />
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem'
                }}>
                    {filteredItems.map((item) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            key={item.key}
                        >
                            <Link
                                to={item.to}
                                className="interactive-hover"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1.25rem 1.5rem',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '20px',
                                    boxShadow: 'var(--shadow-sm)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--bg-primary)',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    color: 'var(--accent-primary)',
                                    marginRight: '1.25rem',
                                    fontSize: '1rem',
                                    border: '1px solid rgba(198, 168, 124, 0.15)'
                                }}>
                                    {item.prefix || <Hash size={16} />}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {item.title}
                                        </h3>
                                        {item.arabic && (
                                            <div style={{
                                                fontFamily: "'Amiri Quran', serif",
                                                fontSize: '1.4rem',
                                                color: 'var(--accent-primary)',
                                                direction: 'rtl',
                                                marginLeft: '1rem'
                                            }}>
                                                {item.arabic}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                            {item.subtitle}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
                                            {item.meta}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
}
