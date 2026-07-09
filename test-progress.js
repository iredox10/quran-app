import { Client, Databases } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67713426001099e03d42');

const databases = new Databases(client);

async function test() {
    try {
        const assignments = await databases.listDocuments('quran_db', 'sauka_assignments');
        if (assignments.documents.length === 0) {
            console.log("No assignments found to test.");
            return;
        }
        const doc = assignments.documents[0];
        
        // Try to update with progress: 0
        const res = await databases.updateDocument('quran_db', 'sauka_assignments', doc.$id, {
            progress: 0
        });
        console.log("SUCCESS! Field exists.");
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}

test();
