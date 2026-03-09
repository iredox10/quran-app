import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Search, BookOpen, Layers, Hash, Book } from 'lucide-react';
import { getChapters } from '../services/api/quranApi';

export default function NavigationModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Context
    const match = location.pathname.match(/\/(surah|memorize|page)\/(\d+)/);
    const contextType = match && match[1] !== 'page' ? match[1] : 'surah';
    const currentSurahId = match && match[1] !== 'page' ? parseInt(match[2], 10) : 1;
    const currentPageId = match && match[1] === 'page' ? parseInt(match[2], 10) : '';

    // Tabs
    const [activeTab, setActiveTab] = useState('surah');

    // State for inputs
    const [surahSearch, setSurahSearch] = useState('');
    const [selectedSurahForAyah, setSelectedSurahForAyah] = useState(currentSurahId);
    const [ayahNumber, setAyahNumber] = useState('');
    const [pageNumber, setPageNumber] = useState(currentPageId);

    useEffect(() => {
        if (isOpen) {
            setSelectedSurahForAyah(currentSurahId);
            setAyahNumber('');
            setPageNumber(currentPageId);
            setSurahSearch('');
            setActiveTab(match && match[1] === 'page' ? 'page' : 'surah');
        }
    }, [isOpen, currentSurahId]);

    const { data: chapters = [] } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
        staleTime: Infinity,
        enabled: isOpen
    });

    const filteredSurahs = useMemo(() => {
        return chapters.filter(c =>
            c.name_simple.toLowerCase().includes(surahSearch.toLowerCase()) ||
            c.name_arabic.includes(surahSearch) ||
            c.id.toString() === surahSearch
        );
    }, [chapters, surahSearch]);

    const handleSurahClick = (id) => {
        navigate(`/${contextType}/${id}`);
        onClose();
    };

    const handleAyahSubmit = (e) => {
        e.preventDefault();
        if (!selectedSurahForAyah || !ayahNumber) return;
        const chap = chapters.find(c => c.id === parseInt(selectedSurahForAyah));
        const maxAyahs = chap?.verses_count || 286;
        const validAyah = Math.min(Math.max(1, parseInt(ayahNumber) || 1), maxAyahs);
        navigate(`/${contextType}/${selectedSurahForAyah}?verse=${selectedSurahForAyah}:${validAyah}`);
        onClose();
    };

    const handlePageSubmit = (e) => {
        e.preventDefault();
        const validPage = Math.min(Math.max(1, parseInt(pageNumber) || 1), 604);
        navigate(`/page/${validPage}`);
        onClose();
    };

    const tabButtonStyle = (isActive) => ({
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '0.75rem',
        border: 'none',
        background: 'none',
        color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
        fontWeight: isActive ? 600 : 500,
        position: 'relative',
        cursor: 'pointer',
        fontSize: '0.95rem'
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            zIndex: 2000
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                            position: 'fixed', top: '50%', left: '50%',
                            width: '90%', maxWidth: '400px',
                            backgroundColor: 'var(--bg-surface)',
                            borderRadius: '24px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px var(--border-color)',
                            zIndex: 2001,
                            display: 'flex', flexDirection: 'column',
                            maxHeight: '85vh'
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Navigation</h3>
                            <button onClick={onClose} className="btn-icon" style={{ padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                            <button style={tabButtonStyle(activeTab === 'surah')} onClick={() => setActiveTab('surah')}>
                                <BookOpen size={16} /> Surah
                            </button>
                            <button style={tabButtonStyle(activeTab === 'ayah')} onClick={() => setActiveTab('ayah')}>
                                <Hash size={16} /> Ayah
                            </button>
                            <button style={tabButtonStyle(activeTab === 'page')} onClick={() => setActiveTab('page')}>
                                <Layers size={16} /> Page
                            </button>
                            {/* Active indicator */}
                            <motion.div
                                animate={{
                                    left: activeTab === 'surah' ? '0%' : activeTab === 'ayah' ? '33.33%' : '66.66%'
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                style={{
                                    position: 'absolute', bottom: 0, width: '33.33%',
                                    height: '2px', backgroundColor: 'var(--accent-primary)',
                                    borderRadius: '2px 2px 0 0'
                                }}
                            />
                        </div>

                        {/* Content area */}
                        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, minHeight: '300px' }}>
                            {activeTab === 'surah' && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="text"
                                            placeholder="Search Surah by name or number..."
                                            value={surahSearch}
                                            onChange={(e) => setSurahSearch(e.target.value)}
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '0.8rem 1rem 0.8rem 2.8rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.95rem'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {filteredSurahs.map(surah => (
                                            <button
                                                key={surah.id}
                                                onClick={() => handleSurahClick(surah.id)}
                                                className="interactive-hover"
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '10px', border: 'none',
                                                    background: surah.id === currentSurahId ? 'var(--accent-light)' : 'transparent',
                                                    color: surah.id === currentSurahId ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                    cursor: 'pointer', textAlign: 'left'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '28px', height: '28px', borderRadius: '50%',
                                                        background: surah.id === currentSurahId ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                                        color: surah.id === currentSurahId ? 'white' : 'inherit',
                                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                        fontSize: '0.8rem', fontWeight: 600
                                                    }}>
                                                        {surah.id}
                                                    </div>
                                                    <span style={{ fontWeight: 500 }}>{surah.name_simple}</span>
                                                </div>
                                                <span style={{ fontFamily: "'Amiri Quran', serif", fontSize: '1.2rem' }}>{surah.name_arabic}</span>
                                            </button>
                                        ))}
                                        {filteredSurahs.length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                No Surah found.
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'ayah' && (
                                <motion.form initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleAyahSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Select Surah</label>
                                        <select
                                            value={selectedSurahForAyah}
                                            onChange={(e) => setSelectedSurahForAyah(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.8rem', borderRadius: '12px',
                                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)', fontSize: '0.95rem'
                                            }}
                                        >
                                            {chapters.map(surah => (
                                                <option key={surah.id} value={surah.id}>
                                                    {surah.id}. {surah.name_simple}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Ayah Number</label>
                                        <input
                                            type="number"
                                            value={ayahNumber}
                                            onChange={(e) => setAyahNumber(e.target.value)}
                                            placeholder="e.g. 255"
                                            min="1"
                                            max={chapters.find(c => c.id === parseInt(selectedSurahForAyah))?.verses_count || 286}
                                            required
                                            autoFocus
                                            style={{
                                                width: '100%', padding: '0.8rem', borderRadius: '12px',
                                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)', fontSize: '0.95rem'
                                            }}
                                        />
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            Verses 1 - {chapters.find(c => c.id === parseInt(selectedSurahForAyah))?.verses_count || '?'}
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '0.8rem', borderRadius: '12px', border: 'none',
                                            background: 'var(--accent-primary)', color: 'white',
                                            fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
                                            marginTop: '0.5rem'
                                        }}
                                        className="interactive-hover"
                                    >
                                        Go to Ayah
                                    </button>
                                </motion.form>
                            )}

                            {activeTab === 'page' && (
                                <motion.form initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onSubmit={handlePageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mushaf Page</label>
                                        <input
                                            type="number"
                                            value={pageNumber}
                                            onChange={(e) => setPageNumber(e.target.value)}
                                            placeholder="e.g. 1 (1 to 604)"
                                            min="1"
                                            max="604"
                                            required
                                            autoFocus
                                            style={{
                                                width: '100%', padding: '0.8rem', borderRadius: '12px',
                                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)', fontSize: '0.95rem'
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '0.8rem', borderRadius: '12px', border: 'none',
                                            background: 'var(--accent-primary)', color: 'white',
                                            fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
                                            marginTop: '0.5rem'
                                        }}
                                        className="interactive-hover"
                                    >
                                        Go to Page
                                    </button>
                                </motion.form>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
