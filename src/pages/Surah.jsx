import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getChapter, getVerses } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, Play, Pause, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Surah() {
    const { id } = useParams();
    const { translationId, reciterId, fontSize } = useAppStore();

    const { data: chapter, isLoading: isChapterLoading } = useQuery({
        queryKey: ['chapter', id],
        queryFn: () => getChapter(id),
    });

    const { data: versesResponse, isLoading: isVersesLoading } = useQuery({
        queryKey: ['verses', id, translationId, reciterId],
        queryFn: () => getVerses(id, translationId, reciterId),
    });

    if (isChapterLoading || isVersesLoading) return (
        <div className="container" style={{ textAlign: 'center', padding: '10vh 0', color: 'var(--text-muted)' }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginBottom: '1rem' }}
            />
            <h2>Loading Ayahs...</h2>
        </div>
    );

    const verses = versesResponse?.verses || [];

    return (
        <div className="container">
            <Link
                to="/"
                className="interactive-hover"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    marginBottom: '2rem',
                    fontWeight: 600
                }}
            >
                <ArrowLeft size={18} /> Back to Surahs
            </Link>

            <div style={{
                padding: '3rem',
                background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-surface))',
                borderRadius: '24px',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                marginBottom: '3rem',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Subtle decorative background Arabic text */}
                <div style={{
                    fontFamily: "'Amiri Quran', serif",
                    fontSize: '12rem',
                    position: 'absolute',
                    opacity: 0.03,
                    top: '-2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}>
                    {chapter?.name_arabic}
                </div>

                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {chapter?.name_simple}
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {chapter?.translated_name.name} • {chapter?.verses_count} Ayahs • {chapter?.revelation_place}
                </p>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1rem'
                }}>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Play size={18} /> Play Audio
                    </button>
                    <button className="btn-primary" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        <BookOpen size={18} style={{ marginRight: '8px' }} /> Reading Mode
                    </button>
                </div>
            </div>

            <div style={{ padding: '0 1rem' }}>
                {/* Bismillah before Surah text (except Fatiha and Tawbah) */}
                {chapter?.id !== 1 && chapter?.id !== 9 && (
                    <div className="quran-text" style={{
                        textAlign: 'center',
                        marginBottom: '3rem',
                        fontSize: `${fontSize * 0.5 + 2}rem`,
                        color: 'var(--accent-primary)'
                    }}>
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                    </div>
                )}

                {verses.map((verse) => (
                    <div key={verse.id} style={{
                        borderBottom: '1px solid var(--border-color)',
                        padding: '2.5rem 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--accent-light)',
                                color: 'var(--accent-primary)',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                            }}>
                                {verse.verse_key.split(':')[1]}
                            </div>

                            {/* Arabic Text rendered using Uthman Taha */}
                            <div
                                className="quran-text"
                                style={{
                                    flex: 1,
                                    textAlign: 'right',
                                    paddingLeft: '2rem',
                                    fontSize: `${fontSize * 0.5 + 2}rem`,
                                    lineHeight: 2.2
                                }}
                            >
                                {verse.text_uthmani}
                            </div>
                        </div>

                        {/* Translation */}
                        <div className="text-english" style={{
                            paddingRight: '60px',
                            fontSize: `${fontSize * 0.1 + 1.1}rem`,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6
                        }}>
                            {verse.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '')} {/* Strip basic HTML from translations */}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
