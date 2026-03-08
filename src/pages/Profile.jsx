import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { User, Settings, Bookmark, Folder, Download, Moon, Sun, ChevronRight, Palette } from 'lucide-react';

export default function Profile() {
    const {
        setNavHeaderTitle,
        setIsSettingsOpen,
        bookmarks,
        collections,
        downloadedSurahs,
        theme,
        toggleTheme
    } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('Profile');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const statCardStyle = {
        background: 'var(--bg-secondary)',
        padding: '1.5rem',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        boxShadow: 'var(--shadow-sm)'
    };

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                {/* Header Profile Info */}
                <div style={{ marginBottom: '2.5rem', marginTop: '1rem', textAlign: 'center' }}>
                    <div style={{
                        width: '96px',
                        height: '96px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(var(--accent-primary-rgb, 14, 165, 233), 0.3)'
                    }}>
                        <User size={48} />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Guest User</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Quran Student</p>
                </div>

                {/* Statistics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
                    <div style={statCardStyle}>
                        <Bookmark size={24} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{bookmarks.length}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bookmarks</span>
                    </div>
                    <div style={statCardStyle}>
                        <Folder size={24} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{collections.length}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Collections</span>
                    </div>
                    <div style={statCardStyle}>
                        <Download size={24} color="var(--accent-primary)" style={{ marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{downloadedSurahs.length}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Downloads</span>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1.25rem', paddingLeft: '0.5rem' }}>
                    Preferences
                </h2>

                {/* Actions / Settings list */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '24px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <button
                        onClick={toggleTheme}
                        className="interactive-hover"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1.25rem 1.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Appearance</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {theme === 'light' ? 'Light' : 'Dark'}
                            <ChevronRight size={20} />
                        </div>
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="interactive-hover"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1.25rem 1.5rem',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                <Settings size={24} />
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Reading Settings</span>
                        </div>
                        <ChevronRight size={20} color="var(--text-muted)" />
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
