import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { saukaService, ASSIGNMENTS_COLLECTION, COMMENTS_COLLECTION } from '../services/saukaService';
import { JUZ_STARTS, HIZB_STARTS } from '../data/quranNavigation';
import { client, databaseId } from '../services/appwrite';
import { useAppStore } from '../store/useAppStore';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Clock, Share2, Copy, BookOpen, Trash2, MessageSquare, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getVersesByPage } from '../services/api/quranApi';

export default function SaukaGroup() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { setNavHeaderTitle } = useAppStore();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Comments
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isDuaOpen, setIsDuaOpen] = useState(false);

    // Modal
    const [selectedJuz, setSelectedJuz] = useState(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [previewText, setPreviewText] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    useEffect(() => {
        loadData();

        const unsubscribe = client.subscribe(
            [
                `databases.${databaseId}.collections.${ASSIGNMENTS_COLLECTION}.documents`,
                `databases.${databaseId}.collections.${COMMENTS_COLLECTION}.documents`
            ],
            (response) => {
                if (
                    response.events.includes('databases.*.collections.*.documents.*.update') ||
                    response.events.includes('databases.*.collections.*.documents.*.create') ||
                    response.events.includes('databases.*.collections.*.documents.*.delete')
                ) {
                    loadData(true); // silent reload
                }
            }
        );

        return () => unsubscribe();
    }, [groupId]);

    const loadData = async (silent = false) => {
        try {
            if (!data && !silent) setIsLoading(true);
            const [result, commentsData] = await Promise.all([
                saukaService.getGroup(groupId),
                saukaService.getComments(groupId)
            ]);
            setData(result);
            setNavHeaderTitle(result.group.title);
            setComments(commentsData);
        } catch (e) {
            console.error(e);
            setError(e.message || 'Group not found or you are offline.');
            setNavHeaderTitle('Error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const handleClaim = async (assignmentId) => {
        setIsActionLoading(true);
        try {
            await saukaService.claimJuz(assignmentId);
            setIsActionModalOpen(false);
            await loadData();
            setSelectedJuz(null);
        } catch (e) {
            alert('Failed to claim. It may have been claimed by someone else.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleComplete = async (assignmentId) => {
        setIsActionLoading(true);
        try {
            await saukaService.completeJuz(assignmentId, groupId);
            setIsActionModalOpen(false);
            const newData = await saukaService.getGroup(groupId);
            setData(newData);
            if (newData.group.status === 'completed' && data.group.status !== 'completed') {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            }
            setSelectedJuz(null);
        } catch (e) {
            alert('Failed to mark complete.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUnclaim = async (assignmentId) => {
        setIsActionLoading(true);
        try {
            await saukaService.unclaimJuz(assignmentId);
            setIsActionModalOpen(false);
            await loadData();
            setSelectedJuz(null);
        } catch (e) {
            alert('Failed to unclaim.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(data.group.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsActionLoading(true);
        try {
            await saukaService.addComment(groupId, newComment.trim());
            setNewComment('');
            const commentsData = await saukaService.getComments(groupId);
            setComments(commentsData);
        } catch (e) {
            alert('Failed to post comment.');
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleDeleteComment = async (commentId) => {
        if (!confirm('Delete comment?')) return;
        try {
            if (commentId) {
                await saukaService.deleteComment(commentId);
            }
            setComments(comments.filter(c => c.$id !== commentId));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        let fetchStartPage = null;
        if (selectedJuz && data && data.group) {
            const isSurah = data.group.divisionType === 'surah';
            const isHizb = data.group.divisionType === 'hizb';
            if (!isSurah) {
                if (isHizb) {
                    const hizbIndex = selectedJuz.partNumber - 1;
                    fetchStartPage = HIZB_STARTS[hizbIndex]?.pageNumber;
                } else {
                    const juzIndex = selectedJuz.partNumber - 1;
                    fetchStartPage = JUZ_STARTS[juzIndex]?.pageNumber;
                }
            }
        }

        if (isActionModalOpen && selectedJuz && fetchStartPage) {
            setIsPreviewLoading(true);
            setPreviewText('');
            getVersesByPage(fetchStartPage, 85, 7, 'kfgqpc-hafs')
                .then(res => {
                    if (res && res.verses && res.verses.length > 0) {
                        setPreviewText(res.verses[0].arabic_text);
                    }
                })
                .catch(console.error)
                .finally(() => setIsPreviewLoading(false));
        } else {
            setPreviewText('');
        }
    }, [isActionModalOpen, selectedJuz?.partNumber, data?.group?.divisionType]);

    // Background prefetch for instant loading
    useEffect(() => {
        if (!data || !data.group || !data.assignments) return;
        const isSurah = data.group.divisionType === 'surah';
        const isHizb = data.group.divisionType === 'hizb';
        if (isSurah) return;

        const pagesToFetch = new Set();
        data.assignments.forEach(a => {
            if (a.status === 'completed') return; // only prefetch active/unclaimed
            let start = null;
            if (isHizb) {
                start = HIZB_STARTS[a.partNumber - 1]?.pageNumber;
            } else {
                start = JUZ_STARTS[a.partNumber - 1]?.pageNumber;
            }
            if (start) pagesToFetch.add(start);
        });

        const prefetch = async () => {
            for (const page of pagesToFetch) {
                try {
                    await getVersesByPage(page, 85, 7, 'kfgqpc-hafs');
                } catch (e) {}
                await new Promise(r => setTimeout(r, 200)); // stagger requests
            }
        };
        prefetch();
    }, [data]);

    if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-[var(--h-gold)]" size={32} /></div>;
    if (error || !data) return <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"><p className="text-[var(--h-ink-muted)]">{error}</p><button onClick={() => navigate('/sauka')} className="mt-4 rounded-xl bg-[var(--h-bone)] px-4 py-2 text-sm font-semibold text-[var(--h-ink)]">Go Back</button></div>;

    const { group, assignments, userId } = data;
    const isSurah = group.divisionType === 'surah';
    const isHizb = group.divisionType === 'hizb';
    const unitName = isSurah ? 'Surah' : isHizb ? 'Hizb' : 'Juz';
    const totalParts = isSurah ? 114 : isHizb ? 60 : 30;
    const completedCount = assignments.filter(a => a.status === 'completed').length;
    const isAdmin = group.createdBy === userId;

    const getDaysLeft = (deadline) => {
        if (!deadline) return null;
        const diff = new Date(deadline).getTime() - new Date().getTime();
        if (diff <= 0) return 'Expired';
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return `${days} Day${days !== 1 ? 's' : ''} Left`;
    };

    // Calculate Modal Info
    let modalStartPage = null, modalPagesCount = null, modalStartSurah = null;
    if (selectedJuz && !isSurah) {
        if (isHizb) {
            const hizbIndex = selectedJuz.partNumber - 1;
            const start = HIZB_STARTS[hizbIndex]?.pageNumber;
            const end = HIZB_STARTS[hizbIndex + 1] ? HIZB_STARTS[hizbIndex + 1].pageNumber - 1 : 604;
            if (start) {
                modalStartPage = start;
                modalPagesCount = end - start + 1;
                modalStartSurah = HIZB_STARTS[hizbIndex].verseKey.split(':')[0];
            }
        } else {
            const juzIndex = selectedJuz.partNumber - 1;
            const start = JUZ_STARTS[juzIndex]?.pageNumber;
            const end = JUZ_STARTS[juzIndex + 1] ? JUZ_STARTS[juzIndex + 1].pageNumber - 1 : 604;
            if (start) {
                modalStartPage = start;
                modalPagesCount = end - start + 1;
                modalStartSurah = JUZ_STARTS[juzIndex].verseKey.split(':')[0];
            }
        }
    }

    const handleShareGraphic = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#065f57'; // h-teal
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Decorations
        ctx.fillStyle = '#10756B';
        ctx.beginPath(); ctx.arc(0, 0, 400, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(1080, 1080, 300, 0, Math.PI*2); ctx.fill();

        // Texts
        ctx.fillStyle = '#E5C07B'; // gold
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ALHAMDULILLAH', 540, 300);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px sans-serif';
        ctx.fillText('Khatmah Completed!', 540, 420);
        
        ctx.font = '40px sans-serif';
        ctx.fillText(`Group: ${group.title}`, 540, 550);
        
        if (group.intention) {
            ctx.fillStyle = '#E5C07B';
            ctx.font = 'italic 40px sans-serif';
            ctx.fillText(`" ${group.intention.substring(0, 50)}${group.intention.length > 50 ? '...' : ''} "`, 540, 650);
        }

        ctx.fillStyle = '#8E9B97';
        ctx.font = '30px sans-serif';
        ctx.fillText('Read on Quran Nur', 540, 950);

        // Download
        const link = document.createElement('a');
        link.download = 'khatmah-completed.png';
        link.href = canvas.toDataURL();
        link.click();
    };

    const handleShareInvite = () => {
        const text = `🌙 Join my Quran Khatmah on Quran Nur!\n\nGroup: ${group.title}\nDivision: ${group.divisionType === 'surah' ? 'Surah by Surah' : 'Juz by Juz'}\nDeadline: ${group.deadline ? new Date(group.deadline).toLocaleDateString() : 'No deadline'}\n\nJoin Code: ${group.joinCode}\n\nRead and track together!`;
        if (navigator.share) {
            navigator.share({ title: 'Quran Nur Khatmah', text }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text);
            alert('Invite text copied to clipboard!');
        }
    };

    return (
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 pb-24 pt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* ── Top Info Card ── */}
                <button 
                    onClick={() => navigate('/sauka')} 
                    className="mb-6 flex w-fit items-center gap-2 rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-2 text-sm font-semibold text-[var(--h-ink-mid)] transition-colors hover:bg-white hover:text-[var(--h-ink)]"
                >
                    <ArrowLeft size={16} /> Back to Sauka
                </button>
                <div className="mb-10 overflow-hidden rounded-[24px] border border-white/20 bg-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--h-teal)] opacity-[0.03] blur-[60px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--h-gold)] opacity-[0.03] blur-[50px] rounded-full pointer-events-none" />
                    
                    <div className="p-8 relative z-10">
                        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h1 className="font-[var(--font-ui)] text-[2rem] leading-tight font-extrabold text-[var(--h-ink)] tracking-tight">{group.title}</h1>
                                <p className="mt-1.5 text-[0.95rem] font-medium text-[var(--h-ink-muted)]">Organized by <span className="text-[var(--h-teal)] font-semibold">{group.createdByName}</span></p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-10 mb-8 p-6 bg-white/50 rounded-2xl border border-white/40 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)]">
                            {/* Circular Progress */}
                            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-[var(--h-teal)]/5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.02)]">
                                <svg className="absolute inset-0 h-full w-full -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
                                    <circle className="stroke-white/80" cx="50" cy="50" r="42" fill="none" strokeWidth="8" />
                                    <circle 
                                        className="stroke-[var(--h-teal)] transition-all duration-1000 ease-out" 
                                        cx="50" cy="50" r="42" fill="none" strokeWidth="8" 
                                        strokeLinecap="round"
                                        strokeDasharray={`${(completedCount / totalParts) * 263.89} 263.89`} 
                                    />
                                </svg>
                                <div className="text-center">
                                    <span className="block font-[var(--font-ui)] text-3xl font-extrabold text-[var(--h-teal)] tracking-tighter">{Math.round((completedCount / totalParts) * 100)}%</span>
                                </div>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex flex-1 flex-col gap-4 w-full">
                                <div className="flex items-center justify-between text-[0.95rem]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--h-green)] shadow-[0_0_8px_var(--h-green)]" />
                                        <span className="font-semibold text-[var(--h-ink-mid)]">Completed</span>
                                    </div>
                                    <span className="font-bold text-[var(--h-ink)] text-lg">{completedCount} <span className="text-[var(--h-ink-muted)] text-sm font-medium">/ {totalParts}</span></span>
                                </div>
                                <div className="flex items-center justify-between text-[0.95rem]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--h-gold)] shadow-[0_0_8px_var(--h-gold)]" />
                                        <span className="font-semibold text-[var(--h-ink-mid)]">In Progress</span>
                                    </div>
                                    <span className="font-bold text-[var(--h-ink)] text-lg">{assignments.filter(a => a.status === 'in_progress').length}</span>
                                </div>
                                <div className="flex items-center justify-between text-[0.95rem]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--h-bone-dark)]" />
                                        <span className="font-semibold text-[var(--h-ink-mid)]">Unclaimed</span>
                                    </div>
                                    <span className="font-bold text-[var(--h-ink)] text-lg">{assignments.filter(a => a.status === 'unclaimed').length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-4">
                            <div className="flex-1 min-w-[140px] flex flex-col items-start px-5 py-4 bg-white/60 border border-white/50 shadow-sm rounded-2xl relative transition-all hover:bg-white/80">
                                <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-[var(--h-teal)] uppercase mb-1">Join Code</span>
                                <span className="text-2xl font-bold font-mono tracking-widest cursor-pointer text-[var(--h-ink)]" onClick={copyCode}>
                                    {group.joinCode} {copied ? '✓' : ''}
                                </span>
                                <button onClick={handleShareInvite} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2.5 text-[var(--h-teal)] shadow-sm hover:bg-[var(--h-teal)] hover:text-white transition-colors" title="Share Invite">
                                    <Share2 size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                            {group.deadline && (
                                <div className="flex-1 min-w-[140px] flex flex-col items-start px-5 py-4 bg-white/60 border border-white/50 shadow-sm rounded-2xl">
                                    <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-[var(--h-teal)] uppercase mb-1">Deadline</span>
                                    <span className="text-xl font-bold font-mono text-[var(--h-ink)] pt-1">{getDaysLeft(group.deadline)}</span>
                                </div>
                            )}
                        </div>
                        {group.intention && (
                            <div className="mt-5 rounded-[16px] bg-[var(--h-teal)]/5 p-5 border border-[var(--h-teal)]/10">
                                <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-[var(--h-teal)] mb-2 font-[var(--font-mono)]">Dedication / Intention</p>
                                <p className="text-[0.95rem] font-medium italic text-[var(--h-ink)] leading-relaxed">"{group.intention}"</p>
                            </div>
                        )}
                    </div>
                    {group.status === 'completed' && (
                        <div className="bg-gradient-to-r from-[var(--h-green)] to-[#0ea5e9] px-8 py-5 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-white font-bold text-lg m-0">Alhamdulillah! This Khatmah is complete.</p>
                            <button onClick={() => setIsDuaOpen(true)} className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[var(--h-green)] transition-all hover:scale-105 shadow-md">
                                Read Completion Dua
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Grid ── */}
                {/* ── Grid ── */}
                <h2 className="mb-5 px-2 font-[var(--font-mono)] text-[0.8rem] font-bold uppercase tracking-[0.15em] text-[var(--h-ink-muted)]">The {totalParts} {isSurah ? 'Surahs' : isHizb ? 'Hizbs' : 'Juz'}</h2>
                <div className={`grid gap-3 sm:gap-4 ${isSurah ? 'grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-8 md:grid-cols-12' : isHizb ? 'grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-8 md:grid-cols-10' : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-10'}`}>
                    {assignments.map(j => {
                        const isClaimedByMe = j.claimedBy === userId;
                        const isInactive = j.status === 'in_progress' && j.claimedAt && (new Date().getTime() - new Date(j.claimedAt).getTime()) > 3 * 24 * 60 * 60 * 1000;
                        return (
                            <motion.button
                                key={j.$id}
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setSelectedJuz(j); setIsActionModalOpen(true); }}
                                className={`relative flex aspect-square flex-col items-center justify-center p-2 rounded-[18px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border transition-all duration-300 ${j.status === 'completed'
                                    ? 'bg-gradient-to-br from-[var(--h-green)] to-[#14b8a6] text-white border-transparent shadow-[0_8px_16px_rgba(16,185,129,0.2)]'
                                    : j.status === 'in_progress'
                                        ? isClaimedByMe ? 'bg-gradient-to-br from-[var(--h-gold)] to-[#d97706] text-white border-transparent shadow-[0_8px_16px_rgba(184,146,74,0.2)]' : 'bg-white/80 text-gray-400 border-gray-200 opacity-60 grayscale-[50%]'
                                        : 'bg-white text-[var(--h-ink-mid)] border-white/50 hover:border-[var(--h-teal)] hover:shadow-md'
                                    }`}
                            >
                                {isInactive && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" title="Inactive for over 3 days" />}
                                <span className={`text-2xl font-bold font-ui ${j.status === 'completed' || (j.status === 'in_progress' && isClaimedByMe) ? 'text-white' : ''}`}>{j.partNumber}</span>
                                {isClaimedByMe && j.status === 'in_progress' && (
                                    <BookOpen size={14} className="absolute bottom-2 right-2 opacity-80" />
                                )}
                                {j.status === 'completed' && (
                                    <CheckCircle2 size={14} className="absolute bottom-2 right-2 opacity-80" />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* ── Comments / Nudges ── */}
                <div className="mt-8 mb-6 rounded-[24px] border border-[var(--h-bone-dark)] bg-white p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--h-gold)] opacity-5 blur-[40px] rounded-full pointer-events-none" />
                    
                    <h2 className="mb-6 font-[var(--font-ui)] text-[1.4rem] font-extrabold text-[var(--h-ink)]">Group Activity</h2>
                    
                    <div className="mb-6 space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {comments.length === 0 ? (
                            <div className="text-center py-8">
                                <MessageSquare size={32} className="mx-auto text-[var(--h-bone-dark)] mb-3" />
                                <p className="text-[0.95rem] text-[var(--h-ink-muted)]">No comments yet. Start the conversation!</p>
                            </div>
                        ) : (
                            comments.map(c => {
                                const isMe = c.userId === userId;
                                return (
                                    <div key={c.$id} className={`flex flex-col relative group/comment ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-baseline gap-2 mb-1 px-1">
                                            <span className="font-bold text-[0.8rem] text-[var(--h-ink)]">{isMe ? 'You' : c.userName}</span>
                                            <span className="text-[0.65rem] text-[var(--h-ink-muted)] font-medium uppercase tracking-wider">{new Date(c.$createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className={`relative max-w-[85%] rounded-[20px] px-5 py-3 shadow-sm ${isMe ? 'bg-gradient-to-br from-[var(--h-teal)] to-[var(--h-teal-mid)] text-white rounded-tr-sm' : 'bg-[var(--h-cream)] border border-[var(--h-bone-dark)] text-[var(--h-ink-mid)] rounded-tl-sm'}`}>
                                            <p className={`text-[0.95rem] leading-relaxed ${isMe ? 'text-white' : 'text-[var(--h-ink-mid)]'}`}>{c.text}</p>
                                        </div>
                                        {(isMe || isAdmin) && (
                                            <button onClick={() => handleDeleteComment(c.$id)} className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-right-8'} text-red-500 opacity-0 transition-all hover:scale-110 group-hover/comment:opacity-100 p-1.5 bg-red-50 rounded-full`}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <form onSubmit={handleAddComment} className="flex gap-3 relative z-10">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type a message or nudge..." className="flex-1 rounded-[16px] border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-5 py-3.5 text-[0.95rem] text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)] focus:bg-white focus:ring-4 focus:ring-[var(--h-teal)]/10 transition-all shadow-inner" />
                        <button type="submit" disabled={isActionLoading || !newComment.trim()} className="rounded-[16px] bg-[var(--h-teal)] px-6 py-3.5 font-bold text-white transition-all hover:bg-[var(--h-teal-mid)] hover:shadow-lg hover:shadow-[var(--h-teal)]/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center">
                            <ArrowRight size={20} strokeWidth={2.5} />
                        </button>
                    </form>
                </div>
            </motion.div>

            {/* ── Action Modal ── */}
            <AnimatePresence>
                {isActionModalOpen && selectedJuz && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isActionLoading && setIsActionModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm overflow-hidden rounded-[24px] bg-[var(--h-white)] shadow-2xl border border-[var(--h-bone-dark)]/50">
                            
                            <div className="p-8 pb-6 text-center relative flex flex-col items-center">
                                {/* Minimal Gold Accent Line */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--h-gold)] to-transparent opacity-60" />
                                
                                <h3 className="font-[var(--font-ui)] text-[0.65rem] font-bold tracking-[0.25em] text-[var(--h-gold)] uppercase mb-1">
                                    {unitName}
                                </h3>
                                <div className="font-[var(--font-ui)] text-[3rem] font-normal text-[var(--h-ink)] leading-none mb-4">
                                    {selectedJuz.partNumber}
                                </div>
                                
                                {/* Elegant Arabic Preview */}
                                <div className="min-h-[50px] flex items-center justify-center mb-4">
                                    {previewText ? (
                                        <p className="font-hafs text-[1.8rem] leading-[1.6] text-[var(--h-ink)] opacity-90 px-2 line-clamp-2 text-ellipsis" dir="rtl">
                                            {previewText}
                                        </p>
                                    ) : isPreviewLoading ? (
                                        <Loader2 className="animate-spin text-[var(--h-gold)] opacity-40" size={20} />
                                    ) : null}
                                </div>

                                {/* Minimal Info Row */}
                                {modalStartPage && (
                                    <div className="flex items-center justify-center gap-4 text-[0.75rem] font-medium tracking-wide text-[var(--h-ink-muted)] mb-6 w-full">
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen size={12} className="text-[var(--h-gold)] opacity-70" />
                                            <span>{modalPagesCount} Pages</span>
                                        </div>
                                        <div className="w-[1px] h-3 bg-[var(--h-bone-dark)] opacity-50"></div>
                                        <div className="flex items-center gap-1.5">
                                            <span>Starts Surah {modalStartSurah}, P. {modalStartPage}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Action Area */}
                                {selectedJuz.status === 'unclaimed' ? (
                                    <div className="flex flex-col items-center gap-3 w-full">
                                        <button onClick={() => handleClaim(selectedJuz.$id)} disabled={isActionLoading} className="w-full rounded-xl bg-[var(--h-ink)] hover:bg-[var(--h-teal)] py-3 text-[1rem] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                                            <CheckCircle2 size={16} /> Claim {unitName}
                                        </button>
                                        
                                        {isAdmin && (
                                            <button onClick={() => {
                                                const guestName = prompt(`Enter name to assign ${unitName} ${selectedJuz.partNumber} to:`);
                                                if (guestName) {
                                                    setIsActionLoading(true);
                                                    saukaService.assignGuest(selectedJuz.$id, guestName)
                                                        .then(() => loadData(true))
                                                        .finally(() => {
                                                            setIsActionLoading(false);
                                                            setIsActionModalOpen(false);
                                                        });
                                                }
                                            }} disabled={isActionLoading} className="text-[0.8rem] font-medium text-[var(--h-ink-muted)] hover:text-[var(--h-ink)] transition-colors underline decoration-transparent hover:decoration-[var(--h-ink)] underline-offset-4 disabled:opacity-50 mt-1">
                                                Assign to Guest
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center w-full">
                                        <div className="mb-6 flex flex-col items-center border-t border-[var(--h-bone-dark)]/30 pt-4">
                                            <p className="text-[0.6rem] text-[var(--h-ink-muted)] uppercase tracking-[0.2em] mb-1 font-[var(--font-mono)]">Status</p>
                                            <p className={`font-[var(--font-ui)] text-xl mb-0.5 ${selectedJuz.status === 'completed' ? 'text-[var(--h-green)]' : 'text-[var(--h-gold)]'}`}>{selectedJuz.status === 'completed' ? 'Completed' : 'In Progress'}</p>
                                            <p className="text-[0.85rem] text-[var(--h-ink-mid)] italic">by {selectedJuz.claimedByName || 'Someone'}</p>
                                        </div>

                                        {(selectedJuz.claimedBy === userId || isAdmin) && selectedJuz.status === 'in_progress' && (
                                            <div className="space-y-2.5">
                                                {(selectedJuz.claimedAt && (new Date().getTime() - new Date(selectedJuz.claimedAt).getTime()) > 3 * 24 * 60 * 60 * 1000) && (
                                                    <div className="flex items-center justify-center gap-1.5 text-red-500 text-[0.7rem] font-bold py-1.5 px-3 bg-red-50 rounded-lg border border-red-100 mb-1">
                                                        <Clock size={12} /> Claimed > 3 days ago
                                                    </div>
                                                )}
                                                {selectedJuz.claimedBy === userId && (
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <button onClick={() => {
                                                            let startPage = 1, endPage = 604;
                                                            if (!isSurah) {
                                                                if (isHizb) {
                                                                    const hizbIndex = selectedJuz.partNumber - 1;
                                                                    startPage = HIZB_STARTS[hizbIndex]?.pageNumber || 1;
                                                                    endPage = HIZB_STARTS[hizbIndex + 1] ? HIZB_STARTS[hizbIndex + 1].pageNumber - 1 : 604;
                                                                } else {
                                                                    const juzIndex = selectedJuz.partNumber - 1;
                                                                    startPage = JUZ_STARTS[juzIndex]?.pageNumber || 1;
                                                                    endPage = JUZ_STARTS[juzIndex + 1] ? JUZ_STARTS[juzIndex + 1].pageNumber - 1 : 604;
                                                                }
                                                            }

                                                            // Resume progress
                                                            const savedProgress = useAppStore.getState().saukaProgress[selectedJuz.$id];
                                                            let targetPage = startPage;
                                                            if (!isSurah && savedProgress && parseInt(savedProgress) >= startPage && parseInt(savedProgress) <= endPage) {
                                                                targetPage = parseInt(savedProgress);
                                                            }

                                                            navigate(isSurah ? `/surah/${selectedJuz.partNumber}` : `/page/${targetPage}`, { 
                                                                state: { 
                                                                    backToSauka: groupId, 
                                                                    saukaAssignmentId: selectedJuz.$id, 
                                                                    saukaPartNumber: selectedJuz.partNumber, 
                                                                    saukaUnit: unitName,
                                                                    saukaStartPage: startPage,
                                                                    saukaEndPage: endPage
                                                                } 
                                                            });
                                                        }} className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[var(--h-gold)] hover:bg-[#b08f5c] py-2.5 text-[0.95rem] font-medium text-white transition-all active:scale-[0.98] shadow-sm">
                                                            <BookOpen size={14} /> Read
                                                        </button>
                                                        <button onClick={() => handleComplete(selectedJuz.$id)} disabled={isActionLoading} className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[var(--h-bone-dark)] py-2.5 text-[0.95rem] font-medium text-[var(--h-ink)] hover:bg-[var(--h-cream)] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm">
                                                            <CheckCircle2 size={14} /> Done
                                                        </button>
                                                    </div>
                                                )}
                                                <button onClick={() => handleUnclaim(selectedJuz.$id)} className="w-full py-2 text-[0.75rem] font-medium text-red-500 hover:text-red-600 transition-colors">Unclaim Part</button>
                                            </div>
                                        )}
                                        {isAdmin && selectedJuz.claimedBy !== userId && selectedJuz.status === 'in_progress' && (
                                            <button onClick={() => handleUnclaim(selectedJuz.$id)} disabled={isActionLoading} className="w-full py-2 mt-2 text-[0.75rem] font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                                                Admin: Unclaim Part
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
                
                {/* ── Dua Modal ── */}
                {isDuaOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDuaOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl bg-[var(--color-paper)] p-6 shadow-xl">
                            <h2 className="mb-4 text-center font-[var(--font-ui)] text-2xl font-bold text-[var(--h-ink)]">Dua Khatm al-Quran</h2>
                            <div className="space-y-4 text-center">
                                <p className="text-2xl font-[var(--font-quran)] leading-loose text-[var(--h-ink)]" dir="rtl">
                                    اللَّهُمَّ ارْحَمْنِي بالقُرْآنِ وَاجْعَلهُ لِي إِمَاماً وَنُوراً وَهُدًى وَرَحْمَةً
                                </p>
                                <p className="text-sm italic text-[var(--h-ink-mid)]">
                                    Allahummarhamni bil-qur'an, waj'alhu li imaman wa nuran wa hudan wa rahmah.
                                </p>
                                <p className="text-sm text-[var(--h-ink)]">
                                    "O Allah, have mercy on me through the Quran, and make it a leader, a light, guidance, and mercy for me."
                                </p>
                                
                                <p className="text-2xl font-[var(--font-quran)] leading-loose text-[var(--h-ink)] pt-4 border-t border-[var(--h-bone-dark)]" dir="rtl">
                                    اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَا نَسِيتُ وَعَلِّمْنِي مِنْهُ مَا جَهِلْتُ وَارْزُقْنِي تِلاَوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ وَاجْعَلهُ لِي حُجَّةً يَا رَبَّ العَالَمِينَ
                                </p>
                                <p className="text-sm italic text-[var(--h-ink-mid)]">
                                    Allahumma dhakkirni minhu ma nasitu wa 'allimni minhu ma jahiltu warzuqni tilawatahu aana'al-laili wa atrafan-nahari waj'alhu li hujjatan ya rabbal-'alamin.
                                </p>
                                <p className="text-sm text-[var(--h-ink)]">
                                    "O Allah, remind me of what I have forgotten of it, teach me what I am ignorant of it, and bless me with its recitation during the hours of the night and the edges of the day, and make it a proof for me, O Lord of the worlds."
                                </p>
                            </div>
                            <div className="mt-8 flex gap-3">
                                <button onClick={handleShareGraphic} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--h-teal)] text-[var(--h-teal)] py-3 text-sm font-bold hover:bg-[var(--h-teal)]/10">
                                    <Share2 size={16} /> Share Graphic
                                </button>
                                <button onClick={() => setIsDuaOpen(false)} className="flex-1 rounded-xl bg-[var(--h-teal)] py-3 text-sm font-bold text-white hover:bg-[var(--h-teal-mid)]">
                                    Ameen / Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
