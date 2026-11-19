import axios from "axios";
import { API_BASE_URL } from "./gateway";

const api = axios.create({ baseURL: API_BASE_URL, headers: { "Content-Type": "application/json" } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type OrderStatus = "pending_payment" | "paid" | "processing" | "delivered" | "revision_requested" | "completed" | "cancelled";
export interface PlatformOrder {
  id: string;
  order_id: string;
  event_id: string;
  photographer_id: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  revision_count: number;
  max_revisions: number;
  created_at: string;
  updated_at: string;
}
export interface OrderDetail extends PlatformOrder {
  buyer_id: string;
  payment_reference?: string;
  items: { photo_id: string; unit_price: number }[];
  history: { actor_id?: string; actor_role: string; event_type: string; from_status?: string; to_status: string; reason?: string; created_at: string }[];
}

const unwrap = <T,>(response: any): { success: boolean; data?: T; error?: string } => ({
  success: !!response.data?.success,
  data: response.data?.data as T,
  error: response.data?.error,
});

export const orderService = {
  async listBuyerOrders(params?: { page?: number; limit?: number }) {
    return unwrap<PlatformOrder[]>(await api.get("/orders", { params }));
  },
  async listPhotographerOrders(params?: { page?: number; limit?: number }) {
    return unwrap<PlatformOrder[]>(await api.get("/photographer/orders", { params }));
  },
  async getOrder(orderId: string) {
    return unwrap<OrderDetail>(await api.get(`/orders/${encodeURIComponent(orderId)}`));
  },
  async confirmDelivery(orderId: string) {
    return unwrap<{ order_id: string; status: OrderStatus }>(await api.post(`/orders/${encodeURIComponent(orderId)}/confirm-delivery`));
  },
  async requestRevision(orderId: string, reason: string) {
    return unwrap<{ order_id: string; status: OrderStatus }>(await api.post(`/orders/${encodeURIComponent(orderId)}/request-revision`, { reason }));
  },
};
