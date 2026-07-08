import { databases, databaseId, account } from './appwrite';
import { Query, ID } from 'appwrite';

export const GROUPS_COLLECTION = 'sauka_groups';
export const ASSIGNMENTS_COLLECTION = 'sauka_assignments';
export const COMMENTS_COLLECTION = 'sauka_comments';

function generateJoinCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export const saukaService = {
    // ─── Create Group ───
    async createGroup(title, divisionType = 'juz', deadline = null, intention = '') {
        const user = await account.get();
        const joinCode = generateJoinCode();

        const group = await databases.createDocument(databaseId, GROUPS_COLLECTION, ID.unique(), {
            title,
            createdBy: user.$id,
            createdByName: user.name || 'Unknown',
            joinCode,
            divisionType,
            deadline: deadline || '',
            intention: intention || '',
            status: 'active',
            completedAt: '',
        });

        // Create assignment docs
        const totalParts = divisionType === 'surah' ? 114 : divisionType === 'hizb' ? 60 : 30;
        const promises = [];
        for (let part = 1; part <= totalParts; part++) {
            promises.push(() =>
                databases.createDocument(databaseId, ASSIGNMENTS_COLLECTION, ID.unique(), {
                    groupId: group.$id,
                    partNumber: part,
                    claimedBy: '',
                    claimedByName: '',
                    status: 'unclaimed',
                    claimedAt: '',
                    completedAt: '',
                })
            );
        }
        // Execute in chunks to prevent rate limits
        const chunkSize = 15;
        for (let i = 0; i < promises.length; i += chunkSize) {
            const chunk = promises.slice(i, i + chunkSize);
            await Promise.all(chunk.map(p => p()));
        }

        return group;
    },

    // ─── Get user's groups (created or participating) ───
    async getMyGroups() {
        try {
            const user = await account.get();

            // Groups I created
            const created = await databases.listDocuments(databaseId, GROUPS_COLLECTION, [
                Query.equal('createdBy', user.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(50),
            ]);

            // Juz I claimed
            const myClaims = await databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
                Query.equal('claimedBy', user.$id),
                Query.limit(100),
            ]);

            const claimedGroupIds = [...new Set(myClaims.documents.map(a => a.groupId))];
            const createdGroupIds = created.documents.map(g => g.$id);
            const joinedOnlyIds = claimedGroupIds.filter(id => !createdGroupIds.includes(id));

            let joinedGroups = [];
            if (joinedOnlyIds.length > 0) {
                const joined = await databases.listDocuments(databaseId, GROUPS_COLLECTION, [
                    Query.equal('$id', joinedOnlyIds),
                    Query.limit(50),
                ]);
                joinedGroups = joined.documents;
            }

            return {
                created: created.documents,
                joined: joinedGroups,
                myClaims: myClaims.documents,
                userId: user.$id,
            };
        } catch (error) {
            console.error("Failed to fetch groups:", error);
            return {
                created: [],
                joined: [],
                myClaims: [],
                userId: null,
            };
        }
    },

    // ─── Find group by join code ───
    async findByCode(code) {
        const result = await databases.listDocuments(databaseId, GROUPS_COLLECTION, [
            Query.equal('joinCode', code.toUpperCase()),
            Query.limit(1),
        ]);
        return result.documents[0] || null;
    },

    // ─── Get group with assignments ───
    async getGroup(groupId) {
        const group = await databases.getDocument(databaseId, GROUPS_COLLECTION, groupId);
        const assignments = await databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.orderAsc('partNumber'),
            Query.limit(120),
        ]);
        const user = await account.get();
        return { group, assignments: assignments.documents, userId: user.$id };
    },

    // ─── Claim a Juz ───
    async claimJuz(assignmentId) {
        const user = await account.get();
        return await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
            claimedBy: user.$id,
            claimedByName: user.name || 'Unknown',
            status: 'in_progress',
            claimedAt: new Date().toISOString(),
        });
    },

    // ─── Direct Assign (Guest Claim) ───
    async assignGuest(assignmentId, guestName) {
        return await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
            claimedBy: `guest_${Date.now()}`,
            claimedByName: guestName,
            status: 'in_progress',
            claimedAt: new Date().toISOString(),
        });
    },

    // ─── Unclaim a Juz (admin or self) ───
    async unclaimJuz(assignmentId) {
        return await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
            claimedBy: '',
            claimedByName: '',
            status: 'unclaimed',
            claimedAt: '',
            completedAt: '',
        });
    },

    // ─── Mark Juz complete ───
    async completeJuz(assignmentId, groupId) {
        const updated = await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
            status: 'completed',
            completedAt: new Date().toISOString(),
        });

        // Check if all are done
        const totalParts = (await databases.getDocument(databaseId, GROUPS_COLLECTION, groupId)).divisionType === 'surah' ? 114 : 30;
        const all = await databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.equal('status', 'completed'),
            Query.limit(120),
        ]);

        if (all.total === totalParts) {
            await databases.updateDocument(databaseId, GROUPS_COLLECTION, groupId, {
                status: 'completed',
                completedAt: new Date().toISOString(),
            });
        }

        return updated;
    },

    // ─── Delete group (admin only) ───
    async deleteGroup(groupId) {
        const assignments = await databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.limit(120),
        ]);
        await Promise.all(assignments.documents.map(a =>
            databases.deleteDocument(databaseId, ASSIGNMENTS_COLLECTION, a.$id)
        ));
        
        const comments = await databases.listDocuments(databaseId, COMMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.limit(100),
        ]);
        await Promise.all(comments.documents.map(c =>
            databases.deleteDocument(databaseId, COMMENTS_COLLECTION, c.$id)
        ));

        await databases.deleteDocument(databaseId, GROUPS_COLLECTION, groupId);
    },

    // ─── Comments & Nudges ───
    async getComments(groupId) {
        const result = await databases.listDocuments(databaseId, COMMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.orderAsc('$createdAt'),
            Query.limit(100),
        ]);
        return result.documents;
    },

    async addComment(groupId, text) {
        const user = await account.get();
        return await databases.createDocument(databaseId, COMMENTS_COLLECTION, ID.unique(), {
            groupId,
            userId: user.$id,
            userName: user.name || 'Unknown',
            text
        });
    },

    async deleteComment(commentId) {
        return await databases.deleteDocument(databaseId, COMMENTS_COLLECTION, commentId);
    }
};
