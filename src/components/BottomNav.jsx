import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Brain, TrendingUp, User } from 'lucide-react';

export default function BottomNav() {
    const location = useLocation();

    // Hide BottomNav if we are actively reading a Surah to maximize screen real estate
    const isSurahPage = /^\/surah\/\d+/.test(location.pathname);
    const isMemorizePage = /^\/memorize\/\d+/.test(location.pathname);
    const isPagePage = /^\/page\/\d+/.test(location.pathname);

    // Check if a path is active
    const isActive = (path) => {
        if (path === '/' && location.pathname !== '/') return false;
        return location.pathname.startsWith(path);
    };

    if (isSurahPage || isMemorizePage || isPagePage) return null; // Hide on immersive views

    const tabs = [
        { path: '/', icon: BookOpen, label: 'Quran' },
        { path: '/memorize', icon: Brain, label: 'Memorize' },
        { path: '/progress', icon: TrendingUp, label: 'Analytics' },
        { path: '/profile', icon: User, label: 'Profile' }
    ];

    const labelStyle = {
        fontSize: '0.65rem',
        fontWeight: 600,
        opacity: 0.9,
    };

    return (
        <div
            className="glass-panel"
            style={{
                position: 'fixed',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 32px)',
                maxWidth: '500px',
                height: '64px',
                borderRadius: '100px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000,
                padding: '0 8px',
                gap: '4px'
            }}
        >
            {tabs.map((tab) => {
                const active = isActive(tab.path);
                const Icon = tab.icon;

                if (active) {
                    return (
                        <div key={tab.path} style={{ flex: '1.5', display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                background: 'var(--accent-light)',
                                borderRadius: '999px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                color: 'var(--accent-primary)'
                            }}>
                                <Icon size={22} color="currentColor" />
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{tab.label}</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <Link key={tab.path} to={tab.path} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        color: 'var(--text-muted)',
                        flex: '1',
                        transition: 'color 0.2s',
                    }}>
                        <Icon size={22} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.9 }}>{tab.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
