import { useEffect, useMemo, useState } from 'react';
import { Clock3, Pause, Play, PlusCircle, RotateCcw, TimerReset, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import PomodoroConfigModal from './PomodoroConfigModal';

function formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

export default function PomodoroWidget({ compact = false, showConfigurator = true }) {
    const {
        pomodoroProfiles,
        activePomodoroProfileId,
        addPomodoroProfile,
        updatePomodoroProfile,
        deletePomodoroProfile,
        setActivePomodoroProfile,
        pomodoroMode,
        pomodoroIsRunning,
        pomodoroSecondsLeft,
        pomodoroCompletedFocusCount,
        pomodoroDailyGoal,
        togglePomodoroRunning,
        resetPomodoroSession,
        switchPomodoroMode,
    } = useAppStore();

    const activeProfile = useMemo(
        () => (pomodoroProfiles || []).find((profile) => profile.id === activePomodoroProfileId) || pomodoroProfiles?.[0] || null,
        [activePomodoroProfileId, pomodoroProfiles]
    );

    const [draftName, setDraftName] = useState('');
    const [draftFocusMinutes, setDraftFocusMinutes] = useState(25);
    const [draftBreakMinutes, setDraftBreakMinutes] = useState(5);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    useEffect(() => {
        if (!activeProfile) {
            return;
        }

        setDraftName(activeProfile.name);
        setDraftFocusMinutes(activeProfile.focusMinutes);
        setDraftBreakMinutes(activeProfile.breakMinutes);
    }, [activeProfile?.id]);

    const progressRatio = useMemo(() => {
        const totalSeconds = activeProfile ? (pomodoroMode === 'focus' ? activeProfile.focusMinutes : activeProfile.breakMinutes) * 60 : 0;
        return totalSeconds ? ((totalSeconds - pomodoroSecondsLeft) / totalSeconds) * 100 : 0;
    }, [activeProfile, pomodoroMode, pomodoroSecondsLeft]);

    const handleCreateProfile = () => {
        addPomodoroProfile({
            name: `Pomodoro ${(pomodoroProfiles?.length || 0) + 1}`,
            focusMinutes: 25,
            breakMinutes: 5,
        });
    };

    const handleSaveProfile = () => {
        if (!activeProfile) {
            return;
        }

        updatePomodoroProfile(activeProfile.id, {
            name: draftName,
            focusMinutes: draftFocusMinutes,
            breakMinutes: draftBreakMinutes,
        });
    };

    if (!activeProfile) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: compact ? '0.6rem 0.9rem' : '0.85rem 1.25rem',
                    borderRadius: '999px',
                    background: pomodoroIsRunning ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    border: pomodoroIsRunning ? '1px solid transparent' : '1px solid var(--border-color)',
                    color: pomodoroIsRunning ? '#fff' : 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: compact ? 'auto' : '100%',
                    justifyContent: compact ? 'center' : 'space-between'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: compact ? '0.9rem' : '1rem' }}>
                    {pomodoroIsRunning ? <Play size={compact ? 16 : 18} fill="currentColor" /> : <Clock3 size={compact ? 16 : 18} />}
                    {compact ? (
                        <span>{formatTime(pomodoroSecondsLeft)}</span>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span>{activeProfile.name} Timer</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: pomodoroIsRunning ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                                {pomodoroCompletedFocusCount}/{pomodoroDailyGoal || 4} Sessions Today
                            </span>
                        </div>
                    )}
                </div>

                {!compact && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>
                            {formatTime(pomodoroSecondsLeft)}
                        </span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pomodoroIsRunning ? '#4ade80' : 'var(--text-muted)' }} />
                    </div>
                )}
            </button>

            <PomodoroConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
        </>
    );
}
