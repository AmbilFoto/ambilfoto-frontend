import axios from 'axios';
import { API_BASE_URL } from './api.config';

const AUTH_API_URL = API_BASE_URL;

const photographerApi = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

photographerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

photographerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ INTERFACES ============

export interface Event {
  id: string;
  photographer_id: string;
  event_name: string;
  event_type?: string;
  event_date: string;
  location?: string;
  description?: string;
  is_public: boolean;
  access_code?: string;
  watermark_enabled: boolean;
  price_per_photo: number;
  status: 'active' | 'completed' | 'archived';
  total_photos: number;
  photo_count?: number;
  matched_users_count?: number;
  created_at: string;
  updated_at?: string;

  // PRD: Collaborative event fields
  is_collaborative?: boolean;
  max_collaborators?: number | null;
  collaborator_count?: number;
}

export interface EventPhoto {
  id: string;
  event_id: string;
  ai_photo_id: string;
  filename: string;
  faces_count: number;
  upload_order?: number;
  matched_users?: number;
  is_deleted: boolean;
  price?: number;
  price_cash?: number;
  price_in_points?: number;
  is_for_sale?: boolean;
  created_at: string;

  // PRD: Collaborator upload tracking
  uploaded_by_photographer_id?: string;
  status?: 'READY' | 'PENDING' | 'DELETED';

  // Uploader info (dari JOIN di backend)
  uploader_name?: string;
  uploader_business_name?: string;
}

export interface CreateEventData {
  event_name: string;
  event_type?: string;
  event_date: string;
  location?: string;
  description?: string;
  is_public?: boolean;
  access_code?: string;
  watermark_enabled?: boolean;
  price_per_photo?: number;
  event_latitude: number | null;
  event_longitude: number | null;

  // PRD: Collaborative event
  is_collaborative?: boolean;
  max_collaborators?: number | null;
}

export interface UpdateEventData {
  event_name?: string;
  event_type?: string;
  event_date?: string;
  location?: string;
  description?: string;
  is_public?: boolean;
  access_code?: string;
  watermark_enabled?: boolean;
  price_per_photo?: number;
  status?: 'active' | 'completed' | 'archived';
  event_latitude?: number | null;
  event_longitude?: number | null;

  // PRD: Collaborative event
  is_collaborative?: boolean;
  max_collaborators?: number | null;
}

export interface PhotographerProfile {
  id: string;
  user_id: string;
  business_name?: string;
  bio?: string;
  portfolio_url?: string;
  bank_account?: string;
  bank_name?: string;
  full_name: string;
  email: string;
  phone?: string;
  profile_photo?: string;
  province_id?: string | null;
  province_name?: string | null;
  city_id?: string | null;
  city_name?: string | null;
  location_updated_at?: string | null;
  created_at: string;
}

export interface PhotographerStats {
  events?: {
    total_events: number;
    active_events: number;
    completed_events: number;
  };
  photos?: {
    total_photos: number;
    total_faces_detected: number;
  };
  downloads?: {
    total_downloads: number;
    total_revenue: number;
  };
  users?: {
    unique_users: number;
  };
}

export interface ProfileCompletion {
  is_complete: boolean;
  missing_fields: string[];
  current_data: {
    province_id: string | number | null;
    province_name: string | null;
    city_id: string | number | null;
    city_name: string | null;
    business_name?: string;
  };
}

export interface UploadPhotoData {
  face_image: string;
  filename: string;
  upload_order?: number;
  price_cash?: number;
  is_for_sale?: boolean;
}

export interface PhotoSaleRecord {
  photo_id: string;
  ai_photo_id: string;
  filename: string;
  event_id: string;
  event_name: string;
  price: number;
  total_sales: number;
  total_revenue: number;
  view_count?: number;
  last_sale_at?: string;
}

export interface PhotoSalesData {
  summary: {
    total_photos: number;
    total_sales: number;
    total_revenue: number;
    avg_revenue_per_photo: number;
  };
  photos: PhotoSaleRecord[];
  top_performers: PhotoSaleRecord[];
}

export interface EventDetail {
  geo_percentage: number;
  id: string;
  event_name: string;
  event_slug: string;
  event_date: string;
  location: string | null;
  description: string | null;
  event_latitude: number | null;
  event_longitude: number | null;
  total_photos: number;
  geo_enabled_photos: number;
  is_public: boolean;
  created_at: string;
  photographer: {
    id: string;
    name: string;
    photo: string | null;
  };
}

export interface PublicEventBrowse {
  id: string;
  event_name: string;
  event_type?: string;
  event_date: string;
  location?: string;
  description?: string;
  is_public: boolean;
  is_collaborative: boolean;
  max_collaborators: number | null;
  photographer_name: string;
  business_name?: string;
  photo_count: number;
  collaborator_count: number;
  slots_remaining: number | null;
}

export interface PublicEventDetail extends PublicEventBrowse {
  event_latitude?: number | null;
  event_longitude?: number | null;
  watermark_enabled: boolean;
  price_per_photo: number;
  my_role: 'owner' | 'collaborator' | null;
  my_status: 'pending' | 'approved' | 'rejected' | null;
  can_join: boolean;
  can_upload: boolean;
}

export interface PublicEventPhoto {
  id: string;
  filename: string;
  preview_url: string;
  download_url: string;
  price_points: number;
  price_cash: number;
  is_for_sale: boolean;
  faces_count: number;
  matched_users: number;
  created_at: string;
  has_location: boolean;
  // Uploader info
  uploaded_by_photographer_id?: string;
  uploader_name?: string;
  uploader_business_name?: string;
}

export interface Province {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  province_id: string;
}

export interface LocationUpdateResponse {
  province_id: string;
  province_name: string;
  city_id: string;
  city_name: string;
}

export interface ProfileCompletion {
  is_complete: boolean;
  missing_fields: string[];
  current_data: {
    province_id: string | number | null;
    province_name: string | null;
    city_id: string | number | null;
    city_name: string | null;
    business_name?: string;
    full_name?: string;
  };
}

// PRD: Standalone Photo Interfaces
export interface StandalonePhotoLocation {
  lat: number;
  lng: number;
  placeName?: string;
}

export type StandalonePricingMode = 'PER_PHOTO' | 'GROUP';
export type StandaloneVisibility = 'PUBLIC' | 'PRIVATE';
export type StandaloneCategory = 'PERSONAL' | 'COMMERCIAL';

export interface UploadStandalonePhotoData {
  face_image: string;
  filename: string;
  location: StandalonePhotoLocation;
  pricingMode?: StandalonePricingMode;
  groupPrice?: number;
  price_cash?: number;
  price_points?: number;
  is_for_sale?: boolean;
  visibility?: StandaloneVisibility;
  category?: StandaloneCategory;
  extract_gps?: boolean;
}

export interface StandalonePhoto {
  photo_id: string;
  id?: string;
  ai_photo_id: string;
  filename: string;
  photographer_id: string;
  business_name?: string;
  photographer_name: string;
  latitude: number;
  longitude: number;
  place_name?: string;
  pricing_mode: StandalonePricingMode;
  price_cash: number;
  price_points: number;
  group_price?: number;
  visibility: StandaloneVisibility;
  category: StandaloneCategory;
  faces_count: number;
  status: 'READY' | 'PENDING' | 'DELETED';
  created_at: string;
  preview_url: string;
  download_url?: string | null;
  original_uploaded?: boolean;
  matched_users?: number;
  total_purchases?: number;
  total_revenue?: number;

  // ← Fields baru dari getMyAllPhotos
  source: 'standalone' | 'event';
  event_id?: string | null;
  event_name?: string | null;
  event_date?: string | null;
  event_role?: 'owner' | 'collaborator' | null;
}

export interface StandalonePhotoUploadResponse {
  photo_id: string;
  ai_photo_id: string;
  faces_detected: number;
  location: {
    lat: number;
    lng: number;
    place_name?: string;
    source: 'manual' | 'exif';
  };
  pricing: {
    mode: StandalonePricingMode;
    price_cash: number;
    price_points: number;
  };
  dropbox_uploaded: boolean;
}

// ============ SERVICE ============

export const photographerService = {
  // ── Profile ──────────────────────────────────────────────────

  async getProfile(): Promise<{ success: boolean; data?: PhotographerProfile; error?: string }> {
    const response = await photographerApi.get('/photographer/profile');
    return response.data;
  },

  async checkProfileCompletion(): Promise<{
    success: boolean;
    data?: ProfileCompletion;
    error?: string;
  }> {
    const response = await photographerApi.get('/photographer/profile/check-completion', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      params: { _t: Date.now() },
    });
    return response.data;
  },

  async updateProfile(data: {
    business_name?: string;
    bio?: string;
    portfolio_url?: string;
    bank_account?: string;
    bank_name?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.put('/photographer/profile', data);
    return response.data;
  },

  async browsePublicEvents(params?: {
    search?: string;
    type?: 'all' | 'collaborative' | 'public';
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data?: PublicEventBrowse[];
    pagination?: { total: number; page: number; limit: number; total_pages: number };
    error?: string;
  }> {
    const response = await photographerApi.get('/photographer/events/discover', { params });
    return response.data;
  },

  async getPublicEventDetail(eventId: string): Promise<{
    success: boolean;
    data?: PublicEventDetail;
    error?: string;
  }> {
    const response = await photographerApi.get(`/photographer/events/public/${eventId}`);
    return response.data;
  },

  async joinEvent(eventId: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      member_id: string;
      status: 'pending' | 'approved';
      event_name: string;
    };
    error?: string;
    error_code?: string;
  }> {
    const response = await photographerApi.post(`/events/${eventId}/join`);
    return response.data;
  },

  // ── Location ─────────────────────────────────────────────────

  async getProvinces(): Promise<{ success: boolean; data?: Province[]; error?: string }> {
    const response = await photographerApi.get('/master/provinces');
    return response.data;
  },

  async getCities(provinceId: string): Promise<{ success: boolean; data?: City[]; error?: string }> {
    const response = await photographerApi.get('/master/cities', { params: { province_id: provinceId } });
    return response.data;
  },

  async updateLocation(data: {
    province_id: string;
    city_id: string;
  }): Promise<{ success: boolean; data?: LocationUpdateResponse; error?: string }> {
    const response = await photographerApi.put('/photographer/profile', {
      province_id: Number(data.province_id),
      city_id: Number(data.city_id),
    });
    return response.data;
  },

  // ── Statistics ───────────────────────────────────────────────

  async getStatistics(): Promise<{ success: boolean; data?: PhotographerStats; error?: string }> {
    const response = await photographerApi.get('/photographer/statistics');
    return response.data;
  },

  // ── Events ───────────────────────────────────────────────────

  async createEvent(data: CreateEventData): Promise<{
    success: boolean;
    data?: {
      event_id: string;
      event_name: string;
      event_date: string;
      is_collaborative: boolean;
      max_collaborators: number | null;
    };
    error?: string;
  }> {
    const response = await photographerApi.post('/photographer/events', data);
    return response.data;
  },

  async getMyEvents(): Promise<{ success: boolean; data?: Event[]; error?: string }> {
    const response = await photographerApi.get('/photographer/events');
    return response.data;
  },

  async getEventDetails(eventId: string): Promise<{
    success: boolean;
    data?: {
      event: Event;
      photos: EventPhoto[];
      current_photographer_id?: string; // ID photographer yang sedang login
    };
    error?: string;
  }> {
    const response = await photographerApi.get(`/photographer/events/${eventId}`);
    return response.data;
  },

  async updateEvent(
    eventId: string,
    data: UpdateEventData,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.put(`/photographer/events/${eventId}`, data);
    return response.data;
  },

  async deleteEvent(eventId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.delete(`/photographer/events/${eventId}`);
    return response.data;
  },

  async getEventBySlug(eventSlug: string): Promise<{
    data: { event: EventDetail };
  }> {
    const response = await photographerApi.get(`/photographer/events/slug/${eventSlug}`);
    return response.data;
  },

  async getEventPhotos(eventId: string): Promise<{
    data: { photos: PublicEventPhoto[] };
  }> {
    const response = await photographerApi.get(`/photographer/events/${eventId}/photos/public`);
    return response.data;
  },

  // ── Event Photos ─────────────────────────────────────────────

  async uploadPhoto(
    eventId: string,
    data: UploadPhotoData,
  ): Promise<{
    success: boolean;
    data?: {
      photo_id: string;
      ai_photo_id: string;
      faces_detected: number;
      dropbox_uploaded: boolean;
    };
    error?: string;
    error_code?: string;
  }> {
    const response = await photographerApi.post(`/photographer/events/${eventId}/photos`, data);
    return response.data;
  },

  async deletePhoto(
    eventId: string,
    photoId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.delete(`/photographer/events/${eventId}/photos/${photoId}`);
    return response.data;
  },

  async updatePhotoPricing(
    eventId: string,
    photoId: string,
    data: { price_cash: number; price_points: number; is_for_sale: boolean },
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.put(
      `/photographer/events/${eventId}/photos/${photoId}/pricing`,
      data,
    );
    return response.data;
  },

  async updateBulkPricing(
    eventId: string,
    data: { price_cash: number; price_points: number; is_for_sale: boolean },
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.put(
      `/photographer/events/${eventId}/photos/bulk-pricing`,
      data,
    );
    return response.data;
  },

  async getPhotoSales(): Promise<{ success: boolean; data?: PhotoSalesData; error?: string }> {
    const response = await photographerApi.get('/photographer/photo-sales');
    return response.data;
  },

  // ── Standalone Photos ─────────────────────────────────────────

  async uploadStandalonePhoto(data: UploadStandalonePhotoData): Promise<{
    success: boolean;
    data?: StandalonePhotoUploadResponse;
    error?: string;
    error_code?: string;
  }> {
    const response = await photographerApi.post('/photos/upload', data);
    return response.data;
  },

    async getMyAllPhotos(params?: {
    page?: number;
    limit?: number;
    source?: 'standalone' | 'event';
    visibility?: StandaloneVisibility;
    category?: StandaloneCategory;
    status?: string;
  }): Promise<{
    success: boolean;
    data?: StandalonePhoto[];
    pagination?: { total: number; page: number; limit: number; total_pages: number };
    summary?: { standalone_count: number; event_count: number };
    error?: string;
  }> {
    const response = await photographerApi.get('/photos/my', { params });
    const res = response.data;

    // Normalisasi: backend return `id`, frontend butuh `photo_id`
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map((photo) => ({
        ...photo,
        photo_id: photo.photo_id ?? photo.id ?? "",
      }));
    }

    return res;
  },

  async uploadOriginalPhoto(photoId: string, file: File): Promise<{
    success: boolean;
    data?: { photo_id: string; original_uploaded: boolean };
    error?: string;
  }> {
    const formData = new FormData();
    formData.append("photo", file);
    const response = await photographerApi.post(`/photos/${photoId}/original`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async getPhotoPreviewBlob(photoId: string): Promise<Blob> {
    const response = await photographerApi.get(`/photos/${photoId}/content`, {
      responseType: "blob",
    });
    return response.data;
  },

  async updateStandalonePhoto(
    photoId: string,
    data: {
      price_cash?: number;
      price_points?: number;
      pricing_mode?: StandalonePricingMode;
      group_price?: number;
      visibility?: StandaloneVisibility;
      category?: StandaloneCategory;
    },
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.put(`/photos/${photoId}`, data);
    return response.data;
  },

  async deleteStandalonePhoto(
    photoId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await photographerApi.delete(`/photos/${photoId}`);
    return response.data;
  },
};