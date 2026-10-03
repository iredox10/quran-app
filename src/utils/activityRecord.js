/**
 * activityRecord.js — pure validation + payload helpers for recording an
 * activity session manually (Activity Flow "Log activity" form) before it is
 * handed to `logReadingSession(durationSeconds, type, chapterId)` in the store.
 *
 * Kept separate from `activity.js` (shared, read-only) so recording rules can
 * be unit tested on their own.
 */

import { ACTIVITY_TYPES } from './activity';

/** Hard ceiling for a single manual entry (minutes). */
export const MAX_LOG_MINUTES = 600;

/** Minimum seconds before an auto-tracked session is worth logging (see Surah.jsx). */
export const MIN_LOG_SECONDS = 10;

/** Quick-pick chips offered next to the minutes input. */
export const MINUTES_CHIPS = [5, 10, 15, 30];

/** Coerce an activity type to one the store understands (falls back to reading). */
export function normalizeLogType(type) {
    return ACTIVITY_TYPES.includes(type) ? type : 'reading';
}

/** Coerce a chapter/surah id to a positive integer ≤ 114, or null when unusable. */
export function normalizeChapterId(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (raw === '') return null;
    const num = Number(raw);
    if (!Number.isInteger(num) || num < 1 || num > 114) return null;
    return num;
}

/**
 * Validate a minutes entry coming from a number input (number or string).
 * Accepts decimals by rounding, caps at MAX_LOG_MINUTES.
 *
 * @returns {{valid: boolean, minutes: number|null, capped: boolean, error: string|null}}
 */
export function validateMinutes(value) {
    const raw = typeof value === 'number' ? value : String(value ?? '').trim();
    if (raw === '') {
        return { valid: false, minutes: null, capped: false, error: 'Enter how many minutes you logged.' };
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
        return { valid: false, minutes: null, capped: false, error: 'Minutes must be a number.' };
    }
    const minutes = Math.round(num);
    if (minutes < 1) {
        return { valid: false, minutes: null, capped: false, error: 'Minutes must be at least 1.' };
    }
    const capped = minutes > MAX_LOG_MINUTES;
    return { valid: true, minutes: Math.min(minutes, MAX_LOG_MINUTES), capped, error: null };
}

/**
 * Build the arguments for `logReadingSession` from raw form values.
 *
 * @returns {{ok: true, duration: number, type: string, chapterId: number|null, capped: boolean}
 *         | {ok: false, error: string}}
 */
export function buildSessionLog({ type, minutes, chapterId } = {}) {
    const mins = validateMinutes(minutes);
    if (!mins.valid) return { ok: false, error: mins.error };
    return {
        ok: true,
        duration: mins.minutes * 60,
        type: normalizeLogType(type),
        chapterId: normalizeChapterId(chapterId),
        capped: mins.capped,
    };
}
