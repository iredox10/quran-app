import { http, authService } from './backend';

export const GROUPS_COLLECTION = 'sauka_groups';
export const ASSIGNMENTS_COLLECTION = 'sauka_assignments';
export const COMMENTS_COLLECTION = 'sauka_comments';
export async function getCachedUser() { const user = await authService.getCurrentUser(); if (!user) throw new Error('Please sign in to use groups.'); return user; }
const segment = encodeURIComponent;
const groupPath = id => `/v1/sauka/groups/${segment(id)}`;
const assignmentAction = async (id, action, fields = {}) => (await http.post(`/v1/sauka/assignments/${segment(id)}/${action}`, fields)).data;
export const saukaService = {
    async createGroup(title, divisionType = 'juz', deadline = '', intention = '', isPublic = false) {
        return (await http.post('/v1/sauka/groups', { title, divisionType, deadline: deadline || '', intention, isPublic })).data;
    },
    async getMyGroups() { return (await http.get('/v1/sauka/groups')).data; },
    async getPublicGroups() { return (await http.get('/v1/sauka/public')).data.groups; },
    async findByCode(code) { return (await http.post('/v1/sauka/join', { code: code.trim().toUpperCase() })).data; },
    async getGroup(id) { return (await http.get(groupPath(id))).data; },
    async joinPublic(id) { return (await http.post(`${groupPath(id)}/join`)).data; },
    claimJuz: id => assignmentAction(id, 'claim'),
    assignGuest: (id, guestName) => assignmentAction(id, 'guest', { guestName }),
    updateProgress: (id, progress) => assignmentAction(id, 'progress', { progress: Math.min(100, Math.max(0, Math.round(progress))) }),
    unclaimJuz: id => assignmentAction(id, 'unclaim'),
    completeJuz: id => assignmentAction(id, 'complete'),
    async autoAssignRemaining(id) { return (await http.post(`${groupPath(id)}/auto-assign`)).data.assigned; },
    async startNextRound(id) { await http.post(`${groupPath(id)}/next-round`); },
    async deleteGroup(id) { await http.delete(groupPath(id)); },
    async getComments(id) { return (await http.get(`${groupPath(id)}/comments`)).data.comments; },
    async addComment(id, text, audioId = null) { return (await http.post(`${groupPath(id)}/comments`, { text, ...(audioId ? { audioId } : {}) })).data; },
    async deleteComment(id) { await http.delete(`/v1/sauka/comments/${segment(id)}`); },
    async uploadAudio(id, file) {
        const body = new FormData(); body.append('file', file);
        return (await http.post(`${groupPath(id)}/audio`, body)).data.id;
    },
    async audioBlob(id) { return (await http.get(`/v1/sauka/audio/${segment(id)}`, { responseType: 'blob' })).data; },
    subscribe(_id, callback) {
        let stopped = false;
        const refresh = () => { if (!stopped && document.visibilityState !== 'hidden') callback(); };
        const timer = setInterval(refresh, 15000);
        const visible = () => { if (document.visibilityState === 'visible') refresh(); };
        document.addEventListener('visibilitychange', visible);
        return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
    },
};
