import axios from 'axios';
import { API_BASE_URL } from './api.config';

const AUTH_API_URL = API_BASE_URL;

const dropboxApi = axios.create({
  baseURL: `${AUTH_API_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
dropboxApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
dropboxApi.interceptors.response.use(
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
export interface DropboxFolder {
  id: string;
  name: string;
  path: string;
  file_count: number;
  total_size_mb: string;
}

export interface DropboxFoldersResponse {
  success: boolean;
  data: {
    folders: DropboxFolder[];
    parent_path: string;
  };
}

export interface SampleFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

export interface SampleThumbnail {
  name: string;
  thumbnail_url: string;
  size: number;
}

export interface FolderDetailsResponse {
  success: boolean;
  data: {
    folder_path: string;
    total_files: number;
    total_size_bytes: number;
    total_size_mb: string;
    sample_files: SampleFile[];
    estimated_processing_time: number;
    sample_thumbnails: SampleThumbnail[];
  };
}

export interface CreateEventFromDropboxRequest {
  dropbox_path: string;
  event_name: string;
  event_type: string;
  event_date: string;
  location: string;
  description?: string;
  is_public: boolean;
  access_code?: string;
  photographer_id: string;
  default_price_points: number;
  default_price_cash: number;
  is_for_sale: boolean;
  watermark_enabled: boolean;
  extract_gps: boolean;
  event_latitude?: number;
  event_longitude?: number;
}

export interface CreateEventResponse {
  success: boolean;
  message: string;
  data: {
    event_id: string;
    event_name: string;
    processing_status: string;
    status_check_url: string;
  };
}

export interface ProcessingProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  current_file?: string;
  completed?: boolean;
}

export interface ProcessingLog {
  id?: string;
  file_name: string;
  status: 'success' | 'failed' | 'processing';
  faces_detected: number;
  error_message: string | null;
  processing_time_ms: number;
  created_at: string;
}

export interface ProcessingStatusResponse {
  success: boolean;
  data: {
    event_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: ProcessingProgress;
    total_photos: number;
    started_at: string | null;
    completed_at: string | null;
    recent_logs: ProcessingLog[];
  };
}

export interface ProcessingLogResponse {
  success: boolean;
  data: {
    summary: {
      total: number;
      successful: number;
      failed: number;
      total_faces: number;
    };
    logs: ProcessingLog[];
  };
}

export interface Photographer {
  id: string;
  photographer_id: string;
  business_name: string | null;
  full_name: string;
  email: string;
}

export const dropboxService = {
  // Get Dropbox folders
  async getDropboxFolders(path?: string): Promise<DropboxFoldersResponse> {
    const params = path ? { path } : {};
    const response = await dropboxApi.get('/dropbox/folders', { params });
    return response.data;
  },

  // Get folder details
  async getFolderDetails(path: string): Promise<FolderDetailsResponse> {
    const response = await dropboxApi.get('/dropbox/folder-details', {
      params: { path },
    });
    return response.data;
  },

  // Create event from Dropbox folder
  async createEventFromDropbox(data: CreateEventFromDropboxRequest): Promise<CreateEventResponse> {
    const response = await dropboxApi.post('/events/create-from-dropbox', data);
    return response.data;
  },

  // Get processing status
  async getProcessingStatus(eventId: string): Promise<ProcessingStatusResponse> {
    const response = await dropboxApi.get(`/events/${eventId}/processing-status`);
    return response.data;
  },

  // Get processing log
  async getProcessingLog(eventId: string, limit: number = 50): Promise<ProcessingLogResponse> {
    const response = await dropboxApi.get(`/events/${eventId}/processing-log`, {
      params: { limit },
    });
    return response.data;
  },

  // Cancel processing
  async cancelProcessing(eventId: string): Promise<{ success: boolean; message: string }> {
    const response = await dropboxApi.post(`/events/${eventId}/cancel-processing`);
    return response.data;
  },

  // Get photographers list for assignment (uses /users endpoint with role filter)
  async getPhotographers(): Promise<{ success: boolean; data: Photographer[] }> {
    const response = await dropboxApi.get('/users', {
      params: { role: 'photographer', limit: 100 },
    });
    // Map the user response to Photographer interface
    const photographers: Photographer[] = response.data.data.map((user: any) => ({
      id: user.photographer_id || user.id, // Use photographer_id if available
      photographer_id: user.photographer_id,
      business_name: user.business_name,
      full_name: user.full_name,
      email: user.email,
    }));
    return { success: true, data: photographers };
  },
};
