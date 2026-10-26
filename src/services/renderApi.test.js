import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

// Pure helpers live in renderApi.js; the backend-selectors switch is exercised
// via dynamic imports so `import.meta.env` flips actually re-evaluate the flags.
import {
    TOKEN_KEYS,
    decodeJwtClaims,
    normalizeUser,
    parseTimestamp,
    parseSyncState,
    pickSyncDoc,
} from './renderApi';
import { parseBooleanFlag } from './apiConfig';

const base64urlJson = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

describe('apiConfig.parseBooleanFlag', () => {
    it('accepts true-ish, case/whitespace tolerant; defaults off', () => {
        for (const raw of ['true', ' TRUE ', '1', 'yes', 'on', true]) {
            expect(parseBooleanFlag(raw)).toBe(true);
        }
        for (const raw of ['false', '0', 'off', 'no', '', undefined, null, false]) {
            expect(parseBooleanFlag(raw)).toBe(false);
        }
    });
});

describe('backend selector (VITE_USE_RENDER_API)', () => {
    beforeEach(() => {
        vi.resetModules();
    });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('defaults OFF → auth/sync/realtime come from appwrite.js (byte-identical behavior)', async () => {
        vi.stubEnv('VITE_USE_RENDER_API', 'false');
        const backend = await import('./backend');
        const appwrite = await import('./appwrite');
        expect(backend.cloudBackendId).toBe('appwrite');
        expect(backend.authService).toBe(appwrite.authService);
        expect(backend.syncService).toBe(appwrite.syncService);
        expect(backend.client).toBe(appwrite.client);
        expect(backend.databaseId).toBe(appwrite.databaseId);
        expect(backend.collectionId).toBe(appwrite.collectionId);
    });

    it('VITE_USE_RENDER_API=true swaps the same surface to renderApi.js', async () => {
        vi.stubEnv('VITE_USE_RENDER_API', 'true');
        const backend = await import('./backend');
        const renderApi = await import('./renderApi');
        const appwrite = await import('./appwrite');
        expect(backend.cloudBackendId).toBe('render');
        expect(backend.authService).toBe(renderApi.authService);
        expect(backend.syncService).toBe(renderApi.syncService);
        expect(backend.client).toBe(renderApi.client);
        // Import parity is preserved even where the values differ.
        expect(backend.databaseId).not.toBe(appwrite.databaseId);
        expect(backend.databaseId).toBe(renderApi.databaseId);
        expect(backend.collectionId).toBe(renderApi.collectionId);
    });
});

describe('renderApi.normalizeUser', () => {
    it('aliases the contract id shape onto the Appwrite `$id`', () => {
        expect(normalizeUser({ id: 'u1', email: 'a@b.c', name: 'Ali' })).toEqual({
            $id: 'u1',
            id: 'u1',
            email: 'a@b.c',
            name: 'Ali',
        });
    });

    it('accepts alternate id fields and defaults', () => {
        expect(normalizeUser({ _id: 'u2' })).toEqual({
            $id: 'u2',
            id: 'u2',
            email: null,
            name: null,
        });
        expect(normalizeUser({})).toBeNull();
        expect(normalizeUser(null)).toBeNull();
    });
});

describe('renderApi token decoding', () => {
    it('decodes JWT payload claims (sub/typ/exp)', () => {
        const token = `hdr.${base64urlJson({ sub: 'user-42', typ: 'access', exp: 1700000000 })}.sig`;
        expect(decodeJwtClaims(token)).toEqual({ sub: 'user-42', typ: 'access', exp: 1700000000 });
    });

    it('returns null (not throws) on garbage tokens', () => {
        expect(decodeJwtClaims('not-a-jwt')).toBeNull();
        expect(decodeJwtClaims('a.@@@.c')).toBeNull();
    });
});

describe('renderApi.parseTimestamp', () => {
    it('parses ISO-8601 UTC strings from the contract', () => {
        expect(parseTimestamp('2026-01-02T03:04:05.000Z')).toBe(Date.parse('2026-01-02T03:04:05.000Z'));
    });

    it('passes epoch-ms through and rejects junk', () => {
        expect(parseTimestamp(1234567890)).toBe(1234567890);
        expect(parseTimestamp('nope')).toBeNull();
        expect(parseTimestamp(null)).toBeNull();
    });
});

describe('renderApi sync doc envelope tolerance', () => {
    it('pickSyncDoc unwraps minimal envelopes and list-style arrays', () => {
        const bare = { userId: 'u1', stateData: '{}' };
        expect(pickSyncDoc(bare)).toBe(bare);
        expect(pickSyncDoc({ doc: bare, updatedAt: 1 })).toBe(bare);
        expect(pickSyncDoc({ sync: bare })).toBe(bare);
        expect(pickSyncDoc([bare])).toBe(bare);
        expect(pickSyncDoc(null)).toBeNull();
    });

    it('parseSyncState parses the JSON-stringified stateData (same field name as appwrite.js)', () => {
        expect(parseSyncState({ stateData: JSON.stringify({ bookmarks: [] }) })).toEqual({ bookmarks: [] });
        expect(parseSyncState({ stateData: { bookmarks: [] } })).toEqual({ bookmarks: [] });
        expect(parseSyncState({ state: JSON.stringify({ a: 1 }) })).toEqual({ a: 1 });
        expect(parseSyncState({ userId: 'u1' })).toBeNull();
    });

    it('token keys are namespaced away from Appwrite values', () => {
        expect(TOKEN_KEYS.access).toContain('quran-nur.render.');
        expect(TOKEN_KEYS.refresh).toContain('quran-nur.render.');
        expect(TOKEN_KEYS.user).toContain('quran-nur.render.');
    });
});
