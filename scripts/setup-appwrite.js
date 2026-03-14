import fs from 'fs';
import { Client, Databases } from 'node-appwrite';

const envContent = fs.readFileSync('.env', 'utf-8');

const getEnvParam = (key) => {
    const regex = new RegExp(`${key}\\s*=\\s*"?([^"\\n]*)"?`);
    const match = envContent.match(regex);
    return match ? match[1].trim() : null;
};

const endpoint = getEnvParam('VITE_APPWRITE_ENDPOINT');
const projectId = getEnvParam('VITE_APPWRITE_PROJECT_ID');
const apiKey = getEnvParam('API_KEY');

if (!endpoint || !projectId || !apiKey) {
    console.error('Missing configuration in .env', { endpoint, projectId, apiKey: apiKey ? '***' : null });
    process.exit(1);
}

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const databases = new Databases(client);

async function setup() {
    console.log('Setting up Appwrite Database...');

    let quranDbId = 'quran_db';
    let userSyncCollectionId = 'user_sync';

    try {
        await databases.get(quranDbId);
        console.log('Database already exists.');
    } catch (e) {
        if (e.code === 404) {
            console.log('Creating database...');
            await databases.create(quranDbId, 'Quran App Database');
        } else {
            console.error('Failed to get/create database:', e);
            process.exit(1);
        }
    }

    try {
        await databases.getCollection(quranDbId, userSyncCollectionId);
        console.log('Collection already exists.');
    } catch (e) {
        if (e.code === 404) {
            console.log('Creating collection...');
            await databases.createCollection(quranDbId, userSyncCollectionId, 'User Sync State', [
                "read(\"users\")",
                "write(\"users\")"
            ]);
        } else {
            console.error('Failed to get/create collection:', e);
            process.exit(1);
        }
    }

    console.log('Configuring attributes (adding/updating)...');
    try {
        await databases.createStringAttribute(quranDbId, userSyncCollectionId, 'userId', 255, true);
        console.log('Added userId attribute.');
    } catch (e) {
        if (e.code === 409) console.log('userId attribute already exists.');
        else console.error('Failed creating userId attribute:', e);
    }

    try {
        await databases.createStringAttribute(quranDbId, userSyncCollectionId, 'stateData', 1000000, true);
        console.log('Added stateData attribute.');
    } catch (e) {
        if (e.code === 409) console.log('stateData attribute already exists.');
        else console.error('Failed creating stateData attribute:', e);
    }

    console.log('Creating unique index on userId...');
    try {
        // give attributes time to be created
        await new Promise(r => setTimeout(r, 2000));
        await databases.createIndex(quranDbId, userSyncCollectionId, 'user_id_index', 'unique', ['userId']);
        console.log('Index created.');
    } catch (e) {
        if (e.code === 409) console.log('Index already exists.');
        else console.error('Failed creating index:', e);
    }

    console.log('Writing back DB IDs to .env');
    let updatedEnv = envContent
        .replace(/VITE_APPWRITE_DATABASE_ID\s*=\s*.*/, `VITE_APPWRITE_DATABASE_ID=${quranDbId}`)
        .replace(/VITE_APPWRITE_USER_DATA_COLLECTION_ID\s*=\s*.*/, `VITE_APPWRITE_USER_DATA_COLLECTION_ID=${userSyncCollectionId}`);

    fs.writeFileSync('.env', updatedEnv);
    console.log('Done.');
}

setup();
