import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle, Trash2, CheckCircle2, Pause, Play, RotateCcw, TimerReset } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

function formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

export default function PomodoroConfigModal({ isOpen, onClose }) {
    const {
        pomodoroProfiles,
        activePomodoroProfileId,
        setActivePomodoroProfile,
        addPomodoroProfile,
        updatePomodoroProfile,
        deletePomodoroProfile,
        pomodoroMode,
        pomodoroIsRunning,
        pomodoroSecondsLeft,
        togglePomodoroRunning,
        resetPomodoroSession,
        switchPomodoroMode,
    } = useAppStore();

    // The active profile from store
    const activeProfile = (pomodoroProfiles || []).find((p) => p.id === activePomodoroProfileId) || pomodoroProfiles?.[0];

    // Local state for the form so we don't save until user confirms, or we can auto-save
    // Let's use local state for smooth editing and save on close or save button
    const [draftName, setDraftName] = useState('');
    const [draftFocusMinutes, setDraftFocusMinutes] = useState(25);
    const [draftBreakMinutes, setDraftBreakMinutes] = useState(5);

    useEffect(() => {
        if (activeProfile && isOpen) {
            setDraftName(activeProfile.name);
            setDraftFocusMinutes(activeProfile.focusMinutes);
            setDraftBreakMinutes(activeProfile.breakMinutes);
        }
    }, [activeProfile, isOpen]);

    const handleCreateProfile = () => {
        addPomodoroProfile({
            name: `Pomodoro ${(pomodoroProfiles?.length || 0) + 1}`,
            focusMinutes: 25,
            breakMinutes: 5,
        });
    };

    const handleSaveProfile = () => {
        if (!activeProfile) return;
        updatePomodoroProfile(activeProfile.id, {
            name: draftName,
            focusMinutes: Number(draftFocusMinutes) || 25,
            breakMinutes: Number(draftBreakMinutes) || 5,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, backdropFilter: 'blur(4px)' }}
                    />

                    {/* Bottom Drawer Modal */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        style={{
                            position: 'fixed',
                            bottom: 0, left: 0, right: 0,
                            display: 'flex',
                            justifyContent: 'center',
                            zIndex: 1101,
                        }}
                    >
                        <div style={{
                            width: '100%',
                            maxWidth: '520px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-surface)',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
                            border: '1px solid var(--border-color)',
                            borderBottom: 'none',
                            overflow: 'hidden',
                        }}>
                            {/* Drag handle */}
                            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem', paddingBottom: '0.25rem', flexShrink: 0 }}>
                                <div style={{ width: '40px', height: '5px', borderRadius: '9999px', background: 'var(--border-color)' }} />
                            </div>

                            {/* Sticky Header */}
                            <div style={{ padding: '0 1.5rem 1rem', flexShrink: 0, borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pomodoro Settings</h3>
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                            Customize your reading and break intervals
                                        </p>
                                    </div>
                                    <button className="btn-icon" onClick={onClose} style={{ background: 'var(--bg-secondary)', width: '36px', height: '36px', flexShrink: 0 }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                {/* Timer Actions (from Widget) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', gap: '1rem' }}>
                                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontFamily: 'monospace' }}>
                                        {formatTime(pomodoroSecondsLeft)}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {pomodoroMode === 'focus' ? 'Focus Session' : 'Break Time'}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <button type="button" onClick={togglePomodoroRunning} style={{ padding: '0.75rem 1.5rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                                            {pomodoroIsRunning ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                                            <span>{pomodoroIsRunning ? 'Pause' : 'Start'}</span>
                                        </button>
                                        <button type="button" onClick={resetPomodoroSession} style={{ padding: '0.75rem 1.2rem', borderRadius: '999px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                            <RotateCcw size={16} aria-hidden="true" />
                                            <span>Reset</span>
                                        </button>
                                        <button type="button" onClick={switchPomodoroMode} style={{ padding: '0.75rem 1.2rem', borderRadius: '999px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                            <TimerReset size={16} aria-hidden="true" />
                                            <span>{pomodoroMode === 'focus' ? 'Break' : 'Focus'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Profiles Selection */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Profiles
                                        </label>
                                        <button
                                            onClick={handleCreateProfile}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                                        >
                                            <PlusCircle size={16} /> New Profile
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                                        {(pomodoroProfiles || []).map((profile) => {
                                            const active = profile.id === activePomodoroProfileId;
                                            return (
                                                <button
                                                    key={profile.id}
                                                    type="button"
                                                    onClick={() => setActivePomodoroProfile(profile.id)}
                                                    style={{
                                                        minHeight: '40px',
                                                        padding: '0.65rem 1.25rem',
                                                        borderRadius: '999px',
                                                        background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                                        color: active ? '#fff' : 'var(--text-primary)',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        whiteSpace: 'nowrap',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        boxShadow: active ? '0 4px 12px rgba(var(--accent-primary-rgb), 0.3)' : 'none'
                                                    }}
                                                >
                                                    {profile.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Active Profile Editing */}
                                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Profile Name</span>
                                        <input
                                            type="text"
                                            value={draftName}
                                            onChange={(event) => setDraftName(event.target.value)}
                                            style={{ minHeight: '48px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '0.7rem 1rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}
                                        />
                                    </label>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Focus (mins)</span>
                                            <input
                                                type="number"
                                                min="5"
                                                max="120"
                                                value={draftFocusMinutes}
                                                onChange={(event) => setDraftFocusMinutes(event.target.value === '' ? '' : Number(event.target.value))}
                                                style={{ minHeight: '48px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '0.7rem 1rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Break (mins)</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={draftBreakMinutes}
                                                onChange={(event) => setDraftBreakMinutes(event.target.value === '' ? '' : Number(event.target.value))}
                                                style={{ minHeight: '48px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '0.7rem 1rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}
                                            />
                                        </label>
                                    </div>

                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    {(pomodoroProfiles || []).length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this Pomodoro timer?')) {
                                                    deletePomodoroProfile(activeProfile.id);
                                                }
                                            }}
                                            style={{
                                                minHeight: '48px',
                                                padding: '0 1.2rem',
                                                borderRadius: '14px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: 'rgb(239, 68, 68)',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSaveProfile}
                                        style={{
                                            flex: 1,
                                            minHeight: '48px',
                                            borderRadius: '14px',
                                            background: 'var(--text-primary)',
                                            color: 'var(--bg-primary)',
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <CheckCircle2 size={18} /> Save & Apply
                                    </button>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

