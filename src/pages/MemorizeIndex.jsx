import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../services/api/quranApi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Search, Mic, Bookmark, Folder, ArrowRight, CheckCircle, Award, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PomodoroWidget from '../components/PomodoroWidget';

export default function MemorizeIndex() {
    const { setNavHeaderTitle, bookmarks, collections, memorizedSurahs, memorizedAyahs } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyMemorized, setShowOnlyMemorized] = useState(false);
    const [showSurahsModal, setShowSurahsModal] = useState(false);
    const [showAyahsModal, setShowAyahsModal] = useState(false);

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

    let filteredChapters = chapters?.filter(c =>
        c.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.translated_name.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (showOnlyMemorized) {
        filteredChapters = filteredChapters?.filter(c => (memorizedSurahs || []).includes(c.id));
    }

    // Group Ayahs By Surah for the Modal
    const memorizedAyahsGrouped = (memorizedAyahs || []).reduce((acc, key) => {
        const [surahId, ayahNum] = key.split(':');
        if (!acc[surahId]) acc[surahId] = [];
        acc[surahId].push(Number(ayahNum));
        return acc;
    }, {});
    // Sort Ayahs within each Surah
    Object.keys(memorizedAyahsGrouped).forEach(surahId => {
        memorizedAyahsGrouped[surahId].sort((a, b) => a - b);
    });

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Helmet>
                <title>Hifdh Mode - Select Surah</title>
                <meta name="description" content="Select a Surah for active memorization." />
            </Helmet>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                {/* Progress Tracking Hero */}
                <div style={{
                    padding: '2.5rem',
                    background: 'var(--bg-surface)',
                    borderRadius: '24px',
                    marginBottom: '3rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                }}>
                    <Mic size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--text-primary)' }}>
                        Hifdh Tracker
                    </h1>

                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                        <div
                            className="interactive-hover"
                            onClick={() => setShowSurahsModal(true)}
                            style={{ flex: 1, minWidth: '150px', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--accent-light)', cursor: 'pointer' }}
                        >
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                {(memorizedSurahs || []).length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 114</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Surahs Memorized
                            </div>
                        </div>
                        <div
                            className="interactive-hover"
                            onClick={() => setShowAyahsModal(true)}
                            style={{ flex: 1, minWidth: '150px', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--accent-light)', cursor: 'pointer' }}
                        >
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                {(memorizedAyahs || []).length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 6236</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Ayahs Memorized
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <PomodoroWidget />
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
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowOnlyMemorized(!showOnlyMemorized)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '99px',
                                background: showOnlyMemorized ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)',
                                color: showOnlyMemorized ? 'var(--status-success, #10b981)' : 'var(--text-muted)',
                                border: `1px solid ${showOnlyMemorized ? 'var(--status-success, #10b981)' : 'var(--border-color)'}`,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Award size={16} />
                            {showOnlyMemorized ? 'Showing Memorized Only' : 'Filter by Memorized'}
                        </button>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1rem'
                }}>
                    {filteredChapters?.map((chapter) => {
                        const isMemorized = (memorizedSurahs || []).includes(chapter.id);

                        // Count how many ayahs are memorized in this surah
                        const memorizedAyahsCount = (memorizedAyahs || []).filter(key => key.split(':')[0] === String(chapter.id)).length;
                        const partialProgress = !isMemorized && memorizedAyahsCount > 0;

                        return (
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
                                        border: isMemorized ? '1px solid var(--status-success, #10b981)' : '1px solid var(--accent-light)',
                                        borderRadius: '16px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        boxShadow: 'var(--shadow-sm)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {isMemorized && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: '60px',
                                            height: '60px',
                                            background: 'linear-gradient(135deg, transparent 50%, rgba(16, 185, 129, 0.1) 50%)',
                                            zIndex: 0
                                        }} />
                                    )}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isMemorized ? 'rgba(16, 185, 129, 0.1)' : 'var(--accent-light)',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        color: isMemorized ? 'var(--status-success, #10b981)' : 'var(--accent-primary)',
                                        marginRight: '1rem',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.9rem',
                                        zIndex: 1
                                    }}>
                                        {chapter.id}
                                    </div>
                                    <div style={{ flex: 1, zIndex: 1, paddingRight: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{chapter.name_simple}</h3>
                                            {isMemorized && <Award size={18} color="var(--status-success, #10b981)" />}
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{chapter.verses_count} Ayahs</span>
                                            {partialProgress && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, background: 'var(--accent-light)', padding: '2px 8px', borderRadius: '12px' }}>
                                                    {memorizedAyahsCount} memorized
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Modals for viewing memorized content */}
            <AnimatePresence>
                {/* Surahs Modal */}
                {showSurahsModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                background: 'var(--bg-surface)', width: '100%', maxWidth: '500px',
                                maxHeight: '80vh', borderRadius: '24px', overflow: 'hidden',
                                display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)'
                            }}
                        >
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Award size={24} color="var(--status-success, #10b981)" /> Fully Memorized Surahs
                                </h3>
                                <button className="btn-icon" onClick={() => setShowSurahsModal(false)}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {!(memorizedSurahs?.length > 0) ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Surahs memorized yet. Keep going!</div>
                                ) : (
                                    memorizedSurahs.map(id => {
                                        const chapter = chapters?.find(c => c.id === id);
                                        return chapter ? (
                                            <Link
                                                to={`/memorize/${chapter.id}`}
                                                key={`surah-${id}`}
                                                className="interactive-hover"
                                                style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderRadius: '12px', textDecoration: 'none', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'inherit' }}
                                            >
                                                <div style={{ width: '36px', height: '36px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success, #10b981)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginRight: '1rem' }}>{chapter.id}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{chapter.name_simple}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{chapter.verses_count} Ayahs</div>
                                                </div>
                                                <ArrowRight size={16} color="var(--accent-primary)" />
                                            </Link>
                                        ) : null;
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Ayahs Modal */}
                {showAyahsModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                background: 'var(--bg-surface)', width: '100%', maxWidth: '500px',
                                maxHeight: '80vh', borderRadius: '24px', overflow: 'hidden',
                                display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)'
                            }}
                        >
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={24} color="var(--status-success, #10b981)" /> Memorized Ayahs
                                </h3>
                                <button className="btn-icon" onClick={() => setShowAyahsModal(false)}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                                {!(memorizedAyahs?.length > 0) ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Ayahs memorized yet. Keep going!</div>
                                ) : (
                                    Object.keys(memorizedAyahsGrouped)
                                        .sort((a, b) => Number(a) - Number(b))
                                        .map(surahId => {
                                            const chapter = chapters?.find(c => String(c.id) === surahId);
                                            const ayahs = memorizedAyahsGrouped[surahId];
                                            return (
                                                <div key={`ayah-group-${surahId}`} style={{ marginBottom: '1.5rem' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent-primary)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Folder size={16} /> Surah {chapter?.name_simple || surahId}
                                                    </h4>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {ayahs.map(ayahNum => (
                                                            <Link
                                                                to={`/memorize/${surahId}?verse=${surahId}:${ayahNum}`}
                                                                onClick={() => setShowAyahsModal(false)}
                                                                key={`${surahId}:${ayahNum}`}
                                                                style={{
                                                                    padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                                    borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', textDecoration: 'none',
                                                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}
                                                            >
                                                                Ayah {ayahNum}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
