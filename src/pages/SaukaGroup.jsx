import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { saukaService, ASSIGNMENTS_COLLECTION, COMMENTS_COLLECTION } from '../services/saukaService';
import { JUZ_STARTS, HIZB_STARTS } from '../data/quranNavigation';
import { client, databaseId, storage, audioBucketId } from '../services/appwrite';
import { useAppStore } from '../store/useAppStore';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Clock, Share2, Copy, BookOpen, Trash2, MessageSquare, UserPlus, Users, Mic, Square, X, Check, CheckCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ID } from 'appwrite';
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

    // Audio Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);
    const timerRef = React.useRef(null);
    const chatEndRef = React.useRef(null);

    // Auto-scroll chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [comments, isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
        } catch (e) {
            alert('Microphone access denied or unavailable.');
        }
    };

    const stopRecordingAndSend = () => {
        if (!mediaRecorderRef.current) return;
        
        mediaRecorderRef.current.onstop = async () => {
            clearInterval(timerRef.current);
            setIsRecording(false);
            
            const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

            const fileId = ID.unique();
            const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
            const file = new File([audioBlob], `voice_note_${fileId}.${ext}`, { type: mimeType });
            
            // Generate a local blob URL for instant preview
            const localUrl = URL.createObjectURL(audioBlob);
            const tempId = `temp-${Date.now()}`;
            
            // Instantly inject a placeholder comment (Optimistic UI)
            const tempComment = {
                $id: tempId,
                userId: data?.userId || 'me',
                userName: 'You',
                text: '🎤 Voice Note (Uploading...)',
                audioUrl: localUrl,
                $createdAt: new Date().toISOString(),
                isTemp: true
            };
            setComments(prev => [tempComment, ...prev]);

            try {
                // Background upload without blocking UI
                const uploadedFile = await storage.createFile(audioBucketId, fileId, file);
                const audioUrl = storage.getFileView(audioBucketId, uploadedFile.$id);
                
                await saukaService.addComment(groupId, '🎤 Voice Note', audioUrl);
                // The realtime subscription will fetch the true database record and replace tempComment!
            } catch (e) {
                console.error(e);
                alert('Failed to send voice note.');
                // Remove placeholder if it fails
                setComments(prev => prev.filter(c => c.$id !== tempId));
            }
        };

        mediaRecorderRef.current.stop();
    };

    const cancelRecording = () => {
        if (!mediaRecorderRef.current) return;
        mediaRecorderRef.current.onstop = () => {
            clearInterval(timerRef.current);
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.stop();
    };

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
        if (!(await useAppStore.getState().confirm("Are you sure you want to mark this part as completed? This will let the group know you've finished reading it."))) return;
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
        const text = newComment.trim();
        if (!text) return;
        
        setNewComment(''); // Instant optimistic UI clear
        
        const tempId = `temp-text-${Date.now()}`;
        const tempComment = {
            $id: tempId,
            userId: data?.userId || 'me',
            userName: 'You',
            text: text,
            $createdAt: new Date().toISOString(),
            isTemp: true
        };
        setComments(prev => [tempComment, ...prev]);

        try {
            await saukaService.addComment(groupId, text);
            // Realtime subscription will automatically pull the new comment!
        } catch (e) {
            alert('Failed to post comment.');
            setNewComment(text); // Restore text on failure
            setComments(prev => prev.filter(c => c.$id !== tempId));
        }
    };
    
    const handleDeleteComment = async (commentId) => {
        if (!(await useAppStore.getState().confirm('Delete comment?'))) return;
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
                    className="mb-6 flex w-fit items-center gap-2 rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-2 text-sm font-semibold text-[var(--h-ink-mid)] transition-colors hover:bg-[var(--h-white)] hover:text-[var(--h-ink)]"
                >
                    <ArrowLeft size={16} /> Back to Sauka
                </button>
                <div className="mb-10 overflow-hidden rounded-[24px] border border-[var(--h-bone-dark)] bg-[var(--h-cream)]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--h-teal)] opacity-[0.03] blur-[60px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--h-gold)] opacity-[0.03] blur-[50px] rounded-full pointer-events-none" />
                    
                    <div className="p-8 relative z-10">
                        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h1 className="font-[var(--font-ui)] text-[2rem] leading-tight font-extrabold text-[var(--h-ink)] tracking-tight">{group.title}</h1>
                                <p className="mt-1.5 text-[0.95rem] font-medium text-[var(--h-ink-muted)]">Organized by <span className="text-[var(--h-teal)] font-semibold">{group.createdByName}</span></p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-10 mb-8 p-6 bg-[var(--h-white)]/50 rounded-2xl border border-[var(--h-bone-dark)] shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
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
                            <div className="flex-1 min-w-[140px] flex flex-col items-start px-5 py-4 bg-[var(--h-white)]/60 border border-[var(--h-bone-dark)] shadow-sm rounded-2xl relative transition-all hover:bg-[var(--h-white)]/80">
                                <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-[var(--h-teal)] uppercase mb-1">Join Code</span>
                                <span className="text-2xl font-bold font-mono tracking-widest cursor-pointer text-[var(--h-ink)]" onClick={copyCode}>
                                    {group.joinCode} {copied ? '✓' : ''}
                                </span>
                                <button onClick={handleShareInvite} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[var(--h-cream)] p-2.5 text-[var(--h-teal)] shadow-sm hover:bg-[var(--h-teal)] hover:text-white transition-colors" title="Share Invite">
                                    <Share2 size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                            {group.deadline && (
                                <div className="flex-1 min-w-[140px] flex flex-col items-start px-5 py-4 bg-[var(--h-white)]/60 border border-[var(--h-bone-dark)] shadow-sm rounded-2xl">
                                    <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-[var(--h-teal)] uppercase mb-1">Deadline</span>
                                    <span className="text-xl font-bold font-mono text-[var(--h-ink)] pt-1">{getDaysLeft(group.deadline)}</span>
                                </div>
                            )}
                            {group.khatmahsCompleted > 0 && (
                                <div className="flex-1 min-w-[140px] flex flex-col items-start px-5 py-4 bg-[var(--h-white)]/60 border border-[var(--h-bone-dark)] shadow-[0_4px_20px_rgba(184,146,74,0.15)] rounded-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--h-gold)] opacity-10 rounded-full blur-xl pointer-events-none" />
                                    <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-[var(--h-gold)] uppercase mb-1">Completed Khatmahs</span>
                                    <span className="text-2xl font-extrabold font-ui text-[var(--h-gold)] pt-1">{group.khatmahsCompleted}</span>
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
                            <p className="text-white font-bold text-lg m-0">Alhamdulillah! Round {group.roundNumber || 1} is complete.</p>
                            <div className="flex gap-2">
                                <button onClick={() => setIsDuaOpen(true)} className="rounded-full bg-[var(--h-white)] px-5 py-2.5 text-sm font-bold text-[var(--h-green)] transition-all hover:scale-105 shadow-md">
                                    Read Completion Dua
                                </button>
                                {isAdmin && (
                                    <button 
                                        onClick={async () => {
                                            if (!(await useAppStore.getState().confirm("This will archive current progress and start a fresh round. Continue?"))) return;
                                            try {
                                                await saukaService.startNextRound(id);
                                                loadData();
                                            } catch (e) { alert("Failed to start next round: " + e.message); }
                                        }}
                                        className="rounded-full bg-transparent border-2 border-[var(--h-white)] text-white px-5 py-2.5 text-sm font-bold transition-all hover:bg-[var(--h-white)] hover:text-[#0ea5e9] shadow-md"
                                    >
                                        Start Next Round
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mb-5 px-2 flex items-center justify-between">
                    <h2 className="font-[var(--font-mono)] text-[0.8rem] font-bold uppercase tracking-[0.15em] text-[var(--h-ink-muted)]">The {totalParts} {isSurah ? 'Surahs' : isHizb ? 'Hizbs' : 'Juz'}</h2>
                    {isAdmin && assignments.some(a => a.status === 'unclaimed') && (
                        <button
                            onClick={async () => {
                                if (!(await useAppStore.getState().confirm("This will randomly assign all remaining unclaimed parts to members of this group. Are you sure?"))) return;
                                try {
                                    await saukaService.autoAssignRemaining(id);
                                    loadData();
                                } catch (e) { alert("Failed to auto-assign: " + e.message); }
                            }}
                            className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider bg-[var(--h-teal)]/10 text-[var(--h-teal)] hover:bg-[var(--h-teal)] hover:text-white px-3 py-1.5 rounded-full transition-all"
                        >
                            <Users size={14} /> Auto-Assign All
                        </button>
                    )}
                </div>
                <div className={`grid gap-3 sm:gap-4 ${isSurah ? 'grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-8 md:grid-cols-12' : isHizb ? 'grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-8 md:grid-cols-10' : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-10'}`}>
                    {assignments.map(j => {
                        const isClaimedByMe = j.claimedBy === userId;
                        const isInactive = j.status === 'in_progress' && j.claimedAt && (new Date().getTime() - new Date(j.claimedAt).getTime()) > 3 * 24 * 60 * 60 * 1000;
                        const isActiveNow = j.status === 'in_progress' && j.lastActive && (new Date().getTime() - new Date(j.lastActive).getTime()) < 15 * 60 * 1000;
                        return (
                            <motion.button
                                key={j.$id}
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setSelectedJuz(j); setIsActionModalOpen(true); }}
                                className={`relative flex aspect-square flex-col items-center justify-center p-2 rounded-[18px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border transition-all duration-300 ${j.status === 'completed'
                                    ? 'bg-gradient-to-br from-[var(--h-green)] to-[#14b8a6] text-white border-transparent shadow-[0_8px_16px_rgba(16,185,129,0.2)]'
                                    : j.status === 'in_progress'
                                        ? isClaimedByMe ? 'bg-gradient-to-br from-[var(--h-gold)] to-[#d97706] text-white border-transparent shadow-[0_8px_16px_rgba(184,146,74,0.2)]' : 'bg-[var(--h-white)]/80 text-gray-400 border-gray-200 opacity-60 grayscale-[50%]'
                                        : 'bg-[var(--h-white)] text-[var(--h-ink-mid)] border-[var(--h-white)]/50 hover:border-[var(--h-teal)] hover:shadow-md'
                                    }`}
                            >
                                {isActiveNow && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" title="Reading right now!" />}
                                {!isActiveNow && isInactive && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" title="Inactive for over 3 days" />}
                                <span className={`text-2xl font-bold font-ui ${j.status === 'completed' || (j.status === 'in_progress' && isClaimedByMe) ? 'text-white' : ''}`}>{j.partNumber}</span>
                                
                                {/* Tiny Progress Bar & Percentage */}
                                {j.status === 'in_progress' && typeof j.progress === 'number' && j.progress > 0 && (
                                    <>
                                        <div className="absolute top-1.5 right-1.5 text-[0.55rem] font-mono font-bold opacity-70">
                                            {j.progress}%
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black/10 rounded-b-[18px] overflow-hidden">
                                            <div className="h-full bg-[var(--h-white)]/60 transition-all duration-500" style={{ width: `${j.progress}%` }} />
                                        </div>
                                    </>
                                )}

                                {isClaimedByMe && j.status === 'in_progress' && !(j.progress > 0) && (
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
                <div className="mt-8 mb-6 rounded-[24px] border border-[var(--h-bone-dark)] bg-[var(--h-cream)] shadow-inner relative flex flex-col h-[500px] overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--h-bone-dark) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    
                    <div className="px-6 pt-5 pb-2 shrink-0 bg-[var(--h-cream)]/50 backdrop-blur-md border-b border-[var(--h-bone-dark)] relative z-10 flex items-center justify-between">
                        <h2 className="font-[var(--font-ui)] text-[1.1rem] font-bold text-[var(--h-ink)]">Group Chat</h2>
                        <div className="text-[0.7rem] font-mono text-[var(--h-teal)] font-bold px-2 py-1 bg-[var(--h-teal)]/10 rounded-lg">{comments.length} Messages</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar relative z-10 flex flex-col-reverse">
                        <div ref={chatEndRef} className="h-1 shrink-0" />
                        {comments.length === 0 ? (
                            <div className="text-center py-10 my-auto">
                                <MessageSquare size={32} className="mx-auto text-[var(--h-bone-dark)] mb-3" />
                                <p className="text-[0.95rem] text-[var(--h-ink-muted)]">No messages yet. Say salam!</p>
                            </div>
                        ) : (
                            comments.map(c => {
                                const isMe = c.userId === userId;
                                return (
                                    <div key={c.$id} className={`flex flex-col relative group/comment ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                                        <div className={`relative px-3.5 py-2.5 shadow-sm min-w-[100px] ${isMe ? 'bg-[var(--h-teal)] text-white rounded-[16px] rounded-tr-[4px]' : 'bg-[var(--h-white)] border border-[var(--h-bone-dark)] text-[var(--h-ink-mid)] rounded-[16px] rounded-tl-[4px]'}`}>
                                            
                                            {!isMe && (
                                                <div className="text-[0.75rem] font-bold text-[var(--h-teal)] mb-0.5 leading-tight">{c.userName}</div>
                                            )}
                                            
                                            <p className={`text-[0.95rem] leading-snug whitespace-pre-wrap pb-3 ${isMe ? 'text-white/95' : 'text-[var(--h-ink)]'}`}>
                                                {c.text}
                                            </p>
                                            
                                            {c.audioUrl && (
                                                <div className="mt-1 mb-4">
                                                    <audio controls src={c.audioUrl} className={`h-11 w-full min-w-[220px] sm:min-w-[260px] rounded-full ${isMe ? 'opacity-90' : 'opacity-80'}`} />
                                                </div>
                                            )}
                                            
                                            <div className={`absolute bottom-1.5 right-2.5 flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wider ${isMe ? 'text-white/70' : 'text-[var(--h-ink-muted)]'}`}>
                                                {new Date(c.$createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {isMe && (
                                                    c.isTemp ? <Clock size={12} className="opacity-70" /> : <CheckCheck size={14} className={isMe ? 'text-white' : 'text-[var(--h-gold)]'} />
                                                )}
                                            </div>
                                        </div>
                                        
                                        {(isMe || isAdmin) && (
                                            <button onClick={() => handleDeleteComment(c.$id)} className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-10' : '-right-10'} text-red-500 opacity-0 transition-all hover:scale-110 group-hover/comment:opacity-100 p-2 bg-[var(--h-white)] rounded-full shadow-sm`}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="shrink-0 px-4 py-3 bg-[var(--h-cream)]/80 backdrop-blur-md border-t border-[var(--h-bone-dark)] relative z-10">
                        {isRecording ? (
                            <div className="flex items-center gap-3 p-3 rounded-[20px] border border-red-500/20 bg-red-500/10 shadow-inner">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse ml-2" />
                                <span className="text-red-500 font-mono font-bold w-12 text-sm">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                                <span className="flex-1 text-[0.85rem] font-bold text-red-500 uppercase tracking-widest text-center truncate">Recording...</span>
                                <button onClick={cancelRecording} className="p-2 text-red-500 hover:text-red-700 transition-colors bg-[var(--h-white)] rounded-full shadow-sm"><X size={18} strokeWidth={3} /></button>
                                <button onClick={stopRecordingAndSend} className="p-2 text-white bg-[var(--h-teal)] hover:bg-[var(--h-teal-mid)] transition-colors rounded-full shadow-md"><Check size={18} strokeWidth={3} /></button>
                            </div>
                        ) : (
                            <form onSubmit={handleAddComment} className="flex gap-2 relative">
                                <button type="button" onClick={startRecording} className="rounded-full w-[46px] h-[46px] border border-[var(--h-bone-dark)] bg-[var(--h-white)] text-[var(--h-ink-mid)] hover:text-[var(--h-teal)] hover:border-[var(--h-teal)] transition-all flex items-center justify-center shrink-0 shadow-sm">
                                    <Mic size={20} />
                                </button>
                                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type a message..." className="flex-1 min-w-0 rounded-[24px] border border-[var(--h-bone-dark)] bg-[var(--h-white)] px-5 py-3 text-[0.95rem] text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)] focus:ring-2 focus:ring-[var(--h-teal)]/20 transition-all shadow-inner" />
                                <button type="submit" disabled={isActionLoading || !newComment.trim()} className="rounded-full w-[46px] h-[46px] bg-[var(--h-teal)] text-white transition-all hover:bg-[var(--h-teal-mid)] hover:shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shrink-0 shadow-sm">
                                    <ArrowRight size={20} strokeWidth={2.5} />
                                </button>
                            </form>
                        )}
                    </div>
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
                                            {selectedJuz.status === 'in_progress' && typeof selectedJuz.progress === 'number' && selectedJuz.progress > 0 && (
                                                <div className="w-full max-w-[120px] mt-1.5 mb-1.5">
                                                    <div className="flex justify-between text-[0.65rem] font-bold text-[var(--h-ink-muted)] mb-1">
                                                        <span>Progress</span>
                                                        <span>{selectedJuz.progress}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-[var(--h-bone-dark)]/30 rounded-full overflow-hidden">
                                                        <div className="h-full bg-[var(--h-gold)] rounded-full transition-all duration-500" style={{ width: `${selectedJuz.progress}%` }} />
                                                    </div>
                                                </div>
                                            )}
                                            <p className="text-[0.85rem] text-[var(--h-ink-mid)] italic mt-1">by {selectedJuz.claimedByName || 'Someone'}</p>
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
                                                        <button onClick={() => handleComplete(selectedJuz.$id)} disabled={isActionLoading} className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[var(--h-white)] border border-[var(--h-bone-dark)] py-2.5 text-[0.95rem] font-medium text-[var(--h-ink)] hover:bg-[var(--h-cream)] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm">
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
