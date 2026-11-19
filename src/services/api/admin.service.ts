import axios from 'axios';
import { API_BASE_URL } from './gateway';

const AUTH_API_URL = API_BASE_URL;

const adminApi = axios.create({
  baseURL: `${AUTH_API_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface DashboardStats {
  users: {
    total_users: number;
    regular_users: number;
    photographers: number;
    admins: number;
    verified_users: number;
    active_users: number;
    deleted_users: number;
    today_registrations: number;
    week_registrations: number;
    month_registrations: number;
    active_last_week: number;
    active_last_month: number;
  };
  events: {
    total_events: number;
    active_events: number;
    completed_events: number;
    archived_events: number;
    today_events: number;
    public_events: number;
    private_events: number;
    avg_photos_per_event: number;
  };
  photos: {
    total_photos: number;
    total_faces_detected: number;
    avg_faces_per_photo: number;
    active_photos: number;
    deleted_photos: number;
    today_uploads: number;
    week_uploads: number;
  };
  matches: {
    total_matches: number;
    unique_users_matched: number;
    photos_with_matches: number;
    avg_confidence: number;
    today_matches: number;
  };
  downloads: {
    total_downloads: number;
    total_revenue: number;
    avg_price_per_download: number;
    unique_buyers: number;
    completed_downloads: number;
    pending_downloads: number;
    today_downloads: number;
    today_revenue: number;
  };
  api_keys: {
    total_api_keys: number;
    active_keys: number;
    expired_keys: number;
    revoked_keys: number;
    total_tokens_purchased: number;
    total_tokens_remaining: number;
    total_tokens_used: number;
    keys_last_month: number;
  };
  tokens: {
    total_transactions: number;
    total_revenue: number;
    purchases: number;
    renewals: number;
    today_revenue: number;
  };
  system_health: {
    database: string;
    ai_server: string;
    ai_details?: any;
    ai_error?: string;
  };
  recent_activity: Array<{ action: string; count: number }>;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: 'user' | 'photographer' | 'admin';
  profile_photo?: string;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
  deleted_at?: string;
  photographer_id?: string;
  business_name?: string;
  activity_count: number;
  api_key_count: number;
}

export interface AdminEvent {
  id: string;
  event_name: string;
  event_type: string;
  event_date: string;
  location: string;
  status: 'active' | 'completed' | 'archived';
  is_public: boolean;
  total_photos: number;
  created_at: string;
  photographer_id: string;
  business_name: string;
  photographer_name: string;
  photographer_email: string;
  photo_count: number;
  matched_users: number;
  download_count: number;
  revenue: number;
}

export interface Download {
  id: string;
  user_id: string;
  event_photo_id: string;
  amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  payment_method: string;
  transaction_id?: string;
  created_at: string;
  user_name: string;
  user_email: string;
  event_name: string;
  photographer_id: string;
  photographer_name: string;
  photographer_full_name: string;
  filename: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
  full_name: string;
  email: string;
  role: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const adminService = {
  // Dashboard
  async getDashboardStats(): Promise<{ success: boolean; data: DashboardStats }> {
    const response = await adminApi.get('/dashboard');
    return response.data;
  },

  async systemHealthCheck(): Promise<{ success: boolean; data: any }> {
    const response = await adminApi.get('/health');
    return response.data;
  },

  // User Management
  async getAllUsers(params?: {
    role?: string;
    is_verified?: string;
    deleted?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AdminUser[]; pagination: PaginationInfo }> {
    const response = await adminApi.get('/users', { params });
    return response.data;
  },

  async getUserDetails(userId: string): Promise<{ success: boolean; data: any }> {
    const response = await adminApi.get(`/users/${userId}`);
    return response.data;
  },

  async updateUserStatus(userId: string, action: 'verify' | 'suspend' | 'activate' | 'delete', reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await adminApi.put(`/users/${userId}/status`, { action, reason });
    return response.data;
  },

  async createAdmin(data: { email: string; password: string; full_name: string }): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await adminApi.post('/users/admin', data);
    return response.data;
  },

  // Event Management
  async getAllEvents(params?: {
    status?: string;
    photographer_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AdminEvent[]; pagination: PaginationInfo }> {
    const response = await adminApi.get('/events', { params });
    return response.data;
  },

  async getEventDetails(eventId: string): Promise<{ success: boolean; data: any }> {
    const response = await adminApi.get(`/events/${eventId}`);
    return response.data;
  },

  // Downloads & Revenue
  async getAllDownloads(params?: {
    payment_status?: string;
    user_id?: string;
    photographer_id?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: Download[]; summary: any; pagination: PaginationInfo }> {
    const response = await adminApi.get('/downloads', { params });
    return response.data;
  },

  async getRevenueAnalytics(params?: {
    period?: '7d' | '30d' | '90d' | '1y';
    photographer_id?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await adminApi.get('/revenue', { params });
    return response.data;
  },

  // Logs & Monitoring
  async getActivityLogs(params?: {
    user_id?: string;
    action?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: ActivityLog[]; pagination: PaginationInfo }> {
    const response = await adminApi.get('/logs', { params });
    return response.data;
  },

  async getApiUsageStats(params?: {
    period?: '7d' | '30d' | '90d';
    api_key_id?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await adminApi.get('/api-usage', { params });
    return response.data;
  },

  // Storage
  async getStorageStats(): Promise<{ success: boolean; data: any }> {
    const response = await adminApi.get('/storage');
    return response.data;
  },

  // Pricing
  async updatePricingPlan(planId: string, data: {
    display_name?: string;
    token_amount?: number;
    duration_months?: number;
    price?: number;
    description?: string;
    features?: string[];
    is_active?: boolean;
    sort_order?: number;
  }): Promise<{ success: boolean; message: string }> {
    const response = await adminApi.put(`/pricing/${planId}`, data);
    return response.data;
  },
};
