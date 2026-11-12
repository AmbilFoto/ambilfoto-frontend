import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, SlidersHorizontal, MapPin, Camera, ShoppingCart,
  Download, Heart, Eye, Star, X, ChevronDown, Loader2,
  Sparkles, TrendingUp, Clock, Zap, Filter, Grid2x2,
  LayoutGrid, List, ArrowUpRight, ImageIcon, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PhotoPurchaseModal } from "@/components/PhotoPurchaseModal";
import { userService } from "@/services/api/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/utils/currency";
import { toast } from "sonner";
import axios from "axios";
import { API_BASE_URL } from "@/services/api/api.config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicPhoto {
  id: string;
  photo_id: string;
  filename: string;
  preview_url: string;
  thumbnail_url?: string;
  photographer_id: string;
  photographer_name: string;
  business_name?: string;
  place_name?: string;
  latitude?: number;
  longitude?: number;
  price_cash: number;
  price_points?: number;
  is_for_sale: boolean;
  is_purchased?: boolean;
  favorite_count?: number;
  view_count?: number;
  uploaded_at: string;
  tags?: string[];
  pricing_mode?: "PER_PHOTO" | "GROUP";
  type: "standalone";
}

interface FilterState {
  search: string;
  sort: "newest" | "popular" | "price_asc" | "price_desc" | "free";
  location: string;
  priceMin: number | null;
  priceMax: number | null;
}

// ─── API helper ───────────────────────────────────────────────────────────────

const API_URL = API_BASE_URL;

const fetchPublicPhotos = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  location?: string;
}): Promise<{ photos: PublicPhoto[]; total: number; hasMore: boolean }> => {
  const token = localStorage.getItem("auth_token");
  const res = await axios.get(`${API_URL}/photos/public`, {
    params: { page: 1, limit: 24, ...params },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = res.data;
  return {
    photos: (data.data || data.photos || []).map((p: any) => ({
      ...p,
      id: p.id || p.photo_id,
      photo_id: p.photo_id || p.id,
      type: "standalone" as const,
    })),
    total: data.pagination?.total || data.total || 0,
    hasMore: data.pagination?.has_more ?? false,
  };
};

// ─── Photo Card ───────────────────────────────────────────────────────────────

const PhotoCard = ({
  photo,
  onBuy,
  onPreview,
  index,
}: {
  photo: PublicPhoto;
  onBuy: (photo: PublicPhoto) => void;
  onPreview: (photo: PublicPhoto) => void;
  index: number;
}) => {
  const isFree = photo.price_cash === 0;
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-gray-950 cursor-pointer"
      style={{
        animationDelay: `${(index % 8) * 60}ms`,
      }}
      onClick={() => onPreview(photo)}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[3/4]">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
        )}
        <AuthenticatedImage
          src={photo.thumbnail_url || photo.preview_url}
          alt={photo.filename}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImgLoaded(true)}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {isFree ? (
            <span className="bg-emerald-400 text-emerald-950 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">
              Gratis
            </span>
          ) : (
            <span className="bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/10">
              {formatRupiah(photo.price_cash)}
            </span>
          )}
          {photo.is_purchased && (
            <span className="bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Download className="h-3 w-3" />
              Dimiliki
            </span>
          )}
        </div>

        {/* Bottom info — hover reveal */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <p className="text-white/70 text-xs mb-1 flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {photo.photographer_name || photo.business_name}
          </p>
          {photo.place_name && (
            <p className="text-white/60 text-xs flex items-center gap-1 mb-3">
              <MapPin className="h-3 w-3" />
              {photo.place_name}
            </p>
          )}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {photo.is_purchased ? (
              <button className="flex-1 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            ) : (
              <button
                onClick={() => onBuy(photo)}
                className="flex-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                {isFree ? (
                  <><Download className="h-3.5 w-3.5" />Ambil Gratis</>
                ) : (
                  <><ShoppingCart className="h-3.5 w-3.5" />Beli Foto</>
                )}
              </button>
            )}
            <button
              onClick={() => onPreview(photo)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-xl transition-colors border border-white/10"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Preview Modal ────────────────────────────────────────────────────────────

const PreviewModal = ({
  photo,
  onClose,
  onBuy,
}: {
  photo: PublicPhoto;
  onClose: () => void;
  onBuy: (photo: PublicPhoto) => void;
}) => {
  const isFree = photo.price_cash === 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image side */}
        <div className="md:w-3/5 bg-black flex items-center justify-center min-h-[300px]">
          <AuthenticatedImage
            src={photo.preview_url}
            alt={photo.filename}
            className="w-full h-full object-contain max-h-[70vh] md:max-h-[90vh]"
          />
        </div>

        {/* Info side */}
        <div className="md:w-2/5 p-6 flex flex-col justify-between bg-gray-950 overflow-y-auto">
          <div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Fotografer</p>
              <p className="text-white font-bold text-lg">{photo.photographer_name}</p>
              {photo.business_name && (
                <p className="text-gray-400 text-sm">{photo.business_name}</p>
              )}
            </div>

            {photo.place_name && (
              <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm">
                <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>{photo.place_name}</span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(photo.uploaded_at).toLocaleDateString("id-ID", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            </div>

            <div className="h-px bg-white/5 mb-6" />

            <div className="mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Harga</p>
              {isFree ? (
                <p className="text-emerald-400 text-3xl font-black">GRATIS</p>
              ) : (
                <div>
                  <p className="text-white text-3xl font-black">{formatRupiah(photo.price_cash)}</p>
                  {photo.price_points && (
                    <p className="text-gray-500 text-sm mt-1">atau {photo.price_points} poin</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {photo.is_purchased ? (
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 transition-colors">
                <Download className="h-5 w-5" />
                Download Hi-Res
              </button>
            ) : (
              <button
                onClick={() => { onBuy(photo); onClose(); }}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                {isFree ? (
                  <><Download className="h-5 w-5" />Ambil Gratis</>
                ) : (
                  <><ShoppingCart className="h-5 w-5" />Beli Foto ini</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "newest",     label: "Terbaru",      icon: Clock },
  { value: "popular",    label: "Terpopuler",   icon: TrendingUp },
  { value: "price_asc",  label: "Harga: Murah", icon: Zap },
  { value: "price_desc", label: "Harga: Mahal", icon: Star },
  { value: "free",       label: "Gratis",       icon: Sparkles },
] as const;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicPhotosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sort: "newest",
    location: "",
    priceMin: null,
    priceMax: null,
  });
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [previewPhoto, setPreviewPhoto] = useState<PublicPhoto | null>(null);
  const [purchasePhoto, setPurchasePhoto] = useState<PublicPhoto | null>(null);
  const [userPoints, setUserPoints] = useState(0);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Load photos ──
  const loadPhotos = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 1 : page + 1;
      const result = await fetchPublicPhotos({
        page: currentPage,
        limit: 24,
        search: filters.search || undefined,
        sort: filters.sort,
        location: filters.location || undefined,
      });

      // Client-side price filter
      let filtered = result.photos;
      if (filters.priceMin !== null) filtered = filtered.filter(p => p.price_cash >= filters.priceMin!);
      if (filters.priceMax !== null) filtered = filtered.filter(p => p.price_cash <= filters.priceMax!);
      if (filters.sort === "free") filtered = filtered.filter(p => p.price_cash === 0);

      if (reset) {
        setPhotos(filtered);
      } else {
        setPhotos(prev => [...prev, ...filtered]);
        setPage(currentPage);
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      toast.error("Gagal memuat foto");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadPhotos(true);
  }, [filters.sort, filters.location, filters.priceMin, filters.priceMax]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  useEffect(() => {
    if (filters.search !== undefined) loadPhotos(true);
  }, [filters.search]);

  // Load user points
  useEffect(() => {
    if (user) {
      userService.getBalance().then(r => {
        if (r.success && r.data) setUserPoints(r.data.balance);
      }).catch(() => {});
    }
  }, [user]);

  const handleBuy = (photo: PublicPhoto) => {
    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      navigate("/login");
      return;
    }
    setPurchasePhoto(photo);
  };

  const handlePurchaseSuccess = () => {
    setPurchasePhoto(null);
    toast.success("Foto berhasil dibeli!");
    loadPhotos(true);
  };

  const freeCount = photos.filter(p => p.price_cash === 0).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Background mosaic blur dari foto */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-gray-950/80 to-gray-950" />
          {photos.slice(0, 6).map((p, i) => (
            <div
              key={p.id}
              className="absolute w-1/3 h-full opacity-20"
              style={{ left: `${i * 16.666}%`, top: 0 }}
            >
              <AuthenticatedImage src={p.preview_url} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>

        <div className="relative z-10 container max-w-7xl py-16 md:py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-blue-400" />
              <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">
                Galeri Publik
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black mb-4 leading-none tracking-tight">
              Foto dari<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Para Fotografer
              </span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-lg">
              Temukan dan beli foto berkualitas tinggi dari fotografer profesional di seluruh Indonesia.
            </p>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <ImageIcon className="h-4 w-4 text-blue-400" />
                <span className="text-white font-semibold">{total.toLocaleString()}</span>
                <span className="text-gray-400">foto tersedia</span>
              </div>
              {freeCount > 0 && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 text-sm">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">{freeCount} gratis</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <Users className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-400">dari fotografer profesional</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-xl border-b border-white/5">
        <div className="container max-w-7xl py-4">
          <div className="flex flex-col md:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Cari foto, fotografer, lokasi..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full bg-gray-900 border border-white/10 text-white placeholder-gray-500 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-gray-800 transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {SORT_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = filters.sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilters(f => ({ ...f, sort: opt.value as any }))}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                        : "bg-gray-900 text-gray-400 border border-white/10 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                showFilters
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-gray-900 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Harga:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin ?? ""}
                  onChange={e => setFilters(f => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : null }))}
                  className="bg-gray-900 border border-white/10 text-white rounded-xl px-3 py-2 text-xs w-24 focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-gray-600">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax ?? ""}
                  onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : null }))}
                  className="bg-gray-900 border border-white/10 text-white rounded-xl px-3 py-2 text-xs w-24 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <input
                type="text"
                placeholder="Lokasi..."
                value={filters.location}
                onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
                className="bg-gray-900 border border-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={() => {
                  setFilters({ search: "", sort: "newest", location: "", priceMin: null, priceMax: null });
                  setSearchInput("");
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-2"
              >
                Reset semua
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="container max-w-7xl py-8">

        {/* Result count */}
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-sm">
              Menampilkan <span className="text-white font-semibold">{photos.length}</span>
              {total > photos.length && ` dari ${total.toLocaleString()}`} foto
              {filters.search && (
                <> untuk <span className="text-blue-400">"{filters.search}"</span></>
              )}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-900 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && photos.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="h-10 w-10 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">Tidak ada foto ditemukan</h3>
            <p className="text-gray-600 mb-6">
              {filters.search ? `Tidak ada hasil untuk "${filters.search}"` : "Belum ada foto yang diupload"}
            </p>
            {filters.search && (
              <button
                onClick={() => { setSearchInput(""); setFilters(f => ({ ...f, search: "" })); }}
                className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                Hapus pencarian
              </button>
            )}
          </div>
        )}

        {/* Photo masonry grid */}
        {!loading && photos.length > 0 && (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
            {photos.map((photo, i) => (
              <div key={photo.id} className="break-inside-avoid mb-3">
                <PhotoCard
                  photo={photo}
                  onBuy={handleBuy}
                  onPreview={setPreviewPhoto}
                  index={i}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="mt-12 text-center">
            <button
              onClick={() => loadPhotos(false)}
              disabled={loadingMore}
              className="bg-gray-900 hover:bg-gray-800 border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all flex items-center gap-3 mx-auto"
            >
              {loadingMore ? (
                <><Loader2 className="h-5 w-5 animate-spin" />Memuat...</>
              ) : (
                <><ChevronDown className="h-5 w-5" />Muat lebih banyak</>
              )}
            </button>
          </div>
        )}

        {/* CTA untuk fotografer */}
        {!loading && (
          <div className="mt-20 rounded-3xl border border-white/5 bg-gradient-to-br from-blue-950/50 to-gray-950 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/20">
              <Camera className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Kamu seorang fotografer?</h3>
              <p className="text-gray-400">
                Upload foto-foto terbaikmu dan mulai jual ke ribuan pembeli di seluruh Indonesia.
              </p>
            </div>
            <Link to="/user/upgrade-to-photographer">
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-colors whitespace-nowrap">
                Jadi Fotografer
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        )}
      </main>

      <Footer />

      {/* Preview Modal */}
      {previewPhoto && (
        <PreviewModal
          photo={previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          onBuy={handleBuy}
        />
      )}

      {/* Purchase Modal */}
      {purchasePhoto && (
        <PhotoPurchaseModal
          isOpen={true}
          onClose={() => setPurchasePhoto(null)}
          photo={{
            id: purchasePhoto.id,
            filename: purchasePhoto.filename,
            event_name: purchasePhoto.place_name || "Foto Standalone",
            price_cash: purchasePhoto.price_cash,
            price_points: purchasePhoto.price_points || 0,
            type: "standalone",
          }}
          userPointBalance={userPoints}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}