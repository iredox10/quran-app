import React from 'react';

/**
 * VersePreview — renders the Arabic text + translation of a single ayah.
 *
 * PROPS CONTRACT (fixed across agents — do not change):
 *   verseKey  — '2:255'
 *   chapterId — 2
 *   surahName — 'Al-Baqara' (used as fallback / query label)
 *   compact   — boolean, tighter typography for list rows
 *
 * Must never throw or break the parent layout: show a skeleton while loading
 * and render nothing (or a tiny placeholder) when the fetch fails / offline.
 *
 * Placeholder implementation — filled in by the verse-preview workstream.
 */
export default function VersePreview({ verseKey }) {
    if (!verseKey) return null;
    return null;
}
