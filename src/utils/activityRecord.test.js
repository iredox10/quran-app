import { describe, it, expect } from 'vitest';
import {
    MAX_LOG_MINUTES,
    MINUTES_CHIPS,
    normalizeLogType,
    normalizeChapterId,
    validateMinutes,
    buildSessionLog,
} from './activityRecord';

describe('minutes validation', () => {
    it('accepts positive integers as strings or numbers', () => {
        expect(validateMinutes(10)).toMatchObject({ valid: true, minutes: 10, capped: false });
        expect(validateMinutes('25')).toMatchObject({ valid: true, minutes: 25, capped: false });
        expect(validateMinutes('  5  ')).toMatchObject({ valid: true, minutes: 5 });
    });

    it('rejects empty, non-numeric and non-positive input', () => {
        expect(validateMinutes('').valid).toBe(false);
        expect(validateMinutes('   ').valid).toBe(false);
        expect(validateMinutes(null).valid).toBe(false);
        expect(validateMinutes(undefined).valid).toBe(false);
        expect(validateMinutes('abc').valid).toBe(false);
        expect(validateMinutes(0).valid).toBe(false);
        expect(validateMinutes(-15).valid).toBe(false);
        expect(validateMinutes('').error).toBeTruthy();
    });

    it('rounds decimal minutes to whole minutes', () => {
        expect(validateMinutes('7.4').minutes).toBe(7);
        expect(validateMinutes('7.6').minutes).toBe(8);
    });

    it('caps at MAX_LOG_MINUTES and flags it', () => {
        const result = validateMinutes(1000);
        expect(result).toMatchObject({ valid: true, minutes: MAX_LOG_MINUTES, capped: true });
        expect(validateMinutes(MAX_LOG_MINUTES).capped).toBe(false);
    });

    it('exposes quick-pick chips', () => {
        expect(MINUTES_CHIPS).toEqual([5, 10, 15, 30]);
    });
});

describe('type + chapter normalization', () => {
    it('keeps known types and falls back to reading', () => {
        expect(normalizeLogType('memorizing')).toBe('memorizing');
        expect(normalizeLogType('listening')).toBe('listening');
        expect(normalizeLogType('pomodoro')).toBe('pomodoro');
        expect(normalizeLogType('dancing')).toBe('reading');
        expect(normalizeLogType(undefined)).toBe('reading');
    });

    it('accepts valid chapter ids as numbers', () => {
        expect(normalizeChapterId(1)).toBe(1);
        expect(normalizeChapterId('114')).toBe(114);
        expect(normalizeChapterId(' 2 ')).toBe(2);
    });

    it('rejects unusable chapter ids', () => {
        expect(normalizeChapterId(null)).toBeNull();
        expect(normalizeChapterId('')).toBeNull();
        expect(normalizeChapterId('   ')).toBeNull();
        expect(normalizeChapterId('abc')).toBeNull();
        expect(normalizeChapterId(0)).toBeNull();
        expect(normalizeChapterId(115)).toBeNull();
        expect(normalizeChapterId(3.5)).toBeNull();
    });
});

describe('buildSessionLog', () => {
    it('builds a store-ready payload', () => {
        expect(buildSessionLog({ type: 'memorizing', minutes: 15, chapterId: '2' })).toEqual({
            ok: true,
            duration: 900,
            type: 'memorizing',
            chapterId: 2,
            capped: false,
        });
    });

    it('defaults type and chapter id', () => {
        expect(buildSessionLog({ minutes: '10' })).toEqual({
            ok: true,
            duration: 600,
            type: 'reading',
            chapterId: null,
            capped: false,
        });
    });

    it('reports capped entries in the payload', () => {
        const result = buildSessionLog({ type: 'listening', minutes: 900 });
        expect(result.ok).toBe(true);
        expect(result.duration).toBe(MAX_LOG_MINUTES * 60);
        expect(result.capped).toBe(true);
    });

    it('fails on invalid minutes with a readable error', () => {
        const result = buildSessionLog({ type: 'reading', minutes: 'soon' });
        expect(result.ok).toBe(false);
        expect(typeof result.error).toBe('string');
        expect(buildSessionLog({ minutes: 0 }).ok).toBe(false);
        expect(buildSessionLog().ok).toBe(false);
    });
});
