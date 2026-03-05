import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../services/api/quranApi';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
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

    return (
        <div className="container">
            <div style={{
                padding: '3rem',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                borderRadius: '24px',
                color: 'white',
                textAlign: 'center',
                marginBottom: '3rem',
                boxShadow: '0 20px 40px -10px var(--accent-light)'
            }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-1px' }}>
                    The Noble Qur'an
                </h1>
                <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>
                    Read, study, and learn the word of Allah.
                </p>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Surahs (Chapters)
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {chapters?.map((chapter, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.3 }}
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
