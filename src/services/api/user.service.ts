import axios from 'axios';

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3000/api';

const userApi = axios.create({
  baseURL: AUTH_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

userApi.interceptors.response.use(
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

export interface UserPhoto {
  match_id?: string;
  event_photo_id: string;
  photo_id: string;
  filename: string;
  faces_count?: number;
  favorite_count?: number;

  type?: 'event' | 'standalone';

  event_id: string;
  event_name: string;
  event_type?: string;
  event_date: string;
  event_location?: string;
  event_description?: string;

  photographer_id?: string;
  business_name?: string;
  photographer_name: string;

  similarity?: number;
  confidence?: number;
  match_date?: string;

  latitude?: number;
  longitude?: number;
  place_name?: string;
  pricing_mode?: 'PER_PHOTO' | 'GROUP';

  // Escrow
  escrow_status?: 'NOT_APPLICABLE' | 'HELD' | 'WAITING_CONFIRMATION' | 'REVISION_REQUESTED' | 'RELEASED' | 'REFUNDED';
  escrow_transaction_id?: string;
  escrow_can_confirm?: boolean;
  escrow_can_download?: boolean;
  escrow_deadline?: string | null;
  escrow_hours_remaining?: number | null;
  escrow_revision_count?: number;
  escrow_max_revisions?: number;
  escrow_status_message?: string;

  delivery_version?: number | null;
  delivery_uploaded_at?: string | null;

  price_cash?: number;
  price_points?: number;
  price?: number;
  price_in_points?: number;
  is_for_sale?: boolean | 0 | 1;
  sold_count?: number;

  is_purchased: boolean | 0 | 1;
  purchased_at?: string;
  purchase_price?: number;
  payment_method?: 'cash' | 'points';

  is_favorited?: boolean | 0 | 1;
  favorited_at?: string;
  favorite_id?: string;

  preview_url: string;
  download_url?: string | null;

  cta?: 'BUY' | 'DOWNLOAD' | 'FREE_DOWNLOAD' | 'VIEW';
  price_display?: string;

  id?: string;
  upload_timestamp?: string;
  uploaded_at?: string;
}

export interface EventBrowse {
  id: string;
  event_name: string;
  event_type?: string;
  event_date: string;
  location?: string;
  description?: string;
  photographer_name: string;
  photo_count: number;
  is_public: boolean;
}

export interface PhotoDetail {
  id: string;
  event_id: string;
  filename: string;
  preview_url: string;
  event_name: string;
  event_date: string;
  event_location?: string;
  photographer_id: string;
  photographer_name: string;
  price_cash: number;
  price_points: number;
  is_for_sale: boolean | 0 | 1;
  is_purchased: boolean | 0 | 1;
  is_favorited?: boolean | 0 | 1;
}

export interface UserBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  recent_transactions: {
    transaction_type: string;
    amount: number;
    description: string;
    created_at: string;
  }[];
  last_updated: string;
}

export interface MatchPhotosData {
  embedding: number[];
}

export interface PurchaseResponse {
  success: boolean;
  message?: string;
  data?: {
    transaction_id: string;
    purchase_id?: string;
    order_id?: string;
    photo: {
      id: string;
      filename: string;
      event_name: string;
    };
    amount?: number;
    payment_url?: string;
    token?: string;
    expired_at?: string;
    payment?: {
      method: string;
      points_used: number;
      cash_value: number;
      balance_before?: number;
      balance_after?: number;
    };
    download_url?: string;
  };
  error?: string;
  error_code?: string;
  details?: {
    required?: number;
    available?: number;
    shortage?: number;
    photo_id?: string;
    price_points?: number;
    price_cash?: number;
  };
}

export interface MyPhotosResponse {
  success: boolean;
  data?: UserPhoto[];
  matched_count?: number;
  /** Backend is refreshing in background — show stale data with a spinner */
  refreshing?: boolean;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  error?: string;
}

export interface FavoriteResponse {
  success: boolean;
  message?: string;
  data?: {
    favorite_id?: string;
    is_favorited?: boolean;
  };
  error?: string;
  error_code?: string;
}

export interface UserStats {
  total_matched_photos: number;
  total_event_matches: number;
  total_standalone_matches: number;
  total_downloads: number;
  total_favorites?: number;
  total_spent: number;
  total_points_spent?: number;
  recent_matches: number;
}

// ============ SERVICE ============

export const userService = {

  // ── Balance ──────────────────────────────────────────────────────────────────
  async getBalance(): Promise<{ success: boolean; data?: UserBalance; error?: string }> {
    const response = await userApi.get('/user/balance');
    return response.data;
  },

  // ── Statistics ────────────────────────────────────────────────────────────────
  async getUserStats(): Promise<{ success: boolean; data?: UserStats; error?: string }> {
    const response = await userApi.get('/user/statistics');
    return response.data;
  },

  // ── Match photos via AI (dipanggil dari useMyPhotos background trigger) ───────
    async matchMyPhotos(data: { embedding: number[]; user_id: string }): Promise<MyPhotosResponse> {
      const response = await userApi.post('/user/my_photos', {
        embedding: data.embedding,
        user_id: data.user_id,
      });
      return response.data;
    },

  // ── My Photos (event matches, cached) ─────────────────────────────────────────
  // Pass refresh=true to silently re-run AI matching in the background.
  // The call still returns immediately with cached data; `refreshing: true` in
  // the response tells the UI to show a subtle "updating…" indicator.
  async getMyPhotos(params?: {
    page?: number;
    limit?: number;
    refresh?: boolean;
  }): Promise<MyPhotosResponse> {
    const response = await userApi.get('/user/my-photos', { params });
    return response.data;
  },

  // ── My Standalone Photos ──────────────────────────────────────────────────────
  async getMyStandalonePhotos(params?: {
    page?: number;
    limit?: number;
  }): Promise<MyPhotosResponse> {
    const response = await userApi.get('/user/my-standalone-photos', { params });
    return response.data;
  },

  // ── Combined feed: event + standalone merged ──────────────────────────────────
  // Fetches both in parallel and returns a single sorted array.
  async getMyAllPhotos(params?: {
    page?: number;
    limit?: number;
  }): Promise<MyPhotosResponse> {
    const [eventRes, standaloneRes] = await Promise.allSettled([
      userService.getMyPhotos(params),
      userService.getMyStandalonePhotos(params),
    ]);

    const eventPhotos      = eventRes.status === 'fulfilled' ? eventRes.value.data ?? [] : [];
    const standalonePhotos = standaloneRes.status === 'fulfilled' ? standaloneRes.value.data ?? [] : [];

    // Tag event photos so UI can differentiate
    const tagged = [
      ...eventPhotos.map(p => ({ ...p, type: 'event' as const })),
      ...standalonePhotos.map(p => ({ ...p, type: 'standalone' as const })),
    ].sort((a, b) => {
      // Sort by match_date descending (newest first)
      const dateA = new Date(a.match_date ?? a.event_date ?? 0).getTime();
      const dateB = new Date(b.match_date ?? b.event_date ?? 0).getTime();
      return dateB - dateA;
    });

    return {
      success: true,
      data:    tagged,
      pagination: {
        total:       tagged.length,
        page:        params?.page ?? 1,
        limit:       params?.limit ?? 100,
        total_pages: 1,
      },
    };
  },

  // ── Purchased Photos ──────────────────────────────────────────────────────────
  async getPurchasedPhotos(params?: { page?: number; limit?: number }): Promise<MyPhotosResponse> {
    const response = await userApi.get('/user/purchased', { params });
    return response.data;
  },

  // ── Favorite Photos (event) ───────────────────────────────────────────────────
  async getFavoritePhotos(params?: { page?: number; limit?: number }): Promise<MyPhotosResponse> {
    const response = await userApi.get('/user/favorites', { params });
    return response.data;
  },

  async addToFavorites(photoId: string): Promise<FavoriteResponse> {
    const response = await userApi.post(`/user/photos/${photoId}/favorite`);
    return response.data;
  },

  async removeFromFavorites(photoId: string): Promise<FavoriteResponse> {
    const response = await userApi.delete(`/user/photos/${photoId}/favorite`);
    return response.data;
  },

  async checkFavoriteStatus(photoId: string): Promise<FavoriteResponse> {
    const response = await userApi.get(`/user/photos/${photoId}/favorite/status`);
    return response.data;
  },

  // ── Favorite Photos (standalone) ──────────────────────────────────────────────
  async getStandaloneFavorites(params?: { page?: number; limit?: number }): Promise<MyPhotosResponse> {
    const response = await userApi.get('/user/standalone-favorites', { params });
    return response.data;
  },

  async addStandaloneToFavorites(photoId: string): Promise<FavoriteResponse> {
    const response = await userApi.post(`/user/standalone-photos/${photoId}/favorite`);
    return response.data;
  },

  async removeStandaloneFromFavorites(photoId: string): Promise<FavoriteResponse> {
    const response = await userApi.delete(`/user/standalone-photos/${photoId}/favorite`);
    return response.data;
  },

  // ── Unified favorite toggle (works for both event and standalone) ─────────────
  async toggleFavorite(
    photoId: string,
    photoType: 'event' | 'standalone',
    currentlyFavorited: boolean,
  ): Promise<FavoriteResponse> {
    if (photoType === 'standalone') {
      return currentlyFavorited
        ? userService.removeStandaloneFromFavorites(photoId)
        : userService.addStandaloneToFavorites(photoId);
    }
    return currentlyFavorited
      ? userService.removeFromFavorites(photoId)
      : userService.addToFavorites(photoId);
  },

  // ── Purchase (event photo) ────────────────────────────────────────────────────
  async purchasePhoto(photoId: string, paymentMethod: 'cash' | 'points'): Promise<PurchaseResponse> {
    const response = await userApi.post(`/user/photos/${photoId}/purchase`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },

  // ── Purchase (standalone photo) ───────────────────────────────────────────────
  async purchaseStandalonePhoto(
    photoId: string,
    paymentMethod: 'cash' | 'points',
  ): Promise<PurchaseResponse> {
    const response = await userApi.post(`/user/standalone-photos/${photoId}/purchase`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },

  // ── Unified purchase (works for both) ─────────────────────────────────────────
  async purchaseAnyPhoto(
    photoId: string,
    photoType: 'event' | 'standalone',
    paymentMethod: 'cash' | 'points',
  ): Promise<PurchaseResponse> {
    return photoType === 'standalone'
      ? userService.purchaseStandalonePhoto(photoId, paymentMethod)
      : userService.purchasePhoto(photoId, paymentMethod);
  },

  // ── Download (event photo) ─────────────────────────────────────────────────────
  async downloadPhoto(photoId: string): Promise<void> {
    const downloadUrl = `${userApi.defaults.baseURL}/user/photos/${photoId}/download`;
    const token = localStorage.getItem('auth_token');
    const link  = document.createElement('a');
    link.href   = `${downloadUrl}?token=${token}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async downloadPhotoBlob(photoId: string): Promise<Blob> {
    const response = await userApi.get(`/user/photos/${photoId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // ── Download (standalone photo) ───────────────────────────────────────────────
  async downloadStandalonePhoto(photoId: string): Promise<void> {
    const downloadUrl = `${userApi.defaults.baseURL}/user/standalone-photos/${photoId}/download`;
    const token = localStorage.getItem('auth_token');
    const link  = document.createElement('a');
    link.href   = `${downloadUrl}?token=${token}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async downloadStandalonePhotoBlob(photoId: string): Promise<Blob> {
    const response = await userApi.get(`/user/standalone-photos/${photoId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // ── Unified download (works for both) ─────────────────────────────────────────
  async downloadAnyPhoto(photoId: string, photoType: 'event' | 'standalone'): Promise<void> {
    return photoType === 'standalone'
      ? userService.downloadStandalonePhoto(photoId)
      : userService.downloadPhoto(photoId);
  },

  // ── Face Matching (manual trigger) ────────────────────────────────────────────
  async matchPhotos(data: MatchPhotosData): Promise<MyPhotosResponse> {
    const response = await userApi.post('/user/match-face', data);
    return response.data;
  },

  // ── Browse Events ─────────────────────────────────────────────────────────────
  async browseEvents(): Promise<{ success: boolean; data?: EventBrowse[]; error?: string }> {
    const response = await userApi.get('/user/events');
    return response.data;
  },

  async getEventPhotos(eventId: string): Promise<MyPhotosResponse> {
    const response = await userApi.get(`/user/events/${eventId}/photos`);
    return response.data;
  },

  async getPhotoDetails(
    photoId: string,
  ): Promise<{ success: boolean; data?: PhotoDetail; error?: string }> {
    const response = await userApi.get(`/user/photos/${photoId}`);
    return response.data;
  },
};