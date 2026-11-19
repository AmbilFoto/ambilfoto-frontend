import axios from 'axios';
import { API_BASE_URL } from './gateway';

const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =====================
// TYPES
// =====================

export interface PhotographerUpgradeRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  user_phone: string;
  user_registered_at: string;
  ktp_number: string;
  ktp_name: string;
  ktp_photo_url: string | null;
  face_photo_url: string | null;
  business_name: string;
  business_address: string;
  business_phone: string;
  portfolio_url: string | null;
  // 🆕 NEW: Location fields
  province_id: string | null;
  province_name: string | null;
  city_id: string | null;
  city_name: string | null;
  ktp_verification_status: 'valid' | 'invalid' | 'pending' | null;
  ktp_verified_at: string | null;
  face_match_score: number | null;
  face_match_status: 'match' | 'no_match' | 'error' | null;
  face_matched_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpgradeStatus {
  has_request: boolean;
  current_request?: {
    id: string;
    business_name: string;
    status: 'pending' | 'approved' | 'rejected';
    ktp_verification_status: 'valid' | 'invalid' | 'pending' | null;
    face_match_score: number | null;
    face_match_status: 'match' | 'no_match' | 'error' | null;
    rejection_reason: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    updated_at: string;
    // 🆕 NEW: Location in status
    province_name: string | null;
    city_name: string | null;
  };
  rejection_history: any[];
  can_submit: boolean;
  stats: {
    total_attempts: number;
    total_rejections: number;
    max_attempts?: number;
    remaining_attempts: number;
    can_resubmit: boolean;
    max_attempts_reached?: boolean;
  };
}

export interface UpgradeStatistics {
  total_requests: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;
  avg_review_time_hours: number;
  recent_activity: {
    today: number;
    this_week: number;
    this_month: number;
  };
}

export interface UserRequestHistory {
  user_id: string;
  email: string;
  full_name: string;
  total_attempts: number;
  requests: PhotographerUpgradeRequest[];
}

export interface SubmitUpgradeData {
  ktp_number: string;
  ktp_name: string;
  ktp_photo: string; // base64
  face_photo: string; // base64
  business_name: string;
  business_address: string;
  business_phone: string;
  portfolio_url?: string;
  // 🆕 NEW: Location fields (optional)
  province_id?: string;
  province_name?: string;
  city_id?: string;
  city_name?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// =====================
// SERVICE
// =====================

export const photographerUpgradeService = {
  /**
   * USER: Submit photographer upgrade request (with location support)
   */
  async submitUpgradeRequest(data: SubmitUpgradeData): Promise<ApiResponse<{
    request_id: string;
    status: string;
    is_resubmission: boolean;
    attempt_number: number;
  }>> {
    const response = await api.post('/auth/upgrade-to-photographer', data);
    return response.data;
  },

  /**
   * USER: Get upgrade request status
   */
  async getUpgradeStatus(): Promise<ApiResponse<UpgradeStatus>> {
    const response = await api.get('/auth/upgrade-status');
    return response.data;
  },

  /**
   * USER: Cancel pending upgrade request
   */
  async cancelUpgradeRequest(): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete('/auth/upgrade-request');
    return response.data;
  },

  /**
   * ADMIN: Get all upgrade requests
   */
  async getUpgradeRequests(params?: {
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    limit?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }): Promise<ApiResponse<PhotographerUpgradeRequest[]> & { pagination?: any }> {
    const response = await api.get('/admin/photographer-requests', { params });
    return response.data;
  },

  /**
   * ADMIN: Get upgrade statistics
   */
  async getUpgradeStatistics(): Promise<ApiResponse<UpgradeStatistics>> {
    const response = await api.get('/admin/photographer-requests/statistics');
    return response.data;
  },

  /**
   * ADMIN: Get single request details (with photos)
   */
  async getRequestDetails(requestId: string): Promise<ApiResponse<{
    request: PhotographerUpgradeRequest;
    ktp_photo_base64: string;
    face_photo_base64: string;
    verification_details: {
      ktp_validation: any;
      face_matching: any;
    };
    history: Array<{
      action_type: string;
      performed_by?: string;
      notes?: string;
      created_at: string;
    }>;
  }>> {
    const response = await api.get(`/admin/photographer-requests/${requestId}`);
    return response.data;
  },

  /**
   * ADMIN: Get user's complete request history
   */
  async getUserRequestHistory(userId: string): Promise<ApiResponse<UserRequestHistory>> {
    const response = await api.get(`/admin/photographer-requests/user/${userId}/history`);
    return response.data;
  },

  /**
   * ADMIN: Approve upgrade request
   */
  async approveRequest(requestId: string, adminNotes?: string): Promise<ApiResponse<{
    user_id: string;
    business_name: string;
  }>> {
    const response = await api.post(`/admin/photographer-requests/${requestId}/approve`, {
      admin_notes: adminNotes,
    });
    return response.data;
  },

  /**
   * ADMIN: Reject upgrade request
   */
  async rejectRequest(requestId: string, rejectionReason: string, adminNotes?: string): Promise<ApiResponse<{
    can_resubmit: boolean;
    remaining_attempts: number;
  }>> {
    const response = await api.post(`/admin/photographer-requests/${requestId}/reject`, {
      rejection_reason: rejectionReason,
      admin_notes: adminNotes,
    });
    return response.data;
  },
};