import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, DownloadCloud, HardDrive, RefreshCw, Trash2, WifiOff } from 'lucide-react';

import { useAppStore } from '../store/useAppStore';
import { OFFLINE_PACKS, deleteOfflinePack, getOfflinePackStats, syncQuranTextPack, syncTajweedPack } from '../utils/offlineLibrary';

function PackCard({ title, description, stats, status, onSync, onDelete }) {
    const isSyncing = status?.state === 'syncing';

    return (
        <div style={{ padding: '1.1rem', borderRadius: '22px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{title}</div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</div>
                </div>
                {stats?.downloaded ? (
                    <div style={{ padding: '0.35rem 0.65rem', borderRadius: '999px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', fontWeight: 700, fontSize: '0.78rem' }}>
                        Downloaded
                    </div>
                ) : (
                    <div style={{ padding: '0.35rem 0.65rem', borderRadius: '999px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem' }}>
                        Not downloaded
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ padding: '0.85rem 0.95rem', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.3rem' }}>Entries</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{stats?.entryCount || 0}</div>
                </div>
                <div style={{ padding: '0.85rem 0.95rem', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.3rem' }}>Storage</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{stats?.sizeLabel || '0 B'}</div>
                </div>
            </div>

            {isSyncing && (
                <div style={{ marginTop: '1rem', padding: '0.85rem 0.95rem', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.45rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        <span>{status.label || 'Syncing...'}</span>
                        <span>{status.total ? `${Math.round((status.current / status.total) * 100)}%` : '...'}</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '999px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                        <div style={{ width: `${status.total ? (status.current / status.total) * 100 : 0}%`, height: '100%', background: 'var(--accent-primary)' }} />
                    </div>
                </div>
            )}

            {status?.state === 'error' && (
                <div style={{ marginTop: '0.85rem', color: '#ef4444', fontSize: '0.84rem', fontWeight: 600 }}>
                    Sync failed. Try again with a stable connection.
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <button
                    type="button"
                    onClick={onSync}
                    disabled={isSyncing}
                    style={{ minHeight: '42px', padding: '0.75rem 0.95rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.45rem', opacity: isSyncing ? 0.7 : 1 }}
                >
                    {isSyncing ? <RefreshCw size={16} className="spin" aria-hidden="true" /> : <DownloadCloud size={16} aria-hidden="true" />}
                    <span>{stats?.downloaded ? 'Refresh Pack' : 'Download Pack'}</span>
                </button>
                {stats?.downloaded && (
                    <button
                        type="button"
                        onClick={onDelete}
                        style={{ minHeight: '42px', padding: '0.75rem 0.95rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                        <Trash2 size={16} aria-hidden="true" />
                        <span>Remove Pack</span>
                    </button>
                )}
            </div>
        </div>
    );
}

export default function OfflineLibrary() {
    const {
        translationId,
        reciterId,
        mushafId,
        setNavHeaderTitle,
        offlinePackStatus,
        setOfflinePackStatus,
    } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('Offline Library');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const statsQuery = useQuery({
        queryKey: ['offline-pack-stats', translationId, reciterId, mushafId],
        queryFn: () => getOfflinePackStats({ translationId, reciterId, mushafId }),
    });

    const packEntries = useMemo(() => Object.values(OFFLINE_PACKS), []);

    const refreshStats = () => statsQuery.refetch();

    const handleSyncPack = async (packId) => {
        try {
            setOfflinePackStatus(packId, { state: 'syncing', current: 0, total: 0, label: 'Preparing...' });

            const onProgress = ({ current, total, label }) => {
                setOfflinePackStatus(packId, { state: 'syncing', current, total, label });
            };

            if (packId === 'tajweed') {
                await syncTajweedPack({ onProgress });
            } else {
                await syncQuranTextPack({ translationId, reciterId, mushafId, onProgress });
            }

            setOfflinePackStatus(packId, { state: 'completed', current: 1, total: 1, label: 'Ready offline' });
            await refreshStats();
        } catch (error) {
            console.error('Offline sync failed', error);
            setOfflinePackStatus(packId, { state: 'error', label: 'Sync failed' });
        }
    };

    const handleDeletePack = async (packId) => {
        await deleteOfflinePack(packId);
        setOfflinePackStatus(packId, { state: 'idle', current: 0, total: 0, label: '' });
        await refreshStats();
    };

    const stats = statsQuery.data || {};

    return (
        <div className="container" style={{ paddingBottom: '6rem' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <section style={{ padding: '1.5rem', borderRadius: '24px', background: 'linear-gradient(145deg, var(--bg-surface), var(--bg-secondary))', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.7rem', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.9rem' }}>
                                <HardDrive size={14} aria-hidden="true" />
                                Offline Library
                            </div>
                            <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                                Download Quran packs for reliable offline reading.
                            </h1>
                            <p style={{ maxWidth: '620px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                Download the exact data your app uses, including Mushaf-aware Quran text and tajweed markup, so reading works even without network access.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: '0.75rem' }}>
                            <div style={{ padding: '1rem', borderRadius: '18px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.3rem' }}>Mushaf</div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{mushafId}</div>
                            </div>
                            <div style={{ padding: '1rem', borderRadius: '18px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.3rem' }}>Status</div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{navigator.onLine ? 'Online' : 'Offline'}</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section style={{ display: 'grid', gap: '1rem' }}>
                    {packEntries.map((pack) => (
                        <PackCard
                            key={pack.id}
                            title={pack.title}
                            description={pack.description}
                            stats={stats[pack.id]}
                            status={offlinePackStatus?.[pack.id]}
                            onSync={() => handleSyncPack(pack.id)}
                            onDelete={() => handleDeletePack(pack.id)}
                        />
                    ))}
                </section>

                <section style={{ marginTop: '1.5rem', padding: '1rem 1.1rem', borderRadius: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.45rem' }}>
                        <WifiOff size={16} aria-hidden="true" />
                        <span>Offline notes</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        Quran packs use the app’s IndexedDB cache, so downloaded content remains available across sessions. Audio files still need a separate local audio folder or future reciter-pack downloads.
                    </div>
                </section>
            </motion.div>
        </div>
    );
}
