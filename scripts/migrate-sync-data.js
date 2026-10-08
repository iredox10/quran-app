#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client, Databases, Query, ID } from 'node-appwrite';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const ENV_FILE = path.join(REPO_ROOT, '.env');

const PROD_DATABASE_ID = '6a37bb9800198870525c';
const PROD_COLLECTION_ID = 'your_user_data_collection_id';
const CANONICAL_DATABASE_ID = 'quran_db';
const CANONICAL_COLLECTION_ID = 'user_sync';

const DEFAULT_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const DEFAULT_PROJECT_ID = '69ac08e1000402826be5';
const STATE_LIMIT = 1000000;
const PAGE_SIZE = 100;

let mergeStateInto = null;
let slimStatePayload = null;

function usage() {
    console.log([
        'migrate-sync-data — one-shot merge of legacy sync documents into the canonical collection.',
        '',
        'Usage:',
        '  node scripts/migrate-sync-data.js [--dry-run] [--write]',
        '  node scripts/migrate-sync-data.js --help',
        '',
        'Flags:',
        '  --dry-run   Compute every merge and print the report; write nothing (default).',
        '  --write     Upsert the merged payloads into quran_db/user_sync.',
        '  --help      Show this help and exit.',
        '',
        `Environment (read from ${ENV_FILE}; process env takes precedence):`,
        '  APPWRITE_API_KEY          required — project API key (never printed)',
        `  VITE_APPWRITE_ENDPOINT    optional — default ${DEFAULT_ENDPOINT}`,
        `  VITE_APPWRITE_PROJECT_ID  optional — default ${DEFAULT_PROJECT_ID}`,
        '',
        'Sources (read-only inputs, never modified):',
        `  prod  ${PROD_DATABASE_ID} / ${PROD_COLLECTION_ID}`,
        `  dev   ${CANONICAL_DATABASE_ID} / ${CANONICAL_COLLECTION_ID} (also the canonical target)`,
    ].join('\n'));
}

function parseArgs(argv) {
    const opts = { help: false, write: false, dryRun: false, unknown: [] };
    for (const arg of argv) {
        if (arg === '--help' || arg === '-h') opts.help = true;
        else if (arg === '--write') opts.write = true;
        else if (arg === '--dry-run') opts.dryRun = true;
        else opts.unknown.push(arg);
    }
    return opts;
}

function loadEnvFile(file) {
    const out = {};
    if (!fs.existsSync(file)) return out;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.*)$/);
        if (!m) continue;
        let value = m[2].trim();
        if (value.length >= 2) {
            const quote = value[0];
            if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
                value = value.slice(1, -1);
            }
        }
        out[m[1]] = value;
    }
    return out;
}

function resolveEnv(fileEnv, key, fallback) {
    const fromShell = process.env[key];
    const fromFile = fileEnv[key];
    const value = fromShell !== undefined && fromShell !== '' ? fromShell : fromFile;
    if (value === undefined || value === '') return fallback;
    return value;
}

function formatError(err) {
    if (!err) return String(err);
    const msg = err.message || String(err);
    const code = err.code ? ` [code ${err.code}]` : '';
    return `${msg}${code}`;
}

function formatNum(n) {
    return Number(n).toLocaleString('en-US');
}

function sortDocs(docs) {
    return [...docs].sort((a, b) => {
        const ca = String(a.$createdAt || '');
        const cb = String(b.$createdAt || '');
        if (ca !== cb) return ca < cb ? -1 : 1;
        return String(a.$id || '') < String(b.$id || '') ? -1 : 1;
    });
}

async function listAllDocuments(databases, databaseId, collectionId, label) {
    const docs = [];
    let cursor = null;
    let pages = 0;
    for (;;) {
        pages += 1;
        if (pages > 1000) {
            throw new Error(`pagination runaway while listing ${label}`);
        }
        const queries = [Query.limit(PAGE_SIZE)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        let res;
        try {
            res = await databases.listDocuments(databaseId, collectionId, queries);
        } catch (err) {
            throw new Error(`failed to list ${label} (${databaseId}/${collectionId}): ${formatError(err)}`);
        }
        docs.push(...res.documents);
        if (res.documents.length < PAGE_SIZE) break;
        cursor = res.documents[res.documents.length - 1].$id;
        if (!cursor) break;
    }
    return docs;
}

function groupByUser(docs) {
    const map = new Map();
    const unassigned = [];
    for (const doc of docs) {
        const uid = typeof doc.userId === 'string' ? doc.userId.trim() : '';
        if (!uid) {
            unassigned.push(doc);
            continue;
        }
        if (!map.has(uid)) map.set(uid, []);
        map.get(uid).push(doc);
    }
    return { map, unassigned };
}

function parseSourceDocs(docs, label, stats) {
    const sorted = sortDocs(docs);
    if (sorted.length > 1) {
        stats.notes.push(`${label}: ${sorted.length} docs for one user — folded oldest to newest via mergeStateInto`);
    }
    let state = null;
    let rawChars = 0;
    for (const doc of sorted) {
        const raw = doc.stateData;
        if (typeof raw !== 'string' || raw.length === 0) {
            stats.parseFailures += 1;
            stats.notes.push(`${label}: doc ${doc.$id} has no stateData — that doc is skipped`);
            continue;
        }
        rawChars += raw.length;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            stats.parseFailures += 1;
            stats.notes.push(`${label}: doc ${doc.$id} stateData is invalid JSON (${formatError(err)}) — that doc is skipped`);
            continue;
        }
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            stats.parseFailures += 1;
            stats.notes.push(`${label}: doc ${doc.$id} stateData is not a JSON object — that doc is skipped`);
            continue;
        }
        state = state === null ? parsed : mergeStateInto(state, parsed);
    }
    return { state, rawChars };
}

async function planUser(userId, prodDocs, devDocs, databases, stats) {
    const row = {
        userId,
        src: prodDocs && devDocs ? 'prod+dev' : prodDocs ? 'prod' : 'dev',
        prodChars: null,
        devChars: null,
        mergedChars: null,
        slimChars: null,
        action: 'error',
        decreased: null,
        docId: null,
        json: null,
        error: null,
    };

    const prod = prodDocs ? parseSourceDocs(prodDocs, 'prod', stats) : null;
    const dev = devDocs ? parseSourceDocs(devDocs, 'dev', stats) : null;
    if (prod) row.prodChars = prod.rawChars;
    if (dev) row.devChars = dev.rawChars;

    const prodState = prod ? prod.state : null;
    const devState = dev ? dev.state : null;
    if (!prodState && !devState) {
        row.error = 'no usable state in any source (all docs missing or unparseable)';
        return row;
    }

    const merged = prodState && devState ? mergeStateInto(devState, prodState) : (prodState || devState);
    row.mergedChars = JSON.stringify(merged).length;

    let payload;
    try {
        payload = slimStatePayload(merged);
    } catch (err) {
        row.error = `slimStatePayload failed: ${formatError(err)}`;
        return row;
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        row.error = 'slimStatePayload returned a non-object payload';
        return row;
    }

    const json = JSON.stringify(payload);
    if (json.length > STATE_LIMIT) {
        row.error = `assertion failed: payload is ${json.length} chars, limit is ${STATE_LIMIT}`;
        return row;
    }
    row.json = json;
    row.slimChars = json.length;

    const largestSource = Math.max(prod ? prod.rawChars : 0, dev ? dev.rawChars : 0);
    row.decreased = json.length < largestSource;

    let existing;
    try {
        const res = await databases.listDocuments(CANONICAL_DATABASE_ID, CANONICAL_COLLECTION_ID, [
            Query.equal('userId', [userId]),
            Query.limit(PAGE_SIZE),
        ]);
        existing = sortDocs(res.documents);
    } catch (err) {
        row.error = `canonical lookup failed: ${formatError(err)}`;
        return row;
    }

    if (existing.length === 0) {
        row.action = 'create';
        return row;
    }
    const doc = existing[0];
    row.docId = doc.$id;
    if (existing.length > 1) {
        stats.notes.push(`canonical: ${existing.length} docs for user ${userId} — using oldest ${doc.$id}, extras left untouched`);
    }
    row.action = doc.stateData === row.json ? 'skip' : 'update';
    return row;
}

function printPlanTable(rows) {
    if (rows.length === 0) {
        console.log('(no users found in either source)');
        return;
    }
    const header = ['userId', 'src', 'prodChars', 'devChars', 'mergedChars', 'slimChars', 'action', 'decreased'];
    const cells = rows.map(r => [
        r.userId,
        r.src,
        r.prodChars === null ? '-' : formatNum(r.prodChars),
        r.devChars === null ? '-' : formatNum(r.devChars),
        r.mergedChars === null ? '-' : formatNum(r.mergedChars),
        r.slimChars === null ? '-' : formatNum(r.slimChars),
        r.action,
        r.decreased === null ? '-' : r.decreased ? 'yes' : 'no',
    ]);
    const all = [header, ...cells];
    const widths = header.map((_, i) => Math.max(...all.map(r => r[i].length)));
    const fmt = r => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');
    console.log(fmt(header));
    console.log(widths.map(w => '-'.repeat(w)).join('  '));
    for (const cell of cells) console.log(fmt(cell));
}

async function writeRow(databases, row) {
    if (row.action === 'error') return 'error';
    if (row.action === 'skip') {
        console.log(`SKIP   user=${row.userId} doc=${row.docId} (canonical already matches, ${formatNum(row.slimChars)} chars)`);
        return 'skip';
    }
    try {
        if (row.action === 'create') {
            const doc = await databases.createDocument({
                databaseId: CANONICAL_DATABASE_ID,
                collectionId: CANONICAL_COLLECTION_ID,
                documentId: ID.unique(),
                data: { userId: row.userId, stateData: row.json },
            });
            row.docId = doc.$id;
            console.log(`CREATE user=${row.userId} doc=${doc.$id} chars=${formatNum(row.slimChars)}`);
        } else {
            await databases.updateDocument({
                databaseId: CANONICAL_DATABASE_ID,
                collectionId: CANONICAL_COLLECTION_ID,
                documentId: row.docId,
                data: { stateData: row.json },
            });
            console.log(`UPDATE user=${row.userId} doc=${row.docId} chars=${formatNum(row.slimChars)}`);
        }
        return row.action;
    } catch (err) {
        console.error(`FAILED user=${row.userId}: ${formatError(err)}`);
        return 'failed';
    }
}

function printSummary(rows, stats, write, writeCounts, canonicalAll, orphans) {
    const both = rows.filter(r => r.src === 'prod+dev').length;
    const prodOnly = rows.filter(r => r.src === 'prod').length;
    const devOnly = rows.filter(r => r.src === 'dev').length;
    const beforeAllSources = rows.reduce((s, r) => s + (r.prodChars || 0) + (r.devChars || 0), 0);
    const beforeLargest = rows.reduce(
        (s, r) => s + Math.max(r.prodChars || 0, r.devChars || 0), 0);
    const after = rows.reduce((s, r) => s + (r.slimChars || 0), 0);
    const planned = { create: 0, update: 0, skip: 0, error: 0 };
    for (const r of rows) planned[r.action] = (planned[r.action] || 0) + 1;

    console.log('');
    console.log('==================== Summary ====================');
    console.log(`Mode:                      ${write ? 'WRITE' : 'DRY RUN (nothing written)'}`);
    console.log(`Users processed:           ${rows.length} (both: ${both}, prod only: ${prodOnly}, dev only: ${devOnly})`);
    console.log(`StateData parse failures:  ${stats.parseFailures} (docs skipped, see notes)`);
    console.log(`Bytes before (all source stateData): ${formatNum(beforeAllSources)}`);
    console.log(`Bytes before (largest source/user):  ${formatNum(beforeLargest)}`);
    console.log(`Bytes after  (merged + slim):        ${formatNum(after)}`);
    console.log(`Canonical docs before:      ${canonicalAll.length} (orphans left untouched: ${orphans})`);
    console.log(`Planned actions:            create ${planned.create}, update ${planned.update}, skip ${planned.skip}, error ${planned.error}`);
    if (write) {
        console.log(`Writes:                     created ${writeCounts.create}, updated ${writeCounts.update}, skipped ${writeCounts.skip}, failed ${writeCounts.failed}`);
    }
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.unknown.length > 0) {
        console.error(`Unknown flag(s): ${opts.unknown.join(' ')}`);
        console.error('Run with --help for usage.');
        process.exit(2);
    }
    if (opts.write && opts.dryRun) {
        console.error('Conflicting flags: --write and --dry-run.');
        process.exit(2);
    }
    if (opts.help) {
        usage();
        process.exit(0);
    }
    const write = opts.write;

    const fileEnv = loadEnvFile(ENV_FILE);
    const endpoint = resolveEnv(fileEnv, 'VITE_APPWRITE_ENDPOINT', DEFAULT_ENDPOINT);
    const projectId = resolveEnv(fileEnv, 'VITE_APPWRITE_PROJECT_ID', DEFAULT_PROJECT_ID);
    const apiKey = resolveEnv(fileEnv, 'APPWRITE_API_KEY', undefined);
    if (!apiKey) {
        console.error(`APPWRITE_API_KEY not found in ${ENV_FILE} and not set in the environment.`);
        console.error('Set it there (never committed) or export it before running.');
        process.exit(1);
    }

    try {
        const mod = await import('../src/utils/syncMerge.js');
        mergeStateInto = mod.mergeStateInto;
        slimStatePayload = mod.slimStatePayload;
    } catch (err) {
        console.error(`Could not load ${path.join(REPO_ROOT, 'src/utils/syncMerge.js')}.`);
        console.error('The merge/slim helpers may still be mid-edit by another agent, or have a syntax error.');
        console.error(`Details: ${formatError(err)}`);
        process.exit(1);
    }
    const missing = [];
    if (typeof mergeStateInto !== 'function') missing.push('mergeStateInto');
    if (typeof slimStatePayload !== 'function') missing.push('slimStatePayload');
    if (missing.length > 0) {
        console.error(`src/utils/syncMerge.js is missing required export(s): ${missing.join(', ')}.`);
        console.error('The merge/slim helpers may still be in progress — re-run once they land.');
        process.exit(1);
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);

    console.log(`Mode:       ${write ? 'WRITE' : 'DRY RUN (default; no writes)'}`);
    console.log(`Endpoint:   ${endpoint}`);
    console.log(`Project:    ${projectId}`);
    console.log('API key:    loaded (hidden)');
    console.log('');

    const canonicalAll = await listAllDocuments(
        databases, CANONICAL_DATABASE_ID, CANONICAL_COLLECTION_ID, 'dev/canonical collection');
    const prodDocs = await listAllDocuments(
        databases, PROD_DATABASE_ID, PROD_COLLECTION_ID, 'prod source');
    const devDocs = canonicalAll;

    const stats = { notes: [], parseFailures: 0 };
    const prodGrouped = groupByUser(prodDocs);
    const devGrouped = groupByUser(devDocs);
    for (const doc of prodGrouped.unassigned) {
        stats.notes.push(`prod: doc ${doc.$id} has no userId — cannot migrate, left untouched`);
    }
    for (const doc of devGrouped.unassigned) {
        stats.notes.push(`dev: doc ${doc.$id} has no userId — cannot migrate, left untouched`);
    }

    const userIds = [...prodGrouped.map.keys(), ...devGrouped.map.keys()]
        .filter((uid, i, arr) => arr.indexOf(uid) === i);

    const canonicalUsers = new Set(canonicalAll.map(d => (typeof d.userId === 'string' ? d.userId.trim() : '')).filter(Boolean));
    const orphans = [...canonicalUsers].filter(uid => !userIds.includes(uid));
    if (orphans.length > 0) {
        stats.notes.push(`canonical: ${orphans.length} user(s) not present in either source — left untouched: ${orphans.join(', ')}`);
    }

    console.log(`Source docs: prod ${prodDocs.length}, dev ${devDocs.length}; canonical ${canonicalAll.length}; users to process: ${userIds.length}`);
    console.log('');
    console.log('Per-user plan:');
    console.log('');

    const rows = [];
    for (const userId of userIds) {
        const row = await planUser(
            userId,
            prodGrouped.map.get(userId),
            devGrouped.map.get(userId),
            databases,
            stats,
        );
        rows.push(row);
    }

    printPlanTable(rows);

    const errorRows = rows.filter(r => r.error);
    if (errorRows.length > 0) {
        console.log('');
        console.log('Errors:');
        for (const r of errorRows) console.log(`  ${r.userId}: ${r.error}`);
    }
    if (stats.notes.length > 0) {
        console.log('');
        console.log('Notes:');
        for (const note of stats.notes) console.log(`  - ${note}`);
    }

    const writeCounts = { create: 0, update: 0, skip: 0, failed: 0 };
    if (write) {
        console.log('');
        console.log('Writing to canonical quran_db/user_sync:');
        for (const row of rows) {
            const result = await writeRow(databases, row);
            if (result === 'create' || result === 'update' || result === 'skip') {
                writeCounts[result] += 1;
            } else if (result === 'failed') {
                writeCounts.failed += 1;
            }
        }
    }

    printSummary(rows, stats, write, writeCounts, canonicalAll, orphans.length);

    const failures = errorRows.length + (write ? writeCounts.failed : 0);
    console.log('');
    if (failures > 0) {
        console.log(`RESULT: ${failures} failure(s)`);
        process.exitCode = 1;
    } else {
        console.log('RESULT: OK');
    }
}

main().catch(err => {
    console.error(`\nFATAL: ${formatError(err)}`);
    process.exitCode = 1;
});
