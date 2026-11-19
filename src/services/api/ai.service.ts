import axios from 'axios';
import { API_BASE_URL } from './gateway';

const aiApi = axios.create({ baseURL: `${API_BASE_URL}/ai`, headers: { 'Content-Type': 'application/json' } });
const photoApi = axios.create({ baseURL: `${API_BASE_URL}/photos`, headers: { 'Content-Type': 'application/json' } });

for (const client of [aiApi, photoApi]) {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

export interface PhotoMetadata {
  event_name: string;
  location: string;
  photographer: string;
  event_date: string;
  photographer_name: string;
  date: string;
  event_id?: string;
}
export interface UploadPhotoData { image: string; filename: string; metadata: PhotoMetadata; }
export interface Photo {
  photo_id: string; filename: string; faces_count: number; metadata: PhotoMetadata;
  uploaded_at: string; in_dropbox: boolean; distance?: number; cosine_similarity?: number;
}
export interface UploadResponse {
  success: boolean; photo_id?: string; faces_detected?: number; dropbox_uploaded?: boolean;
  compressed?: boolean; error?: string;
}
export interface PhotosResponse { success: boolean; photos: Photo[]; error?: string; }
export interface BiometricStart {
  session_id: string; challenge: string[]; expires_in: number;
}
export interface BiometricFrame {
  success: boolean; matched: boolean; message: string; next_challenge: string;
  done: boolean; attempts_remaining: number; pose_progress: number; hold_progress: number;
}
export interface BiometricComplete {
  liveness_score: number; liveness_status: string; quality_score: number;
  angles_captured: string[]; matched_photos: number; biometric_owner: string;
}

export const aiService = {
  async uploadPhoto(data: UploadPhotoData): Promise<UploadResponse> {
    const response = await photoApi.post('/upload', {
      face_image: data.image, filename: data.filename, event_id: data.metadata.event_id || '',
    });
    const payload = response.data?.data || response.data;
    return { success: !!response.data?.success, photo_id: payload?.id || payload?.photo_id, faces_detected: payload?.faces_count };
  },
  async getPhotographerPhotos(): Promise<PhotosResponse> {
    const response = await photoApi.get('/my');
    const photos = response.data?.data || [];
    return { success: !!response.data?.success, photos: photos.map((p: any) => ({
      photo_id: p.id || p.photo_id, filename: p.filename, faces_count: p.faces_count || 0,
      metadata: p.metadata || {}, uploaded_at: p.created_at || p.uploaded_at,
      in_dropbox: false,
    })) };
  },
  async deletePhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
    const response = await photoApi.delete(`/${encodeURIComponent(photoId)}`);
    return { success: !!response.data?.success, error: response.data?.error };
  },
  getPreviewUrl(photoId: string): string {
    return `${API_BASE_URL}/photos/${encodeURIComponent(photoId)}/content`;
  },
  getDownloadUrl(photoId: string): string {
    return `${API_BASE_URL}/photos/${encodeURIComponent(photoId)}/download-url`;
  },
  async healthCheck(): Promise<{ status: string; [key: string]: unknown }> {
    const response = await aiApi.get('/health');
    return response.data?.data || response.data;
  },
  async startBiometricEnrollment(): Promise<BiometricStart> {
    const response = await aiApi.post('/biometric/start', { min_angles: 4 });
    return response.data?.data || response.data;
  },
  async submitBiometricFrame(sessionId: string, challenge: string, frame: string): Promise<BiometricFrame> {
    const response = await aiApi.post('/biometric/frame', { session_id: sessionId, challenge, frame });
    return response.data?.data || response.data;
  },
  async completeBiometricEnrollment(sessionId: string): Promise<BiometricComplete> {
    const response = await aiApi.post('/biometric/complete', { session_id: sessionId });
    return response.data?.data || response.data;
  },
};

export default aiService;
