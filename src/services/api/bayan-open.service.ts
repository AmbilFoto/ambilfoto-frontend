import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
// Client Area has its own base URL / token namespace — intentionally isolated
// from the existing admin.service.ts / developer.service.ts.

const BAYAN_OPEN_API_URL =
  import.meta.env.VITE_BAYAN_OPEN_API_URL || 'https://gallery.bayanopen.com/api';

// Host without the trailing /api — used to resolve relative preview_url paths
// returned by the gallery endpoint (e.g. "/api/admin/gallery/preview/xxx.jpg").
const BAYAN_OPEN_API_ORIGIN = new URL(BAYAN_OPEN_API_URL).origin;

export const BAYAN_OPEN_TOKEN_KEY = 'bayan_open_client_token';

const bayanOpenApi = axios.create({
  baseURL: BAYAN_OPEN_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach client-area token (own namespace) ──────────
bayanOpenApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(BAYAN_OPEN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — 401/403 clears token & bounces to client login ───
// Never redirect to /login — that's the main app's login, not the client area's.
bayanOpenApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem(BAYAN_OPEN_TOKEN_KEY);
      localStorage.removeItem('bayan_open_client_session');
      if (!window.location.pathname.startsWith('/clientarea/bayan-open/login')) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/clientarea/bayan-open/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Types — shaped to match the ACTUAL API responses, not assumed fields
// ─────────────────────────────────────────────────────────────────────────────

export interface BayanOpenSummary {
  total_users: number;
  total_faces: number;
  total_photos: number;
  today: {
    users: number;
    faces_added: number;
    photos: number;
  };
}

export interface BayanOpenUserDailyPoint {
  date: string; // "2026-08-22"
  users: number;
}

export interface BayanOpenFaceDailyPoint {
  date: string;
  faces_added: number;
  total_faces: number;
}

export interface BayanOpenPhotoDailyPoint {
  date: string;
  photos_added: number;
}

export interface BayanOpenGalleryDate {
  date: string;
  photos: number;
}

export interface BayanOpenGalleryItem {
  photo_id: string;
  filename: string;
  faces_count: number;
  preview_url: string; // relative, e.g. "/api/admin/gallery/preview/xxx.JPG"
  uploaded_at: string; // ISO, no timezone suffix — treat as local/server time
}

export interface BayanOpenGalleryResponse {
  photos: BayanOpenGalleryItem[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  date: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Resolves a gallery preview_url (relative) into an absolute, loadable URL. */
export function resolveGalleryImageUrl(previewUrl: string): string {
  if (!previewUrl) return '';
  if (previewUrl.startsWith('http')) return previewUrl;
  return `${BAYAN_OPEN_API_ORIGIN}${previewUrl}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service — one call per endpoint, thin wrappers, no guessed fields
// ─────────────────────────────────────────────────────────────────────────────

export const bayanOpenService = {
  async getSummary(): Promise<BayanOpenSummary> {
    const res = await bayanOpenApi.get('/admin/stats/summary');
    return res.data.data as BayanOpenSummary;
  },

  async getUsersDaily(days = 30): Promise<BayanOpenUserDailyPoint[]> {
    const res = await bayanOpenApi.get('/admin/stats/users/daily', { params: { days } });
    return (res.data.data ?? []) as BayanOpenUserDailyPoint[];
  },

  async getFacesDaily(days = 30): Promise<BayanOpenFaceDailyPoint[]> {
    const res = await bayanOpenApi.get('/admin/stats/faces/daily', { params: { days } });
    return (res.data.data ?? []) as BayanOpenFaceDailyPoint[];
  },

  async getPhotosDaily(days = 30): Promise<BayanOpenPhotoDailyPoint[]> {
    const res = await bayanOpenApi.get('/admin/stats/photos/daily', { params: { days } });
    return (res.data.data ?? []) as BayanOpenPhotoDailyPoint[];
  },

  async getGalleryDates(): Promise<BayanOpenGalleryDate[]> {
    const res = await bayanOpenApi.get('/admin/gallery/dates');
    return (res.data.dates ?? []) as BayanOpenGalleryDate[];
  },

  async getGallery(page = 1, limit = 20, date?: string): Promise<BayanOpenGalleryResponse> {
    const res = await bayanOpenApi.get('/admin/gallery', {
      params: { page, limit, ...(date ? { date } : {}) },
    });
    return res.data as BayanOpenGalleryResponse;
  },
};

export default bayanOpenApi;