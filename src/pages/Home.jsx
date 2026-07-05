import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../services/api/quranApi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Search, Bookmark, DownloadCloud, X, Hash, Layers3, LibraryBig, Rows3, ArrowRight, Flame, Clock, BarChart3, Sparkles, Share2, Copy, Check, CalendarDays, Brain } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { HIZB_STARTS, JUZ_STARTS, PAGE_GROUPS } from '../data/quranNavigation';
import PageTourModal from '../components/ui/PageTourModal';
import Coachmark from '../components/ui/Coachmark';
import OnboardingProgress from '../components/ui/OnboardingProgress';
import ShareModal from '../components/ui/ShareModal';

const homeTourSteps = [
    { title: "Welcome to Quran Nur", description: "This is your personal companion for reading, memorizing, and studying the Quran.", icon: Sparkles },
    { title: "Daily Progress", target: "#daily-progress", description: "Track your reading streak, daily minutes, and total hours right from the dashboard.", icon: Flame },
    { title: "Verse of the Day", target: "#verse-of-the-day", description: "Start your day with a selected Ayah. You can copy or share it easily.", icon: BookOpen },
    { title: "Resume Reading", target: "#resume-reading", description: "Pick up exactly where you left off last time.", icon: ArrowRight },
    { title: "Browse the Quran", target: "#browse-quran", description: "Navigate quickly to any Surah, Juz, or Page.", icon: Search },
    { title: "Set a Reading Goal 📅", description: "Head to the Planner tab to create a personalized Khatm plan with daily assignments.", icon: CalendarDays, link: '/planner' },
    { title: "Start Memorizing 🧠", description: "Use the Memorize tab to practice Hifdh with spaced repetition and word-by-word reveal.", icon: Brain, link: '/memorize/1' }
];

const homeAdvancedTourSteps = [
    { title: "Swipe Between Surahs", description: "While reading, try swiping left or right to quickly jump between Surahs.", icon: ArrowRight },
    { title: "Create a Habit", description: "Consistency is key. Use the Planner to build a daily reading habit.", icon: CalendarDays, link: '/planner' }
];

// ─── Curated Verses of the Day ───
const DAILY_VERSES = [
    { arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', translation: '"In the name of Allah, the Most Gracious, the Most Merciful."', ref: 'Al-Fatiha 1:1' },
    { arabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', translation: '"Guide us to the straight path."', ref: 'Al-Fatiha 1:6' },
    { arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', translation: '"Indeed, with hardship comes ease."', ref: 'Ash-Sharh 94:6' },
    { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', translation: '"And your Lord is going to give you, and you will be satisfied."', ref: 'Ad-Duha 93:5' },
    { arabic: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', translation: '"So remember Me; I will remember you."', ref: 'Al-Baqarah 2:152' },
    { arabic: 'وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥ', translation: '"Whoever puts their trust in Allah, He is sufficient for them."', ref: 'At-Talaq 65:3' },
    { arabic: 'رَبِّ ٱشْرَحْ لِى صَدْرِى', translation: '"My Lord, expand for me my chest."', ref: 'Ta-Ha 20:25' },
    { arabic: 'وَقُل رَّبِّ زِدْنِى عِلْمًا', translation: '"And say: My Lord, increase me in knowledge."', ref: 'Ta-Ha 20:114' },
    { arabic: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ', translation: '"Indeed, Allah is with the patient."', ref: 'Al-Baqarah 2:153' },
    { arabic: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ ٱلْوَرِيدِ', translation: '"And We are closer to him than his jugular vein."', ref: 'Qaf 50:16' },
    { arabic: 'فَإِنَّ ذِكْرَىٰ تَنفَعُ ٱلْمُؤْمِنِينَ', translation: '"And remind, for indeed, the reminder benefits the believers."', ref: 'Adh-Dhariyat 51:55' },
    { arabic: 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا', translation: '"Allah does not burden a soul beyond that it can bear."', ref: 'Al-Baqarah 2:286' },
];

const BROWSE_MODES = [
    { id: 'surah', label: 'Surah', icon: BookOpen },
    { id: 'page', label: 'Page', icon: Rows3 },
    { id: 'juz', label: 'Juz', icon: LibraryBig },
    { id: 'hizb', label: 'Hizb', icon: Layers3 },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getBrowseItems(mode, chapters) {
    if (mode === 'page') {
        return PAGE_GROUPS.map((item) => ({
            key: `page-${item.id}`, title: `Page ${item.pageNumber}`,
            subtitle: 'Mushaf page view', meta: `Page ${String(item.pageNumber).padStart(3, '0')}`,
            to: `/page/${item.pageNumber}`, arabic: null, prefix: null,
        }));
    }
    if (mode === 'juz') {
        return JUZ_STARTS.map((item) => ({
            key: `juz-${item.id}`, title: `Juz ${item.id}`,
            subtitle: `Starts at ${item.verseKey}`, meta: `Page ${item.pageNumber}`,
            to: `/page/${item.pageNumber}`, arabic: `الجزء ${item.id}`, prefix: item.id,
        }));
    }
    if (mode === 'hizb') {
        return HIZB_STARTS.map((item) => ({
            key: `hizb-${item.id}`, title: `Hizb ${item.id}`,
            subtitle: `Starts at ${item.verseKey}`, meta: `Page ${item.pageNumber}`,
            to: `/page/${item.pageNumber}`, arabic: `حزب ${item.id}`, prefix: item.id,
        }));
    }
    return (chapters || []).map((chapter) => ({
        key: `surah-${chapter.id}`, title: chapter.name_simple,
        subtitle: chapter.translated_name.name, meta: `${chapter.verses_count} Ayahs`,
        to: `/surah/${chapter.id}`, arabic: chapter.name_arabic, prefix: chapter.id,
    }));
}

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return { salam: 'Assalamu Alaikum', sub: 'May your morning be blessed' };
    if (h >= 12 && h < 17) return { salam: 'Assalamu Alaikum', sub: 'Wishing you a productive afternoon' };
    if (h >= 17 && h < 21) return { salam: 'Assalamu Alaikum', sub: 'May your evening be peaceful' };
    return { salam: 'Assalamu Alaikum', sub: 'May your night be filled with barakah' };
}

function getDailyVerse() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

function formatDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function Home() {
    const { recentlyRead, bookmark, readingSessions, incrementPageVisit } = useAppStore();
    
    useEffect(() => {
        incrementPageVisit('home');
    }, [incrementPageVisit]);
    
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [browseMode, setBrowseMode] = useState('surah');
    const [copied, setCopied] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareModalType, setShareModalType] = useState('verse');

    useEffect(() => {
        if (!location.state?.scrollToTop) return;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    // PWA install
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        const dismissed = localStorage.getItem('hideInstallCard');
        if (!isStandalone && !dismissed) setIsInstallable(true);
        const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setIsInstallable(true); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const dismissInstall = (e) => { e.stopPropagation(); localStorage.setItem('hideInstallCard', 'true'); setIsInstallable(false); };
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') { setDeferredPrompt(null); setIsInstallable(false); }
        } else {
            const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            alert(isIos ? "Tap Share → 'Add to Home Screen'." : "Look for 'Install App' in your browser menu.");
        }
    };

    const { data: chapters, isLoading, error } = useQuery({ queryKey: ['chapters'], queryFn: getChapters });
    const browseItems = useMemo(() => getBrowseItems(browseMode, chapters), [browseMode, chapters]);
    const filteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return browseItems;
        return browseItems.filter(item => [item.title, item.subtitle, item.meta, item.arabic].filter(Boolean).some(v => v.toLowerCase().includes(q)));
    }, [browseItems, searchQuery]);

    // Computed stats
    const today = new Date().toISOString().split('T')[0];
    const sessions = readingSessions || [];

    const todayMinutes = useMemo(() => {
        return Math.round(sessions.filter(s => s.date === today).reduce((sum, s) => sum + (s.duration || 0), 0) / 60);
    }, [sessions, today]);

    const totalHours = useMemo(() => {
        return (sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600).toFixed(1);
    }, [sessions]);

    const streak = useMemo(() => {
        const uniqueDays = [...new Set(sessions.map(s => s.date))].sort().reverse();
        if (uniqueDays.length === 0) return 0;
        let count = 0;
        const d = new Date();
        const todayStr = d.toISOString().split('T')[0];
        if (uniqueDays[0] !== todayStr) {
            d.setDate(d.getDate() - 1);
            if (uniqueDays[0] !== d.toISOString().split('T')[0]) return 0;
        }
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - i);
            const ds = checkDate.toISOString().split('T')[0];
            if (uniqueDays.includes(ds)) count++;
            else if (i > 0) break;
        }
        return count;
    }, [sessions]);

    // Weekly heatmap
    const weekData = useMemo(() => {
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const dayMins = Math.round(sessions.filter(s => s.date === ds).reduce((sum, s) => sum + (s.duration || 0), 0) / 60);
            result.push({ label: DAY_LABELS[d.getDay()], mins: dayMins, isToday: i === 0 });
        }
        return result;
    }, [sessions]);

    const weekMax = useMemo(() => Math.max(...weekData.map(d => d.mins), 1), [weekData]);

    // Greeting & verse
    const greeting = useMemo(() => getGreeting(), []);
    const verse = useMemo(() => getDailyVerse(), []);

    // Continue reading
    const lastRead = recentlyRead?.[0];

    // Time ago
    const timeAgo = useCallback((ts) => {
        if (!ts) return '';
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }, []);

    // Copy verse
    const copyVerse = useCallback(() => {
        navigator.clipboard.writeText(`${verse.arabic}\n\n${verse.translation}\n— ${verse.ref}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [verse]);

    // Share verse
    const shareVerse = useCallback(() => {
        setShareModalType('verse');
        setIsShareModalOpen(true);
    }, []);

    // Share progress
    const shareProgress = useCallback(() => {
        setShareModalType('progress');
        setIsShareModalOpen(true);
    }, []);

    // Invite friend
    const inviteFriend = useCallback(async () => {
        if (navigator.share) {
            await navigator.share({
                title: 'Join me on Quran Nur',
                text: 'I\'m using Quran Nur to build my daily reading habit. Join me!',
                url: 'https://quranapp.com'
            });
        } else {
            navigator.clipboard.writeText('I\'m using Quran Nur to build my daily reading habit. Join me! https://quranapp.com');
            alert('Invite link copied to clipboard!');
        }
    }, []);

    if (isLoading) return (
        <div className="mx-auto max-w-[1200px] px-4 pb-20">
            <div className="pt-[10vh] text-center text-[var(--h-ink-muted)]">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="mb-4 inline-block h-9 w-9 rounded-full"
                    style={{ border: '3px solid var(--h-bone-dark)', borderTopColor: 'var(--h-teal)' }} />
                <p>Loading...</p>
            </div>
        </div>
    );

    if (error) return <div className="mx-auto max-w-[1200px] px-4 pb-20"><div className="py-8 text-center text-sm italic text-[var(--h-ink-muted)]">Error fetching data. Please try again later.</div></div>;

    return (
        <div className="mx-auto max-w-[1200px] px-4 pb-20">
            <Helmet>
                <title>The Noble Qur'an — Read, Study, Learn</title>
                <meta name="description" content="A beautiful web application for reading and studying the Noble Qur'an." />
            </Helmet>

            <PageTourModal tourId="home-tour" pageId="home" steps={homeTourSteps} />
            <PageTourModal tourId="home-tour-advanced" pageId="home" visitThreshold={3} steps={homeAdvancedTourSteps} />

            <ShareModal 
                isOpen={isShareModalOpen} 
                onClose={() => setIsShareModalOpen(false)} 
                type={shareModalType} 
                data={shareModalType === 'verse' ? verse : { streak, todayMinutes, totalHours }} 
            />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                {/* Offline Banner */}
                <AnimatePresence>
                    {!isOnline && (
                        <motion.div className="mb-4 flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--h-gold)] bg-[var(--h-gold-soft)] px-4 py-[0.85rem] text-center text-sm font-semibold text-[var(--h-gold)]" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" /> Offline Mode — Using Cached Data
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Install Banner */}
                <AnimatePresence>
                    {isInstallable && (
                        <motion.div className="relative mb-6 cursor-pointer rounded-2xl bg-gradient-to-br from-[var(--h-teal)] to-[#3d8b6e] px-5 py-4 text-white transition-shadow duration-150 hover:shadow-[0_8px_24px_rgba(46,79,74,0.25)] md:px-6 md:py-5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }} onClick={handleInstallClick}>
                            <button className="absolute right-1.5 top-1.5 cursor-pointer border-none bg-transparent p-1 text-white/50" onClick={dismissInstall}><X size={14} /></button>
                            <div className="flex flex-1 items-center gap-4">
                                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white/15"><DownloadCloud size={22} /></div>
                                <div>
                                    <div className="text-base font-bold">Install App</div>
                                    <div className="mt-0.5 text-xs opacity-85">Read offline with a native feel</div>
                                </div>
                            </div>
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--h-teal)]">Install</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Greeting Hero ─── */}
                <div className="mb-6 text-center pt-6">
                    <h1 className="mb-0.5 font-ui text-[1.75rem] font-bold text-[var(--h-ink)]">{greeting.salam}</h1>
                    <p className="mb-0.5 text-[0.82rem] text-[var(--h-ink-muted)]">{greeting.sub}</p>
                    <p className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[var(--h-ink-muted)]">{formatDate()}</p>

                    {lastRead && (
                        <Link to={lastRead.verseKey ? `/surah/${lastRead.chapterId}?verse=${lastRead.verseKey}` : `/surah/${lastRead.chapterId}`}
                            className="mx-auto flex max-w-[420px] items-center gap-4 rounded-2xl bg-gradient-to-br from-[var(--h-teal)] to-[var(--h-teal-mid)] p-4 text-white no-underline transition-all duration-150 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(46,79,74,0.25)] md:p-5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><BookOpen size={22} /></div>
                            <div className="min-w-0 flex-1 text-left">
                                <div className="mb-0.5 font-ui text-base font-semibold">Continue: {lastRead.chapterName}</div>
                                <div className="font-mono text-[0.72rem] tracking-[0.02em] opacity-75">{lastRead.verseKey ? `Verse ${lastRead.verseKey.split(':')[1]}` : 'From the beginning'} · {timeAgo(lastRead.timestamp)}</div>
                            </div>
                            <ArrowRight size={18} className="shrink-0 opacity-60" />
                        </Link>
                    )}
                </div>

                {/* ─── Onboarding Progress ─── */}
                <OnboardingProgress />

                {/* ─── Stats Row ─── */}
                <section id="daily-progress" className="mb-10">
                    <div className="mb-7 flex gap-2">
                        <div className="flex-1 rounded-[14px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-3 py-[0.85rem] text-center transition-colors duration-200">
                            <div className="mb-1"><Flame size={18} color={streak > 0 ? '#ef4444' : 'var(--h-ink-muted)'} /></div>
                            <div className="font-ui text-2xl font-bold leading-[1.2] text-[var(--h-ink)]">{streak}<small className="text-[0.7rem] font-normal text-[var(--h-ink-muted)]"> days</small></div>
                            <div className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-[var(--h-ink-muted)]">Streak</div>
                        </div>
                        <div className="flex-1 rounded-[14px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-3 py-[0.85rem] text-center transition-colors duration-200">
                            <div className="mb-1"><Clock size={18} color="var(--h-teal)" /></div>
                            <div className="font-ui text-2xl font-bold leading-[1.2] text-[var(--h-ink)]">{todayMinutes}<small className="text-[0.7rem] font-normal text-[var(--h-ink-muted)]"> min</small></div>
                            <div className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-[var(--h-ink-muted)]">Today</div>
                        </div>
                        <div className="flex-1 rounded-[14px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-3 py-[0.85rem] text-center transition-colors duration-200">
                            <div className="mb-1"><BarChart3 size={18} color="var(--h-gold)" /></div>
                            <div className="font-ui text-2xl font-bold leading-[1.2] text-[var(--h-ink)]">{totalHours}<small className="text-[0.7rem] font-normal text-[var(--h-ink-muted)]"> hrs</small></div>
                            <div className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-[var(--h-ink-muted)]">Total</div>
                        </div>
                    </div>
                    <div className="flex justify-center mt-3">
                        <button 
                            onClick={shareProgress}
                            className="flex cursor-pointer items-center gap-1.5 rounded-[20px] bg-[var(--h-teal)] px-4 py-2 text-xs font-semibold text-white transition-all duration-150 hover:bg-[var(--h-teal-mid)] hover:shadow-[0_4px_12px_rgba(46,79,74,0.2)]"
                        >
                            <Share2 size={14} /> Share Progress
                        </button>
                    </div>
                </section>

                {/* ─── Verse of the Day ─── */}
                <div className="relative mb-7 overflow-hidden rounded-[18px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <span className="pointer-events-none absolute -right-2.5 -top-4 select-none text-[6rem] opacity-[0.03] text-[var(--h-gold)]" aria-hidden="true">﷽</span>
                    <div className="mb-4 flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--h-gold)]"><Sparkles size={14} /> Verse of the Day</div>
                    <div className="quran-text mb-4 text-center text-[1.6rem] leading-[2.2] text-[var(--h-ink)]">
                        {verse.arabic}
                    </div>
                    <div className="mb-4 text-center text-[0.9rem] italic leading-[1.6] text-[var(--h-ink-mid)]">{verse.translation}</div>
                    <div className="mb-4 text-center font-mono text-[0.7rem] text-[var(--h-ink-muted)]">— {verse.ref}</div>
                    <div className="flex justify-center gap-2">
                        <Coachmark id="home-copy-verse" label="Share the Ayah">
                            <button className={`flex cursor-pointer items-center gap-1.5 rounded-[20px] border-[1.5px] border-[var(--h-bone-dark)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--h-ink-mid)] transition-all duration-150 hover:border-[var(--h-teal)] hover:bg-[var(--h-teal-soft)] hover:text-[var(--h-teal)] ${copied ? 'border-[var(--h-green)] bg-[var(--h-green-soft)] text-[var(--h-green)]' : ''}`} onClick={copyVerse}>
                                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                            </button>
                        </Coachmark>
                        <button className="flex cursor-pointer items-center gap-1.5 rounded-[20px] border-[1.5px] border-[var(--h-bone-dark)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--h-ink-mid)] transition-all duration-150 hover:border-[var(--h-teal)] hover:bg-[var(--h-teal-soft)] hover:text-[var(--h-teal)]" onClick={shareVerse}><Share2 size={14} /> Share</button>
                    </div>
                </div>

                {/* ─── Weekly Heatmap ─── */}
                <div className="mb-7 rounded-2xl border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-1.5 font-ui text-lg font-semibold text-[var(--h-ink)]"><BarChart3 size={16} /> This Week</h2>
                    </div>
                    <div className="mt-3 flex justify-between gap-1">
                        {weekData.map((day, i) => {
                            const pct = Math.round((day.mins / weekMax) * 100);
                            let level = 'low';
                            if (pct > 20) level = 'med';
                            if (pct > 50) level = 'high';
                            if (pct > 80) level = 'max';
                            const fillClasses = {
                                low: 'bg-[var(--h-bone-dark)]',
                                med: 'border border-[rgba(46,79,74,0.15)] bg-[var(--h-teal-soft)]',
                                high: 'bg-[var(--h-teal)]',
                                max: 'bg-[var(--h-green)]',
                            };
                            return (
                                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                                    <span className={`font-mono text-[0.58rem] uppercase tracking-[0.05em] ${day.isToday ? 'font-bold text-[var(--h-teal)]' : 'text-[var(--h-ink-muted)]'}`}>{day.label}</span>
                                    <div className="flex h-8 w-full flex-col-reverse overflow-hidden rounded-md bg-[var(--h-bone)]">
                                        <div className={`w-full rounded-md transition-all duration-[0.4s] ${day.mins > 0 ? fillClasses[level] : ''}`}
                                            style={{ height: day.mins > 0 ? `${Math.max(15, pct)}%` : '0%' }} />
                                    </div>
                                    <span className={`mt-0.5 font-mono text-[0.58rem] ${day.isToday ? 'font-bold text-[var(--h-teal)]' : 'text-[var(--h-ink-muted)]'}`}>{day.mins}m</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Invite Friends ─── */}
                <div className="mb-7 rounded-2xl bg-gradient-to-r from-[var(--h-teal)] to-[var(--h-teal-mid)] p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--h-gold)] opacity-10 rounded-full -ml-8 -mb-8 blur-lg"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-ui text-xl font-bold mb-1 flex items-center gap-2">
                                <Sparkles size={18} className="text-[var(--h-gold)]" /> Invite Friends
                            </h3>
                            <p className="text-sm opacity-90 max-w-sm font-body leading-relaxed">
                                Inspire others to build a daily Quran habit. Share the app and grow together!
                            </p>
                        </div>
                        <button 
                            onClick={inviteFriend}
                            className="flex shrink-0 w-full md:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl bg-white text-[var(--h-teal)] px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-[var(--h-cream)] shadow-md"
                        >
                            <Share2 size={16} /> Send Invite
                        </button>
                    </div>
                </div>

                {/* ─── Bookmark ─── */}
                {bookmark && (
                    <Link to={`/surah/${bookmark.chapterId || bookmark.verseKey.split(':')[0]}?verse=${bookmark.verseKey}`}
                        className="mb-7 flex items-center gap-4 rounded-[14px] border-[1.5px] border-[var(--h-gold)] bg-[var(--h-gold-soft)] p-4 no-underline text-inherit transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(184,146,74,0.15)] md:p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(184,146,74,0.12)]"><Bookmark size={20} color="var(--h-gold)" /></div>
                        <div className="flex-1">
                            <div className="font-ui text-base font-semibold text-[var(--h-gold)]">{bookmark.surahName}</div>
                            <div className="mt-0.5 text-[0.72rem] text-[var(--h-ink-muted)]">Verse {bookmark.verseKey.split(':')[1]} · Resume reading</div>
                        </div>
                        <ArrowRight size={16} color="var(--h-gold)" />
                    </Link>
                )}

                {/* ─── Recently Read ─── */}
                {recentlyRead?.length > 0 && (
                    <section id="resume-reading" className="mb-12">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-1.5 font-ui text-lg font-semibold text-[var(--h-ink)]"><BookOpen size={16} /> Recently Read</h2>
                        </div>
                        <div className="mb-7 flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {recentlyRead.slice(0, 6).map((item) => (
                                    <Link key={item.chapterId} to={item.verseKey ? `/surah/${item.chapterId}?verse=${item.verseKey}` : `/surah/${item.chapterId}`}
                                        className="flex min-w-[155px] max-w-[180px] shrink-0 flex-col gap-1 rounded-[14px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-4 no-underline text-inherit transition-all duration-150 hover:-translate-y-px hover:border-[var(--h-teal)] hover:shadow-[0_4px_14px_rgba(46,79,74,0.08)]">
                                    <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--h-teal-soft)] font-mono text-[0.72rem] font-bold text-[var(--h-teal)]">{item.chapterId}</div>
                                    <div className="font-ui text-[0.95rem] font-semibold text-[var(--h-ink)]">{item.chapterName}</div>
                                    {item.verseKey && <div className="text-[0.68rem] text-[var(--h-ink-muted)]">Verse {item.verseKey.split(':')[1]}</div>}
                                    <div className="text-[0.68rem] text-[var(--h-ink-muted)]">{timeAgo(item.timestamp)}</div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── Browse the Quran ─── */}
                <section id="browse-quran">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="flex items-center gap-2 font-ui text-[1.35rem] font-bold text-[var(--h-ink)]"><BookOpen size={20} /> Browse the Quran</h2>
                            <p className="mt-0.5 text-[0.82rem] text-[var(--h-ink-muted)]">Select a Surah, Page, Juz, or Hizb to begin.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {BROWSE_MODES.map(mode => {
                                const Icon = mode.icon;
                                return (
                                    <button key={mode.id} className={`flex cursor-pointer items-center gap-1.5 rounded-[20px] border-[1.5px] px-3.5 py-2 text-xs font-semibold font-[inherit] transition-all duration-200 ${
                                        browseMode === mode.id
                                            ? 'border-[var(--h-teal)] bg-[var(--h-teal-soft)] text-[var(--h-teal)]'
                                            : 'border-[var(--h-bone-dark)] bg-transparent text-[var(--h-ink-muted)]'
                                    }`}
                                        onClick={() => setBrowseMode(mode.id)}>
                                        <Icon size={14} /> {mode.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-5 flex items-center gap-3 rounded-[14px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-[1.15rem] py-[0.85rem] transition-colors duration-200 focus-within:border-[var(--h-teal)] md:px-5">
                        <Search size={18} className="shrink-0 text-[var(--h-ink-muted)]" />
                        <input type="text" placeholder={`Search ${browseMode}...`} value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border-none bg-transparent font-[inherit] text-[0.95rem] text-[var(--h-ink)] outline-none placeholder:text-[var(--h-ink-muted)]" />
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                        {filteredItems.map(item => (
                            <motion.div key={item.key} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                                <Link to={item.to} className="flex items-center gap-3 overflow-hidden rounded-[14px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-4 no-underline text-inherit transition-all duration-150 hover:-translate-y-px hover:border-[var(--h-teal)] hover:shadow-[0_4px_14px_rgba(46,79,74,0.08)] md:p-[18px]">
                                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[var(--h-teal-soft)] font-mono text-[0.8rem] font-bold text-[var(--h-teal)]">{item.prefix || <Hash size={14} />}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-0.5 flex items-center justify-between">
                                            <span className="font-ui text-[0.95rem] font-semibold text-[var(--h-ink)]">{item.title}</span>
                                            {item.arabic && <span className="text-[1.15rem] text-[var(--h-gold)] [direction:rtl]">{item.arabic}</span>}
                                        </div>
                                        <div className="flex items-center justify-between text-[0.72rem] text-[var(--h-ink-muted)]">
                                            <span>{item.subtitle}</span>
                                            <span className="rounded-lg bg-[var(--h-bone)] px-1.5 py-0.5 text-[0.62rem] font-semibold text-[var(--h-ink-muted)]">{item.meta}</span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {filteredItems.length === 0 && <div className="py-8 text-center text-sm italic text-[var(--h-ink-muted)]">No results matching your search.</div>}
                </section>
            </motion.div>
        </div>
    );
}
