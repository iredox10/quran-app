import React, { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Bookmark, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const toArabicNumerals = (num) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).split('').map(char => arabicNumbers[parseInt(char)]).join('');
};

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
    setActiveTafsir, isTafsirFetching, tafsirId, showPageDivider, tafsirs
}) => {
    const { ref, inView } = useInView({
        threshold: 0.5,
        triggerOnce: false,
    });

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
                        transition: 'background-color 0.5s ease',
                        borderRadius: '8px',
                        padding: '0 0.25rem',
                        wordBreak: 'break-word'
                    }}
                >
                    {tajweedEnabled && tajweedMap?.[verse.verse_key]
                        ? <span dangerouslySetInnerHTML={{ __html: tajweedMap[verse.verse_key] }} />
                        : verse.text_uthmani
                    }
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '1.4em',
                        height: '1.4em',
                        borderRadius: '50%',
                        border: '1.5px solid var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.45em',
                        margin: '0 0.5rem',
                        position: 'relative',
                        bottom: '0.2em',
                        fontFamily: "'Amiri Quran', serif"
                    }}>
                        {toArabicNumerals(verse.verse_key.split(':')[1])}
                    </span>
                </span>
            </React.Fragment>
        );
    }

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
                    padding: '1.5rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    transition: 'background-color 0.5s ease',
                    borderRadius: '12px'
                }}
            >
                {/* Verse Actions Row — on top */}
                <div className="verse-actions-row" style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: `clamp(28px, ${fontSize * 0.3 + 1.2}rem, ${fontSize * 0.35 + 1.4}rem)`,
                        height: `clamp(28px, ${fontSize * 0.3 + 1.2}rem, ${fontSize * 0.35 + 1.4}rem)`,
                        borderRadius: '50%',
                        border: '1.5px solid var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        fontSize: `clamp(0.7rem, ${fontSize * 0.2 + 0.5}rem, ${fontSize * 0.25 + 0.7}rem)`,
                        fontFamily: "'Amiri Quran', serif",
                        flexShrink: 0
                    }}>
                        {toArabicNumerals(verse.verse_key.split(':')[1])}
                    </div>
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
                        : verse.text_uthmani
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
            </div>
        </React.Fragment>
    );
};

export default VerseRow;
