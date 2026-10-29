/** The single application backend; frontend static hosting is independent. */
export { authService, syncService, client, databaseId, collectionId, http } from './renderApi';
export const cloudBackendId = 'heroku';
export const isCloudConfigured = true;
