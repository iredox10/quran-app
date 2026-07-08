import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, DownloadCloud, HardDrive, RefreshCw, Trash2, WifiOff } from 'lucide-react';

import { useAppStore } from '../store/useAppStore';
import { OFFLINE_PACKS, deleteOfflinePack, getOfflinePackStats, syncQuranTextPack, syncTajweedPack } from '../utils/offlineLibrary';

function PackCard({ title, description, stats, status, onSync, onDelete }) {
    const isSyncing = status?.state === 'syncing';

    return (
        <div className="p-[1.1rem] rounded-[22px] bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
            <div className="flex justify-between gap-4 items-start flex-wrap">
                <div>
                    <h3 className="font-ui text-2xl font-extrabold text-[var(--text-primary)] mb-[0.3rem]">{title}</h3>
                    <div className="text-[var(--text-secondary)] leading-[1.6]">{description}</div>
                </div>
                {stats === undefined ? (
                    <div className="px-[0.65rem] py-[0.35rem] rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold text-[0.78rem] animate-pulse">
                        Checking...
                    </div>
                ) : stats?.downloaded ? (
                    <div className="px-[0.65rem] py-[0.35rem] rounded-full bg-[rgba(34,197,94,0.12)] text-[#22c55e] font-bold text-[0.78rem] flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Downloaded
                    </div>
                ) : (
                    <div className="px-[0.65rem] py-[0.35rem] rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold text-[0.78rem]">
                        Not downloaded
                    </div>
                )}
            </div>

            <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <div className="px-[0.95rem] py-[0.85rem] rounded-2xl bg-[var(--bg-primary)] border border-[rgba(0,0,0,0.06)]">
                    <div className="font-mono text-[var(--text-muted)] text-[0.7rem] uppercase tracking-[0.1em] font-bold mb-[0.3rem]">Entries</div>
                    <div className="text-[var(--text-primary)] font-extrabold">{stats?.entryCount || 0}</div>
                </div>
                <div className="px-[0.95rem] py-[0.85rem] rounded-2xl bg-[var(--bg-primary)] border border-[rgba(0,0,0,0.06)]">
                    <div className="font-mono text-[var(--text-muted)] text-[0.7rem] uppercase tracking-[0.1em] font-bold mb-[0.3rem]">Storage</div>
                    <div className="text-[var(--text-primary)] font-extrabold">{stats?.sizeLabel || '0 B'}</div>
                </div>
            </div>

            {isSyncing && (
                <div className="mt-4 px-[0.95rem] py-[0.85rem] rounded-2xl bg-[var(--bg-primary)] border border-[rgba(0,0,0,0.06)]">
                    <div className="flex justify-between gap-4 mb-[0.45rem] text-[var(--text-primary)] font-bold">
                        <span>{status.label || 'Syncing...'}</span>
                        <span>{status.total ? `${Math.round((status.current / status.total) * 100)}%` : '...'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                        <div className="h-full bg-[var(--accent-primary)] transition-all duration-300" style={{ width: `${status.total ? (status.current / status.total) * 100 : 0}%` }} />
                    </div>
                </div>
            )}

            {status?.state === 'completed' && (
                <div className="mt-4 px-[0.95rem] py-[0.85rem] rounded-2xl bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] flex items-center gap-3 text-[#22c55e]">
                    <CheckCircle2 size={20} />
                    <span className="font-bold text-[0.9rem]">{status.label || 'Download Complete!'}</span>
                </div>
            )}

            {status?.state === 'error' && (
                <div className="mt-[0.85rem] text-[#ef4444] text-[0.84rem] font-semibold">
                    Sync failed. Try again with a stable connection.
                </div>
            )}

            <div className="flex gap-[0.6rem] flex-wrap mt-4">
                <button
                    type="button"
                    onClick={onSync}
                    disabled={isSyncing}
                    className="min-h-[42px] px-[0.95rem] py-[0.75rem] rounded-full bg-[var(--accent-primary)] text-white font-bold inline-flex items-center gap-[0.45rem]"
                    style={{ opacity: isSyncing ? 0.7 : 1 }}
                >
                    {isSyncing ? <RefreshCw size={16} className="spin" aria-hidden="true" /> : <DownloadCloud size={16} aria-hidden="true" />}
                    <span>{stats?.downloaded ? 'Refresh Pack' : 'Download Pack'}</span>
                </button>
                {stats?.downloaded && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="min-h-[42px] px-[0.95rem] py-[0.75rem] rounded-full bg-[rgba(239,68,68,0.1)] text-[rgb(239,68,68)] font-bold inline-flex items-center gap-[0.45rem]"
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
        <div className="container pb-24">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <section className="p-6 rounded-3xl bg-[linear-gradient(145deg,var(--bg-surface),var(--bg-secondary))] border border-[var(--border-color)] shadow-[var(--shadow-md)] mb-6">
                    <div className="flex justify-between gap-4 items-start flex-wrap">
                        <div>
                            <div className="inline-flex items-center gap-[0.45rem] px-[0.7rem] py-[0.35rem] rounded-full bg-[var(--accent-light)] text-[var(--accent-primary)] font-bold text-[0.82rem] mb-[0.9rem]">
                                <HardDrive size={14} aria-hidden="true" />
                                Offline Library
                            </div>
                            <h1 className="font-ui font-extrabold leading-[1.1] text-[var(--text-primary)] mb-[0.6rem]" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
                                Download Quran packs for reliable offline reading.
                            </h1>
                            <p className="max-w-[620px] text-[var(--text-secondary)] leading-[1.7]">
                                Download the exact data your app uses, including Mushaf-aware Quran text and tajweed markup, so reading works even without network access.
                            </p>
                        </div>
                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))' }}>
                            <div className="p-4 rounded-[18px] bg-[var(--bg-primary)] border border-[rgba(0,0,0,0.06)]">
                                <div className="font-mono text-[var(--text-muted)] text-[0.7rem] uppercase tracking-[0.1em] font-bold mb-[0.3rem]">Mushaf</div>
                                <div className="text-[var(--text-primary)] font-bold">{mushafId}</div>
                            </div>
                            <div className="p-4 rounded-[18px] bg-[var(--bg-primary)] border border-[rgba(0,0,0,0.06)]">
                                <div className="font-mono text-[var(--text-muted)] text-[0.7rem] uppercase tracking-[0.1em] font-bold mb-[0.3rem]">Status</div>
                                <div className="text-[var(--text-primary)] font-bold">{navigator.onLine ? 'Online' : 'Offline'}</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4">
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

                <section className="mt-6 px-[1.1rem] py-4 rounded-[20px] bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
                    <div className="flex items-center gap-[0.55rem] text-[var(--text-primary)] font-bold mb-[0.45rem]">
                        <WifiOff size={16} aria-hidden="true" />
                        <span>Offline notes</span>
                    </div>
                    <div className="text-[var(--text-secondary)] leading-[1.7]">
                        Quran packs use the app's IndexedDB cache, so downloaded content remains available across sessions. Audio files still need a separate local audio folder or future reciter-pack downloads.
                    </div>
                </section>
            </motion.div>
        </div>
    );
}
