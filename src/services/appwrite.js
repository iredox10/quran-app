import { Client, Account, Databases, Query, Storage } from 'appwrite';
import { mergeStateInto } from '../utils/syncMerge';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'quran_db';
export const collectionId = import.meta.env.VITE_APPWRITE_USER_DATA_COLLECTION_ID || 'user_sync';
export const audioBucketId = 'audio_notes';

export const client = new Client();
export const isAppwriteConfigured = !!projectId;

if (isAppwriteConfigured) {
    client.setEndpoint(endpoint).setProject(projectId);
} else {
    console.warn('Appwrite project id is missing in .env. Cloud features will be disabled.');
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Auth Service Actions
export const authService = {
    async getCurrentUser() {
        try {
            return await account.get();
        } catch (error) {
            return null;
        }
    },
    async login(email, password) {
        return await account.createEmailPasswordSession(email, password);
    },
    async register(email, password, name) {
        return await account.create('unique()', email, password, name);
    },
    async sendPasswordRecovery(email, url) {
        return await account.createRecovery(email, url);
    },
    async logout() {
        return await account.deleteSession('current');
    }
};

export const syncService = {
    async pushState(userId, stateData) {
        try {
            const result = await databases.listDocuments(databaseId, collectionId, [
                Query.equal("userId", userId)
            ]);

            let mergedData = stateData;
            let payload = { userId };

            if (result.documents.length > 0) {
                const existingDoc = result.documents[0];
                let existingData = {};
                try {
                    existingData = JSON.parse(existingDoc.stateData || '{}');
                } catch (e) {
                    console.error('Appwrite sync: failed to parse existing stateData, overwriting', e);
                }
                // Merge local into the existing cloud doc so both devices' data survives
                mergedData = mergeStateInto(existingData, stateData);
                payload.stateData = JSON.stringify(mergedData);
                const updatedDoc = await databases.updateDocument(databaseId, collectionId, existingDoc.$id, payload);
                return {
                    updatedAt: new Date(updatedDoc.$updatedAt).getTime()
                };
            } else {
                payload.stateData = JSON.stringify(mergedData);
                const createdDoc = await databases.createDocument(databaseId, collectionId, 'unique()', payload);
                return {
                    updatedAt: new Date(createdDoc.$updatedAt).getTime()
                };
            }
        } catch (error) {
            console.error('Appwrite sync push error:', error);
            throw error;
        }
    },

    async pullState(userId) {
        try {
            const result = await databases.listDocuments(databaseId, collectionId, [
                Query.equal("userId", userId)
            ]);

            if (result.documents.length > 0) {
                return {
                    state: JSON.parse(result.documents[0].stateData),
                    updatedAt: new Date(result.documents[0].$updatedAt).getTime()
                };
            }
            return null;
        } catch (error) {
            console.error('Appwrite sync pull error:', error);
            throw error;
        }
    }
};
