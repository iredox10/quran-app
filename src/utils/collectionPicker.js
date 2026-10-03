/**
 * collectionPicker.js — pure helpers for the AddToCollectionModal.
 * No React, no store access: plain data in, plain data out, so every branch
 * (dedupe / saved state, name validation, verse context) is testable in
 * collectionPicker.test.js.
 *
 * Shapes (from useAppStore):
 *   collection = { id, name, items: [{ verseKey, surahName, chapterId }] }
 *   verse      = { verseKey, surahName, chapterId } | null | partial
 */

import { collectionStats, validateCollectionName, parseVerseKey } from './library';

/** Safe string form of a verse key ('' for null/undefined/partial values). */
function keyOf(verseKey) {
    if (verseKey == null) return '';
    return String(verseKey);
}

/**
 * Rows for the picker list — name, verse count, and whether the row already
 * contains `verseKey` (the caller uses `contains` to flip between the
 * "add" affordance and the "Saved / Remove" state).
 * Tolerates null/garbage collections and a missing verse key.
 */
export function pickerRows(collections = [], verseKey = null) {
    const key = keyOf(verseKey);
    return (Array.isArray(collections) ? collections : [])
        .filter(Boolean)
        .map((collection) => {
            const { verseCount } = collectionStats(collection);
            const contains = key
                ? (Array.isArray(collection.items) ? collection.items : []).some(
                      (item) => keyOf(item?.verseKey) === key
                  )
                : false;
            return {
                id: collection.id,
                name: collection.name == null ? '' : String(collection.name),
                verseCount,
                contains,
                collection,
            };
        });
}

/** Display names of existing collections (for duplicate-name checks). */
export function existingCollectionNames(collections = []) {
    return (Array.isArray(collections) ? collections : [])
        .filter(Boolean)
        .map((c) => c?.name)
        .filter((n) => n != null && String(n).length > 0)
        .map((n) => String(n));
}

/** `validateCollectionName` wired up with the names already taken. */
export function validateNewCollectionName(name, collections = []) {
    return validateCollectionName(name, { existingNames: existingCollectionNames(collections) });
}

/**
 * Verse context line for the modal header. Never throws, even when `verse`
 * is null / undefined / missing fields.
 *   -> { surahName, chapterId, ayah, label }
 *   e.g. { surahName: 'Al-Baqarah', chapterId: 2, ayah: 255,
 *          label: 'Al-Baqarah · Ayah 255' }
 */
export function verseContext(verse = null) {
    const surahName = verse?.surahName == null ? '' : String(verse.surahName);
    const { chapterId, ayahNumber } = parseVerseKey(verse?.verseKey);
    const ayahLabel = ayahNumber != null ? `Ayah ${ayahNumber}` : '';
    const label = [surahName, ayahLabel].filter(Boolean).join(' · ');
    return { surahName, chapterId, ayah: ayahNumber, label };
}

/** Toast copy after saving into a collection. */
export function addedNotice(name) {
    const label = name == null || String(name).trim() === '' ? 'collection' : String(name).trim();
    return `Added to “${label}”`;
}

/** Toast copy after removing the verse from a collection. */
export function removedNotice(name) {
    const label = name == null || String(name).trim() === '' ? 'collection' : String(name).trim();
    return `Removed from “${label}”`;
}

/** How many rows already contain the verse ("Saved in 2 of 5"). */
export function savedCount(rows = []) {
    return (Array.isArray(rows) ? rows : []).filter((r) => r?.contains).length;
}
