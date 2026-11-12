// src/services/api/buyer-escrow.service.ts

import axios from 'axios';
import { API_BASE_URL } from './api.config';

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

export interface BuyerPurchase {
  transaction_id: string;
  order_id: string;
  
  photo: {
    id: string;
    filename: string;
    event_name: string;
    preview_url: string | null;
    download_url: string | null;
    faces_count?: number;
  };
  
  photographer: {
    id: string;
    name: string;
    business_name?: string;
    full_name?: string;
    bio?: string | null;
    portfolio_url?: string | null;
    email?: string;
    phone?: string;
  };
  
  payment: {
    amount: number;
    amount_formatted: string;
    method: string;
    status: string;
    platform_fee?: number;
    photographer_share?: number;
    paid_at?: string;
  };
  
  escrow: {
    status: 'NOT_APPLICABLE' | 'HELD' | 'WAITING_CONFIRMATION' | 'REVISION_REQUESTED' | 'RELEASED' | 'REFUNDED';
    status_message: string;
    can_confirm: boolean;
    can_download: boolean;
    deadline: string | null;
    confirmation_deadline?: string | null;
    hours_remaining: number | null;
    minutes_remaining?: number | null;
    revision_count: number;
    max_revisions: number;
    can_request_revision?: boolean;
    urgency?: 'overdue' | 'urgent' | 'warning' | 'normal' | 'waiting';
    held_at?: string | null;
    released_at?: string | null;
  };
  
  delivery: {
    id?: string;
    version: number;
    status?: string;
    uploaded_at: string;
    confirmed_at?: string | null;
    photographer_notes?: string | null;
    rejection_reason?: string | null;
    file_size_mb?: string | null;
    resolution: string | null;
    file?: {
      size_bytes?: number;
      size_mb?: string | null;
      hash?: string;
      resolution?: string | null;
      format?: string;
      color_space?: string;
    };
  } | null;
  
  purchased_at: string;
  created_at?: string;
}

export interface PurchaseDetail extends BuyerPurchase {
  event: {
    id: string;
    name: string;
    type: string | null;
    date: string;
    location: string | null;
  };
  
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
    from_status: string;
    to_status: string;
    actor: string;
    timestamp: string;
    metadata: any;
  }[];
  
  actions: {
    action: string;
    label: string;
    endpoint: string;
    method: string;
    payload?: any;
  }[];
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============ SERVICE ============

export const buyerEscrowService = {
  /**
   * Get all purchases for current buyer
   */
  async getMyPurchases(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data?: BuyerPurchase[];
    pagination?: PaginationInfo;
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      
      const response = await api.get(`/buyer/purchases?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('getMyPurchases error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch purchases'
      };
    }
  },

  /**
   * Get purchase detail by transaction ID
   */
  async getPurchaseDetails(transactionId: string): Promise<{
    success: boolean;
    data?: PurchaseDetail;
    error?: string;
  }> {
    try {
      const response = await api.get(`/buyer/purchases/${transactionId}`);
      return response.data;
    } catch (error: any) {
      console.error('getPurchaseDetails error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch purchase details'
      };
    }
  },

  /**
   * Confirm delivery (YES = accept, NO = request revision)
   */
  async confirmDelivery(
    transactionId: string,
    confirmation: 'YES' | 'NO',
    rejectionReason?: string
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
    error_code?: string;
  }> {
    try {
      const response = await api.post(`/buyer/purchases/${transactionId}/confirm`, {
        confirmation,
        rejection_reason: rejectionReason || null
      });
      return response.data;
    } catch (error: any) {
      console.error('confirmDelivery error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to process confirmation',
        error_code: error.response?.data?.error_code
      };
    }
  },

  /**
   * Get delivery preview (watermarked)
   */
  async getDeliveryPreview(transactionId: string, version?: number): Promise<{
    success: boolean;
    data?: {
      version: number;
      preview_url: string | null;
      watermarked: boolean;
      uploaded_at: string;
      photographer_notes: string | null;
      file_info: {
        size_mb: string | null;
        resolution: string | null;
        format: string | null;
      };
    };
    error?: string;
  }> {
    try {
      const queryParams = version ? `?version=${version}` : '';
      const response = await api.get(`/buyer/purchases/${transactionId}/preview${queryParams}`);
      return response.data;
    } catch (error: any) {
      console.error('getDeliveryPreview error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch preview'
      };
    }
  },

  /**
   * Cancel purchase (only before photographer uploads)
   */
  async cancelPurchase(transactionId: string, reason?: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await api.post(`/buyer/purchases/${transactionId}/cancel`, {
        reason: reason || null
      });
      return response.data;
    } catch (error: any) {
      console.error('cancelPurchase error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to cancel purchase'
      };
    }
  },
};

// ============ HELPER FUNCTIONS ============

export const buyerEscrowHelpers = {
  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'HELD':
        return 'blue';
      case 'WAITING_CONFIRMATION':
        return 'yellow';
      case 'REVISION_REQUESTED':
        return 'orange';
      case 'RELEASED':
        return 'green';
      case 'REFUNDED':
        return 'gray';
      default:
        return 'gray';
    }
  },

  /**
   * Get urgency level
   */
  getUrgency(hoursRemaining: number | null, status: string): 'overdue' | 'urgent' | 'warning' | 'normal' {
    if (status === 'WAITING_CONFIRMATION') {
      if (!hoursRemaining || hoursRemaining <= 0) return 'overdue';
      if (hoursRemaining <= 6) return 'urgent';
      if (hoursRemaining <= 12) return 'warning';
    }
    return 'normal';
  },

  /**
   * Format time remaining
   */
  formatTimeRemaining(hoursRemaining: number | null): string {
    if (!hoursRemaining || hoursRemaining <= 0) return 'Auto-approved';
    
    if (hoursRemaining < 1) {
      return `${Math.round(hoursRemaining * 60)} menit`;
    } else if (hoursRemaining < 24) {
      return `${Math.round(hoursRemaining)} jam`;
    } else {
      const days = Math.floor(hoursRemaining / 24);
      const hours = Math.round(hoursRemaining % 24);
      return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
    }
  },

  /**
   * Get status icon emoji
   */
  getStatusEmoji(status: string): string {
    switch (status) {
      case 'HELD':
        return '⏳';
      case 'WAITING_CONFIRMATION':
        return '✅';
      case 'REVISION_REQUESTED':
        return '🔄';
      case 'RELEASED':
        return '🎉';
      case 'REFUNDED':
        return '💸';
      default:
        return '📦';
    }
  },

  /**
   * Can user request revision?
   */
  canRequestRevision(purchase: BuyerPurchase): boolean {
    return (
      purchase.escrow.status === 'WAITING_CONFIRMATION' &&
      purchase.escrow.revision_count < purchase.escrow.max_revisions &&
      purchase.escrow.can_confirm
    );
  },

  /**
   * Can user download?
   */
  canDownload(purchase: BuyerPurchase): boolean {
    return purchase.escrow.can_download;
  },
};