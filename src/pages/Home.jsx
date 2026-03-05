import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../services/api/quranApi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Search, Bookmark } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Home() {
    const { recentlyRead, bookmarks } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);

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

    const { data: chapters, isLoading, error } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
    });

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

    const filteredChapters = chapters?.filter(c =>
        c.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.translated_name.name.toLowerCase().includes(searchQuery.toLowerCase())
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

            <div style={{
                padding: '3rem',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                borderRadius: '24px',
                color: 'white',
                textAlign: 'center',
                marginBottom: '3rem',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-1px' }}>
                    The Noble Qur'an
                </h1>
                <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>
                    Read, study, and learn the word of Allah.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem', marginBottom: '3rem' }}>
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
                                    to={`/surah/${item.chapterId}`}
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
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Bookmarks */}
                {bookmarks && bookmarks.length > 0 && (
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bookmark size={20} color="var(--accent-primary)" /> My Bookmarks
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                            {bookmarks.map((verseKey) => (
                                <Link
                                    key={verseKey}
                                    to={`/surah/${verseKey.split(':')[0]}?verse=${verseKey}`}
                                    className="interactive-hover"
                                    style={{
                                        minWidth: '140px',
                                        padding: '1rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '16px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verse</span>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{verseKey}</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Surahs (Chapters)
            </h2>

            <div style={{
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '0.75rem 1.5rem',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <Search size={20} color="var(--text-muted)" style={{ marginRight: '1rem' }} />
                <input
                    type="text"
                    placeholder="Search Surahs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '1.1rem', fontFamily: 'inherit' }}
                />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {filteredChapters?.map((chapter, index) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        key={chapter.id}
                    >
                        <Link
                            to={`/surah/${chapter.id}`}
                            className="glass-panel interactive-hover"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1.25rem',
                                textDecoration: 'none',
                                color: 'inherit',
                                border: '1px solid var(--border-color)', // overriding glass if we want solid borders in light mode
                                background: 'var(--bg-secondary)', // giving it solid bg on grid
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--bg-primary)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                color: 'var(--accent-primary)',
                                marginRight: '1rem',
                                fontSize: '0.9rem'
                            }}>
                                {chapter.id}
                            </div>

                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{chapter.name_simple}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {chapter.translated_name.name} • {chapter.verses_count} Ayahs
                                </p>
                            </div>

                            <div style={{
                                fontFamily: "'Amiri Quran', serif",
                                fontSize: '1.5rem',
                                color: 'var(--accent-primary)',
                                direction: 'rtl'
                            }}>
                                {chapter.name_arabic}
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
