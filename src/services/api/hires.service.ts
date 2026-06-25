// src/services/api/hires.service.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5050/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============ Interfaces ============

export interface HiResQueueItem {
  queue_id?: string;
  id?: string; // ✅ Added fallback field
  status: 'pending' | 'uploaded' | 'delivered';
  photo_id: string;
  filename?: string;
  photo_filename?: string; // ✅ Added fallback field
  event_name: string;
  buyer_name?: string;
  user_name?: string; // ✅ Added fallback field
  buyer_email?: string;
  user_email?: string; // ✅ Added fallback field
  payment_date: string;
  sla_deadline: string;
  hours_since_payment: number | null; // ✅ Changed to allow null
  purchase_price: number;
  payment_method: string;
  is_overdue: boolean | number; // ✅ Changed to allow number (0/1 from MySQL)
  preview_url?: string;
  hires_url?: string | null;
  status_label?: string;
  can_upload?: boolean;
  can_view_hires?: boolean;
}

export interface HiResQueueStats {
  total: number;
  pending: number;
  uploaded: number;
  overdue: number;
  avg_hours: number | string | null; // ✅ Changed to allow null
}

export interface HiResQueueResponse {
  success: boolean;
  data?: {
    queue: HiResQueueItem[];
    stats?: HiResQueueStats; // ✅ Made optional
  };
  error?: string;
}

export interface HiResUploadData {
  face_image: string;
  filename: string;
  metadata?: {
    resolution?: string;
    format?: string;
    filesize_mb?: number;
  };
}

export interface HiResUploadResponse {
  success: boolean;
  message?: string;
  data?: {
    queue_id: string;
    hires_ai_photo_id: string;
    validation: {
      passed: boolean;
      errors?: string[];
      resolution: string;
      format: string;
      filesize_mb: number;
      validation_id: string;
    };
    user_notified: boolean;
  };
  error?: string;
  validation_errors?: string[];
}

export interface UserHiResPhoto {
  purchase_id: string;
  hires_status: 'waiting' | 'uploaded' | 'delivered';
  hires_uploaded_at: string | null;
  purchased_at: string;
  photo_id: string;
  filename: string;
  event_name: string;
  photographer_name: string;
  preview_url: string;
  hires_url: string | null;
  status_label: string;
  can_download: boolean;
  hours_waiting: number;
  sla_deadline?: string;
  is_overdue?: boolean;
}

export interface UserHiResPhotosResponse {
  success: boolean;
  data?: UserHiResPhoto[];
  error?: string;
}

export interface HiResAnalytics {
  period: string;
  stats: {
    total_deliveries: number;
    pending: number;
    uploaded: number;
    delivered: number;
    overdue: number;
    avg_upload_hours: number | null; // ✅ Changed to allow null
    within_sla: number;
    missed_sla: number;
  };
  by_photographer: {
    photographer_id: string;
    business_name: string;
    total: number;
    delivered: number;
    overdue: number;
    avg_hours: number | null; // ✅ Changed to allow null
    sla_compliance_pct: number | string; // ✅ Changed to allow string (from DB)
  }[];
  daily_trend: {
    date: string;
    total: number;
    delivered: number;
    overdue: number;
  }[];
}

export interface HiResAnalyticsResponse {
  success: boolean;
  data?: HiResAnalytics;
  error?: string;
}

// ============ Service ============

export const hiresService = {
  // ✅ PHOTOGRAPHER ENDPOINTS
  async getQueue(params?: { 
    status?: string; 
    overdue_only?: boolean 
  }): Promise<HiResQueueResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.overdue_only) queryParams.append('overdue_only', 'true');
      
      const response = await api.get(`/hires/photographer/queue?${queryParams.toString()}`);
      
      // ✅ Backend sudah mengirim preview_url, tinggal map field yang diperlukan saja
      if (response.data.success && response.data.data) {
        response.data.data.queue = response.data.data.queue.map((item: any) => ({
          ...item,
          queue_id: item.id,                    // Map id -> queue_id
          filename: item.photo_filename,        // Map photo_filename -> filename
          buyer_name: item.user_name,           // Map user_name -> buyer_name
          buyer_email: item.user_email,         // Map user_email -> buyer_email
          is_overdue: Boolean(item.is_overdue), // ✅ Convert 0/1 to boolean
        }));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('getQueue error:', error.response?.data || error.message);
      throw error;
    }
  },

  async uploadHiRes(queueId: string, data: HiResUploadData): Promise<HiResUploadResponse> {
    try {
      const response = await api.post(`/hires/photographer/${queueId}/upload`, data);
      return response.data;
    } catch (error: any) {
      console.error('uploadHiRes error:', error.response?.data || error.message);
      throw error;
    }
  },

  async markAsDelivered(queueId: string): Promise<{ 
    success: boolean; 
    message?: string; 
    error?: string 
  }> {
    try {
      const response = await api.post(`/hires/photographer/${queueId}/deliver`);
      return response.data;
    } catch (error: any) {
      console.error('markAsDelivered error:', error.response?.data || error.message);
      throw error;
    }
  },

  // ✅ USER ENDPOINTS
  async getMyHiResPhotos(params?: { 
    status?: string 
  }): Promise<UserHiResPhotosResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      
      const response = await api.get(`/hires/user/photos?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('getMyHiResPhotos error:', error.response?.data || error.message);
      throw error;
    }
  },

  async downloadHiRes(purchaseId: string): Promise<void> {
    try {
      const response = await api.get(`/hires/user/${purchaseId}/download`, {
        responseType: 'blob',
      });
      
      // Create download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `hires-${purchaseId}.jpg`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('downloadHiRes error:', error.response?.data || error.message);
      throw error;
    }
  },

  // ✅ ADMIN ENDPOINTS
  async getAnalytics(period?: string): Promise<HiResAnalyticsResponse> {
    try {
      const queryParams = period ? `?period=${period}` : '';
      const response = await api.get(`/hires/admin/analytics${queryParams}`);
      
      // ✅ Normalize data untuk handling null values dan string numbers
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        
        // Normalize by_photographer data
        if (data.by_photographer) {
          data.by_photographer = data.by_photographer.map((p: any) => ({
            ...p,
            avg_hours: p.avg_hours === null ? null : Number(p.avg_hours),
            sla_compliance_pct: Number(p.sla_compliance_pct || 0),
          }));
        }
        
        // Normalize stats
        if (data.stats) {
          data.stats.avg_upload_hours = data.stats.avg_upload_hours === null 
            ? null 
            : Number(data.stats.avg_upload_hours);
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('getAnalytics error:', error.response?.data || error.message);
      throw error;
    }
  },

  async getAdminQueue(params?: { 
    status?: string; 
    overdue_only?: boolean 
  }): Promise<HiResQueueResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.overdue_only) queryParams.append('overdue_only', 'true');
      
      const response = await api.get(`/hires/admin/queue?${queryParams.toString()}`);
      
      // ✅ Normalize admin queue data
      if (response.data.success && response.data.data) {
        response.data.data.queue = response.data.data.queue.map((item: any) => ({
          ...item,
          queue_id: item.id || item.queue_id,
          filename: item.photo_filename || item.filename,
          buyer_name: item.user_name || item.buyer_name,
          buyer_email: item.user_email || item.buyer_email,
          is_overdue: Boolean(item.is_overdue), // Convert 0/1 to boolean
          hours_since_payment: item.hours_since_payment === null 
            ? null 
            : Number(item.hours_since_payment),
        }));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('getAdminQueue error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ✅ HELPER FUNCTIONS
export const hiresHelpers = {
  /**
   * Get status badge color based on hi-res status
   */
  getStatusColor(status: string, isOverdue?: boolean): string {
    if (isOverdue) return 'red';
    
    switch (status) {
      case 'delivered':
        return 'green';
      case 'uploaded':
        return 'yellow';
      case 'waiting':
      case 'pending':
        return 'orange';
      default:
        return 'gray';
    }
  },

  /**
   * Format hours to human readable time
   */
  formatHours(hours: number | null): string {
    if (hours === null || hours === undefined) return '-';
    
    if (hours < 1) {
      return `${Math.round(hours * 60)} menit`;
    } else if (hours < 24) {
      return `${Math.round(hours)} jam`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 
        ? `${days} hari ${remainingHours} jam`
        : `${days} hari`;
    }
  },

  /**
   * Calculate time remaining until SLA deadline
   */
  getTimeRemaining(slaDeadline: string): {
    hours: number;
    isOverdue: boolean;
    label: string;
  } {
    const deadline = new Date(slaDeadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const isOverdue = diffHours < 0;
    const absHours = Math.abs(diffHours);
    
    return {
      hours: diffHours,
      isOverdue,
      label: isOverdue 
        ? `Terlambat ${this.formatHours(absHours)}`
        : `${this.formatHours(absHours)} lagi`
    };
  },

  /**
   * Get emoji for status label
   */
  getStatusEmoji(status: string, isOverdue?: boolean): string {
    if (isOverdue) return '🔴';
    
    switch (status) {
      case 'delivered':
        return '🟢';
      case 'uploaded':
        return '🟡';
      case 'waiting':
      case 'pending':
        return '🟠';
      default:
        return '⚪';
    }
  },

  /**
   * ✅ Safe number conversion with null handling
   */
  safeNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  },

  /**
   * ✅ Format SLA compliance percentage
   */
  formatSLACompliance(value: number | string | null): string {
    if (value === null || value === undefined) return '0.0';
    const num = Number(value);
    return isNaN(num) ? '0.0' : num.toFixed(1);
  },
};