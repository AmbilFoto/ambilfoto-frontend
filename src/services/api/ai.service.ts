import axios from 'axios';
import { API_BASE_URL } from './api.config';

const AI_API_URL = API_BASE_URL;

const aiApi = axios.create({
  baseURL: AI_API_URL,
});

aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PhotoMetadata {
  event_name: string;
  location: string;
  photographer: string;
  event_date: string;
  photographer_name: string;
  date: string;
  event_id?: string;
}

export interface UploadPhotoData {
  image: string;
  filename: string;
  metadata: PhotoMetadata;
}

export interface FaceData {
  box: number[];
  confidence: number;
  embedding_id: string;
}

export interface Photo {
  photo_id: string;
  filename: string;
  faces_count: number;
  metadata: PhotoMetadata;
  uploaded_at: string;
  in_dropbox: boolean;
  distance?: number;
  cosine_similarity?: number;
}

export interface UploadResponse {
  success: boolean;
  photo_id?: string;
  faces_detected?: number;
  dropbox_uploaded?: boolean;
  compressed?: boolean;
  error?: string;
}

export interface PhotosResponse {
  success: boolean;
  photos: Photo[];
  error?: string;
}

export interface FaceEmbeddingResponse {
  success: boolean;
  embedding?: number[];
  confidence?: number;
  error?: string;
}

export interface BiometricStartResponse {
  session_id: string;
  challenge: string[];
  expires_in: number;
}

export interface BiometricFrameResponse {
  success: boolean;
  matched: boolean;
  message?: string;
  next_challenge?: string | null;
  done: boolean;
  attempts_remaining?: number;
  pose_progress?: number;
  holding?: boolean;
  hold_progress?: number;
}

export interface BiometricCompleteResponse {
  liveness_score: number;
  liveness_status: string;
  quality_score: number;
  angles_captured: string[];
  matched_photos: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const aiService = {

  // ── Photographer: upload photo ─────────────────────────────────────────────
  async uploadPhoto(data: UploadPhotoData): Promise<UploadResponse> {
    const form = new FormData();
    const imageSource = data.image.startsWith('data:')
      || data.image.startsWith('blob:')
      || /^https?:\/\//i.test(data.image)
      ? data.image
      : `data:image/jpeg;base64,${data.image}`;
    const imageResponse = await fetch(imageSource);
    if (!imageResponse.ok) throw new Error('Failed to read selected photo');
    form.append('photo', await imageResponse.blob(), data.filename);
    if (data.metadata.event_id) form.append('event_id', data.metadata.event_id);

    const response = await aiApi.post('/photos/upload', form);
    const result = response.data?.data ?? response.data;
    return {
      success: response.data?.success === true,
      photo_id: result.id ?? result.photo_id,
      faces_detected: result.face_count ?? 0,
      dropbox_uploaded: String(result.storage_url ?? '').startsWith('dropbox://'),
      error: response.data?.error,
    };
  },

  // ── Photographer: list their photos ───────────────────────────────────────
  async getPhotographerPhotos(): Promise<PhotosResponse> {
    const response = await aiApi.get('/photos');
    const result = response.data?.data ?? response.data;
    return { success: response.data?.success === true, photos: result.photos ?? [] };
  },

  // ── Photographer: delete a photo ──────────────────────────────────────────
  async deletePhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
    const response = await aiApi.delete(`/photos/${photoId}`);
    return response.data;
  },

  // ── User: extract face embedding for registration / manual match ───────────
  async registerFace(image: string): Promise<FaceEmbeddingResponse> {
    const response = await aiApi.post('/ai/extract-embedding', { image });
    const result = response.data?.data ?? response.data;
    return {
      success: response.data?.success === true && Array.isArray(result.embedding),
      embedding: result.embedding,
      confidence: result.confidence,
      error: response.data?.error,
    };
  },

  async startBiometric(): Promise<BiometricStartResponse> {
    const response = await aiApi.post('/ai/biometric/start', { min_angles: 4 });
    return response.data?.data ?? response.data;
  },

  async submitBiometricFrame(
    sessionId: string,
    challenge: string,
    frame: string,
  ): Promise<BiometricFrameResponse> {
    const response = await aiApi.post('/ai/biometric/frame', {
      session_id: sessionId,
      challenge,
      frame,
    });
    return response.data?.data ?? response.data;
  },

  async completeBiometric(sessionId: string): Promise<BiometricCompleteResponse> {
    const response = await aiApi.post('/ai/biometric/complete', { session_id: sessionId });
    return response.data?.data ?? response.data;
  },

  // ── Preview URL helper ─────────────────────────────────────────────────────
  getPreviewUrl(photoId: string): string {
    return `${API_BASE_URL}/user/photos/${encodeURIComponent(photoId)}/preview`;
  },

  // ── Download URL helper ──────────────────────────────────────────────────
  getDownloadUrl(photoId: string): string {
    return `${AI_API_URL}/user/photos/${photoId}/download`;
  },

  // ── Health check ──────────────────────────────────────────────────────────
  async healthCheck(): Promise<{ status: string; [key: string]: unknown }> {
    const response = await aiApi.get('/ai/health');
    return response.data?.data ?? response.data;
  },
};