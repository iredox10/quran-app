import { Client, Storage, Permission, Role } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69ac08e1000402826be5')
    .setKey('standard_160270700ff43891cff4f9f6214dbd305dd18fdeff71006f37ec2223d51ca9ab5d9fd289ce6a2e8ca7afc6b6d7e6083f7c9771655d713c9accfbabf7d826be2f411edae25425153235d7fade859b0fbeb26536de002e3fd1cb669f7fbea8b2768be0a744ac46371d19d25f20e5e0f86cca8befb54f67436ea122e4b929eec3b0');

const storage = new Storage(client);

async function setup() {
    try {
        await storage.createBucket(
            'audio_notes',
            'Voice Notes',
            [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ],
            false,
            true,
            undefined,
            ['mp3', 'wav', 'ogg', 'webm', 'm4a']
        );
        console.log('Audio bucket created successfully!');
    } catch(e) {
        console.log('Error or already exists:', e.message);
    }
}

setup();
