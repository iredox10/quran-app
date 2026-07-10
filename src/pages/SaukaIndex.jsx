import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { saukaService } from '../services/saukaService';
import { authService } from '../services/appwrite';
import { useAppStore } from '../store/useAppStore';
import { Users, Plus, Hash, ArrowRight, Loader2, Calendar, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function SaukaIndex() {
    const { setNavHeaderTitle } = useAppStore();
    const navigate = useNavigate();

    const [groups, setGroups] = useState({ created: [], joined: [], userId: null });
    const [publicGroups, setPublicGroups] = useState([]);
    const [activeTab, setActiveTab] = useState('my_groups'); // 'my_groups' or 'public'
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createTitle, setCreateTitle] = useState('');
    const [createIntention, setCreateIntention] = useState('');
    const [createDivisionType, setCreateDivisionType] = useState('juz');
    const [createDeadline, setCreateDeadline] = useState('');
    const [createIsPublic, setCreateIsPublic] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Join Modal
    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Auth Modal
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [authError, setAuthError] = useState('');
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    useEffect(() => {
        setNavHeaderTitle('Group Khatmah');
        loadGroups();
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const loadGroups = async () => {
        try {
            setIsLoading(true);
            setError('');
            const [data, publicData] = await Promise.all([
                saukaService.getMyGroups(),
                saukaService.getPublicGroups()
            ]);
            if (!data.userId) {
                throw new Error("User not authenticated.");
            }
            setGroups(data);
            setPublicGroups(publicData);
        } catch (e) {
            console.error(e);
            setError('Please sign in from the Profile page to use Group Khatmah.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!createTitle.trim()) return;
        setIsCreating(true);
        try {
            const group = await saukaService.createGroup(createTitle.trim(), createDivisionType, createDeadline, createIntention.trim(), createIsPublic);
            setIsCreateOpen(false);
            setCreateTitle('');
            setCreateIntention('');
            setCreateDeadline('');
            setCreateIsPublic(false);
            navigate(`/sauka/${group.$id}`);
        } catch (e) {
            console.error(e);
            alert(`Failed to create group: ${e.message || 'Check your connection'}`);
            setIsCreating(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setIsJoining(true);
        try {
            const group = await saukaService.findByCode(joinCode.trim());
            if (group) {
                setIsJoinOpen(false);
                setJoinCode('');
                navigate(`/sauka/${group.$id}`);
            } else {
                alert('Invalid join code.');
                setIsJoining(false);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to join group.');
            setIsJoining(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault(); 
        setIsAuthLoading(true); 
        setAuthError('');
        try {
            if (authMode === 'register') { 
                await authService.register(email, password, name); 
                await authService.login(email, password); 
            } else { 
                await authService.login(email, password); 
            }
            setShowAuthModal(false);
            setEmail(''); setPassword(''); setName('');
            loadGroups(); // reload the groups after successful login
        } catch (err) { 
            setAuthError(err.message || 'Authentication failed'); 
        } finally { 
            setIsAuthLoading(false); 
        }
    };

    const allGroups = [...groups.created, ...groups.joined].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

    return (
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 pb-24 pt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* ── Header ── */}
                <button 
                    onClick={() => navigate('/profile')} 
                    className="mb-6 flex w-fit items-center gap-2 rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-2 text-sm font-semibold text-[var(--h-ink-mid)] transition-colors hover:bg-white hover:text-[var(--h-ink)]"
                >
                    <ArrowLeft size={16} /> Back to Profile
                </button>
                <div className="mb-10 text-center relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[var(--h-teal)] opacity-10 blur-[50px] rounded-full pointer-events-none" />
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[var(--h-teal)] to-[var(--h-teal-mid)] text-white shadow-lg shadow-[var(--h-teal-soft)] relative z-10">
                        <Users size={36} strokeWidth={2.5} />
                    </div>
                    <h1 className="font-[var(--font-ui)] text-4xl font-extrabold text-[var(--h-ink)] tracking-tight relative z-10">Sauka</h1>
                    <p className="mt-3 text-[1.05rem] text-[var(--h-ink-mid)] font-medium max-w-sm mx-auto relative z-10">Connect, read, and complete the Noble Quran together.</p>
                </div>

                {error ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-8 text-center text-[var(--h-ink)] shadow-sm">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--h-teal)]/10 text-[var(--h-teal)]">
                            <Users size={32} />
                        </div>
                        <h2 className="mb-2 font-[var(--font-ui)] text-2xl font-bold text-[var(--h-ink)]">Join the Community</h2>
                        <p className="mb-6 text-sm text-[var(--h-ink-mid)]">Please sign in or create an account to start reading the Quran together with friends and family.</p>
                        <button onClick={() => setShowAuthModal(true)} className="inline-block w-full rounded-xl bg-[var(--h-teal)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--h-teal-mid)] active:scale-95">
                            Sign In / Sign Up
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ── Actions ── */}
                        <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={() => setIsCreateOpen(true)} className="group flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--h-teal)] to-[var(--h-teal-mid)] p-6 text-left shadow-lg shadow-[var(--h-teal-soft)] transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--h-teal-soft)] relative active:scale-95 border-none cursor-pointer">
                                <div className="relative z-10">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
                                        <Plus size={20} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="font-bold text-white text-lg mb-1">Create Group</h3>
                                    <p className="text-white/80 text-sm font-medium">Start a new Khatmah</p>
                                </div>
                                <div className="absolute -right-6 -bottom-6 opacity-10 text-white group-hover:scale-110 transition-transform duration-500">
                                    <Users size={120} />
                                </div>
                            </button>
                            
                            <button onClick={() => setIsJoinOpen(true)} className="group flex items-center justify-between overflow-hidden rounded-2xl border border-[var(--h-bone-dark)] bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--h-teal)] hover:shadow-md relative active:scale-95 cursor-pointer">
                                <div className="relative z-10">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--h-teal-soft)] text-[var(--h-teal)]">
                                        <Hash size={20} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="font-bold text-[var(--h-ink)] text-lg mb-1">Join via Code</h3>
                                    <p className="text-[var(--h-ink-mid)] text-sm font-medium">Enter an invite code</p>
                                </div>
                                <div className="absolute -right-6 -bottom-6 opacity-5 text-[var(--h-ink)] group-hover:scale-110 transition-transform duration-500">
                                    <Hash size={120} />
                                </div>
                            </button>
                        </div>

                        {/* ── Tabs ── */}
                        <div className="mb-6 flex items-center gap-2 border-b border-[var(--h-bone-dark)] pb-2">
                            <button
                                onClick={() => setActiveTab('my_groups')}
                                className={`px-4 py-2 text-sm font-bold transition-all rounded-t-xl ${activeTab === 'my_groups' ? 'bg-[var(--h-teal)] text-white' : 'text-[var(--h-ink-mid)] hover:bg-[var(--h-cream)]'}`}
                            >
                                My Groups
                            </button>
                            <button
                                onClick={() => setActiveTab('public')}
                                className={`px-4 py-2 text-sm font-bold transition-all rounded-t-xl ${activeTab === 'public' ? 'bg-[var(--h-teal)] text-white' : 'text-[var(--h-ink-mid)] hover:bg-[var(--h-cream)]'}`}
                            >
                                Explore Public
                            </button>
                        </div>

                        {/* ── List ── */}
                        <div className="mb-6">
                            {isLoading ? (
                                <div className="flex h-32 items-center justify-center text-[var(--h-gold)]"><Loader2 className="animate-spin" size={24} /></div>
                            ) : activeTab === 'my_groups' && allGroups.length === 0 ? (
                                <div className="rounded-2xl border border-[var(--h-bone-dark)] border-dashed py-12 text-center text-sm text-[var(--h-ink-muted)]">
                                    You haven't joined any groups yet.
                                </div>
                            ) : activeTab === 'public' && publicGroups.length === 0 ? (
                                <div className="rounded-2xl border border-[var(--h-bone-dark)] border-dashed py-12 text-center text-sm text-[var(--h-ink-muted)]">
                                    No public groups available at the moment.
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {(activeTab === 'my_groups' ? allGroups : publicGroups).map(g => (
                                        <Link key={g.$id} to={`/sauka/${g.$id}`} className="group block rounded-[20px] border border-[var(--h-bone-dark)] bg-white p-5 no-underline shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--h-teal)] hover:shadow-md">
                                            <div className="mb-4 flex items-start justify-between">
                                                <div className="pr-2">
                                                    <h3 className="font-[var(--font-ui)] text-[1.3rem] font-bold text-[var(--h-ink)] leading-tight mb-1">{g.title}</h3>
                                                    <p className="text-[0.8rem] text-[var(--h-ink-muted)] font-medium">by {g.createdByName}</p>
                                                </div>
                                                {g.status === 'completed' ? (
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--h-green)]/10 text-[var(--h-green)]">
                                                        <CheckCircle2 size={18} strokeWidth={2.5} />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--h-gold)]/10 text-[var(--h-gold)]">
                                                        <Loader2 size={16} className="animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-[0.75rem] font-bold tracking-wide">
                                                <div className="flex items-center gap-1.5 rounded-full bg-[var(--h-teal-soft)] px-3 py-1.5 text-[var(--h-teal)]">
                                                    <Hash size={12} strokeWidth={3} /> <span className="font-[var(--font-mono)]">{g.joinCode}</span>
                                                </div>
                                                {g.deadline && (
                                                    <div className="flex items-center gap-1.5 rounded-full bg-[var(--h-bone)] px-3 py-1.5 text-[var(--h-ink-mid)]">
                                                        <Calendar size={12} strokeWidth={2.5} /> {new Date(g.deadline).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </motion.div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isCreating && setIsCreateOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm rounded-3xl bg-[var(--color-paper)] p-6 shadow-xl">
                            <h2 className="mb-2 font-[var(--font-ui)] text-2xl font-bold text-[var(--h-ink)]">Create Sauka</h2>
                            <p className="mb-6 text-sm text-[var(--h-ink-muted)]">Invite others to complete a Khatmah together.</p>
                            <form onSubmit={handleCreate}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-[var(--h-ink-mid)]">Title</label>
                                        <input type="text" value={createTitle} onChange={e => setCreateTitle(e.target.value)} required placeholder="e.g. Ramadan Family Khatmah" className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-3 text-sm text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)]" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-[var(--h-ink-mid)]">Dedication / Intention (Optional)</label>
                                        <input type="text" value={createIntention} onChange={e => setCreateIntention(e.target.value)} placeholder="e.g. For the healing of our grandfather" className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-3 text-sm text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)]" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-[var(--h-ink-mid)]">Divide Quran By</label>
                                        <select value={createDivisionType} onChange={e => setCreateDivisionType(e.target.value)} className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-3 text-sm text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)] appearance-none cursor-pointer">
                                            <option value="juz">30 Parts (Juz / Para)</option>
                                            <option value="hizb">60 Parts (Hizb)</option>
                                            <option value="surah">114 Parts (Surahs / Chapters)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-[var(--h-ink-mid)]">Target Date (Optional)</label>
                                        <input type="date" value={createDeadline} onChange={e => setCreateDeadline(e.target.value)} className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-3 text-sm text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)]" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="isPublic" checked={createIsPublic} onChange={e => setCreateIsPublic(e.target.checked)} className="w-5 h-5 rounded border-[var(--h-bone-dark)] text-[var(--h-teal)] focus:ring-[var(--h-teal)]" />
                                        <label htmlFor="isPublic" className="text-sm font-semibold text-[var(--h-ink-mid)] select-none cursor-pointer">
                                            Make this group public <span className="block text-xs font-normal text-[var(--h-ink-muted)] mt-0.5">Anyone can find and join this group</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-8 flex gap-3">
                                    <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 rounded-xl bg-[var(--h-bone)] py-3 text-sm font-bold text-[var(--h-ink-mid)] hover:bg-[var(--h-bone-dark)]">Cancel</button>
                                    <button type="submit" disabled={isCreating} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--h-teal)] py-3 text-sm font-bold text-white hover:bg-[var(--h-teal-mid)] disabled:opacity-50">
                                        {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isJoinOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isJoining && setIsJoinOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm rounded-3xl bg-[var(--color-paper)] p-6 shadow-xl">
                            <h2 className="mb-2 font-[var(--font-ui)] text-2xl font-bold text-[var(--h-ink)]">Join Sauka</h2>
                            <p className="mb-6 text-sm text-[var(--h-ink-muted)]">Enter the 6-character invite code.</p>
                            <form onSubmit={handleJoin}>
                                <div>
                                    <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} required maxLength={6} placeholder="Enter Code" className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-4 py-4 text-center font-[var(--font-mono)] text-2xl tracking-[0.2em] text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)] uppercase" />
                                </div>
                                <div className="mt-8 flex gap-3">
                                    <button type="button" onClick={() => setIsJoinOpen(false)} className="flex-1 rounded-xl bg-[var(--h-bone)] py-3 text-sm font-bold text-[var(--h-ink-mid)] hover:bg-[var(--h-bone-dark)]">Cancel</button>
                                    <button type="submit" disabled={isJoining || joinCode.length < 6} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--h-teal)] py-3 text-sm font-bold text-white hover:bg-[var(--h-teal-mid)] disabled:opacity-50">
                                        {isJoining ? <Loader2 size={16} className="animate-spin" /> : <>Join <ArrowRight size={16} /></>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showAuthModal && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isAuthLoading && setShowAuthModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm rounded-3xl bg-[var(--h-cream)] p-6 shadow-xl border border-[var(--h-bone-dark)]">
                            <h2 className="mb-2 font-[var(--font-ui)] text-2xl font-bold text-[var(--h-ink)]">
                                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="mb-6 text-sm text-[var(--h-ink-muted)]">
                                {authMode === 'login' ? 'Sign in to access your Khatmah groups.' : 'Join the community to start reading.'}
                            </p>
                            
                            <form onSubmit={handleAuth} className="space-y-4">
                                {authError && <div className="rounded-[12px] bg-red-500/10 px-4 py-3 text-[0.8rem] font-bold text-red-500 border border-red-500/20">{authError}</div>}
                                
                                {authMode === 'register' && (
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-[var(--h-ink-mid)]">Your Name</label>
                                        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Ahmad" className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-white px-4 py-3 text-sm text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)]" />
                                    </div>
                                )}
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-[var(--h-ink-mid)]">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-white px-4 py-3 text-sm text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)]" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-[var(--h-ink-mid)]">Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" className="w-full rounded-xl border border-[var(--h-bone-dark)] bg-white px-4 py-3 text-sm text-[var(--h-ink)] outline-none focus:border-[var(--h-teal)]" />
                                </div>
                                
                                <button type="submit" disabled={isAuthLoading} className="mt-2 w-full flex justify-center items-center rounded-xl bg-[var(--h-teal)] py-3.5 text-sm font-bold text-white hover:bg-[var(--h-teal)]/90 disabled:opacity-50">
                                    {isAuthLoading ? <Loader2 size={18} className="animate-spin" /> : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
                                </button>

                                <div className="text-center mt-4">
                                    <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-sm font-bold text-[var(--h-ink-muted)] hover:text-[var(--h-ink)] transition-colors">
                                        {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
