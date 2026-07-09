import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69ac08e1000402826be5')
    .setKey('standard_160270700ff43891cff4f9f6214dbd305dd18fdeff71006f37ec2223d51ca9ab5d9fd289ce6a2e8ca7afc6b6d7e6083f7c9771655d713c9accfbabf7d826be2f411edae25425153235d7fade859b0fbeb26536de002e3fd1cb669f7fbea8b2768be0a744ac46371d19d25f20e5e0f86cca8befb54f67436ea122e4b929eec3b0');

const databases = new Databases(client);

async function addProgressAttribute() {
    try {
        await databases.createIntegerAttribute(
            'quran_db', 
            'sauka_assignments', 
            'progress', 
            false, // required
            0, // min
            100, // max
            0 // default
        );
        console.log('Successfully created progress attribute');
    } catch(e) {
        console.error('Failed', e);
    }
}
addProgressAttribute();
