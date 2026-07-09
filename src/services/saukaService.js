import { databases, databaseId, account } from './appwrite';
import { Query, ID } from 'appwrite';

export const GROUPS_COLLECTION = 'sauka_groups';
export const ASSIGNMENTS_COLLECTION = 'sauka_assignments';
export const COMMENTS_COLLECTION = 'sauka_comments';

let cachedUser = null;
let cachedUserPromise = null;

export async function getCachedUser() {
    if (cachedUser) return cachedUser;
    if (cachedUserPromise) return cachedUserPromise;
    cachedUserPromise = account.get().then(u => {
        cachedUser = u;
        cachedUserPromise = null;
        return u;
    }).catch(e => {
        cachedUserPromise = null;
        throw e;
    });
    return cachedUserPromise;
}

function generateJoinCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export const saukaService = {
    // ─── Create Group ───
    async createGroup(title, divisionType = 'juz', deadline = null, intention = '') {
        const user = await getCachedUser();
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
            members: [user.$id],
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
            const user = await getCachedUser();

            // Fetch all base user groups in parallel
            const [created, memberGroups, myClaims] = await Promise.all([
                databases.listDocuments(databaseId, GROUPS_COLLECTION, [
                    Query.equal('createdBy', user.$id),
                    Query.orderDesc('$createdAt'),
                    Query.limit(50),
                ]),
                databases.listDocuments(databaseId, GROUPS_COLLECTION, [
                    Query.contains('members', [user.$id]),
                    Query.limit(50),
                ]),
                databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
                    Query.equal('claimedBy', user.$id),
                    Query.limit(100),
                ])
            ]);

            const createdGroupIds = created.documents.map(g => g.$id);
            // Filter out groups we already have in `created`
            const joinedGroups = memberGroups.documents.filter(g => !createdGroupIds.includes(g.$id));

            const claimedGroupIds = [...new Set(myClaims.documents.map(a => a.groupId))];
            const memberGroupIds = memberGroups.documents.map(g => g.$id);
            const legacyJoinedOnlyIds = claimedGroupIds.filter(id => !createdGroupIds.includes(id) && !memberGroupIds.includes(id));

            if (legacyJoinedOnlyIds.length > 0) {
                const legacyJoined = await databases.listDocuments(databaseId, GROUPS_COLLECTION, [
                    Query.equal('$id', legacyJoinedOnlyIds),
                    Query.limit(50),
                ]);
                joinedGroups.push(...legacyJoined.documents);
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
        let [group, assignmentsList, user] = await Promise.all([
            databases.getDocument(databaseId, GROUPS_COLLECTION, groupId),
            databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
                Query.equal('groupId', groupId),
                Query.orderAsc('partNumber'),
                Query.limit(120),
            ]),
            getCachedUser().catch(() => null)
        ]);
        const assignments = assignmentsList.documents;
        
        let userId = user ? user.$id : null;
        if (userId) {
            // Auto-join logic for persistence: add user to members array if not present
            const members = group.members || [];
            if (!members.includes(userId)) {
                members.push(userId);
                try {
                    group = await databases.updateDocument(databaseId, GROUPS_COLLECTION, groupId, { members });
                } catch (e) {
                    console.error('Failed to add user to members array', e);
                }
            }
        }
        
        return { group, assignments, userId };
    },

    // ─── Claim a Juz ───
    async claimJuz(assignmentId) {
        const user = await getCachedUser();
        return await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
            claimedBy: user.$id,
            claimedByName: user.name || 'Unknown',
            status: 'in_progress',
            claimedAt: new Date().toISOString(),
            progress: 0,
        });
    },

    // ─── Direct Assign (Guest Claim) ───
    async assignGuest(assignmentId, guestName) {
        return await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
            claimedBy: `guest_${Date.now()}`,
            claimedByName: guestName,
            status: 'in_progress',
            claimedAt: new Date().toISOString(),
            progress: 0,
        });
    },

    // ─── Update Progress ───
    async updateProgress(assignmentId, progress) {
        // progress is 0-100
        try {
            return await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
                progress: Math.min(100, Math.max(0, Math.round(progress))),
            });
        } catch (e) {
            console.error('Failed to update progress on backend', e);
        }
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
        const user = await getCachedUser();
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
