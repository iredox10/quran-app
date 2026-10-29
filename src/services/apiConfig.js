/** Public build configuration. All application data uses the Heroku API. */
export const API_DEFAULT_BASE_URL = 'https://qurannur-backend-d7d7312f118d.herokuapp.com';
export const parseBooleanFlag = raw => raw === true || raw === 1 ||
    (typeof raw === 'string' && ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase()));
export function validateApiBaseUrl(raw) {
    const url = new URL(raw || API_DEFAULT_BASE_URL);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
        throw new Error('VITE_API_BASE_URL must be an HTTPS origin (loopback HTTP is allowed for development).');
    }
    return url.origin;
}
export const apiBaseUrl = validateApiBaseUrl(import.meta.env?.VITE_API_BASE_URL);
// Compatibility names for the existing content adapter; Appwrite fallback is retired.
export const useRenderApi = true;
export const renderApiBaseUrl = apiBaseUrl;
export const RENDER_API_DEFAULT_BASE_URL = API_DEFAULT_BASE_URL;
