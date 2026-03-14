import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Settings, X, Timer } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import PomodoroConfigModal from './PomodoroConfigModal';

function formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

export default function FloatingPomodoro() {
    const {
        pomodoroIsRunning,
        pomodoroSecondsLeft,
        pomodoroMode,
        showGlobalPomodoro,
        togglePomodoroRunning,
    } = useAppStore();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (!showGlobalPomodoro) {
            setIsMinimized(false);
        }
    }, [showGlobalPomodoro]);

    if (!showGlobalPomodoro) {
        return null;
    }

    return (
        <>
            <AnimatePresence>
                {showGlobalPomodoro && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        style={{
                            position: 'fixed',
                            bottom: '80px',
                            right: '20px',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            padding: '0.4rem 0.5rem 0.4rem 1rem',
                            borderRadius: '999px',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setIsConfigModalOpen(true)}>
                            <Timer size={16} color={pomodoroMode === 'focus' ? 'var(--accent-primary)' : '#4ade80'} />
                            <span style={{
                                fontSize: '1.2rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: 'var(--text-primary)',
                                width: '48px',
                                textAlign: 'center'
                            }}>
                                {formatTime(pomodoroSecondsLeft)}
                            </span>
                        </div>

                        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

                        <button
                            onClick={togglePomodoroRunning}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: pomodoroIsRunning
                                    ? (pomodoroMode === 'focus' ? 'var(--accent-primary)' : '#4ade80')
                                    : 'var(--bg-secondary)',
                                color: pomodoroIsRunning ? '#fff' : 'var(--text-primary)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {pomodoroIsRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
                        </button>

                        <button
                            onClick={() => setIsConfigModalOpen(true)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="interactive-hover"
                        >
                            <Settings size={16} />
                        </button>

                        <button
                            onClick={() => setIsMinimized(true)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="interactive-hover"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}

                {showGlobalPomodoro && isMinimized && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        onTap={() => setIsMinimized(false)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            bottom: '100px',
                            right: '25px',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: pomodoroIsRunning
                                ? (pomodoroMode === 'focus' ? 'var(--accent-primary)' : '#4ade80')
                                : 'var(--bg-surface)',
                            border: pomodoroIsRunning
                                ? '2px solid transparent'
                                : `2px solid ${pomodoroMode === 'focus' ? 'var(--accent-primary)' : '#4ade80'}`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            cursor: 'grab',
                        }}
                    >
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: pomodoroIsRunning
                                ? '#fff'
                                : (pomodoroMode === 'focus' ? 'var(--accent-primary)' : '#4ade80'),
                            opacity: pomodoroIsRunning ? 1 : 0.8,
                            boxShadow: pomodoroIsRunning ? '0 0 8px rgba(255,255,255,0.8)' : 'none',
                            transition: 'all 0.3s'
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            <PomodoroConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
        </>
    );
}
