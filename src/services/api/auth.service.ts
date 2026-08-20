import axios from 'axios';

// TODO: ganti balik ke http://localhost:8080/api begitu API Gateway sudah
// jalan dan route /api/auth/* sudah diproxy ke Auth Service (:8001).
// Untuk sekarang, langsung ke Auth Service karena gateway belum di-setup.
const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8001/api';

// ✅ EXPORT authApi agar bisa dipakai di puzzle-captcha.service.ts
export const authApi = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =====================
// INTERCEPTORS
// =====================
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authApi.interceptors.response.use(
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

// =====================
// TYPES
// =====================
export interface RegisterData {
  email: string;
  phone?: string; // ✅ matches backend registerRequest.Phone (json:"phone")
  password: string;
  full_name: string;
  role?: 'user' | 'photographer';
  captcha_token?: string | null;
}

export interface RegisterFaceData {
  face_embedding: string; // ✅ matches backend body{ FaceEmbedding } (json:"face_embedding")
}

export interface LoginData {
  email: string;
  password: string;
  captcha_token?: string | null;
}

export interface FaceLoginData {
  face_embedding: string; // ✅ consistent with face_embedding contract everywhere
  captcha_token?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string; // ✅ matches models.User.Phone (json:"phone,omitempty")
  full_name: string;
  role: 'user' | 'photographer' | 'admin';
  is_verified: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: UserProfile;
    token?: string;
    similarity?: number;
  };
  error?: string;
  code?: string;
  remainingAttempts?: number;
  failedAttempts?: number;
}

// =====================
// SERVICE
// =====================
export const authService = {
  /**
   * Register user (NO FACE)
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await authApi.post('/auth/register', data);
    return response.data;
  },

  /**
   * Register face after signup
   */
  async registerFace(faceEmbedding: string): Promise<AuthResponse> {
    const response = await authApi.put('/auth/register/face', {
      face_embedding: faceEmbedding,
    });
    return response.data;
  },

  /**
   * Login email/password
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await authApi.post('/auth/login', data);
    return response.data;
  },

  /**
   * Login using face biometric
   * NOTE: backend endpoint saat ini masih 501 Not Implemented
   * (nunggu integrasi AI Service) — panggil ini akan gagal sampai itu selesai.
   */
  async loginWithFace(data: FaceLoginData): Promise<AuthResponse> {
    const response = await authApi.post('/auth/login/face', data);
    return response.data;
  },

  /**
   * Get logged-in user profile
   */
  async getProfile(): Promise<{ success: boolean; data: UserProfile }> {
    const response = await authApi.get('/auth/profile');
    return response.data;
  },

  async verifyToken(): Promise<{ success: boolean; data: any }> {
    const response = await authApi.get('/auth/verify');
    return response.data;
  },

  async updateProfile(data: {
    full_name?: string;
    phone?: string; // ✅ matches backend UpdateProfile body{ FullName, Phone }
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await authApi.put('/auth/profile', data);
    return response.data;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await authApi.put('/auth/profile/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * ✅ BARU — sebelumnya ForgotPassword.tsx manggil authApi.post() langsung
   * dari komponen (nggak konsisten sama pola method lain di authService).
   * Cocok dengan backend RequestPasswordReset: selalu balikin
   * { success: true } apapun hasilnya (anti email-enumeration), jadi
   * jangan expect field lain selain success/message di sini.
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; message?: string }> {
    const response = await authApi.post('/auth/password/reset/request', { email });
    return response.data;
  },

  /**
   * ✅ BARU — pasangan dari requestPasswordReset di atas, buat step
   * konfirmasi (masukin OTP + password baru). Cocok dengan backend
   * ConfirmPasswordReset: butuh email, otp, dan new_password.
   */
  async confirmPasswordReset(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await authApi.post('/auth/password/reset/confirm', {
      email,
      otp,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Update face after login (security-sensitive, requires password confirmation)
   * ✅ Backend endpoint PUT /auth/profile/face sekarang sudah ada.
   */
  async updateFaceBiometric(
    faceEmbedding: string,
    password: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await authApi.put('/auth/profile/face', {
      face_embedding: faceEmbedding,
      password,
    });
    return response.data;
  },

  /**
   * ✅ Backend sekarang benar-benar validasi password + confirmation.
   * confirmation harus persis string "DELETE".
   */
  async deleteAccount(
    password: string,
    confirmation: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await authApi.delete('/auth/profile', {
      data: { password, confirmation },
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },
};

// ✅ Default export for backward compatibility
export default authService;