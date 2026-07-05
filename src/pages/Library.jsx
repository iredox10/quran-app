import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Folder, Trash2, ArrowRight, Bookmark, BookOpen, X, Library as LibraryIcon, FolderPlus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTourModal from '../components/ui/PageTourModal';

const libraryTourSteps = [
    { title: "Your Library", description: "This is where your personalized Quran content lives.", icon: LibraryIcon },
    { title: "Bookmarks", target: "#bookmarks-section", description: "Quickly access specific ayahs you've bookmarked while reading.", icon: Bookmark },
    { title: "Collections", target: "#collections-section", description: "Group specific verses together into custom collections for focused Hifdh or study.", icon: Folder }
];

export default function Library() {
    const { collections, bookmarks, deleteCollection, removeFromCollection, setNavHeaderTitle, toggleBookmark, addCollection } = useAppStore();
    const [newCollectionName, setNewCollectionName] = React.useState('');

    useEffect(() => {
        setNavHeaderTitle('My Library');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const hasContent = (bookmarks && bookmarks.length > 0) || (collections && collections.length > 0);

    return (
        <div className="container pb-16">
            {hasContent && <PageTourModal tourId="library-tour" steps={libraryTourSteps} />}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                {/* Bookmarks Section */}
                <section id="bookmarks-section" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <Bookmark size={24} className="text-accent" />
                        <h2 className="font-ui text-3xl font-bold text-[var(--text-primary)]">Bookmarks</h2>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                        {bookmarks.length === 0 ? (
                            <div className="col-span-full p-12 text-center bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-color)] flex flex-col items-center">
                                <div className="mb-4 opacity-20">
                                    <img src="/logo-192.png" className="w-16 h-16 object-contain" alt="" />
                                </div>
                                <p className="text-[var(--text-muted)]">No bookmarks yet. Save your favorite ayahs to see them here.</p>
                            </div>
                        ) : (
                            bookmarks.map((b, i) => (
                                <motion.div
                                    key={i}
                                    layout
                                    className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex justify-between items-center"
                                >
                                    <div>
                                        <h4 className="font-ui text-xl font-semibold text-[var(--text-primary)]">{b.surahName}</h4>
                                        <p className="font-mono text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wider mt-1">Ayah {b.verseKey.split(':')[1]}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link to={`/surah/${b.chapterId}?verse=${b.verseKey}`} className="btn-icon text-[var(--accent-primary)] bg-[var(--accent-light)]">
                                            <ArrowRight size={20} />
                                        </Link>
                                        <button onClick={() => toggleBookmark(b.verseKey)} className="btn-icon text-[#dc2626] bg-[rgba(220,38,38,0.1)]">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* Collections Section */}
                <section id="collections-section">
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <Folder size={24} className="text-accent" />
                            <h2 className="font-ui text-3xl font-bold text-[var(--text-primary)] mt-10">Collections</h2>
                        </div>

                        <div className="flex gap-2 bg-[var(--bg-surface)] p-2 rounded-xl border border-[var(--border-color)] min-w-[280px]">
                            <input
                                type="text"
                                placeholder="New Collection Name..."
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                className="flex-1 px-[0.8rem] py-[0.4rem] rounded-lg border-none text-[0.9rem] bg-transparent text-[var(--text-primary)] outline-none"
                            />
                            <button
                                onClick={() => {
                                    if (newCollectionName.trim()) {
                                        addCollection(newCollectionName.trim());
                                        setNewCollectionName('');
                                    }
                                }}
                                className="bg-[var(--accent-primary)] text-white border-none rounded-lg px-4 py-[0.4rem] cursor-pointer flex items-center gap-1.5 font-semibold text-[0.9rem]"
                            >
                                <Plus size={16} /> Create
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
                        {collections.length === 0 ? (
                            <div className="col-span-full p-12 text-center bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-color)]">
                                <Folder size={48} className="text-[var(--text-muted)] mb-4 opacity-30" />
                                <p className="text-[var(--text-muted)]">No collections yet. Group verses together for better hifdh focus.</p>
                            </div>
                        ) : (
                            collections.map(c => (
                                <motion.div
                                    key={c.id}
                                    layout
                                    className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--border-color)] shadow-[var(--shadow-md)] flex flex-col"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-ui text-2xl font-semibold text-[var(--text-primary)] mb-1">{c.name}</h3>
                                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                                                <LibraryIcon size={14} /> {c.items.length} verses
                                            </div>
                                        </div>
                                        <button onClick={() => deleteCollection(c.id)} className="btn-icon text-[#dc2626] bg-[rgba(220,38,38,0.1)]">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3 flex-1">
                                        {c.items.length === 0 ? (
                                            <p className="text-sm text-[var(--text-muted)] text-center p-4">No verses in this collection.</p>
                                        ) : (
                                            c.items.slice(0, 4).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center px-4 py-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                                                    <span className="text-[0.9rem] text-[var(--text-secondary)] font-medium">{item.surahName} {item.verseKey.split(':')[1]}</span>
                                                    <div className="flex gap-2">
                                                        <Link to={`/surah/${item.chapterId}?verse=${item.verseKey}`} className="text-[var(--accent-primary)]"><ArrowRight size={18} /></Link>
                                                        <button
                                                            onClick={() => removeFromCollection(c.id, item.verseKey)}
                                                            className="bg-transparent border-none text-[#dc2626] cursor-pointer p-[4px]"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {c.items.length > 4 && (
                                            <p className="text-[0.8rem] text-[var(--text-muted)] text-center mt-2">+ {c.items.length - 4} more verses</p>
                                        )}
                                    </div>

                                    {c.items.length > 0 && (
                                        <Link
                                            to={`/memorize/${c.items[0]?.chapterId}`}
                                            className="btn-primary mt-8 w-full flex justify-center items-center gap-2 no-underline p-4 rounded-xl"
                                        >
                                            <BookOpen size={18} /> Launch Hifdh
                                        </Link>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

            </motion.div>
        </div>
    );
}
