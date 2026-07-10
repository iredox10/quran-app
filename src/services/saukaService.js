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
    // ─── Group Management ───
    async createGroup(title, divisionType = 'juz', deadline = null, intention = '', isPublic = false) {
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
            isPublic
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
            lastActive: new Date().toISOString(),
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
            lastActive: new Date().toISOString(),
        });
    },

    // ─── Update Progress ───
    async updateProgress(assignmentId, progress) {
        // progress is 0-100
        try {
            return await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
                progress: Math.min(100, Math.max(0, Math.round(progress))),
                lastActive: new Date().toISOString(),
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

    // ─── Auto Assign Remaining ───
    async autoAssignRemaining(groupId) {
        // 1. Fetch group to get members
        const group = await databases.getDocument(databaseId, GROUPS_COLLECTION, groupId);
        const members = group.members || [];
        if (members.length === 0) throw new Error("No members in group to assign to.");

        // 2. Fetch all assignments
        const allAssignments = await databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.limit(200)
        ]);

        // 3. Build a name map from existing claims
        const nameMap = {};
        allAssignments.documents.forEach(a => {
            if (a.claimedBy && a.claimedByName) nameMap[a.claimedBy] = a.claimedByName;
        });

        // 4. Filter available assignments
        const available = allAssignments.documents.filter(a => a.status === 'unclaimed');
        if (available.length === 0) return 0; // Nothing to do

        // 5. Shuffle members for random distribution
        const shuffledMembers = [...members].sort(() => Math.random() - 0.5);

        // 6. Assign round-robin
        const promises = available.map((assignment, index) => {
            const assigneeId = shuffledMembers[index % shuffledMembers.length];
            const assigneeName = nameMap[assigneeId] || 'Assigned Member';

            return databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignment.$id, {
                claimedBy: assigneeId,
                claimedByName: assigneeName,
                status: 'in_progress',
                claimedAt: new Date().toISOString(),
                progress: 0,
                lastActive: new Date().toISOString()
            });
        });

        await Promise.all(promises);
        return available.length; // Return how many were assigned
    },

    // ─── Mark Juz complete ───
    async completeJuz(assignmentId, groupId) {
        const updated = await databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, assignmentId, {
            status: 'completed',
            progress: 100,
            lastActive: new Date().toISOString()
        });
        
        // Check if all are completed
        const totalParts = (await databases.getDocument(databaseId, GROUPS_COLLECTION, groupId)).divisionType === 'surah' ? 114 : 30;
        const all = await databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.limit(200)
        ]);

        const allCompleted = all.documents.length === totalParts && all.documents.every(a => a.status === 'completed');
        if (allCompleted) {
            await databases.updateDocument(databaseId, GROUPS_COLLECTION, groupId, {
                status: 'completed'
            });
        }
        return updated;
    },

    // ─── Start Next Round (Khatmah) ───
    async startNextRound(groupId) {
        const group = await databases.getDocument(databaseId, GROUPS_COLLECTION, groupId);
        
        // 1. Update group counters and status
        await databases.updateDocument(databaseId, GROUPS_COLLECTION, groupId, {
            status: 'active',
            roundNumber: (group.roundNumber || 1) + 1,
            khatmahsCompleted: (group.khatmahsCompleted || 0) + 1
        });

        // 2. Reset all assignments
        const all = await databases.listDocuments(databaseId, ASSIGNMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.limit(200)
        ]);

        const promises = all.documents.map(a => 
            databases.updateDocument(databaseId, ASSIGNMENTS_COLLECTION, a.$id, {
                status: 'unclaimed',
                claimedBy: null,
                claimedByName: null,
                claimedAt: null,
                progress: 0,
                lastActive: null
            })
        );
        await Promise.all(promises);
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

    // ─── Comments (Nudges) ───
    async getComments(groupId) {
        const result = await databases.listDocuments(databaseId, COMMENTS_COLLECTION, [
            Query.equal('groupId', groupId),
            Query.orderDesc('$createdAt'),
            Query.limit(50)
        ]);
        return result.documents.reverse();
    },

    async addComment(groupId, text, audioUrl = null) {
        const user = await getCachedUser();
        return await databases.createDocument(databaseId, COMMENTS_COLLECTION, ID.unique(), {
            groupId,
            userId: user.$id,
            userName: user.name || 'Group Member',
            text,
            audioUrl
        });
    },

    async deleteComment(commentId) {
        return await databases.deleteDocument(databaseId, COMMENTS_COLLECTION, commentId);
    }
};
