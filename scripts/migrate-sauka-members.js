import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'quran_db';

async function migrate() {
    console.log('Fetching all groups...');
    const groupsResponse = await databases.listDocuments(databaseId, 'sauka_groups');
    console.log(`Found ${groupsResponse.documents.length} groups.`);

    for (const group of groupsResponse.documents) {
        console.log(`Migrating group ${group.$id}...`);
        const members = new Set(group.members || []);
        
        // Add creator
        if (group.createdBy) {
            members.add(group.createdBy);
        }

        // Fetch assignments to see who else claimed
        const assignmentsResponse = await databases.listDocuments(databaseId, 'sauka_assignments', [
            `equal("groupId", ["${group.$id}"])`,
            `limit(120)`
        ]);

        for (const assignment of assignmentsResponse.documents) {
            if (assignment.claimedBy && !assignment.claimedBy.startsWith('guest_')) {
                members.add(assignment.claimedBy);
            }
        }

        const membersArray = Array.from(members);
        if (membersArray.length > 0) {
            await databases.updateDocument(databaseId, 'sauka_groups', group.$id, {
                members: membersArray
            });
            console.log(`Updated group ${group.$id} with ${membersArray.length} members.`);
        }
    }
    console.log('Migration complete!');
}

migrate().catch(console.error);
