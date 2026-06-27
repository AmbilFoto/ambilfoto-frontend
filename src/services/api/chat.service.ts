import axios from 'axios';

const API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5050/api';

const chatApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

chatApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==================== TYPES ====================

export interface ChatParticipant {
  user_id: string;
  role: 'user' | 'photographer' | 'admin';
  full_name: string;
  profile_photo?: string;
  email?: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'complaint';
  photo_id?: string;
  order_id?: string;
  is_locked: boolean;
  last_message_at?: string;
  created_at: string;
  last_message?: string;
  last_message_type?: string;
  unread_count: number;
  photo_filename?: string;
  event_name?: string;
  ticket_id?: string;
  ticket_status?: string;
  participants: ChatParticipant[];
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  sender_photo?: string;
  sender_role: 'user' | 'photographer' | 'admin';
  message: string;
  type: 'text' | 'image' | 'system';
  is_system?: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface ComplaintTicket {
  id: string;
  ticket_code: string;
  order_id: string;
  chat_id: string;
  user_id: string;
  subject?: string;
  description: string;
  category: string;
  status: 'Open' | 'Reviewing' | 'Resolved' | 'Rejected';
  admin_id?: string;
  admin_name?: string;
  resolution_note?: string;
  refund_amount?: number;
  refund_status?: string;
  complainant_name?: string;
  complainant_email?: string;
  photo_filename?: string;
  event_name?: string;
  closed_at?: string;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ChatStats {
  chats: {
    total_chats: number;
    direct_chats: number;
    complaint_chats: number;
    locked_chats: number;
    today_chats: number;
  };
  messages: {
    total_messages: number;
    today_messages: number;
    unread_messages: number;
  };
  complaints: {
    total_complaints: number;
    open: number;
    reviewing: number;
    resolved: number;
    rejected: number;
    total_refunded: number;
    avg_resolution_hours: number | null;
  };
}

export interface Photographer {
  id: string;
  user_id: string;
  business_name: string;
  full_name: string;
  bio?: string;
  portfolio_url?: string;
  avatar_url?: string;
  location?: string;
  specialties?: string[];
  rating?: number;
  total_events?: number;
  total_photos?: number;
  created_at: string;
}

// ==================== USER/PHOTOGRAPHER CHAT SERVICE ====================

export const chatService = {
  // Create or get direct chat with a photographer
  async createOrGetDirectChat(photographerId: string, photoId?: string, orderId?: string): Promise<Chat> {
    const response = await chatApi.post('/chat/direct', {
      photographer_id: photographerId,
      photo_id: photoId,
      order_id: orderId,
    });
    return response.data.data;
  },

  // Get current user's chat list
  async getMyChats(type?: 'direct' | 'complaint'): Promise<Chat[]> {
    const params = type ? `?type=${type}` : '';
    const response = await chatApi.get(`/chat/my-chats${params}`);
    const data: Chat[] = response.data.data || [];
    
    
    // Normalise unread_count — backend kadang kirim string "0"
    return data.map((chat) => ({
      ...chat,
      unread_count: Number(chat.unread_count) || 0,
      is_locked: Boolean(chat.is_locked), // ← tambah ini
    }));
  },

  // Get messages in a chat (paginated)
  async getMessages(chatId: string, page = 1, limit = 50): Promise<{ messages: ChatMessage[]; pagination: Pagination }> {
    const response = await chatApi.get(`/chat/${chatId}/messages`, { params: { page, limit } });
    return { messages: response.data.data || [], pagination: response.data.pagination };
  },

  // Send a message
  async sendMessage(chatId: string, message: string, type: 'text' | 'image' = 'text'): Promise<ChatMessage> {
    const response = await chatApi.post(`/chat/${chatId}/message`, { message, type });
    return response.data.data;
  },

  // Mark messages as read
  async markAsRead(chatId: string): Promise<void> {
    await chatApi.put(`/chat/${chatId}/read`);
  },

  // Block a user
  async blockUser(targetUserId: string): Promise<void> {
    await chatApi.post('/chat/block', { target_user_id: targetUserId });
  },

  // Unblock a user
  async unblockUser(targetUserId: string): Promise<void> {
    await chatApi.delete(`/chat/block/${targetUserId}`);
  },

  // ==================== COMPLAINTS ====================

  // Create complaint
  async createComplaint(data: { order_id: string; subject?: string; description: string; category?: string }): Promise<{
    ticket_id: string;
    ticket_code: string;
    chat_id: string;
    status: string;
  }> {
    const response = await chatApi.post('/chat/complaint/create', data);
    return response.data.data;
  },

  // Get my complaints
  async getMyComplaints(params?: { status?: string; page?: number; limit?: number }): Promise<{ tickets: ComplaintTicket[]; pagination: Pagination }> {
    const response = await chatApi.get('/chat/complaint/my-complaints', { params });
    return { tickets: response.data.data || [], pagination: response.data.pagination };
  },

  // Get complaint details
  async getComplaintDetails(ticketId: string): Promise<ComplaintTicket> {
    const response = await chatApi.get(`/chat/complaint/${ticketId}`);
    return response.data.data;
  },

  // ==================== PHOTOGRAPHER SEARCH (legacy support) ====================

  async searchPhotographers(query?: string, location?: string): Promise<Photographer[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (location) params.append('location', location);
    const response = await chatApi.get(`/photographers/search?${params.toString()}`);
    return response.data.photographers || [];
  },

  async getPhotographer(photographerId: string): Promise<Photographer> {
    const response = await chatApi.get(`/photographers/${photographerId}`);
    return response.data.photographer;
  },

  async getAllPhotographers(): Promise<Photographer[]> {
    const response = await chatApi.get('/photographers');
    return response.data.photographers || [];
  },
};

// ==================== ADMIN CHAT SERVICE ====================

export const adminChatService = {
  // Get all chats with filters
  async getAllChats(params?: { type?: string; is_locked?: string; page?: number; limit?: number }): Promise<{ chats: Chat[]; pagination: Pagination }> {
    const response = await chatApi.get('/admin/chat/all', { params });
    return { chats: response.data.data || [], pagination: response.data.pagination };
  },

  // View messages in any chat
  async viewChatMessages(chatId: string, page = 1, limit = 100): Promise<{ messages: ChatMessage[]; pagination: Pagination }> {
    const response = await chatApi.get(`/admin/chat/${chatId}/messages`, { params: { page, limit } });
    return { messages: response.data.data || [], pagination: response.data.pagination };
  },

  // Join a chat as mediator
  async joinChat(chatId: string): Promise<void> {
    await chatApi.post(`/admin/chat/${chatId}/join`);
  },

  // Send admin message
  async sendAdminMessage(chatId: string, message: string): Promise<ChatMessage> {
    const response = await chatApi.post(`/admin/chat/${chatId}/message`, { message });
    return response.data.data;
  },

  // Get all complaints (admin)
  async getAllComplaints(params?: { status?: string; admin_id?: string; search?: string; page?: number; limit?: number }): Promise<{ tickets: ComplaintTicket[]; pagination: Pagination }> {
    const response = await chatApi.get('/admin/chat/complaints', { params });
    return { tickets: response.data.data || [], pagination: response.data.pagination };
  },

  // Update complaint status
  async updateComplaintStatus(ticketId: string, status: string, note?: string): Promise<void> {
    await chatApi.put(`/admin/chat/complaint/${ticketId}/status`, { status, note });
  },

  // Resolve complaint with optional refund
  async resolveComplaint(ticketId: string, data: { resolution: string; refund_amount?: number; refund_method?: string }): Promise<void> {
    await chatApi.post(`/admin/chat/complaint/${ticketId}/resolve`, data);
  },

  // Get chat & complaint stats
  async getChatStats(): Promise<ChatStats> {
    const response = await chatApi.get('/admin/chat/stats');
    return response.data.data;
  },
};
