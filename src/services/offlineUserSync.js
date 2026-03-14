import { getSyncableState, useAppStore } from '../store/useAppStore';
import { syncService } from './appwrite';
import { enqueueSyncQueueJob, getSyncQueueSummary, listSyncQueueJobs, removeSyncQueueJob, updateSyncQueueJob } from '../utils/syncQueue';

const CLOUD_BACKUP_JOB_TYPE = 'cloud-state-backup';

export function buildCloudSyncPayload(state = useAppStore.getState()) {
  return getSyncableState(state);
}

export async function queueCloudStateBackup(userId, state = useAppStore.getState()) {
  return enqueueSyncQueueJob({
    type: CLOUD_BACKUP_JOB_TYPE,
    userId,
    payload: buildCloudSyncPayload(state),
    dedupeKey: `${CLOUD_BACKUP_JOB_TYPE}:${userId}`,
  });
}

export async function flushQueuedCloudBackups(userId) {
  const jobs = await listSyncQueueJobs();
  const pendingJobs = jobs.filter((job) => job.type === CLOUD_BACKUP_JOB_TYPE && job.userId === userId && job.status !== 'completed');

  for (const job of pendingJobs) {
    try {
      await updateSyncQueueJob(job.id, { status: 'syncing', attempts: (job.attempts || 0) + 1, lastError: null });
      await syncService.pushState(userId, job.payload);
      await removeSyncQueueJob(job.id);
    } catch (error) {
      await updateSyncQueueJob(job.id, {
        status: 'failed',
        attempts: (job.attempts || 0) + 1,
        lastError: error?.message || 'Unknown sync failure',
      });
      throw error;
    }
  }
}

export async function getQueuedCloudBackupSummary(userId) {
  return getSyncQueueSummary(CLOUD_BACKUP_JOB_TYPE, userId);
}
