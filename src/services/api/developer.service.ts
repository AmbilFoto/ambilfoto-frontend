import axios from 'axios';
import { API_BASE_URL } from './gateway';

const AUTH_API_URL = API_BASE_URL;

const authApi = axios.create({
  baseURL: AUTH_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'yearly';

export interface Plan {
  id: string;
  slug: string;
  name: string;
  color_tag: string;
  target_segment: string;
  positioning: string;
  price_monthly: number;
  price_yearly: number;
  discount_yearly_pct: number;
  price_monthly_formatted: string;
  price_yearly_formatted: string | null;
  api_hit_limit: number;
  upload_limit_monthly?: number;
  rate_limit_rpm: number;
  sla_hours: number;
  sla_label: string;
  support_channel: string;
  support_level: string;
  upload_label: string;
  is_custom: number;
  sort_order: number;
  features: string[];
  storage_gb?: number;
  upload_limit?: number;
  price?: number;
}

export interface DeveloperProfile {
  id: string;
  user_id: number;
  company_name: string;
  website: string;
  email: string;
  full_name: string;
  dashboard_url?: string;
}

export interface Subscription {
  id: string;
  status: 'active' | 'expired' | 'cancelled';
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  features: string[];
  billing_cycle: BillingCycle;
  cycle_price: number;
  total_billed_amount: number;
  savings_amount: number;
  api_hit_limit: number;
  rate_limit_rpm: number;
  sla_label: string;
  support_channel: string;
  sla_hours: number;
  support_level: string;
  storage_gb?: number;
  upload_limit?: number;
  limits?: {
    api_hit_limit: number;
    rate_limit_rpm: number;
    sla_label: string;
    support_channel: string;
    sla_hours: number;
    support_level: string;
    storage_gb?: number;
    upload_limit?: number;
  };
}

export interface UsageStat {
  storage?: {
    used_mb: number;
    used_gb: number;
    limit_gb: number;
    pct: number;
  };
  uploads: {
    used: number;
    limit: number;
    pct: number;
  };
  today_requests: number;
  error_rate_24h: number;
  this_month: { used_mb: number; upload_count: number };
}

export interface ApiKey {
  id: string;
  key_type: 'dev' | 'prod';
  key_prefix: string;
  key_preview: string;
  status: 'active' | 'expired' | 'revoked' | 'inactive';
  is_active: boolean;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  request_count: number;
}

export interface DeveloperOverview {
  developer: DeveloperProfile;
  subscription: Subscription | null;
  usage: UsageStat;
  keys: ApiKey[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  plan_name: string;
  plan_slug: string;
  amount: number;
  total_amount: number;
  billing_cycle: BillingCycle;
  price_per_month: number;
  savings_amount: number;
  discount_pct: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paid_at: string | null;
  created_at: string;
  expired_at: string | null;
  pdf_url: string | null;
}

export interface InvoicesResponse {
  success: boolean;
  data: {
    invoices: Invoice[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface SubscribeResponse {
  invoice_id: string;
  invoice_number: string;
  developer_id: string;
  plan: {
    id: string;
    slug: string;
    name: string;
    price: number;
    price_formatted: string;
  };
  billing_cycle: BillingCycle;
  payment_url: string;
  token: string;
  expired_at: string;
}

export interface UsageAnalytics {
  period_days: number;
  totals: {
    requests: number;
    success: number;
    errors: number;
    success_rate: number;
    avg_response_ms: number;
  };
  by_endpoint: { endpoint: string; count: number; avg_ms: number; errors: number }[];
  daily_trend: { date: string; requests: number; errors: number }[];
}

export interface RealtimeUsage {
  uploads: { used: number; limit: number; remaining: number | null; pct: number };
  storage?: { used_mb: number; limit_mb: number; remaining_mb: number; pct: number };
  expires_in_days: number;
}

export interface OrderBreakdown {
  plan: {
    id: string;
    slug: string;
    name: string;
    color_tag: string;
    api_hit_limit: number;
    rate_limit_rpm: number;
    sla_label: string;
    support_channel: string;
    support_level: string;
    features: string[];
    storage_gb?: number;
    upload_limit?: number;
  };
  breakdown: {
    subtotal: number;
    subtotal_formatted: string;
    ppn_rate: number;
    ppn: number;
    ppn_formatted: string;
    service_fee: number;
    service_fee_formatted: string;
    total: number;
    total_formatted: string;
    billing_cycle: BillingCycle;
    price_per_month: number;
    price_per_month_formatted: string;
    savings_amount: number;
    savings_formatted: string;
    discount_pct: number;
    duration_days: number;
  };
  period_days: number;
  note: string;
}

export interface DeveloperMe {
  developer_id: string;
  company_name: string;
  website: string;
  subscription: {
    id: string;
    status: 'active' | 'expired' | 'cancelled';
    plan_slug: string;
    plan_name: string;
    end_date: string;
    days_remaining: number;
    billing_cycle: BillingCycle;
  } | null;
}

export interface InvoiceStatus {
  invoice_id: string;
  invoice_number: string;
  status: 'pending' | 'paid' | 'cancelled';
  amount: number;
  plan_name: string;
  plan_slug: string;
  developer_id: string;
  paid_at: string | null;
  created_at: string;
  subscription_active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getInvoicePdfUrl(developerId: string, invoiceId: string): string {
  return `${AUTH_API_URL}/developer/${developerId}/invoices/${invoiceId}/pdf`;
}

export async function downloadInvoicePdf(
  developerId: string,
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(getInvoicePdfUrl(developerId, invoiceId), {
    method: 'GET',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try { const e = await response.json(); msg = e?.error ?? e?.message ?? msg; } catch {}
    throw new Error(msg);
  }

  const blob = await response.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `AmbilFoto_Receipt_${invoiceNumber.replace(/[^A-Z0-9\-]/gi, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalise key fields: backend returns type/prefix/preview, frontend expects
// key_type/key_prefix/key_preview + is_active
// ─────────────────────────────────────────────────────────────────────────────

function normaliseKey(k: any): ApiKey {
  return {
    ...k,
    key_type:   k.key_type   ?? k.type    ?? 'dev',
    key_prefix: k.key_prefix ?? k.prefix  ?? '',
    key_preview: k.key_preview ?? k.preview ?? '',
    is_active:  k.is_active  ?? (k.status === 'active'),
    request_count: k.request_count ?? 0,
    last_used_at:  k.last_used_at  ?? null,
    created_at:    k.created_at    ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const developerService = {

  // ── Plans ─────────────────────────────────────────────────────────────────

  async getPlans(): Promise<{ success: boolean; data: Plan[] }> {
    const res = await authApi.get('/developer/plans');
    const raw = res.data;

    if (raw?.success && Array.isArray(raw?.data)) {
      raw.data = raw.data.map((p: any) => {
        const pricing = p.pricing ?? {};
        const monthly = pricing.monthly ?? {};
        const yearly  = pricing.yearly  ?? {};
        const limits  = p.limits        ?? {};

        const priceMonthly = monthly.price ?? p.price ?? 0;
        const priceYearly  = yearly.price  ?? priceMonthly;
        const discountPct  = priceMonthly > 0 && priceYearly < priceMonthly
          ? Math.round((1 - priceYearly / priceMonthly) * 100)
          : 0;

        return {
          ...p,
          price_monthly:           priceMonthly,
          price_yearly:            priceYearly,
          discount_yearly_pct:     discountPct,
          price_monthly_formatted: monthly.price_formatted ?? p.price_formatted ?? `Rp ${priceMonthly.toLocaleString('id-ID')}`,
          price_yearly_formatted:  yearly.price_formatted  ?? null,
          api_hit_limit:    limits.api_hit_limit   ?? p.api_hit_limit   ?? 0,
          rate_limit_rpm:   limits.rate_limit_rpm  ?? p.rate_limit_rpm  ?? 0,
          sla_hours:        limits.sla_hours        ?? p.sla_hours       ?? 0,
          sla_label:        limits.sla_label        ?? p.sla_label       ?? '-',
          support_channel:  limits.support_channel  ?? p.support_channel ?? 'email',
          support_level:    limits.support_level    ?? p.support_level   ?? 'email',
          is_custom: p.is_custom === true ? 1 : (p.is_custom === false ? 0 : (p.is_custom ?? 0)),
        };
      });
    }

    return raw;
  },

  async calculateOrder(
    planId: string,
    billingCycle: BillingCycle = 'monthly'
  ): Promise<{ success: boolean; data: OrderBreakdown }> {
    const res = await authApi.get('/developer/calculate-order', {
      params: { plan_id: planId, billing_cycle: billingCycle },
    });
    return res.data;
  },

  // ── Identity ──────────────────────────────────────────────────────────────

  async getMe(): Promise<{
    success: boolean;
    has_developer_account: boolean;
    data: DeveloperMe | null;
  }> {
    const res = await authApi.get('/developer/me');
    return res.data;
  },

  // ── Subscription ──────────────────────────────────────────────────────────

  async subscribe(
    planId: string,
    billingCycle: BillingCycle = 'monthly',
    companyName?: string
  ): Promise<{ success: boolean; error?: string; data: SubscribeResponse }> {
    const res = await authApi.post('/developer/subscribe', {
      plan_id:       planId,
      billing_cycle: billingCycle,
      company_name:  companyName,
    });
    return res.data;
  },

  async renew(
    planId: string,
    billingCycle: BillingCycle = 'monthly'
  ): Promise<{ success: boolean; data: SubscribeResponse }> {
    const res = await authApi.post('/developer/renew', {
      plan_id:       planId,
      billing_cycle: billingCycle,
    });
    return res.data;
  },

  async reconcilePayment(orderId: string): Promise<{
    success: boolean; message: string;
    data: { invoice_id: string; invoice_number: string; activated: boolean; midtrans_status: string };
  }> {
    const res = await authApi.post(`/developer/reconcile/${orderId}`);
    return res.data;
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getOverview(developerId: string): Promise<{ success: boolean; data: DeveloperOverview }> {
    const res = await authApi.get(`/developer/${developerId}`);
    const raw = res.data;

    // Normalise subscription
    if (raw?.data?.subscription) {
      const sub = raw.data.subscription;
      const lim = sub.limits ?? {};
      const billing = sub.billing ?? {};

      raw.data.subscription = {
        ...sub,
        api_hit_limit:   sub.api_hit_limit   ?? lim.api_hit_limit   ?? sub.upload_limit ?? lim.upload_limit ?? 0,
        rate_limit_rpm:  sub.rate_limit_rpm  ?? lim.rate_limit_rpm  ?? 60,
        sla_label:       sub.sla_label       ?? lim.sla_label       ?? '-',
        support_channel: sub.support_channel ?? lim.support_channel ?? 'email',
        sla_hours:       sub.sla_hours       ?? lim.sla_hours       ?? 0,
        support_level:   sub.support_level   ?? lim.support_level   ?? '-',
        // Billing — normalise from nested billing object or top-level
        billing_cycle:       sub.billing_cycle       ?? billing.cycle         ?? 'monthly',
        cycle_price:         sub.cycle_price         ?? billing.price_per_month ?? 0,
        total_billed_amount: sub.total_billed_amount ?? billing.total_billed  ?? 0,
        savings_amount:      sub.savings_amount      ?? billing.savings       ?? 0,
        // Legacy compat
        storage_gb:    sub.storage_gb   ?? lim.storage_gb   ?? 0,
        upload_limit:  sub.upload_limit ?? lim.upload_limit ?? sub.api_hit_limit ?? 0,
      };
    }

    // Normalise usage — backend may return api_hits instead of uploads
    if (raw?.data?.usage) {
      const u = raw.data.usage;

      // Handle api_hits field (new backend) → uploads (frontend expects)
      if (!u.uploads && u.api_hits) {
        const { used, limit } = u.api_hits;
        u.uploads = {
          used:  used  ?? 0,
          limit: limit ?? raw.data.subscription?.api_hit_limit ?? 0,
          pct:   u.api_hits.pct ?? (limit > 0 ? Math.round((used / limit) * 100) : 0),
        };
      }

      if (u.storage) {
        u.storage.used_gb  = u.storage.used_gb  ?? Math.round((u.storage.used_mb / 1024) * 100) / 100;
        u.storage.limit_gb = u.storage.limit_gb ?? (raw.data.subscription?.storage_gb ?? 0);
      }

      // Normalise legacy upload_used/upload_limit
      if (!u.uploads && u.upload_used !== undefined) {
        const used  = u.upload_used  ?? 0;
        const limit = u.upload_limit ?? raw.data.subscription?.api_hit_limit ?? 0;
        u.uploads = {
          used,
          limit,
          pct: limit > 0 ? Math.round((used / limit) * 100) : 0,
        };
      }

      // Fallback empty uploads
      if (!u.uploads) {
        u.uploads = { used: 0, limit: raw.data.subscription?.api_hit_limit ?? 0, pct: 0 };
      }

      // Ensure this_month exists
      if (!u.this_month) {
        u.this_month = { used_mb: 0, upload_count: u.uploads.used };
      }
    }

    // Normalise keys — backend may return type/prefix/preview instead of key_type/key_prefix/key_preview
    if (Array.isArray(raw?.data?.keys)) {
      raw.data.keys = raw.data.keys.map(normaliseKey);
    }

    return raw;
  },

  async updateProfile(
    developerId: string,
    data: { company_name?: string; website?: string; description?: string; contact_phone?: string }
  ): Promise<{ success: boolean; message: string }> {
    const res = await authApi.put(`/developer/${developerId}/profile`, data);
    return res.data;
  },

  // ── Invoices ──────────────────────────────────────────────────────────────

  async getInvoices(developerId: string, page = 1, limit = 10): Promise<InvoicesResponse> {
    const res = await authApi.get(`/developer/${developerId}/invoices`, { params: { page, limit } });
    const raw = res.data;

    const invoices: Invoice[] = Array.isArray(raw?.data) ? raw.data : (raw?.data?.invoices ?? []);
    const pg = raw?.pagination ?? raw?.data?.pagination ?? {};

    return {
      success: raw?.success ?? true,
      data: {
        invoices,
        pagination: {
          total: pg.total       ?? invoices.length,
          page:  pg.page        ?? page,
          limit: pg.limit       ?? limit,
          pages: pg.total_pages ?? pg.pages ?? 1,
        },
      },
    };
  },

  async getInvoiceStatus(invoiceId: string): Promise<{ success: boolean; data: InvoiceStatus }> {
    const res = await authApi.get(`/developer/invoice/${invoiceId}/status`);
    return res.data;
  },

  // ── PDF Receipt ───────────────────────────────────────────────────────────

  async downloadReceiptPdf(
    developerId: string,
    invoiceId: string,
    invoiceNumber: string,
    setLoading?: (v: boolean) => void,
    onError?: (message: string) => void
  ): Promise<boolean> {
    try {
      setLoading?.(true);
      await downloadInvoicePdf(developerId, invoiceId, invoiceNumber);
      return true;
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Gagal mengunduh PDF');
      return false;
    } finally {
      setLoading?.(false);
    }
  },

  getReceiptPdfUrl: getInvoicePdfUrl,

  // ── API Keys ──────────────────────────────────────────────────────────────

  async getKeys(developerId: string): Promise<{ success: boolean; data: ApiKey[] }> {
    const res = await authApi.get(`/developer/${developerId}/keys`);
    const raw = res.data;
    if (raw?.success && Array.isArray(raw?.data)) {
      raw.data = raw.data.map(normaliseKey);
    }
    return raw;
  },

  async regenerateKey(
    developerId: string,
    keyType: 'dev' | 'prod'
  ): Promise<{
    success: boolean;
    message: string;
    data: { key_id: string; raw_key: string; preview: string; expires_at: string; key_type: 'dev' | 'prod' };
  }> {
    const res = await authApi.post(`/developer/${developerId}/key/regenerate`, { key_type: keyType });
    return res.data;
  },

  async revokeKey(
    developerId: string,
    keyId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await authApi.post(`/developer/${developerId}/key/revoke`, { key_id: keyId, reason });
    return res.data;
  },

  // ── Usage ─────────────────────────────────────────────────────────────────

  async getUsageAnalytics(
    developerId: string,
    days = 30
  ): Promise<{ success: boolean; data: UsageAnalytics }> {
    const res = await authApi.get(`/developer/${developerId}/usage`, { params: { days } });
    const raw = res.data;

    if (raw?.success && raw?.data?.totals) {
      const t = raw.data.totals;
      const requests = t.total_requests   ?? t.requests ?? 0;
      const success  = t.success_requests ?? t.success  ?? 0;
      const errors   = t.error_requests   ?? t.errors   ?? 0;
      return {
        success: true,
        data: {
          ...raw.data,
          totals: {
            requests, success, errors,
            avg_response_ms: t.avg_response_ms ?? 0,
            success_rate: t.success_rate ?? (requests > 0 ? Math.round((success / requests) * 1000) / 10 : 0),
          },
        },
      };
    }
    return raw;
  },

  async getRealtimeUsage(
    developerId: string
  ): Promise<{ success: boolean; data: RealtimeUsage | null }> {
    const res = await authApi.get(`/developer/${developerId}/usage/realtime`);
    return res.data;
  },
};