import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getChapter, getVerses, getChapterAudio, getChapterTafsirs, getTajweedVerses, getChapters, getFootnote } from '../services/api/quranApi';
import { getJuzByPage, getHizbByPage } from '../data/quranNavigation';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, ArrowRight, Play, Pause, BookOpen, Bookmark, Info, X, Download, Minus, Plus, Settings2, Target, CheckCircle2, Loader2, Copy, Share2, Brain, Eye, EyeOff, Highlighter, Type, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useSwipeable } from 'react-swipeable';
import VerseRow from '../components/VerseRow';
import AudioSetupModal from '../components/AudioSetupModal';
import AutoScroller from '../components/AutoScroller';
import { getMushafById, isTajweedEnabledForMushaf, MUSHAFS } from '../config/mushaf';
import { sanitizeTajweedHtml, getVerseArabicText, getWordArabicText } from '../utils/quranText';
import { saukaService } from '../services/saukaService';
import PageTourModal from '../components/ui/PageTourModal';
import GestureTip from '../components/ui/GestureTip';
import CustomSelect from '../components/ui/CustomSelect';
import ShareVerseModal from '../components/ui/ShareVerseModal';

/* ── Inline pickers (mirror SettingsDrawer lists) ── */
const TRANSLATIONS = [
    { id: 85, name: 'English · M.A.S. Abdel Haleem' },
    { id: 131, name: 'English · Dr. Mustafa Khattab' },
    { id: 20, name: 'English · Saheeh International' },
    { id: 22, name: 'English · A. Yusuf Ali' },
    { id: 84, name: 'English · Mufti Taqi Usmani' },
    { id: 32, name: 'Hausa · Abubakar Mahmoud Gumi' },
    { id: 234, name: 'Urdu · Fatah Muhammad Jalandhari' }
];
const TAFSIRS = [
    { id: 169, name: 'Ibn Kathir (Abridged)' },
    { id: 168, name: "Ma'arif al-Qur'an" },
    { id: 817, name: 'Tazkirul Quran' },
    { id: 16, name: 'Tafsir al-Muyassar' },
    { id: 14, name: 'Tafsir Ibn Kathir' },
    { id: 15, name: 'Tafsir al-Tabari' },
    { id: 93, name: 'Al-Tafsir al-Wasit' }
];

import { RECITERS } from '../config/reciters';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const surahTourSteps = [
    { title: "Read & Listen", target: "#verses-container", description: "Read the ayahs and tap the play icon on any ayah to start listening from there.", icon: Play },
    { title: "Tafsir & Translations", target: "#verses-container", description: "Tap the info icon on any ayah to read its Tafsir. Change translation languages in the toolbar above.", icon: Info },
    { title: "Offline Access", target: "#download-audio-btn", description: "Use the Download button at the top to save this Surah's audio for offline listening.", icon: Download, action: { type: 'click', target: '#download-audio-btn' } }
];

const surahScrollPositions = {};

/* ── Toolbar primitives ── */
function ToolbarToggle({ active, onClick, title, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-pressed={active}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.78rem] font-semibold transition-all duration-200 ${
                active
                    ? 'border-accent bg-accent text-white shadow-[0_4px_12px_rgba(198,168,124,0.3)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
            }`}
        >
            {children}
        </button>
    );
}

function ToolbarStep({ onClick, title, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all duration-200 hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
        >
            {children}
        </button>
    );
}

/* ── Self-contained Verse renderer with every feature ── */
function VerseItem({
    verse, readingMode, chapter, fontSize, translationFontSize, arabicFont,
    tajweedEnabled, tajweedMap, activeTafsir, setActiveTafsir, isTafsirFetching,
    showPageDivider, tafsirs, isAudioPlaying, mushaf, onPlayVerse,
    collections, addCollection, addToCollection, memorizedAyahs, toggleMemorizedAyah,
    memorizeMode, bookmark, setBookmark, addRecentlyRead, onShare
}) {
    const { ref, inView } = useInView({ threshold: 0.5, triggerOnce: false });
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [activeFootnoteId, setActiveFootnoteId] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    const isMemorized = (memorizedAyahs || []).includes(verse.verse_key);
    const isHidden = memorizeMode && !revealed;

    useEffect(() => {
        if (inView && chapter) {
            addRecentlyRead?.(chapter.id, chapter.name_simple, verse.verse_key);
        }
    }, [inView, chapter?.id, chapter?.name_simple, verse.verse_key, addRecentlyRead]);

    const { data: footnoteData, isFetching: isFootnoteFetching } = useQuery({
        queryKey: ['footnote', activeFootnoteId],
        queryFn: () => getFootnote(activeFootnoteId),
        enabled: !!activeFootnoteId,
    });

    const pageDivider = showPageDivider ? (
        <div key={`page-${verse.page_number}`} data-page={verse.page_number} className="page-divider"
            style={{ display: readingMode ? 'block' : 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', margin: readingMode ? '1.5rem 0' : '0', direction: 'ltr', width: '100%' }}>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--accent-primary), transparent)' }} />
            <span className="whitespace-nowrap rounded-[9999px] bg-[var(--accent-light)] px-3 py-1 font-['Outfit',sans-serif] text-[0.8rem] font-semibold text-accent">Page {verse.page_number}</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--accent-primary), transparent)' }} />
        </div>
    ) : null;

    const verseArabicText = getVerseArabicText(verse, mushaf);

    const renderWords = () => {
        if (!Array.isArray(verse.words) || verse.words.length === 0) {
            const fallback = tajweedEnabled && tajweedMap?.[verse.verse_key]
                ? tajweedMap[verse.verse_key]
                : verseArabicText;
            return <span dangerouslySetInnerHTML={{ __html: fallback.replace(/\s+$/, '') }} />;
        }
        return verse.words.map((word, index) => {
            const translationText = word.translation?.text || '';
            const isEndMark = word.char_type_name === 'end';
            const isLast = index === verse.words.length - 1;
            let content = tajweedEnabled && word.text_uthmani_tajweed
                ? sanitizeTajweedHtml(word.text_uthmani_tajweed)
                : getWordArabicText(word, mushaf);
            if (isLast) content = content.replace(/\s+$/, '');
            return (
                <span key={word.id || index} className={`word inline-block ${isEndMark ? 'end' : ''}`}
                    data-word-translation={translationText}
                    style={{ cursor: translationText ? 'pointer' : 'auto', marginLeft: index < verse.words.length - 1 ? '0.3em' : '0' }}>
                    {tajweedEnabled && word.text_uthmani_tajweed ? (
                        <span dangerouslySetInnerHTML={{ __html: content }} />
                    ) : (
                        <>{content}</>
                    )}
                </span>
            );
        });
    };

    const handleShare = () => {
        onShare?.(verse);
    };

    if (readingMode) {
        return (
            <React.Fragment key={`reading-${verse.verse_key}`}>
                {pageDivider}
                <span ref={ref} id={`verse-${verse.verse_key}`}
                    className="quran-text tajweed-text"
                    style={{
                        fontSize: `clamp(${0.9 + fontSize * 0.15}rem, ${fontSize * 1.2}vw, ${fontSize * 0.4 + 1.5}rem)`,
                        fontFamily: arabicFont, marginRight: '0.4rem', display: 'inline',
                        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                        backgroundColor: isAudioPlaying ? 'var(--accent-light)' : 'transparent',
                        borderRadius: '8px', padding: '0 0.25rem', wordBreak: 'break-word',
                        filter: isHidden ? 'blur(7px)' : 'none', userSelect: isHidden ? 'none' : 'auto'
                    }}>
                    {renderWords()}
                </span>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment key={`translation-${verse.verse_key}`}>
            {pageDivider}
            <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--accent-light), var(--border-color), var(--accent-light), transparent)' }} />
                <div className="h-[6px] w-[6px] rounded-full bg-accent opacity-40" />
                <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, var(--accent-light), var(--border-color), var(--accent-light), transparent)' }} />
            </div>
            <div ref={ref} id={`verse-${verse.verse_key}`} className="verse-container"
                style={{ padding: '1.5rem', margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem',
                    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                    backgroundColor: isAudioPlaying ? 'var(--accent-light)' : 'transparent',
                    transform: isAudioPlaying ? 'scale(1.01)' : 'scale(1)',
                    boxShadow: isAudioPlaying ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', borderRadius: '16px' }}>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="font-['Outfit',sans-serif] text-[1rem] sm:text-[0.85rem] font-bold tracking-[0.05em] text-[var(--accent-primary)] sm:rounded-[999px] sm:border sm:bg-[var(--accent-light)] sm:px-3 sm:py-[0.35rem]" style={{ borderColor: 'rgba(198,168,124,0.2)' }}>
                        {verse.verse_key}
                    </div>
                    <div className="verse-actions-row flex flex-wrap items-center gap-2">
                        <button className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:text-accent hover:shadow-[var(--shadow-sm)]" onClick={() => setShowCollectionModal(true)} title="Add to Collection"><Plus size={18} /></button>
                        {setBookmark && (
                            <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:shadow-[var(--shadow-sm)]" style={{ color: bookmark?.verseKey === verse.verse_key ? 'var(--accent-primary)' : 'var(--text-muted)' }} onClick={() => setBookmark(verse.verse_key, chapter ? chapter.name_simple : `Surah ${verse.verse_key.split(':')[0]}`, chapter?.id)} title="Bookmark Verse">
                                <Bookmark size={18} fill={bookmark?.verseKey === verse.verse_key ? 'currentColor' : 'none'} />
                            </button>
                        )}
                        <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200" style={{ color: isAudioPlaying ? 'var(--accent-primary)' : 'var(--text-muted)', backgroundColor: isAudioPlaying ? 'var(--accent-light)' : 'transparent' }} title={isAudioPlaying ? "Playing" : "Play this Ayah"} onClick={() => onPlayVerse?.(verse)}>
                            {isAudioPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:shadow-[var(--shadow-sm)]" style={{ color: activeTafsir?.verse_key === verse.verse_key ? 'var(--accent-primary)' : 'var(--text-muted)' }} title="Read Tafsir" onClick={() => {
                            if (activeTafsir?.verse_key === verse.verse_key) setActiveTafsir(null);
                            else if (isTafsirFetching) setActiveTafsir({ verse_key: verse.verse_key, text: '<p>Loading tafsir...</p>' });
                            else { const t = tafsirs?.find((x) => x.verse_key === verse.verse_key); setActiveTafsir({ verse_key: verse.verse_key, text: t ? t.text : '<p>Tafsir is not available for this verse in the selected source.</p>' }); }
                        }}><Info size={18} /></button>
                        {memorizeMode && (
                            <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:shadow-[var(--shadow-sm)]" style={{ color: revealed ? 'var(--accent-primary)' : 'var(--text-muted)' }} title={revealed ? "Hide to test memory" : "Reveal verse"} onClick={() => setRevealed((v) => !v)}>
                                {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        )}
                        <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:shadow-[var(--shadow-sm)] text-[var(--text-muted)]" title="Share verse" onClick={handleShare}>
                            <Share2 size={18} />
                        </button>
                    </div>
                </div>

                <div className={`quran-text tajweed-text`} style={{ textAlign: 'right', fontSize: `clamp(${0.9 + fontSize * 0.15}rem, ${fontSize * 1.2}vw, ${fontSize * 0.4 + 1.5}rem)`, lineHeight: 2.0, fontFamily: arabicFont, wordBreak: 'break-word', overflowWrap: 'anywhere', filter: isHidden ? 'blur(7px)' : 'none', userSelect: isHidden ? 'none' : 'auto' }}>
                    {renderWords()}
                </div>

                {isHidden ? (
                    <button onClick={() => setRevealed(true)} className="quran-translation text-left w-full rounded-[10px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[0.85rem] text-[var(--text-muted)] cursor-pointer transition-all duration-200 hover:border-accent hover:text-accent">
                        Tap to reveal translation &amp; meaning
                    </button>
                ) : (
                    <div dir="ltr" className="quran-translation text-left" style={{ fontSize: `${(translationFontSize || 2) * 0.15 + 0.8}rem`, color: 'var(--text-secondary)', lineHeight: 1.6 }}
                        onClick={(e) => { const sup = e.target.closest('sup'); if (sup) { const fnId = sup.getAttribute('foot_note'); if (fnId) setActiveFootnoteId(fnId === activeFootnoteId ? null : fnId); } }}
                        dangerouslySetInnerHTML={{ __html: verse.translations?.[0]?.text || '' }} />
                )}

                <AnimatePresence>
                    {activeFootnoteId && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                            <div className="relative mt-4 rounded-xl bg-[var(--bg-secondary)] p-5 text-[0.9rem] text-[var(--text-primary)]" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
                                <button onClick={() => setActiveFootnoteId(null)} className="absolute right-3 top-3 cursor-pointer border-none bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
                                <h4 className="mb-2 font-semibold text-[var(--text-primary)] flex items-center gap-2"><Info size={16} className="text-accent" /> Footnote</h4>
                                {isFootnoteFetching ? <p className="text-[var(--text-muted)] animate-pulse m-0">Loading...</p> : <div className="leading-[1.6]" dangerouslySetInnerHTML={{ __html: footnoteData?.text || 'Footnote not available.' }} />}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showCollectionModal && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCollectionModal(false)} className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="fixed inset-0 z-[1101] flex items-center justify-center pointer-events-none">
                                <div className="w-[calc(100vw-2rem)] max-w-[420px] rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-surface)] p-6 shadow-2xl pointer-events-auto backdrop-blur-xl flex flex-col">
                                    <div className="mb-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent-primary)]"><Bookmark size={18} fill="currentColor" opacity={0.2} /></div>
                                            <h3 className="m-0 text-[1.15rem] font-bold text-[var(--text-primary)] tracking-tight">Save to Collection</h3>
                                        </div>
                                        <button onClick={() => setShowCollectionModal(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]"><X size={18} /></button>
                                    </div>
                                    <div className="mb-5 flex max-h-[260px] flex-col gap-[0.4rem] overflow-y-auto pr-2">
                                        {(collections || []).map((c) => {
                                            const isIn = c.items?.some((item) => item.verseKey === verse.verse_key);
                                            return (
                                                <button key={c.id} onClick={() => { addToCollection(c.id, verse.verse_key, chapter ? chapter.name_simple : `Surah ${verse.verse_key.split(':')[0]}`, chapter?.id); setShowCollectionModal(false); }}
                                                    className={`group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl border p-3 text-left transition-all duration-300 ${isIn ? 'border-[var(--accent-primary)] bg-[var(--accent-light)] shadow-[0_4px_12px_rgba(var(--accent-rgb),0.1)]' : 'border-transparent bg-[var(--bg-secondary)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:shadow-md'}`}>
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isIn ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--border-color)] text-[var(--text-muted)] group-hover:bg-[var(--accent-light)] group-hover:text-[var(--accent-primary)]'}`}>{isIn ? <CheckCircle2 size={16} strokeWidth={3} /> : <Bookmark size={16} />}</div>
                                                        <span className={`text-[0.95rem] transition-colors ${isIn ? 'font-semibold text-[var(--accent-primary)]' : 'font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]'}`}>{c.name}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {(!collections || collections.length === 0) && (
                                            <div className="flex flex-col items-center justify-center py-8 text-center opacity-70"><Bookmark size={32} className="mb-3 text-[var(--text-muted)]" /><div className="text-[0.9rem] font-medium text-[var(--text-primary)]">No collections yet</div><div className="text-[0.8rem] text-[var(--text-muted)]">Create your first one below</div></div>
                                        )}
                                    </div>
                                    <div className="h-px w-full bg-[var(--border-color)] mb-5 opacity-60" />
                                    <div>
                                        <label className="mb-2 block text-[0.8rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] ml-1">New Collection</label>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Enter name..." value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newCollectionName.trim()) { const nid = Date.now(); addCollection(newCollectionName.trim(), nid); addToCollection(nid, verse.verse_key, chapter ? chapter.name_simple : `Surah ${verse.verse_key.split(':')[0]}`, chapter?.id); setNewCollectionName(''); setShowCollectionModal(false); } }}
                                                className="min-h-12 flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[0.95rem] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:shadow-[0_0_0_4px_var(--accent-light)]" />
                                            <button className={`flex w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl font-bold transition-all duration-300 ${newCollectionName.trim() ? 'bg-[var(--accent-primary)] text-white shadow-[0_4px_14px_rgba(var(--accent-rgb),0.3)] hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]' : 'bg-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed opacity-70'}`} disabled={!newCollectionName.trim()} onClick={() => { if (newCollectionName.trim()) { const nid = Date.now(); addCollection(newCollectionName.trim(), nid); addToCollection(nid, verse.verse_key, chapter ? chapter.name_simple : `Surah ${verse.verse_key.split(':')[0]}`, chapter?.id); setNewCollectionName(''); setShowCollectionModal(false); } }}><Plus size={20} strokeWidth={2.5} /></button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </React.Fragment>
    );
}

export default function Surah() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const didRegisterReadRef = React.useRef(null);

    const { backToSauka, saukaAssignmentId, saukaPartNumber, saukaUnit } = location.state || {};
    const [isSaukaCompleting, setIsSaukaCompleting] = useState(false);

    const handleSaukaComplete = async () => {
        setIsSaukaCompleting(true);
        try {
            await saukaService.completeJuz(saukaAssignmentId, backToSauka);
            navigate(`/sauka/${backToSauka}`);
        } catch (e) {
            console.error(e);
            alert('Failed to mark complete');
            setIsSaukaCompleting(false);
        }
    };

    const {
        translationId, setTranslation, reciterId, setReciter, fontSize, setFontSize, translationFontSize, setTranslationFontSize,
        readingMode, setReadingMode,
        bookmark, setBookmark,
        addRecentlyRead,
        setIsPlaying, currentAudioUrl, isPlaying,
        audioPlaylist, setAudioPlaylist, audioTrackIndex,
        audioSettings, updateAudioSettings,
        mushafId,
        arabicFont, tajweedEnabled, setTajweed,
        tafsirId, setTafsirId,
        downloadedSurahs, addDownloadedSurah,
        setNavHeaderTitle,
        autoScroll, setAutoScroll,
        isPlayerVisible, setIsPlayerVisible,
        playTriggerCount,
        customAudioBaseUrl,
        localAudioDirHandle,
        logReadingSession,
        hifdhHistory,
        memorizedAyahs, toggleMemorizedAyah,
        collections, addCollection, addToCollection,
        setIsSettingsOpen
    } = useAppStore();
    const mushaf = getMushafById(mushafId);
    const isTajweedActive = isTajweedEnabledForMushaf(mushafId, tajweedEnabled);

    const [showAudioSetup, setShowAudioSetup] = useState(false);
    const [pendingPlaylist, setPendingPlaylist] = useState([]);
    const [memorizeMode, setMemorizeMode] = useState(false);
    const [sharingVerse, setSharingVerse] = useState(null);

    const { data: chapter, isLoading: isChapterLoading } = useQuery({ queryKey: ['chapter', id], queryFn: () => getChapter(id) });
    const { data: allChapters } = useQuery({ queryKey: ['chapters'], queryFn: getChapters, staleTime: Infinity });

    useEffect(() => {
        if (chapter) {
            setNavHeaderTitle(chapter.name_simple);
            if (didRegisterReadRef.current !== chapter.id) {
                didRegisterReadRef.current = chapter.id;
                const queryParams = new URLSearchParams(location.search);
                const initialVerse = queryParams.get('verse');
                addRecentlyRead(chapter.id, chapter.name_simple, initialVerse);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapter?.id]);

    useEffect(() => { return () => setNavHeaderTitle(null); }, [setNavHeaderTitle]);

    useEffect(() => {
        const startTime = Date.now();
        return () => {
            const duration = Math.round((Date.now() - startTime) / 1000);
            if (duration >= 10) logReadingSession(duration, 'reading', Number(id));
        };
    }, [id, logReadingSession]);

    const { data: versesResponse, isLoading: isVersesLoading, isFetching: isVersesFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['verses', id, translationId, reciterId, mushafId],
        queryFn: ({ pageParam = 1 }) => getVerses(id, translationId, reciterId, pageParam, mushafId),
        getNextPageParam: (lastPage) => lastPage.pagination.current_page < lastPage.pagination.total_pages ? lastPage.pagination.current_page + 1 : undefined,
        placeholderData: keepPreviousData,
    });

    const { data: audioData } = useQuery({ queryKey: ['chapterAudio', id, reciterId], queryFn: () => getChapterAudio(id, reciterId) });
    const { data: tafsirs, isFetching: isTafsirFetching } = useQuery({ queryKey: ['tafsirs', id, tafsirId], queryFn: () => getChapterTafsirs(id, tafsirId), placeholderData: keepPreviousData });
    const [activeTafsir, setActiveTafsir] = useState(null);
    const { data: tajweedData } = useQuery({ queryKey: ['tajweed', id, mushafId], queryFn: () => getTajweedVerses(id), enabled: isTajweedActive && mushaf.tajweedSource === 'uthmani_html' });

    const tajweedMap = React.useMemo(() => {
        if (!tajweedData) return {};
        return tajweedData.reduce((acc, v) => { acc[v.verse_key] = sanitizeTajweedHtml(v.text_uthmani_tajweed); return acc; }, {});
    }, [tajweedData]);

    const { ref: observerRef, inView } = useInView();
    useEffect(() => { setActiveTafsir(null); }, [tafsirId]);
    useEffect(() => { if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage(); }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const verses = versesResponse?.pages.flatMap(page => page.verses) || [];
    const isCurrentSurahPlaying = audioPlaylist.length > 0 && String(audioPlaylist[0]?.surahId) === String(id);
    const activeAudioVerseKey = isPlayerVisible && isCurrentSurahPlaying && audioPlaylist[audioTrackIndex] ? audioPlaylist[audioTrackIndex].verseKey : null;

    const buildPlaylist = useCallback((verses, id) => verses.map(v => {
        let url = v.audio?.url ? (v.audio.url.startsWith('http') ? v.audio.url : `https://verses.quran.com/${v.audio.url}`) : null;
        const [surahNum, ayahNum] = v.verse_key.split(':');
        const fileName = `${String(surahNum).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;
        if (localAudioDirHandle) url = `local-audio://${fileName}`;
        else if (customAudioBaseUrl) url = `${customAudioBaseUrl.replace(/\/$/, '')}/${fileName}`;
        return { surahId: id, verseKey: v.verse_key, verseNumber: v.verse_number, url };
    }).filter(v => v.url), [localAudioDirHandle, customAudioBaseUrl]);

    const handlePlayClick = () => {
        if (!verses || verses.length === 0) return;
        if (isCurrentSurahPlaying) {
            setIsPlaying(!isPlaying);
            setIsPlayerVisible(true);
        } else {
            const playlist = buildPlaylist(verses, id);
            if (playlist.length > 0) {
                setPendingPlaylist(playlist);
                updateAudioSettings({ startRange: 0, endRange: playlist.length - 1 });
                setShowAudioSetup(true);
            }
        }
    };

    const handleStartPlaying = () => {
        if (pendingPlaylist.length === 0) return;
        setAudioPlaylist(pendingPlaylist, audioSettings.startRange ?? 0);
        setIsPlaying(true);
        setIsPlayerVisible(true);
        setShowAudioSetup(false);
    };

    const handlePlayVerse = useCallback((verse) => {
        const playlist = buildPlaylist(verses, id);
        if (playlist.length === 0) return;
        const startIndex = playlist.findIndex(p => p.verseKey === verse.verse_key);
        const targetIndex = startIndex >= 0 ? startIndex : 0;
        if (isCurrentSurahPlaying && audioPlaylist[audioTrackIndex]?.verseKey === verse.verse_key) {
            setIsPlaying(!isPlaying);
            setIsPlayerVisible(true);
            return;
        }
        setAudioPlaylist(playlist, targetIndex);
        updateAudioSettings({ startRange: targetIndex, endRange: playlist.length - 1 });
        setIsPlaying(true);
        setIsPlayerVisible(true);
    }, [verses, id, isCurrentSurahPlaying, audioPlaylist, audioTrackIndex, isPlaying, setAudioPlaylist, updateAudioSettings, setIsPlaying, setIsPlayerVisible, buildPlaylist]);

    const isDownloaded = (downloadedSurahs || []).includes(id);
    const [isDownloading, setIsDownloading] = useState(false);
    const mountPlayTriggerRef = React.useRef(playTriggerCount);
    useEffect(() => { if (playTriggerCount === mountPlayTriggerRef.current) return; handlePlayClick(); mountPlayTriggerRef.current = playTriggerCount; /* eslint-disable-next-line */ }, [playTriggerCount]);

    const handleDownloadSurah = async () => {
        if (!verses || verses.length === 0 || isDownloading) return;
        try {
            setIsDownloading(true);
            const urlsToCache = verses.map(v => v.audio?.url ? (v.audio.url.startsWith('http') ? v.audio.url : `https://verses.quran.com/${v.audio.url}`) : null).filter(Boolean);
            const chunkSize = 5;
            for (let i = 0; i < urlsToCache.length; i += chunkSize) {
                const chunk = urlsToCache.slice(i, i + chunkSize);
                await Promise.all(chunk.map(url => fetch(url, { mode: 'cors' }).catch(e => console.warn("Verse audio cache failed:", url, e))));
            }
            if (audioData?.audio_url) await fetch(audioData.audio_url, { mode: 'cors' }).catch(() => {});
            addDownloadedSurah(id);
        } catch (error) { console.error("Audio download failed", error); }
        finally { setIsDownloading(false); }
    };

    const isCurrentAudio = currentAudioUrl === audioData?.audio_url;
    const hasScrolledRef = React.useRef(null);
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const verseKey = queryParams.get('verse');
        if (verseKey && verses.length > 0 && hasScrolledRef.current !== verseKey) {
            const element = document.getElementById(`verse-${verseKey}`);
            if (element) {
                hasScrolledRef.current = verseKey;
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'instant', block: 'center' });
                    element.style.transition = 'background-color 0.5s';
                    element.style.backgroundColor = 'var(--accent-light)';
                    setTimeout(() => { element.style.backgroundColor = 'transparent'; }, 2000);
                }, 50);
            } else if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }
    }, [location.search, verses, isVersesLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const swipeDirectionRef = React.useRef(0);
    const swipeHandlers = useSwipeable({
        onSwipedRight: () => { if (!backToSauka && parseInt(id) < 114) { surahScrollPositions[id] = window.scrollY; swipeDirectionRef.current = -1; navigate(`/surah/${parseInt(id) + 1}`); } },
        onSwipedLeft: () => { if (!backToSauka && parseInt(id) > 1) { surahScrollPositions[id] = window.scrollY; swipeDirectionRef.current = 1; navigate(`/surah/${parseInt(id) - 1}`); } },
        preventScrollOnSwipe: false, trackMouse: false, delta: 50,
    });

    const hasRestoredScroll = React.useRef(null);
    useEffect(() => {
        if (!isVersesLoading && !isChapterLoading && verses.length > 0 && hasRestoredScroll.current !== id) {
            hasRestoredScroll.current = id;
            if (new URLSearchParams(window.location.search).get('verse')) return;
            setTimeout(() => {
                const savedPos = surahScrollPositions[id];
                if (savedPos !== undefined) window.scrollTo({ top: savedPos, behavior: 'instant' });
                else window.scrollTo({ top: 0, behavior: 'instant' });
            }, 50);
        }
    }, [isVersesLoading, isChapterLoading, verses.length, id]);

    const pageVariants = {
        enter: (direction) => ({ x: direction >= 0 ? '60%' : '-60%', opacity: 0, scale: 0.96 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (direction) => ({ x: direction >= 0 ? '-60%' : '60%', opacity: 0, scale: 0.96 }),
    };
    const pageTransition = { type: 'spring', stiffness: 280, damping: 30, mass: 0.8 };

    const memorizedInSurah = (memorizedAyahs || []).filter(k => k.startsWith(`${id}:`)).length;
    const totalInSurah = chapter?.verses_count || verses.length || 0;

    if (isChapterLoading || isVersesLoading) return (
        <div className="container text-center py-[10vh] text-[var(--text-muted)]">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="inline-block w-10 h-10 border-[3px] border-[var(--border-color)] border-t-[var(--accent-primary)] rounded-full mb-4" />
            <h2>Loading Ayahs...</h2>
        </div>
    );

    const reciterGroups = RECITERS.reduce((acc, r) => { const s = r.style || 'Other'; if (!acc[s]) acc[s] = { label: s, items: [] }; acc[s].items.push({ value: r.id, label: r.name }); return acc; }, {});

    return (
        <div className="container overflow-hidden" {...swipeHandlers}>
            <PageTourModal tourId="surah-tour" steps={surahTourSteps} />
            <GestureTip id="surah-swipe" title="Swipe to Navigate" description="Swipe left or right anywhere on the page to quickly move between Surahs." animation="swipe-left" />
            {isVersesFetching && !isVersesLoading && (
                <div className="fixed top-0 left-0 right-0 h-[3px] z-[2000] overflow-hidden pointer-events-none">
                    <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 0.9, ease: 'easeInOut', repeat: Infinity }} className="h-full w-[40%] bg-[linear-gradient(90deg,transparent,var(--accent-primary),transparent)] rounded" />
                </div>
            )}
            <Helmet>
                <title>{chapter ? `${chapter.name_simple} - The Noble Qur'an` : "Surah - The Noble Qur'an"}</title>
                <meta name="description" content={`Read and listen to ${chapter?.name_simple} (${chapter?.translated_name.name}) online with translations and Tafsir.`} />
            </Helmet>

            <AnimatePresence mode="wait" initial={false} custom={swipeDirectionRef.current}>
                <motion.div key={id} custom={swipeDirectionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTransition} className="will-change-[transform,opacity]">

                    <div className="flex flex-col items-center text-center w-full pt-8 pb-8 mb-6 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <h1 className="font-ui font-extrabold text-[2.2rem] text-[var(--text-primary)] tracking-tight leading-none">{chapter?.name_simple}</h1>
                            <span className="font-arabic text-[2.5rem] text-[var(--accent-primary)] leading-none mt-[-0.5rem]">{chapter?.name_arabic}</span>
                        </div>
                        <div className="flex items-center justify-center flex-wrap gap-2 font-mono text-[0.65rem] font-medium text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-5">
                            <span className="font-bold text-[var(--accent-primary)]">Surah {chapter?.id}</span>
                            <span className="text-[var(--text-muted)] opacity-50">●</span>
                            <span>{chapter?.translated_name.name}</span>
                            <span className="text-[var(--text-muted)] opacity-50">●</span>
                            <span>{chapter?.verses_count} Ayahs</span>
                            <span className="text-[var(--text-muted)] opacity-50">●</span>
                            <span>{chapter?.revelation_place}</span>
                            {verses && verses.length > 0 && (
                                <>
                                    <span className="text-[var(--text-muted)] opacity-50">●</span>
                                    <span>Starts Juz {getJuzByPage(verses[0].page_number).id} • Hizb {getHizbByPage(verses[0].page_number).id}</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-1 bg-[var(--bg-surface)] p-1.5 rounded-full border border-[var(--border-color)] shadow-sm">
                            <button onClick={handlePlayClick} className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--accent-primary)] text-white transition-all duration-300 hover:scale-105 shadow-[0_4px_12px_rgba(198,168,124,0.3)] cursor-pointer" title={isCurrentAudio && isPlaying ? "Pause Audio" : "Play Audio"}>
                                {isCurrentAudio && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                            </button>
                            {!isDownloaded && (
                                <button id="download-audio-btn" onClick={handleDownloadSurah} disabled={isDownloading} className={`flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] ${isDownloading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} title={isDownloading ? "Downloading..." : "Download Audio"}>
                                    {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                </button>
                            )}
                        </div>
                    </div>

                    {memorizeMode && (
                        <div className="mx-4 mb-4 flex items-center gap-3 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-primary)]/30 px-4 py-3">
                            <Brain size={18} className="text-[var(--accent-primary)] shrink-0" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between text-[0.8rem] font-semibold text-[var(--text-primary)]">
                                    <span>Memorization progress</span>
                                    <span>{memorizedInSurah}/{totalInSurah} ayahs</span>
                                </div>
                                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/60">
                                    <div className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500" style={{ width: `${totalInSurah ? (memorizedInSurah / totalInSurah) * 100 : 0}%` }} />
                                </div>
                            </div>
                            <span className="text-[0.7rem] text-[var(--text-muted)]">Blur mode active to test memory</span>
                        </div>
                    )}

                    {backToSauka && saukaAssignmentId && (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 mb-2 mx-4 p-3 sm:p-4 rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
                            <div className="min-w-0 w-full sm:w-auto flex-1">
                                <div className="flex items-center gap-[0.4rem] mb-[0.15rem] text-[var(--text-primary)] font-bold text-[0.88rem]"><Target size={13} aria-hidden="true" /><span>Sauka Group Reading</span></div>
                                <div className="text-[var(--text-muted)] text-[0.76rem]">Currently reading: {saukaUnit} {saukaPartNumber}</div>
                            </div>
                            <div className="flex gap-2 items-center w-full sm:w-auto">
                                <button type="button" disabled={isSaukaCompleting} onClick={handleSaukaComplete} className="flex-1 sm:flex-none justify-center min-h-9 px-4 py-2 rounded-full bg-[var(--h-teal)] text-white font-bold inline-flex items-center gap-2 text-[0.82rem] border-none cursor-pointer disabled:opacity-50">
                                    {isSaukaCompleting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} aria-hidden="true" />} Mark as Complete
                                </button>
                                <Link to={`/sauka/${backToSauka}`} className="flex-1 sm:flex-none justify-center min-h-9 px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold inline-flex items-center gap-2 text-[0.78rem] no-underline hover:bg-[var(--h-teal)] hover:text-white transition-colors">← Back to Sauka</Link>
                            </div>
                        </div>
                    )}

                    <div id="verses-container" className="px-4 flex-col" style={{ display: readingMode ? 'block' : 'flex' }}>
                        {chapter?.id !== 1 && chapter?.id !== 9 && (
                            <div className="quran-text text-center mb-12 text-accent" style={{ fontSize: `clamp(${fontSize * 0.2 + 1.2}rem, 4vw + ${fontSize * 0.2}rem, ${fontSize * 0.4 + 2}rem)`, fontFamily: arabicFont }}>
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                            </div>
                        )}

                        <div style={{ display: readingMode ? 'inline-block' : 'block', textAlign: readingMode ? 'justify' : 'left', direction: readingMode ? 'rtl' : 'ltr', lineHeight: readingMode ? 2.5 : 'inherit' }}>
                            {verses.map((verse, index) => {
                                const prevVerse = index > 0 ? verses[index - 1] : null;
                                const showPageDivider = verse.page_number && (!prevVerse || prevVerse.page_number !== verse.page_number);
                                return (
                                    <VerseItem
                                        key={verse.id}
                                        verse={verse}
                                        readingMode={readingMode}
                                        chapter={chapter}
                                        bookmark={bookmark}
                                        setBookmark={setBookmark}
                                        addRecentlyRead={addRecentlyRead}
                                        fontSize={fontSize}
                                        translationFontSize={translationFontSize}
                                        arabicFont={arabicFont}
                                        tajweedEnabled={isTajweedActive}
                                        tajweedMap={tajweedMap}
                                        activeTafsir={activeTafsir}
                                        setActiveTafsir={setActiveTafsir}
                                        isTafsirFetching={isTafsirFetching}
                                        tafsirId={tafsirId}
                                        showPageDivider={showPageDivider}
                                        tafsirs={tafsirs}
                                        isAudioPlaying={activeAudioVerseKey === verse.verse_key}
                                        onPlayVerse={handlePlayVerse}
                                        collections={collections}
                                        addCollection={addCollection}
                                        addToCollection={addToCollection}
                                        memorizedAyahs={memorizedAyahs}
                                        toggleMemorizedAyah={toggleMemorizedAyah}
                                        memorizeMode={memorizeMode}
                                        hifdhHistory={hifdhHistory}
                                        onShare={setSharingVerse}
                                    />
                                );
                            })}
                        </div>

                        <div ref={observerRef} className="py-8 text-center">
                            {isFetchingNextPage && <div className="text-[var(--text-muted)]">Loading more Ayahs...</div>}
                        </div>

                        {/* Sauka Completion Banner */}
                        {!hasNextPage && !isVersesLoading && backToSauka && saukaAssignmentId && (
                            <div className="mt-12 mb-12 bg-gradient-to-br from-[var(--h-teal)] to-[#0f766e] rounded-2xl p-6 sm:p-8 text-center shadow-lg border border-[var(--h-teal)]/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--h-gold)] opacity-10 blur-[40px] rounded-full pointer-events-none" />
                                <CheckCircle2 size={40} className="text-[var(--h-gold)] mx-auto mb-3" />
                                <h3 className="font-ui text-2xl sm:text-3xl font-bold text-white mb-2">Alhamdulillah!</h3>
                                <p className="text-[0.95rem] text-white/90 mb-6">You've reached the end of your assigned reading.</p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={handleSaukaComplete}
                                        disabled={isSaukaCompleting}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-white text-[var(--h-teal)] hover:bg-[var(--h-cream)] rounded-xl font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 inline-flex items-center justify-center gap-2 border-none cursor-pointer"
                                    >
                                        {isSaukaCompleting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                        Mark Part as Complete
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (navigator.share) {
                                                navigator.share({
                                                    title: 'Khatmah Progress',
                                                    text: `Alhamdulillah! I just finished reading my assigned Surah for our Group Khatmah. Join us and earn rewards!`,
                                                    url: window.location.origin
                                                }).catch(console.error);
                                            } else {
                                                alert("Sharing is not supported on this browser.");
                                            }
                                        }}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 rounded-xl font-bold transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Share2 size={18} />
                                        Share Achievement
                                    </button>
                                </div>
                            </div>
                        )}

                        {!hasNextPage && !isVersesLoading && !backToSauka && (
                            <div className="mt-16 pt-8 border-t border-[var(--border-color)] flex flex-row justify-between gap-3 sm:gap-4 pb-12">
                                {parseInt(id) < 114 ? (
                                    <button onClick={() => { surahScrollPositions[id] = window.scrollY; swipeDirectionRef.current = -1; navigate(`/surah/${parseInt(id) + 1}`); }} className="group flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-4 rounded-[1.25rem] border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] hover:shadow-sm transition-all flex-1 cursor-pointer w-full text-left gap-2 sm:gap-0">
                                        <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 shrink-0 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors"><ArrowLeft size={16} className="sm:w-[20px] sm:h-[20px] group-hover:-translate-x-1 transition-transform" /></div>
                                        <div className="flex flex-col items-start sm:ml-4 overflow-hidden w-full"><span className="font-ui font-bold text-[0.85rem] sm:text-[1.1rem] text-[var(--text-primary)] truncate w-full">Surah {allChapters?.find(c => String(c.id) === String(parseInt(id) + 1))?.name_simple || (parseInt(id) + 1)}</span></div>
                                    </button>
                                ) : <div className="flex-1" />}
                                {parseInt(id) > 1 ? (
                                    <button onClick={() => { surahScrollPositions[id] = window.scrollY; swipeDirectionRef.current = 1; navigate(`/surah/${parseInt(id) - 1}`); }} className="group flex flex-col sm:flex-row-reverse items-end sm:items-center p-3 sm:p-4 rounded-[1.25rem] border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] hover:shadow-sm transition-all flex-1 cursor-pointer w-full text-right gap-2 sm:gap-0">
                                        <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 shrink-0 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors"><ArrowRight size={16} className="sm:w-[20px] sm:h-[20px] group-hover:translate-x-1 transition-transform" /></div>
                                        <div className="flex flex-col items-end sm:mr-4 overflow-hidden w-full"><span className="font-ui font-bold text-[0.85rem] sm:text-[1.1rem] text-[var(--text-primary)] truncate w-full">Surah {allChapters?.find(c => String(c.id) === String(parseInt(id) - 1))?.name_simple || (parseInt(id) - 1)}</span></div>
                                    </button>
                                ) : <div className="flex-1" />}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            <AutoScroller />

            <AnimatePresence>
                {activeTafsir && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveTafsir(null)} className="fixed inset-0 bg-black/50 z-[999] backdrop-blur-sm" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] z-[1000] rounded-t-3xl p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[80vh] flex flex-col border-t border-[var(--border-color)]">
                            <div className="w-10 h-[5px] bg-[var(--border-color)] rounded-[3px] mx-auto mb-6" />
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-ui text-2xl font-bold text-[var(--text-primary)] m-0">Tafsir (Ayah {activeTafsir.verse_key.split(':')[1]})</h3>
                                <button className="btn-icon bg-[var(--bg-secondary)]" onClick={() => setActiveTafsir(null)} aria-label="Close Tafsir"><X size={20} /></button>
                            </div>
                            <div className="tafsir-content overflow-y-auto pr-2 text-[var(--text-secondary)] leading-[1.8] text-base" dangerouslySetInnerHTML={{ __html: activeTafsir.text }} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AudioSetupModal isOpen={showAudioSetup} onClose={() => setShowAudioSetup(false)} pendingPlaylist={pendingPlaylist} audioSettings={audioSettings} updateAudioSettings={updateAudioSettings} handleStartPlaying={handleStartPlaying} chapterName={chapter?.name_simple} />
            
            {sharingVerse && (
                <ShareVerseModal
                    verse={sharingVerse}
                    chapter={chapter}
                    mushaf={mushafId}
                    onClose={() => setSharingVerse(null)}
                />
            )}
        </div>
    );
}
