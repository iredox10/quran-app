import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Folder, Trash2, ArrowRight, Bookmark, BookOpen, X, Library as LibraryIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Library() {
    const { collections, bookmarks, deleteCollection, removeFromCollection, setNavHeaderTitle, toggleBookmark } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('My Library');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                {/* Bookmarks Section */}
                <section style={{ marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                        <Bookmark size={24} color="var(--accent-primary)" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Bookmarks</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        {bookmarks.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
                                <Bookmark size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                <p style={{ color: 'var(--text-muted)' }}>No bookmarks yet. Save your favorite ayahs to see them here.</p>
                            </div>
                        ) : (
                            bookmarks.map((b, i) => (
                                <motion.div
                                    key={i}
                                    layout
                                    style={{
                                        background: 'var(--bg-surface)',
                                        padding: '1.5rem',
                                        borderRadius: '20px',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--shadow-sm)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <h4 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.surahName}</h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ayah {b.verseKey.split(':')[1]}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link to={`/surah/${b.chapterId}?verse=${b.verseKey}`} className="btn-icon" style={{ color: 'var(--accent-primary)', background: 'var(--accent-light)' }}>
                                            <ArrowRight size={20} />
                                        </Link>
                                        <button onClick={() => toggleBookmark(b.verseKey)} className="btn-icon" style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)' }}>
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* Collections Section */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                        <Folder size={24} color="var(--accent-primary)" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Collections</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                        {collections.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
                                <Folder size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                <p style={{ color: 'var(--text-muted)' }}>No collections yet. Group verses together for better hifdh focus.</p>
                            </div>
                        ) : (
                            collections.map(c => (
                                <motion.div
                                    key={c.id}
                                    layout
                                    style={{
                                        background: 'var(--bg-surface)',
                                        padding: '2rem',
                                        borderRadius: '24px',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--shadow-md)',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{c.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                <LibraryIcon size={14} /> {c.items.length} verses
                                            </div>
                                        </div>
                                        <button onClick={() => deleteCollection(c.id)} className="btn-icon" style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)' }}>
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                                        {c.items.length === 0 ? (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No verses in this collection.</p>
                                        ) : (
                                            c.items.slice(0, 4).map((item, idx) => (
                                                <div key={idx} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.75rem 1rem',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.surahName} {item.verseKey.split(':')[1]}</span>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <Link to={`/surah/${item.chapterId}?verse=${item.verseKey}`} style={{ color: 'var(--accent-primary)' }}><ArrowRight size={18} /></Link>
                                                        <button
                                                            onClick={() => removeFromCollection(c.id, item.verseKey)}
                                                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {c.items.length > 4 && (
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>+ {c.items.length - 4} more verses</p>
                                        )}
                                    </div>

                                    {c.items.length > 0 && (
                                        <Link
                                            to={`/memorize/${c.items[0]?.chapterId}`}
                                            className="btn-primary"
                                            style={{
                                                marginTop: '2rem',
                                                width: '100%',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: '8px',
                                                textDecoration: 'none',
                                                padding: '1rem',
                                                borderRadius: '14px'
                                            }}
                                        >
                                            <BookOpen size={18} /> Launch Hifdh
                                        </Link>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

            </motion.div>
        </div>
    );
}
