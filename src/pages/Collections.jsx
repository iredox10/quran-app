import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Check,
    ChevronRight,
    Folder,
    FolderPlus,
    Pencil,
    Plus,
    Search,
    SearchX,
    Trash2,
    X,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
    collectionStats,
    groupBySurah,
    normalizeQuery,
    parseVerseKey,
    searchCollections,
    timeAgo,
    validateCollectionName,
} from '../utils/library';

const PREVIEW_COUNT = 3;

const FOCUSABLE =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--h-cream)]';

const MICRO = 'font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)]';

const ICON_BTN = `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-transparent text-[var(--text-secondary)] transition-colors hover:border-[var(--h-bone-dark)] hover:bg-[var(--h-bone)] hover:text-[var(--text-primary)] ${FOCUSABLE}`;

const DANGER_ICON_BTN = `${ICON_BTN} hover:border-[#dc2626] hover:bg-[rgba(220,38,38,0.1)] hover:text-[#dc2626]`;

const GHOST_PILL = `inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] ${FOCUSABLE}`;

const PRIMARY_PILL = `inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-[var(--accent-primary)] bg-[var(--accent-primary)] px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-widest text-white transition-colors hover:bg-[var(--accent-hover)] hover:text-white ${FOCUSABLE}`;

const TEXT_INPUT =
    'min-w-0 flex-1 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] px-4 py-2.5 font-ui text-[0.95rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)]';

function EmptyState({ icon, title, message, action }) {
    const Icon = icon;
    return (
        <div className="py-14 text-center">
            <Icon size={40} className="mx-auto mb-4 text-[var(--accent-primary)]/60" />
            <h3 className="mb-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">{title}</h3>
            <p className="mx-auto max-w-[420px] text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">{message}</p>
            {action}
        </div>
    );
}

function CollectionCard({
    collection,
    renaming,
    renameValue,
    renameError,
    onRenameChange,
    onStartRename,
    onCancelRename,
    onCommitRename,
    onDelete,
}) {
    const items = collection.items || [];
    const { verseCount, surahCount } = collectionStats(collection);
    const preview = items.slice(0, PREVIEW_COUNT);
    const rest = items.slice(PREVIEW_COUNT);
    const restSurahCount = rest.length > 0 ? groupBySurah(rest).length : 0;
    const restNote =
        rest.length > 0
            ? `+${rest.length} more ${rest.length === 1 ? 'verse' : 'verses'}${
                  restSurahCount > 1 ? ` across ${restSurahCount} surahs` : ''
              }`
            : '';
    const createdAt = Number.isFinite(collection.createdAt)
        ? collection.createdAt
        : typeof collection.id === 'number' && collection.id > 1e12
          ? collection.id
          : null;
    const createdLabel = createdAt ? timeAgo(createdAt) : '';
    const renameInputId = `rename-collection-${collection.id}`;

    return (
        <article className="group relative flex flex-col rounded-[20px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] p-5 transition-colors hover:border-[var(--accent-primary)]">
            {renaming ? (
                <form noValidate className="flex flex-col gap-2.5" onSubmit={(e) => onCommitRename(e, collection)}>
                    <label htmlFor={renameInputId} className={MICRO}>
                        Collection name
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            id={renameInputId}
                            type="text"
                            value={renameValue}
                            autoFocus
                            onChange={(e) => onRenameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    onCancelRename();
                                }
                            }}
                            aria-invalid={renameError ? 'true' : undefined}
                            aria-describedby={renameError ? `${renameInputId}-error` : undefined}
                            className={`${TEXT_INPUT} border-[var(--accent-primary)] py-2`}
                        />
                        <button type="submit" aria-label={`Save the new name for ${collection.name}`} className={ICON_BTN}>
                            <Check size={15} />
                        </button>
                        <button type="button" onClick={onCancelRename} aria-label="Cancel renaming" className={ICON_BTN}>
                            <X size={15} />
                        </button>
                    </div>
                    {renameError && (
                        <p id={`${renameInputId}-error`} role="alert" className="text-[0.75rem] text-[#dc2626]">
                            {renameError}
                        </p>
                    )}
                </form>
            ) : (
                <Link
                    to={`/collections/${collection.id}`}
                    aria-label={`Open collection ${collection.name}`}
                    className={`flex flex-1 flex-col gap-3 rounded-[12px] no-underline text-inherit ${FOCUSABLE}`}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="truncate font-ui text-[1.2rem] font-bold leading-snug text-[var(--text-primary)]">
                                {collection.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                                <span>
                                    {verseCount} {verseCount === 1 ? 'verse' : 'verses'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                    {surahCount} {surahCount === 1 ? 'surah' : 'surahs'}
                                </span>
                                {createdLabel && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span>Created {createdLabel}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <ChevronRight
                            size={16}
                            className="mt-1 shrink-0 text-[var(--text-secondary)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--accent-primary)]"
                        />
                    </div>

                    {items.length === 0 ? (
                        <p className="rounded-[12px] border-[1.5px] border-dashed border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-3 py-3 text-center text-[0.78rem] leading-[1.5] text-[var(--text-secondary)]">
                            No verses yet — open the collection to start filling it.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {preview.map((item) => {
                                const { ayahNumber } = parseVerseKey(item.verseKey);
                                const ayahLabel = ayahNumber !== null ? `Ayah ${ayahNumber}` : String(item.verseKey || '');
                                return (
                                    <div
                                        key={item.verseKey}
                                        className="flex items-center justify-between gap-2 rounded-[12px] border-[1.5px] border-transparent bg-[var(--h-cream)] px-3 py-2 transition-colors group-hover:border-[var(--h-bone-dark)]"
                                    >
                                        <span className="truncate font-ui text-[0.95rem] font-semibold text-[var(--text-primary)]">
                                            {item.surahName}
                                        </span>
                                        <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                                            {ayahLabel}
                                        </span>
                                    </div>
                                );
                            })}
                            {restNote && <p className="px-1 pt-0.5 text-[0.72rem] text-[var(--text-secondary)]">{restNote}</p>}
                        </div>
                    )}
                </Link>
            )}

            <div className="mt-3 flex items-center justify-end gap-1 border-t-[1.5px] border-[var(--h-bone-dark)] pt-2.5">
                {!renaming && (
                    <button
                        type="button"
                        onClick={() => onStartRename(collection)}
                        aria-label={`Rename ${collection.name}`}
                        className={ICON_BTN}
                    >
                        <Pencil size={15} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onDelete(collection)}
                    aria-label={`Delete ${collection.name}`}
                    className={DANGER_ICON_BTN}
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </article>
    );
}

export default function Collections() {
    const { collections, addCollection, renameCollection, deleteCollection, confirm, setNavHeaderTitle } = useAppStore();
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [newName, setNewName] = useState('');
    const [createError, setCreateError] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameError, setRenameError] = useState(null);
    const createInputRef = useRef(null);

    useEffect(() => {
        setNavHeaderTitle('Collections');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const items = useMemo(() => collections || [], [collections]);
    const existingNames = useMemo(() => items.map((c) => c.name), [items]);
    const filtered = useMemo(() => searchCollections(items, query), [items, query]);
    const hasQuery = normalizeQuery(query).length > 0;
    const countLabel = `${items.length} ${items.length === 1 ? 'collection' : 'collections'}`;

    const handleBack = useCallback(() => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/library');
    }, [navigate]);

    const handleCreate = useCallback(
        (e) => {
            e.preventDefault();
            const error = validateCollectionName(newName, { existingNames });
            if (error) {
                setCreateError(error);
                return;
            }
            addCollection(newName.trim());
            setNewName('');
            setCreateError(null);
        },
        [newName, existingNames, addCollection]
    );

    const handleRenameChange = (value) => {
        setRenameValue(value);
        if (renameError) setRenameError(null);
    };

    const startRename = (collection) => {
        setRenamingId(collection.id);
        setRenameValue(collection.name);
        setRenameError(null);
    };

    const cancelRename = () => {
        setRenamingId(null);
        setRenameValue('');
        setRenameError(null);
    };

    const commitRename = (e, collection) => {
        e.preventDefault();
        const error = validateCollectionName(renameValue, { existingNames, ignoreName: collection.name });
        if (error) {
            setRenameError(error);
            return;
        }
        const trimmed = renameValue.trim();
        if (trimmed !== collection.name) renameCollection(collection.id, trimmed);
        cancelRename();
    };

    const handleDelete = async (collection) => {
        const { verseCount } = collectionStats(collection);
        const message = `Delete "${collection.name}" and its ${verseCount} ${verseCount === 1 ? 'verse' : 'verses'}?`;
        const ok = await confirm(message);
        if (ok) deleteCollection(collection.id);
    };

    const focusCreateInput = () => {
        createInputRef.current?.focus();
        createInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const cards = filtered.map((collection) => (
        <CollectionCard
            key={collection.id}
            collection={collection}
            renaming={renamingId === collection.id}
            renameValue={renameValue}
            renameError={renameError}
            onRenameChange={handleRenameChange}
            onStartRename={startRename}
            onCancelRename={cancelRename}
            onCommitRename={commitRename}
            onDelete={handleDelete}
        />
    ));

    let body;
    if (items.length === 0) {
        body = (
            <EmptyState
                icon={FolderPlus}
                title="No collections yet"
                message="Collections group the verses you are working on — a surah at a time, a hifdh plan, or the ayat you want to revisit."
                action={
                    <button type="button" onClick={focusCreateInput} className={PRIMARY_PILL}>
                        <Plus size={13} /> Create your first collection
                    </button>
                }
            />
        );
    } else if (filtered.length === 0 && hasQuery) {
        body = (
            <EmptyState
                icon={SearchX}
                title={`No collections for \u201c${query.trim()}\u201d`}
                message="Collections match by their name, or by any surah name stored inside them."
                action={
                    <button type="button" onClick={() => setQuery('')} className={`mt-5 ${GHOST_PILL}`}>
                        <X size={13} /> Clear search
                    </button>
                }
            />
        );
    } else {
        body = (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">{cards}</div>
        );
    }

    return (
        <div className="mx-auto max-w-[1200px] px-4 pb-20 text-[var(--text-primary)]">
            <div className="pt-6">
                <button
                    type="button"
                    onClick={handleBack}
                    className={`mb-4 inline-flex items-center gap-1.5 rounded-full font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)] ${FOCUSABLE}`}
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div className="mb-6 text-center">
                    <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Library · {countLabel}
                    </span>
                    <h1 className="font-ui text-[1.75rem] font-bold text-[var(--text-primary)]">Collections</h1>
                    <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">
                        Group the verses you are working on into custom sets for focused study and hifdh.
                    </p>
                </div>

                <div className="mb-6 rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                        <form noValidate onSubmit={handleCreate} className="min-w-0 flex-1">
                            <label htmlFor="new-collection-name" className={`mb-1.5 block ${MICRO}`}>
                                New collection
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="new-collection-name"
                                    ref={createInputRef}
                                    type="text"
                                    value={newName}
                                    onChange={(e) => {
                                        setNewName(e.target.value);
                                        if (createError) setCreateError(null);
                                    }}
                                    placeholder="e.g. Surah Mulk review"
                                    aria-invalid={createError ? 'true' : undefined}
                                    aria-describedby={createError ? 'new-collection-error' : undefined}
                                    className={TEXT_INPUT}
                                />
                                <button type="submit" className={PRIMARY_PILL}>
                                    <Plus size={13} /> Create
                                </button>
                            </div>
                            {createError && (
                                <p id="new-collection-error" role="alert" className="mt-1.5 text-[0.75rem] text-[#dc2626]">
                                    {createError}
                                </p>
                            )}
                        </form>

                        {items.length > 0 && (
                            <div className="w-full md:w-80">
                                <label htmlFor="collection-search" className={`mb-1.5 block ${MICRO}`}>
                                    Search
                                </label>
                                <div className="relative">
                                    <Search
                                        size={16}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                                    />
                                    <input
                                        id="collection-search"
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Name or surah..."
                                        className="w-full rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] py-2.5 pl-11 pr-10 font-ui text-[0.9rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)]"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            aria-label="Clear collection search"
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--h-bone)] hover:text-[var(--text-primary)] ${FOCUSABLE}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="mt-4 flex items-center gap-1.5 text-[0.78rem] leading-[1.5] text-[var(--text-secondary)]">
                        <Folder size={13} className="shrink-0" />
                        While reading, tap the folder icon on any verse to file it into a collection.
                    </p>
                </div>

                <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
                    <div className="mb-4 flex items-baseline justify-between gap-3 px-1">
                        <div className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            <Folder size={13} /> Collections
                        </div>
                        <div className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            {hasQuery ? `${filtered.length} of ${countLabel}` : countLabel}
                        </div>
                    </div>
                    {body}
                </div>
            </div>
        </div>
    );
}
