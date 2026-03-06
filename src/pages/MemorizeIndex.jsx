import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../services/api/quranApi';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Search, Mic, Bookmark, Folder, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function MemorizeIndex() {
    const { setNavHeaderTitle, bookmarks, collections } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setNavHeaderTitle('Select Surah for Hifdh');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

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
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Helmet>
                <title>Hifdh Mode - Select Surah</title>
                <meta name="description" content="Select a Surah for active memorization." />
            </Helmet>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div style={{
                    padding: '3rem',
                    background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-secondary))',
                    borderRadius: '24px',
                    textAlign: 'center',
                    marginBottom: '3rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <Mic size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        Active Memorization
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                        Select a Surah to begin your distraction-free Hifdh session.
                    </p>
                </div>

                {/* Library Quick Access */}
                {(bookmarks?.length > 0 || collections?.length > 0) && (
                    <div style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Bookmark size={20} color="var(--accent-primary)" /> Quick Resume from Library
                            </h2>
                            <Link to="/library" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>View Hub</Link>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                            {bookmarks?.slice(0, 4).map((b, i) => (
                                <Link
                                    key={`b-${i}`}
                                    to={`/memorize/${b.chapterId}?verse=${b.verseKey}`}
                                    className="interactive-hover"
                                    style={{
                                        padding: '1.25rem',
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '16px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '1rem' }}>{b.surahName}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ayah {b.verseKey.split(':')[1]}</div>
                                    </div>
                                    <ArrowRight size={16} color="var(--accent-primary)" />
                                </Link>
                            ))}
                            {collections?.slice(0, 2).map((c) => (
                                <Link
                                    key={c.id}
                                    to={`/memorize/${c.items[0]?.chapterId}`}
                                    className="interactive-hover"
                                    style={{
                                        padding: '1.25rem',
                                        background: 'var(--accent-light)',
                                        border: '1px solid var(--accent-primary)',
                                        borderRadius: '16px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Folder size={20} color="var(--accent-primary)" />
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '1rem' }}>{c.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.items.length} verses</div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{
                    marginBottom: '3rem',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    padding: '1rem 1.5rem',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <Search size={20} color="var(--text-muted)" style={{ marginRight: '1rem' }} />
                    <input
                        type="text"
                        placeholder="Search for a Surah to memorize..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '1.1rem', fontFamily: 'inherit' }}
                    />
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1rem'
                }}>
                    {filteredChapters?.map((chapter) => (
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={chapter.id}
                        >
                            <Link
                                to={`/memorize/${chapter.id}`}
                                className="interactive-hover"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1.5rem',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--accent-light)',
                                    borderRadius: '16px',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--accent-light)',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    color: 'var(--accent-primary)',
                                    marginRight: '1rem',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.9rem'
                                }}>
                                    {chapter.id}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{chapter.name_simple}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {chapter.verses_count} Ayahs
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
