// src/services/api/photographer-escrow.service.ts

import axios from 'axios';
import { API_BASE_URL } from './gateway';

const API_URL = API_BASE_URL;

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

// ============ INTERFACES ============

export interface PendingOrder {
  transaction_id: string;
  order_id: string;
  
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  
  photo: {
    id: string;
    filename: string;
    event_name: string;
    event_type: string | null;
    event_date: string;
    preview_url: string | null;
  };
  
  status: {
    escrow: string;
    delivery: string;
    urgency: 'overdue' | 'urgent' | 'warning' | 'normal' | 'waiting';
    action_required: string;
  };
  
  revision: {
    number: number;
    max: number;
    reason: string | null;
    previous_upload: string | null;
    previous_notes: string | null;
  } | null;
  
  payment: {
    total_amount: number;
    platform_fee: number;
    your_earning: number;
    your_earning_formatted: string;
  };
  
  deadline: {
    upload_deadline: string;
    hours_remaining: number;
    is_overdue: boolean;
    is_urgent: boolean;
  };
  
  purchased_at: string;
}

export interface OrderDetail extends PendingOrder {
  delivery_history: {
    version: number;
    status: string;
    uploaded_at: string;
    confirmed_at: string | null;
    rejected_at: string | null;
    rejection_reason: string | null;
    photographer_notes: string | null;
    file_size_mb: string | null;
    resolution: string | null;
  }[];
  
  history: {
    event: string;
    description: string;
    timestamp: string;
  }[];
}

export interface UploadStats {
  overview: {
    total_orders: number;
    pending_upload: number;
    pending_revision: number;
    awaiting_confirmation: number;
    completed: number;
    overdue_uploads: number;
  };
  
  earnings: {
    total_earned: number;
    total_earned_formatted: string;
    pending_earnings: number;
    pending_earnings_formatted: string;
  };
  
  performance: {
    avg_completion_hours: number | null;
    revision_rate: string;
    avg_revisions_per_order: number;
  };
  
  recent_activity: {
    date: string;
    orders: number;
    earnings: number;
    earnings_formatted: string;
  }[];
}

export interface OrdersSummary {
  total_pending: number;
  total_overdue: number;
  total_urgent: number;
  total_revisions: number;
  total_earning_pending: number;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  data?: {
    delivery_id: string;
    version_number: number;
    is_revision: boolean;
    file_info: {
      size_bytes: number;
      size_mb: string;
      resolution: string;
      format: string;
      color_space: string;
      hash: string;
    };
    escrow_updated: string;
    buyer_deadline: string;
    buyer_deadline_formatted: string;
    auto_approve_in: string;
    notification_sent: boolean;
    next_steps: string[];
  };
  error?: string;
  error_code?: string;
  hint?: string;
}

// ============ SERVICE ============

export const photographerEscrowService = {
  /**
   * Get pending orders (need hi-res upload)
   */
  async getPendingOrders(params?: {
    page?: number;
    limit?: number;
    status?: 'new' | 'revision';
  }): Promise<{
    success: boolean;
    data?: PendingOrder[];
    summary?: OrdersSummary;
    pagination?: PaginationInfo;
    error?: string;
  }> {
    try {
      const response = await api.get('/hires/photographer/queue');
      const raw = response.data?.data;
      const queue = Array.isArray(raw) ? raw : (raw?.queue || []);
      const now = Date.now();
      const mapped: PendingOrder[] = queue.map((item: any) => {
        const createdAt = item.created_at || new Date().toISOString();
        const deadlineAt = item.sla_due_at ? new Date(item.sla_due_at) : new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000);
        const hoursRemaining = (deadlineAt.getTime() - now) / 3600000;
        const overdue = hoursRemaining < 0;
        const urgency = overdue ? 'overdue' : hoursRemaining <= 12 ? 'urgent' : hoursRemaining <= 24 ? 'warning' : 'normal';
        const waiting = item.status === 'waiting' || item.status === 'overdue';
        return {
          transaction_id: item.queue_id || item.id,
          order_id: item.order_id || '',
          buyer: { id: item.user_id || '', name: item.user_id ? `Pembeli ${item.user_id.slice(0, 8)}` : 'Pembeli', email: '', phone: null },
          photo: { id: item.purchase_id || '', filename: item.purchase_id || 'Foto pesanan', event_name: 'Pesanan AmbilFoto', event_type: null, event_date: createdAt, preview_url: null },
          status: { escrow: waiting ? 'HELD' : item.status === 'uploaded' ? 'UPLOADED' : item.status.toUpperCase(), delivery: item.status, urgency, action_required: item.status === 'uploaded' ? 'deliver' : 'upload' },
          revision: null,
          payment: { total_amount: 0, platform_fee: 0, your_earning: 0, your_earning_formatted: '—' },
          deadline: { upload_deadline: deadlineAt.toLocaleString('id-ID'), hours_remaining: hoursRemaining, is_overdue: overdue, is_urgent: !overdue && hoursRemaining <= 12 },
          purchased_at: createdAt,
        };
      });
      const filtered = params?.status === 'new'
        ? mapped.filter(item => item.status.delivery === 'waiting' || item.status.delivery === 'overdue')
        : params?.status === 'revision' ? [] : mapped;
      const pending = mapped.filter(item => item.status.delivery === 'waiting' || item.status.delivery === 'overdue').length;
      const overdue = mapped.filter(item => item.deadline.is_overdue).length;
      return {
        success: response.data?.success === true,
        data: filtered,
        summary: {
          total_pending: pending,
          total_overdue: overdue,
          total_urgent: mapped.filter(item => item.status.urgency === 'urgent').length,
          total_revisions: 0,
          total_earning_pending: 0,
        },
      };
    } catch (error: any) {
      console.error('getPendingOrders (HiRes Service) error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Gagal memuat antrean Hi-Res' };
    }
  },

  /**
   * Get order details
   */
  async getOrderDetails(transactionId: string): Promise<{
    success: boolean;
    data?: OrderDetail;
    error?: string;
  }> {
    try {
      const response = await api.get(`/photographer/orders/${transactionId}`);
      return response.data;
    } catch (error: any) {
      console.error('getOrderDetails error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch order details'
      };
    }
  },

  /**
   * Upload hi-res photo (accepts FormData directly)
   */
  async uploadHiRes(
    queueId: string,
    formData: FormData
  ): Promise<UploadResponse> {
    try {
      const response = await api.post(`/hires/photographer/${encodeURIComponent(queueId)}/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return {
        success: response.data?.success === true,
        message: 'Hi-Res berhasil diunggah',
        data: response.data?.data,
        error: response.data?.error,
      };
    } catch (error: any) {
      console.error('uploadHiRes (HiRes Service) error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Gagal mengunggah Hi-Res' };
    }
  },

  async markAsDelivered(queueId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post(`/hires/photographer/${encodeURIComponent(queueId)}/deliver`);
      return { success: response.data?.success === true, error: response.data?.error };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Gagal mengirim Hi-Res ke pembeli' };
    }
  },

  /**
   * Upload hi-res photo (legacy method - accepts File)
   * @deprecated Use uploadHiRes with FormData instead
   */
  async uploadHiResPhoto(
    transactionId: string,
    file: File,
    photographerNotes?: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (photographerNotes) {
      formData.append('photographer_notes', photographerNotes);
    }
    
    return this.uploadHiRes(transactionId, formData);
  },

  /**
   * Get upload statistics
   */
  async getUploadStats(): Promise<{
    success: boolean;
    data?: UploadStats;
    error?: string;
  }> {
    try {
      const response = await api.get('/photographer/orders/stats');
      return response.data;
    } catch (error: any) {
      console.error('getUploadStats error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch statistics'
      };
    }
  },
};

// ============ HELPER FUNCTIONS ============

export const photographerEscrowHelpers = {
  /**
   * Get urgency badge color
   */
  getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case 'overdue':
        return 'red';
      case 'urgent':
        return 'orange';
      case 'warning':
        return 'yellow';
      case 'waiting':
        return 'blue';
      default:
        return 'gray';
    }
  },

  /**
   * Get urgency icon
   */
  getUrgencyIcon(urgency: string): string {
    switch (urgency) {
      case 'overdue':
        return '🔴';
      case 'urgent':
        return '🟠';
      case 'warning':
        return '🟡';
      case 'waiting':
        return '🔵';
      default:
        return '⚪';
    }
  },

  /**
   * Format deadline message
   */
  formatDeadline(hoursRemaining: number): string {
    if (hoursRemaining < 0) {
      return `OVERDUE - ${Math.abs(Math.round(hoursRemaining))}h terlambat!`;
    } else if (hoursRemaining < 1) {
      return `${Math.round(hoursRemaining * 60)} menit tersisa`;
    } else if (hoursRemaining < 24) {
      return `${Math.round(hoursRemaining)} jam tersisa`;
    } else {
      const days = Math.floor(hoursRemaining / 24);
      const hours = Math.round(hoursRemaining % 24);
      return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
    }
  },

  /**
   * Calculate progress percentage (0-100)
   */
  getDeadlineProgress(hoursRemaining: number, totalHours: number = 48): number {
    const elapsed = totalHours - hoursRemaining;
    const progress = (elapsed / totalHours) * 100;
    return Math.min(Math.max(progress, 0), 100);
  },

  /**
   * Is order urgent?
   */
  isUrgent(hoursRemaining: number): boolean {
    return hoursRemaining <= 12 && hoursRemaining > 0;
  },

  /**
   * Is order overdue?
   */
  isOverdue(hoursRemaining: number): boolean {
    return hoursRemaining < 0;
  },

  /**
   * Get order priority (for sorting)
   */
  getOrderPriority(order: PendingOrder): number {
    if (order.deadline.is_overdue) return 1;
    if (order.status.urgency === 'urgent') return 2;
    if (order.revision) return 3;
    return 4;
  },

  /**
   * Sort orders by priority
   */
  sortByPriority(orders: PendingOrder[]): PendingOrder[] {
    return [...orders].sort((a, b) => {
      const priorityA = this.getOrderPriority(a);
      const priorityB = this.getOrderPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Within same priority, sort by hours remaining (ascending)
      return a.deadline.hours_remaining - b.deadline.hours_remaining;
    });
  },
};