import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Mic, TrendingUp, User } from 'lucide-react';

export default function BottomNav() {
    const location = useLocation();

    // Hide BottomNav if we are actively reading a Surah to maximize screen real estate
    const isSurahPage = /^\/surah\/\d+/.test(location.pathname);

    // Check if a path is active
    const isActive = (path) => {
        if (path === '/' && location.pathname !== '/') return false;
        return location.pathname.startsWith(path);
    };

    if (isSurahPage) return null; // Hide on Surah reading view

    const tabs = [
        { path: '/', icon: BookOpen, label: 'Quran' },
        { path: '/memorize', icon: Mic, label: 'Memorize' },
        { path: '/dashboard', icon: Home, label: 'Dashboard' },
        { path: '/progress', icon: TrendingUp, label: 'Analytics' },
        { path: '/profile', icon: User, label: 'Profile' }
    ];

    const labelStyle = {
        fontSize: '0.65rem',
        fontWeight: 600,
        opacity: 0.9,
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '500px',
            height: '64px',
            background: 'var(--bg-surface)',
            borderRadius: '100px', // heavily rounded
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            zIndex: 1000,
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '0 8px',
        }}>
            {tabs.map((tab) => {
                const active = isActive(tab.path);
                const Icon = tab.icon;

                if (active) {
                    return (
                        <div key={tab.path} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                position: 'relative',
                                top: '-24px',
                                width: '68px',
                                height: '68px',
                                borderRadius: '50%',
                                background: 'var(--bg-surface)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
                            }}>
                                <div style={{
                                    width: '54px',
                                    height: '54px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    transition: 'transform 0.2s',
                                    boxShadow: '0 8px 20px rgba(var(--accent-primary-rgb, 14, 165, 233), 0.3)'
                                }}
                                    className="interactive-hover"
                                >
                                    <Icon size={24} color="white" />
                                </div>
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
                        gap: '4px',
                        textDecoration: 'none',
                        color: 'var(--text-muted)',
                        flex: 1,
                        transition: 'color 0.2s',
                    }}>
                        <Icon size={22} />
                        <span style={labelStyle}>{tab.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
