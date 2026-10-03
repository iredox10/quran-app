import React from 'react';

/**
 * AddToCollectionModal — pick or create a collection for a single verse.
 *
 * PROPS CONTRACT (fixed across agents — do not change):
 *   open    — boolean
 *   verse   — { verseKey, surahName, chapterId } | null
 *   onClose — () => void
 *   onAdded — optional (collection) => void, called after a successful add
 *
 * Placeholder implementation — filled in by the modal workstream.
 */
export default function AddToCollectionModal(props) {
    if (!props.open || !props.verse) return null;
    return null;
}
