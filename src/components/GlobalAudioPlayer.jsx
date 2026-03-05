import { useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

export default function GlobalAudioPlayer() {
    const { currentAudioUrl, isPlaying, setIsPlaying, setAudio } = useAppStore();
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => {
                    console.error("Audio playback failed", e);
                    setIsPlaying(false);
                });
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, currentAudioUrl]);

    if (!currentAudioUrl) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '1rem',
            backgroundColor: 'var(--bg-surface)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--border-color)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.5rem',
            boxShadow: '0 -10px 30px -10px rgba(0,0,0,0.1)'
        }}>
            <audio
                ref={audioRef}
                src={currentAudioUrl}
                onEnded={() => setIsPlaying(false)}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="btn-icon" aria-label="Previous">
                    <SkipBack size={20} />
                </button>

                <button
                    className="btn-primary"
                    style={{ width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setIsPlaying(!isPlaying)}
                >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
                </button>

                <button className="btn-icon" aria-label="Next">
                    <SkipForward size={20} />
                </button>
            </div>

            {/* Decorative volume or track name can go here */}
            <div style={{ position: 'absolute', right: '2rem', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                <Volume2 size={20} />
            </div>
        </div>
    );
}
