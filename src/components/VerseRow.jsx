import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Bookmark, Info, X, Plus, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { getVerseArabicText } from '../utils/quranText';


const TAFSIR_NAMES = {
    169: 'Ibn Kathir (Abridged)',
    168: "Ma'arif al-Qur'an",
    817: 'Tazkirul Quran',
    16: 'Tafsir al-Muyassar',
    14: 'Tafsir Ibn Kathir',
    15: 'Tafsir al-Tabari',
    93: 'Al-Tafsir al-Wasit'
};

const VerseRow = ({
    verse, readingMode, chapter, bookmark, setBookmark, addRecentlyRead,
    fontSize, translationFontSize, arabicFont, tajweedEnabled, tajweedMap, activeTafsir,
    setActiveTafsir, isTafsirFetching, tafsirId, showPageDivider, tafsirs,
    isAudioPlaying,
    mushaf,
    onPlayVerse
}) => {
    const { ref, inView } = useInView({
        threshold: 0.5,
        triggerOnce: false,
    });

    const { collections, addCollection, addToCollection } = useAppStore();
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

    useEffect(() => {
        if (inView && chapter) {
            addRecentlyRead?.(chapter.id, chapter.name_simple, verse.verse_key);
        }
    }, [inView, chapter?.id, chapter?.name_simple, verse.verse_key, addRecentlyRead]);

    const pageDivider = showPageDivider ? (
        <div
            key={`page-${verse.page_number}`}
            data-page={verse.page_number}
            className="page-divider"
            style={{
                display: readingMode ? 'block' : 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 0',
                margin: readingMode ? '1.5rem 0' : '0',
                direction: 'ltr',
                width: '100%'
            }}
        >
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--accent-primary), transparent)' }} />
            <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                backgroundColor: 'var(--accent-light)',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                whiteSpace: 'nowrap',
                fontFamily: "'Outfit', sans-serif"
            }}>
                Page {verse.page_number}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--accent-primary), transparent)' }} />
        </div>
    ) : null;

    if (readingMode) {
        const verseArabicText = getVerseArabicText(verse, mushaf);

        return (
            <React.Fragment key={`reading-${verse.verse_key}`}>
                {pageDivider}
                <span
                    ref={ref}
                    id={`verse-${verse.verse_key}`}
                    className="quran-text tajweed-text"
                    style={{
                        fontSize: `clamp(${0.9 + fontSize * 0.15}rem, ${fontSize * 1.2}vw, ${fontSize * 0.4 + 1.5}rem)`,
                        marginRight: '0.4rem',
                        display: 'inline',
                        fontFamily: arabicFont,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        backgroundColor: isAudioPlaying ? 'var(--accent-light)' : 'transparent',
                        borderRadius: '8px',
                        padding: '0 0.25rem',
                        wordBreak: 'break-word'
                    }}
                >
                    {tajweedEnabled && tajweedMap?.[verse.verse_key]
                        ? <span dangerouslySetInnerHTML={{ __html: tajweedMap[verse.verse_key] }} />
                        : <>{verseArabicText}</>
                    }

                </span>
            </React.Fragment>
        );
    }

    const verseArabicText = getVerseArabicText(verse, mushaf);

    return (
        <React.Fragment key={`translation-${verse.verse_key}`}>
            {pageDivider}
            {/* Ayah Divider */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.5rem 0'
            }}>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--accent-light), var(--border-color), var(--accent-light), transparent)' }} />
                <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    opacity: 0.4
                }} />
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--accent-light), var(--border-color), var(--accent-light), transparent)' }} />
            </div>
            <div
                ref={ref}
                id={`verse-${verse.verse_key}`}
                className="verse-container"
                style={{
                    padding: '1.5rem',
                    margin: '0.5rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isAudioPlaying ? 'var(--accent-light)' : 'transparent',
                    transform: isAudioPlaying ? 'scale(1.01)' : 'scale(1)',
                    boxShadow: isAudioPlaying ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    borderRadius: '16px'
                }}
            >
                {/* Verse Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        backgroundColor: 'var(--accent-light)',
                        border: '1px solid rgba(198, 168, 124, 0.2)',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '999px',
                        fontFamily: "'Outfit', sans-serif",
                        letterSpacing: '0.05em'
                    }}>
                        {verse.verse_key}
                    </div>

                    <div className="verse-actions-row" style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            className="btn-icon"
                            style={{ color: 'var(--text-muted)', width: '32px', height: '32px' }}
                            onClick={() => setShowCollectionModal(true)}
                            title="Add to Collection"
                        >
                            <Plus size={18} />
                        </button>
                        <button
                            className="btn-icon"
                            style={{ color: bookmark?.verseKey === verse.verse_key ? 'var(--accent-primary)' : 'var(--text-muted)', width: '32px', height: '32px' }}
                            onClick={() => setBookmark(verse.verse_key, chapter ? chapter.name_simple : `Surah ${verse.verse_key.split(':')[0]}`, chapter?.id)}
                            title="Bookmark Verse"
                        >
                            <Bookmark size={18} fill={bookmark?.verseKey === verse.verse_key ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            className="btn-icon"
                            style={{
                                color: isAudioPlaying ? 'var(--accent-primary)' : 'var(--text-muted)',
                                width: '32px', height: '32px',
                                backgroundColor: isAudioPlaying ? 'var(--accent-light)' : 'transparent',
                                borderRadius: '50%',
                                transition: 'all 0.2s ease'
                            }}
                            title={isAudioPlaying ? "Playing" : "Play this Ayah"}
                            onClick={() => onPlayVerse?.(verse)}
                        >
                            {isAudioPlaying
                                ? <Pause size={18} fill="currentColor" />
                                : <Play size={18} fill="currentColor" />
                            }
                        </button>
                        <button
                            className="btn-icon"
                            style={{ color: activeTafsir?.verse_key === verse.verse_key ? 'var(--accent-primary)' : 'var(--text-muted)', width: '32px', height: '32px' }}
                            title="Read Tafsir"
                            onClick={() => {
                                if (activeTafsir?.verse_key === verse.verse_key) {
                                    setActiveTafsir(null);
                                } else if (isTafsirFetching) {
                                    setActiveTafsir({
                                        verse_key: verse.verse_key,
                                        text: '<p>Loading tafsir...</p>'
                                    });
                                } else {
                                    const tafsirObj = tafsirs?.find((t) => t.verse_key === verse.verse_key);
                                    setActiveTafsir({
                                        verse_key: verse.verse_key,
                                        text: tafsirObj ? tafsirObj.text : '<p>Tafsir is not available for this verse in the selected source.</p>'
                                    });
                                }
                            }}
                        >
                            <Info size={18} />
                        </button>
                    </div>
                </div>

                {/* Arabic Text */}
                <div
                    className="quran-text tajweed-text"
                    style={{
                        textAlign: 'right',
                        fontSize: `clamp(${0.9 + fontSize * 0.15}rem, ${fontSize * 1.2}vw, ${fontSize * 0.4 + 1.5}rem)`,
                        lineHeight: 2.0,
                        fontFamily: arabicFont,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere'
                    }}
                >
                    {tajweedEnabled && tajweedMap?.[verse.verse_key]
                        ? <span dangerouslySetInnerHTML={{ __html: tajweedMap[verse.verse_key] }} />
                        : <>{verseArabicText}</>
                    }

                </div>

                <div className="text-english" style={{
                    fontSize: `${(translationFontSize || 2) * 0.15 + 0.75}rem`,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6
                }}>
                    {verse.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '')}
                </div>

                <AnimatePresence>
                    {activeTafsir?.verse_key === verse.verse_key && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                marginTop: '1.5rem',
                                padding: '1.5rem',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                borderLeft: '4px solid var(--accent-primary)',
                                position: 'relative'
                            }}>
                                <button
                                    onClick={() => setActiveTafsir(null)}
                                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    <X size={18} />
                                </button>
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
                                    📖 {TAFSIR_NAMES[tafsirId] || 'Tafsir'}
                                </h4>
                                <div
                                    className="tafsir-content quran-tafsir-html"
                                    style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.8 }}
                                    dangerouslySetInnerHTML={{ __html: activeTafsir.text }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collection Modal per verse (uses AnimatePresence) */}
                <AnimatePresence>
                    {showCollectionModal && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowCollectionModal(false)}
                                style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                style={{
                                    position: 'fixed',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1101,
                                    pointerEvents: 'none'
                                }}
                            >
                                <div style={{
                                    width: 'calc(100vw - 2rem)',
                                    maxWidth: '400px',
                                    backgroundColor: 'var(--bg-surface)',
                                    borderRadius: '24px',
                                    padding: '1.5rem',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-xl)',
                                    pointerEvents: 'auto'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Add to Collection</h3>
                                        <button className="btn-icon" onClick={() => setShowCollectionModal(false)}><X size={18} /></button>
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {(collections || []).map(c => {
                                            const isInCollection = c.items?.some(item => item.verseKey === verse.verse_key);
                                            return (
                                                <button
                                                    key={c.id}
                                                    className="interactive-hover"
                                                    onClick={() => {
                                                        addToCollection(c.id, verse.verse_key, chapter ? chapter.name_simple : `Surah ${verse.verse_key.split(':')[0]}`, chapter?.id);
                                                        setShowCollectionModal(false);
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem',
                                                        borderRadius: '12px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer',
                                                        color: 'var(--text-primary)', textAlign: 'left', fontWeight: isInCollection ? 700 : 500
                                                    }}
                                                >
                                                    <span>{c.name}</span>
                                                    {isInCollection && <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>Added</span>}
                                                </button>
                                            );
                                        })}
                                        {(!collections || collections.length === 0) && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>No collections yet</div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="New collection name..."
                                            className="form-input"
                                            value={newCollectionName}
                                            onChange={(e) => setNewCollectionName(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '0 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => {
                                                if (newCollectionName.trim()) {
                                                    const newId = Date.now();
                                                    addCollection(newCollectionName.trim(), newId);
                                                    addToCollection(newId, verse.verse_key, chapter ? chapter.name_simple : `Surah ${verse.verse_key.split(':')[0]}`, chapter?.id);
                                                    setNewCollectionName('');
                                                    setShowCollectionModal(false);
                                                }
                                            }}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </React.Fragment>
    );
};

export default VerseRow;
