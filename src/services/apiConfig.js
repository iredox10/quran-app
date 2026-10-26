/**
 * Shared backend configuration flags — the single source of truth for the
 * Render.com backend migration.
 *
 * Everything defaults OFF: when `VITE_USE_RENDER_API` is falsy the app talks
 * to Appwrite (auth/sync/realtime) and api.quran.com (content) exactly as
 * before. Both `VITE_*` values are build-time inlined — never put secrets in
 * them.
 */
const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export const parseBooleanFlag = (raw) => {
    if (raw === true || raw === 1) return true;
    if (typeof raw !== 'string') return false;
    return TRUTHY.has(raw.trim().toLowerCase());
};

export const useRenderApi = parseBooleanFlag(import.meta.env?.VITE_USE_RENDER_API);

export const RENDER_API_DEFAULT_BASE_URL = 'https://quran-nur-api.onrender.com';
export const renderApiBaseUrl = import.meta.env?.VITE_API_BASE_URL || RENDER_API_DEFAULT_BASE_URL;
