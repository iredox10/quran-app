import { Client, Databases, Permission, Role } from 'node-appwrite';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[match[1]] = val;
    }
});

const endpoint = env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = env.VITE_APPWRITE_PROJECT_ID;
const apiKey = env.APPWRITE_API_KEY;
const databaseId = env.VITE_APPWRITE_DATABASE_ID || 'quran_db';

if (!projectId || !apiKey) {
    console.error("Missing VITE_APPWRITE_PROJECT_ID or APPWRITE_API_KEY in .env");
    process.exit(1);
}

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const databases = new Databases(client);

async function setup() {
    try {
        console.log("Checking database...");
        try {
            await databases.get(databaseId);
            console.log("Database already exists.");
        } catch (e) {
            if (e.code === 404) {
                console.log("Creating database...");
                await databases.create(databaseId, 'Quran App DB');
            } else throw e;
        }

        const collectionsToCreate = [
            {
                id: env.VITE_APPWRITE_USER_DATA_COLLECTION_ID || 'user_sync',
                name: 'User Sync',
                attributes: [
                    { key: 'userId', type: 'string', size: 255, required: true },
                    { key: 'stateData', type: 'string', size: 1000000, required: true }
                ]
            },
            {
                id: 'sauka_groups',
                name: 'Sauka Groups',
                attributes: [
                    { key: 'title', type: 'string', size: 255, required: true },
                    { key: 'createdBy', type: 'string', size: 255, required: true },
                    { key: 'createdByName', type: 'string', size: 255, required: true },
                    { key: 'joinCode', type: 'string', size: 20, required: true },
                    { key: 'divisionType', type: 'string', size: 50, required: true },
                    { key: 'deadline', type: 'string', size: 255, required: false },
                    { key: 'intention', type: 'string', size: 1000, required: false },
                    { key: 'status', type: 'string', size: 50, required: true },
                    { key: 'completedAt', type: 'string', size: 255, required: false },
                    { key: 'members', type: 'string', size: 255, required: false, array: true }
                ]
            },
            {
                id: 'sauka_assignments',
                name: 'Sauka Assignments',
                attributes: [
                    { key: 'groupId', type: 'string', size: 255, required: true },
                    { key: 'partNumber', type: 'integer', required: true },
                    { key: 'claimedBy', type: 'string', size: 255, required: false },
                    { key: 'claimedByName', type: 'string', size: 255, required: false },
                    { key: 'status', type: 'string', size: 50, required: true },
                    { key: 'claimedAt', type: 'string', size: 255, required: false },
                    { key: 'completedAt', type: 'string', size: 255, required: false }
                ]
            },
            {
                id: 'sauka_comments',
                name: 'Sauka Comments',
                attributes: [
                    { key: 'groupId', type: 'string', size: 255, required: true },
                    { key: 'userId', type: 'string', size: 255, required: true },
                    { key: 'userName', type: 'string', size: 255, required: true },
                    { key: 'text', type: 'string', size: 5000, required: true }
                ]
            }
        ];

        for (const col of collectionsToCreate) {
            console.log(`\nChecking collection ${col.id}...`);
            try {
                await databases.getCollection(databaseId, col.id);
                console.log(`Collection ${col.id} already exists.`);
            } catch (e) {
                if (e.code === 404) {
                    console.log(`Creating collection ${col.id}...`);
                    await databases.createCollection(
                        databaseId, 
                        col.id, 
                        col.name, 
                        [
                            Permission.read(Role.users()),
                            Permission.create(Role.users()),
                            Permission.update(Role.users()),
                            Permission.delete(Role.users())
                        ],
                        false // Document security
                    );
                } else throw e;
            }

            console.log(`Setting up attributes for ${col.id}...`);
            for (const attr of col.attributes) {
                try {
                    if (attr.type === 'string') {
                        await databases.createStringAttribute(databaseId, col.id, attr.key, attr.size, attr.required, undefined, attr.array || false);
                    } else if (attr.type === 'integer') {
                        await databases.createIntegerAttribute(databaseId, col.id, attr.key, attr.required);
                    }
                    console.log(`Created attribute: ${attr.key}`);
                    // Wait a bit to prevent rate limit or creation conflicts
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    if (e.code === 409) {
                        console.log(`Attribute ${attr.key} already exists.`);
                        await new Promise(r => setTimeout(r, 100)); // Sleep on 409
                    } else {
                        console.error(`Error creating attribute ${attr.key}:`, e.message);
                        throw e;
                    }
                }
            }
        }

        console.log("\nSetting up indexes...");
        const indexesToCreate = [
            { collectionId: 'sauka_assignments', key: 'groupId_idx', type: 'key', attributes: ['groupId'] },
            { collectionId: 'sauka_assignments', key: 'partNumber_idx', type: 'key', attributes: ['partNumber'] },
            { collectionId: 'sauka_assignments', key: 'claimedBy_idx', type: 'key', attributes: ['claimedBy'] },
            { collectionId: 'sauka_comments', key: 'groupId_idx', type: 'key', attributes: ['groupId'] },
            { collectionId: 'sauka_groups', key: 'createdBy_idx', type: 'key', attributes: ['createdBy'] },
            { collectionId: 'sauka_groups', key: 'joinCode_idx', type: 'key', attributes: ['joinCode'] },
        ];

        for (const index of indexesToCreate) {
            try {
                await databases.createIndex(databaseId, index.collectionId, index.key, index.type, index.attributes);
                console.log(`Created index ${index.key} on ${index.collectionId}`);
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                if (e.code === 409) {
                    console.log(`Index ${index.key} already exists on ${index.collectionId}.`);
                } else {
                    console.error(`Error creating index ${index.key}:`, e.message);
                }
            }
        }

        console.log("\nSetup complete! All databases and collections are ready.");
    } catch (error) {
        console.error("Setup failed:", error);
        process.exit(1);
    }
}

setup();
