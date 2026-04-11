import { Client, Account, Databases, Query, ID } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);
export { client, Query, ID };

export const APPWRITE_CONFIG = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '',
    userSyncCollectionId: import.meta.env.VITE_APPWRITE_USER_DATA_COLLECTION_ID || '',
};

export function isAppwriteConfigured() {
    return !!(
        import.meta.env.VITE_APPWRITE_ENDPOINT &&
        import.meta.env.VITE_APPWRITE_PROJECT_ID &&
        import.meta.env.VITE_APPWRITE_DATABASE_ID &&
        import.meta.env.VITE_APPWRITE_USER_DATA_COLLECTION_ID
    );
}
