import axios from 'axios';

const AI_API_URL =
  import.meta.env.VITE_AI_API_URL || 'https://3dc7-36-85-35-251.ngrok-free.app/api';

const aiApi = axios.create({
  baseURL: AI_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PhotoMetadata {
  event_name: string;
  location: string;
  photographer: string;
  event_date: string;
  photographer_name: string;
  date: string;
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

// ── Service ───────────────────────────────────────────────────────────────────

export const aiService = {

  // ── Photographer: upload photo ─────────────────────────────────────────────
  async uploadPhoto(data: UploadPhotoData): Promise<UploadResponse> {
    const response = await aiApi.post('/photographer/upload', data);
    return response.data;
  },

  // ── Photographer: list their photos ───────────────────────────────────────
  async getPhotographerPhotos(): Promise<PhotosResponse> {
    const response = await aiApi.get('/photographer/photos');
    return response.data;
  },

  // ── Photographer: delete a photo ──────────────────────────────────────────
  async deletePhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
    const response = await aiApi.delete(`/photographer/delete/${photoId}`);
    return response.data;
  },

  // ── User: extract face embedding for registration / manual match ───────────
  // This is the ONLY method the frontend should call directly on the AI server.
  // All photo-matching must go through Node.js (/api/user/match-face) which
  // handles auth, DB writes, and deduplication.
  async registerFace(image: string): Promise<FaceEmbeddingResponse> {
    const response = await aiApi.post('/user/register_face', { image });
    return response.data;
  },

  // ── Preview URL helper ─────────────────────────────────────────────────────
  // Returns the direct AI-server URL for a photo thumbnail.
  // Use this when rendering <img> tags in the frontend.
  getPreviewUrl(photoId: string): string {
    return `${AI_API_URL}/image/preview/${photoId}`;
  },

  // ── Download URL helper (direct AI server) ─────────────────────────────────
  // NOTE: Prefer /api/user/photos/:id/download (Node.js authenticated route)
  // over this direct URL. Only use this for public/free previews.
  getDownloadUrl(photoId: string): string {
    return `${AI_API_URL}/download/dropbox/${photoId}`;
  },

  // ── Health check ──────────────────────────────────────────────────────────
  async healthCheck(): Promise<{ status: string; [key: string]: unknown }> {
    const response = await aiApi.get('/health');
    return response.data;
  },
};