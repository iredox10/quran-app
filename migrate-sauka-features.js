import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69ac08e1000402826be5')
    .setKey('standard_160270700ff43891cff4f9f6214dbd305dd18fdeff71006f37ec2223d51ca9ab5d9fd289ce6a2e8ca7afc6b6d7e6083f7c9771655d713c9accfbabf7d826be2f411edae25425153235d7fade859b0fbeb26536de002e3fd1cb669f7fbea8b2768be0a744ac46371d19d25f20e5e0f86cca8befb54f67436ea122e4b929eec3b0');

const databases = new Databases(client);

const DB_ID = 'quran_db';

async function migrate() {
    console.log('Starting migration...');

    try {
        console.log('Adding lastActive to sauka_assignments...');
        await databases.createDatetimeAttribute(DB_ID, 'sauka_assignments', 'lastActive', false);
    } catch (e) { console.log('lastActive exists or failed:', e.message); }

    try {
        console.log('Adding roundNumber to sauka_groups...');
        await databases.createIntegerAttribute(DB_ID, 'sauka_groups', 'roundNumber', false, 1, 1000, 1);
    } catch (e) { console.log('roundNumber exists or failed:', e.message); }

    try {
        console.log('Adding khatmahsCompleted to sauka_groups...');
        await databases.createIntegerAttribute(DB_ID, 'sauka_groups', 'khatmahsCompleted', false, 0, 10000, 0);
    } catch (e) { console.log('khatmahsCompleted exists or failed:', e.message); }

    try {
        console.log('Adding isPublic to sauka_groups...');
        await databases.createBooleanAttribute(DB_ID, 'sauka_groups', 'isPublic', false, false);
    } catch (e) { console.log('isPublic exists or failed:', e.message); }

    try {
        console.log('Adding audioUrl to sauka_comments...');
        await databases.createStringAttribute(DB_ID, 'sauka_comments', 'audioUrl', 2000, false);
    } catch (e) { console.log('audioUrl exists or failed:', e.message); }

    console.log('Done!');
}

migrate();
