import { databases, Query, ID, APPWRITE_CONFIG, isAppwriteConfigured } from './client';

const { databaseId, userSyncCollectionId } = APPWRITE_CONFIG;

export async function getUserSyncData(userId) {
    if (!isAppwriteConfigured() || !userId) return null;
    const response = await databases.listDocuments(
        databaseId,
        userSyncCollectionId,
        [Query.equal('userId', userId), Query.limit(1)]
    );
    if (response.documents.length === 0) return null;
    return JSON.parse(response.documents[0].stateData);
}

export async function saveUserSyncData(userId, stateData) {
    if (!isAppwriteConfigured() || !userId) return null;
    const existing = await databases.listDocuments(
        databaseId,
        userSyncCollectionId,
        [Query.equal('userId', userId), Query.limit(1)]
    );

    const payload = {
        userId,
        stateData: JSON.stringify(stateData),
    };

    if (existing.documents.length > 0) {
        return await databases.updateDocument(
            databaseId,
            userSyncCollectionId,
            existing.documents[0].$id,
            payload
        );
    } else {
        return await databases.createDocument(
            databaseId,
            userSyncCollectionId,
            ID.unique(),
            payload
        );
    }
}

export async function pushBookmark(userId, bookmark) {
    if (!isAppwriteConfigured() || !userId) return null;
    return await databases.createDocument(
        databaseId,
        userSyncCollectionId,
        ID.unique(),
        {
            userId,
            stateData: JSON.stringify({ type: 'bookmark', action: 'add', data: bookmark, timestamp: Date.now() }),
        }
    );
}

export async function pushMemorization(userId, data) {
    if (!isAppwriteConfigured() || !userId) return null;
    return await databases.createDocument(
        databaseId,
        userSyncCollectionId,
        ID.unique(),
        {
            userId,
            stateData: JSON.stringify({ type: 'memorization', action: 'update', data, timestamp: Date.now() }),
        }
    );
}

export async function pushProgress(userId, data) {
    if (!isAppwriteConfigured() || !userId) return null;
    return await databases.createDocument(
        databaseId,
        userSyncCollectionId,
        ID.unique(),
        {
            userId,
            stateData: JSON.stringify({ type: 'progress', action: 'log', data, timestamp: Date.now() }),
        }
    );
}

export async function pushPlanner(userId, data) {
    if (!isAppwriteConfigured() || !userId) return null;
    return await databases.createDocument(
        databaseId,
        userSyncCollectionId,
        ID.unique(),
        {
            userId,
            stateData: JSON.stringify({ type: 'planner', action: 'update', data, timestamp: Date.now() }),
        }
    );
}
