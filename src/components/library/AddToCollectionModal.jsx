import React, { useEffect, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, FolderPlus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
    pickerRows,
    validateNewCollectionName,
    verseContext,
    addedNotice,
    removedNotice,
} from '../../utils/collectionPicker';

/**
 * AddToCollectionModal — pick or create a collection for a single verse.
 *
 * PROPS CONTRACT (fixed across agents — do not change):
 *   open    — boolean
 *   verse   — { verseKey, surahName, chapterId } | null
 *   onClose — () => void
 *   onAdded — optional (collection) => void, called after a successful add
 *
 * Behavior: the modal stays open after saving so one verse can be filed
 * into several collections; each saved row flips to a "Saved + Remove"
 * state instantly (store-driven) and a polite toast line confirms the action.
 */

const FOCUSABLE =
    'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])';
const NOTICE_MS = 2600;

export default function AddToCollectionModal({ open, verse, onClose, onAdded }) {
    const collections = useAppStore((s) => s.collections);
    const addCollection = useAppStore((s) => s.addCollection);
    const addToCollection = useAppStore((s) => s.addToCollection);
    const removeFromCollection = useAppStore((s) => s.removeFromCollection);

    const panelRef = useRef(null);
    const inputRef = useRef(null);
    const noticeTimer = useRef(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [createError, setCreateError] = useState(null);
    const [notice, setNotice] = useState(null);

    const show = Boolean(open && verse);
    const list = Array.isArray(collections) ? collections : [];
    const rows = pickerRows(list, verse?.verseKey);
    const empty = rows.length === 0;
    const showCreate = createOpen || empty;
    const ctx = verseContext(verse);
    const canSave = Boolean(verse?.verseKey);
    const savedIn = rows.filter((r) => r.contains).length;

    const verseKey = verse?.verseKey ?? null;

    // Reset transient UI when the modal opens or the target verse changes.
    // Render-time state adjustment (react.dev "You Might Not Need an Effect") —
    // keeps the exit animation pristine, since closing does NOT clear state.
    const [seed, setSeed] = useState({ open: show, verseKey });
    if (seed.open !== show || seed.verseKey !== verseKey) {
        const openedFresh = show && (!seed.open || seed.verseKey !== verseKey);
        setSeed({ open: show, verseKey });
        if (openedFresh) {
            setCreateOpen(false);
            setNewName('');
            setCreateError(null);
            setNotice(null);
        }
    }

    // Drop any pending toast timer when the modal closes or unmounts.
    useEffect(() => {
        if (!show) return undefined;
        return () => {
            if (noticeTimer.current) {
                clearTimeout(noticeTimer.current);
                noticeTimer.current = null;
            }
        };
    }, [show]);

    // Focus the first interactive element on open; restore focus on close.
    useEffect(() => {
        if (!show) return undefined;
        const previous = document.activeElement;
        const frame = window.setTimeout(() => {
            const first = panelRef.current?.querySelector(FOCUSABLE);
            if (first && typeof first.focus === 'function') first.focus();
        }, 0);
        return () => {
            window.clearTimeout(frame);
            if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
                previous.focus();
            }
        };
    }, [show]);

    // Escape closes the dialog.
    useEffect(() => {
        if (!show) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [show, onClose]);

    const flashNotice = (message) => {
        setNotice(message);
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = window.setTimeout(() => {
            setNotice(null);
            noticeTimer.current = null;
        }, NOTICE_MS);
    };

    const freshCollectionByName = (name) =>
        useAppStore.getState().collections?.find((c) => c.name === name) || null;

    const freshCollection = (id) =>
        useAppStore.getState().collections?.find((c) => c.id === id) || null;

    const handleAdd = (row) => {
        if (!canSave) return;
        addToCollection(row.id, verse.verseKey, verse.surahName || '', verse.chapterId ?? null);
        flashNotice(addedNotice(row.name));
        onAdded?.(freshCollection(row.id) || row.collection);
    };

    const handleRemove = (row) => {
        if (!canSave) return;
        removeFromCollection(row.id, verse.verseKey);
        flashNotice(removedNotice(row.name));
    };

    const handleCreate = () => {
        if (!canSave) return;
        const error = validateNewCollectionName(newName, list);
        if (error) {
            setCreateError(error);
            return;
        }
        const trimmed = String(newName).trim();
        addCollection(trimmed);
        const created = freshCollectionByName(trimmed);
        if (!created) {
            setCreateError('Could not create the collection — please try again.');
            return;
        }
        if (canSave) {
            addToCollection(created.id, verse.verseKey, verse.surahName || '', verse.chapterId ?? null);
        }
        setNewName('');
        setCreateError(null);
        flashNotice(addedNotice(trimmed));
        onAdded?.(freshCollection(created.id) || created);
    };

    const handleOpenCreate = () => {
        setCreateOpen(true);
        setCreateError(null);
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <Motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="save-to-collection-title"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative max-h-[85vh] w-full max-w-md overflow-hidden rounded-3xl border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 shadow-2xl"
                    >
                        <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-[var(--h-teal)] opacity-5 blur-[40px]" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--h-gold-soft)] text-[var(--h-gold)]">
                                        <FolderPlus size={22} strokeWidth={2.5} />
                                    </span>
                                    <div className="min-w-0">
                                        <h3
                                            id="save-to-collection-title"
                                            className="font-[var(--font-ui)] text-xl font-bold text-[var(--h-ink)]"
                                        >
                                            Save to collection
                                        </h3>
                                        <p className="truncate text-[0.85rem] text-[var(--h-ink-mid)]">
                                            {ctx.label || 'Choose where to save this verse'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--h-ink-mid)] transition-all hover:bg-[var(--h-bone)] hover:text-[var(--h-ink)] active:scale-95"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {list.length > 0 && (
                                <p className="mt-3 text-[0.78rem] font-semibold text-[var(--h-ink-muted)]">
                                    {savedIn > 0
                                        ? `Saved in ${savedIn} of ${list.length} collection${list.length === 1 ? '' : 's'}`
                                        : `${list.length} collection${list.length === 1 ? '' : 's'}`}
                                </p>
                            )}

                            {!empty && (
                                <ul className="mt-2 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                                    {rows.map((row) => (
                                        <li key={row.id}>
                                            {row.contains ? (
                                                <div className="flex items-center gap-3 rounded-2xl border border-[var(--h-teal)]/35 bg-[var(--h-teal-soft)] px-3.5 py-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--h-teal)] text-white">
                                                        <Check size={16} strokeWidth={3} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-start font-bold text-[var(--h-ink)]">
                                                            {row.name || 'Untitled'}
                                                        </span>
                                                        <span className="block text-start text-[0.76rem] text-[var(--h-ink-mid)]">
                                                            {row.verseCount} verse{row.verseCount === 1 ? '' : 's'} · Saved
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemove(row)}
                                                        aria-label={`Remove from ${row.name || 'collection'}`}
                                                        className="shrink-0 rounded-xl bg-[var(--h-cream)] px-3 py-2 text-[0.78rem] font-bold text-[var(--h-ink-mid)] transition-all hover:bg-[var(--h-bone)] hover:text-[var(--h-ink)] active:scale-95"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAdd(row)}
                                                    disabled={!canSave}
                                                    className="group flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-bone)] px-3.5 py-3 text-start transition-all hover:border-[var(--h-teal)]/50 hover:bg-[var(--h-teal-soft)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--h-cream)] text-[var(--h-ink-mid)] transition-colors group-hover:text-[var(--h-teal)]">
                                                        <Plus size={16} strokeWidth={3} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate font-bold text-[var(--h-ink)]">
                                                            {row.name || 'Untitled'}
                                                        </span>
                                                        <span className="block text-[0.76rem] text-[var(--h-ink-mid)]">
                                                            {row.verseCount} verse{row.verseCount === 1 ? '' : 's'}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 text-[0.78rem] font-bold text-[var(--h-teal)]">
                                                        Add
                                                    </span>
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="min-h-[1.4rem] pt-2" aria-live="polite">
                                {notice && (
                                    <p className="flex items-center gap-1.5 text-[0.82rem] font-bold text-[var(--h-teal)]">
                                        <Check size={14} strokeWidth={3} />
                                        {notice}
                                    </p>
                                )}
                            </div>

                            {showCreate ? (
                                <div className="rounded-2xl border-[1.5px] border-dashed border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-3.5">
                                    <p className="mb-2 text-[0.85rem] font-semibold text-[var(--h-ink)]">
                                        {list.length === 0
                                            ? 'You have no collections yet — name one below and this verse will be saved straight into it.'
                                            : 'New collection'}
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            ref={inputRef}
                                            id="add-to-collection-new-name"
                                            type="text"
                                            value={newName}
                                            maxLength={60}
                                            disabled={!canSave}
                                            placeholder="e.g. Morning verses"
                                            onChange={(e) => {
                                                setNewName(e.target.value);
                                                if (createError) setCreateError(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleCreate();
                                                }
                                            }}
                                            aria-label="New collection name"
                                            aria-invalid={Boolean(createError)}
                                            aria-describedby={createError ? 'add-to-collection-error' : undefined}
                                            className="min-w-0 flex-1 rounded-xl border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-3 py-2.5 text-[0.95rem] text-[var(--h-ink)] outline-none transition-colors placeholder:text-[var(--h-ink-muted)] focus:border-[var(--h-teal)]"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreate}
                                            disabled={!canSave}
                                            className="shrink-0 rounded-xl bg-[var(--h-teal)] px-4 py-2.5 font-bold text-white transition-all hover:bg-[var(--h-teal-mid)] active:scale-95 shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Create
                                        </button>
                                    </div>
                                    {createError && (
                                        <p
                                            id="add-to-collection-error"
                                            role="alert"
                                            className="mt-1.5 text-[0.8rem] font-semibold text-red-500"
                                        >
                                            {createError}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleOpenCreate}
                                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[var(--h-bone-dark)] px-4 py-3 font-bold text-[var(--h-ink-mid)] transition-all hover:border-[var(--h-teal)] hover:text-[var(--h-teal)] active:scale-[0.99]"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                    New collection
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-4 w-full rounded-xl bg-[var(--h-teal)] px-6 py-3.5 font-bold text-white transition-all hover:bg-[var(--h-teal-mid)] active:scale-95 shadow-md"
                            >
                                Done
                            </button>
                        </div>
                    </Motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
