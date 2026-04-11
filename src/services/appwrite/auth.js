import { account, ID, isAppwriteConfigured } from './client';

let authStateListeners = [];

function notifyAuthChange(user) {
    authStateListeners.forEach(fn => fn(user));
}

export function onAuthChange(fn) {
    authStateListeners.push(fn);
    return () => {
        authStateListeners = authStateListeners.filter(f => f !== fn);
    };
}

export async function getInitialSession() {
    if (!isAppwriteConfigured()) return null;
    try {
        const user = await account.get();
        notifyAuthChange(user);
        return user;
    } catch {
        notifyAuthChange(null);
        return null;
    }
}

export async function signInAnonymously() {
    if (!isAppwriteConfigured()) throw new Error('Appwrite not configured');
    const session = await account.createAnonymousSession();
    const user = await account.get();
    notifyAuthChange(user);
    return { session, user };
}

export async function signInWithEmail(email, password) {
    if (!isAppwriteConfigured()) throw new Error('Appwrite not configured');
    const session = await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    notifyAuthChange(user);
    return { session, user };
}

export async function signUpWithEmail(email, password, name = 'Quran Student') {
    if (!isAppwriteConfigured()) throw new Error('Appwrite not configured');
    await account.create(ID.unique(), email, password, name);
    return signInWithEmail(email, password);
}

export async function signOut() {
    await account.deleteSession('current');
    notifyAuthChange(null);
}

export async function createAccount(email, password, name = 'Quran Student') {
    return signUpWithEmail(email, password, name);
}

export async function login(email, password) {
    return signInWithEmail(email, password);
}
