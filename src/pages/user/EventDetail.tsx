import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import HeaderDash from "@/components/layout/HeaderDash";
import { Footer } from "@/components/layout/Footer";
import { userService, UserPhoto } from "@/services/api/user.service";
import { aiService } from "@/services/api/ai.service";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, MapPin, Image as ImageIcon, Search, ArrowLeft,
  Download, ShoppingCart, Eye, Camera, Users, Clock,
  ChevronRight, Filter, Grid2x2, List, SortAsc,
  Loader2, X, Star, TrendingUp, CheckCircle, Lock,
  Globe, ChevronDown, Sparkles, ZoomIn, Share2,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah, formatRupiahShort } from "@/utils/currency";

// ─── Tipe lokal ─────────────────────────────────────────────────────────────

interface EventInfo {
  event_name: string;
  event_date: string;
  event_location: string;
  event_type?: string;
  photographer_name?: string;
  photo_count: number;
  purchased_count: number;
}

type SortOption = "match" | "date" | "price_asc" | "price_desc";
type ViewMode = "grid" | "list";
type FilterTab = "all" | "purchased" | "unpurchased";

// ─── Warna & label tipe event ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding", birthday: "Ulang Tahun", corporate: "Korporat",
  graduation: "Wisuda", concert: "Konser", sports: "Olahraga", other: "Lainnya",
};
const TYPE_COLORS: Record<string, string> = {
  wedding: "bg-pink-100 text-pink-700", birthday: "bg-yellow-100 text-yellow-700",
  corporate: "bg-slate-100 text-slate-700", graduation: "bg-emerald-100 text-emerald-700",
  concert: "bg-violet-100 text-violet-700", sports: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

// ─── Komponen skeleton ───────────────────────────────────────────────────────

const PhotoSkeleton = ({ view }: { view: ViewMode }) =>
  view === "grid" ? (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  ) : (
    <div className="flex gap-4 p-4 rounded-2xl border border-border bg-card">
      <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
    </div>
  );

// ─── Modal foto besar ────────────────────────────────────────────────────────

const PhotoModal = ({
  photo, onClose, onBuy,
}: {
  photo: UserPhoto; onClose: () => void; onBuy: (p: UserPhoto) => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <div
      className="relative bg-card rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Foto */}
      <div className="bg-black flex items-center justify-center" style={{ maxHeight: "65vh" }}>
        <AuthenticatedImage
          src={photo.preview_url || aiService.getPreviewUrl(photo.photo_id)}
          alt={photo.filename}
          className="max-h-full w-full object-contain"
        />
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-base truncate">{photo.filename}</p>
            <p className="text-sm text-muted-foreground">{photo.event_name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs font-medium">{Math.round((photo.similarity || 0) * 100)}% kecocokan</span>
            </div>
          </div>

          {photo.is_purchased ? (
            <div className="flex flex-col items-end gap-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />Dimiliki
              </Badge>
              {photo.download_url && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = photo.download_url!;
                    a.download = photo.filename;
                    a.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />Download Hi-Res
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <p className="font-bold text-lg">
                {formatRupiah(photo.price_cash)}
              </p>
              <Button size="sm" className="gap-1.5" onClick={() => onBuy(photo)}>
                <ShoppingCart className="h-3.5 w-3.5" />Beli Foto
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ─── Komponen utama ──────────────────────────────────────────────────────────

const UserEventPage = () => {
  const { eventName } = useParams<{ eventName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);
  const [showSort, setShowSort] = useState(false);

  // Derived event info dari foto
  const eventInfo = useMemo<EventInfo | null>(() => {
    if (!photos.length) return null;
    const first = photos[0];
    const purchased = photos.filter((p) => p.is_purchased).length;
    return {
      event_name: first.event_name || "Event",
      event_date: first.event_date || "",
      event_location: first.event_location || "",
      event_type: first.event_type,
      photographer_name: first.photographer_name,
      photo_count: photos.length,
      purchased_count: purchased,
    };
  }, [photos]);

  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await userService.getMyPhotos();
      if (response.success && response.data) {
        // Filter hanya foto dari event ini
        const filtered = eventName
          ? response.data.filter(
              (p) =>
                p.event_name?.toLowerCase().replace(/\s+/g, "-") === eventName?.toLowerCase() ||
                p.event_id === eventName
            )
          : response.data;
        setPhotos(filtered);
      }
    } catch {
      toast({ title: "Gagal memuat foto", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [eventName, toast]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Filter + sort
  const processedPhotos = useMemo(() => {
    let result = [...photos];

    // Tab filter
    if (filterTab === "purchased") result = result.filter((p) => p.is_purchased);
    if (filterTab === "unpurchased") result = result.filter((p) => !p.is_purchased);

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.filename?.toLowerCase().includes(q) || p.event_name?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "match":
        result.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        break;
      case "date":
        result.sort((a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime());
        break;
      case "price_asc":
        result.sort((a, b) => (a.price_cash || 0) - (b.price_cash || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price_cash || 0) - (a.price_cash || 0));
        break;
    }
    return result;
  }, [photos, filterTab, search, sortBy]);

  const handleBuyPhoto = (photo: UserPhoto) => {
    navigate(`/user/photos?buy=${photo.photo_id}`);
  };

  const sortLabels: Record<SortOption, string> = {
    match: "Kecocokan Terbaik",
    date: "Terbaru",
    price_asc: "Harga Termurah",
    price_desc: "Harga Termahal",
  };

  const unpurchasedCount = photos.filter((p) => !p.is_purchased).length;

  return (
    <div className="min-h-screen bg-background">
      <HeaderDash />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/user/events")}
          className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua Event
        </Button>

        {/* ── Event Header ── */}
        {isLoading ? (
          <div className="mb-8 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : eventInfo ? (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {eventInfo.event_type && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[eventInfo.event_type] ?? TYPE_COLORS.other}`}>
                      {TYPE_LABELS[eventInfo.event_type] ?? "Lainnya"}
                    </span>
                  )}
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                    <Globe className="h-3 w-3" />Publik
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">{eventInfo.event_name}</h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {eventInfo.event_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(eventInfo.event_date), "d MMMM yyyy", { locale: localeId })}
                    </div>
                  )}
                  {eventInfo.event_location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {eventInfo.event_location}
                    </div>
                  )}
                  {eventInfo.photographer_name && (
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" />
                      {eventInfo.photographer_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats ringkas */}
              <div className="flex gap-3">
                <div className="text-center px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-2xl font-bold text-blue-700">{eventInfo.photo_count}</p>
                  <p className="text-xs text-blue-600">Foto</p>
                </div>
                <div className="text-center px-4 py-3 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-2xl font-bold text-green-700">{eventInfo.purchased_count}</p>
                  <p className="text-xs text-green-600">Dimiliki</p>
                </div>
                {unpurchasedCount > 0 && (
                  <div className="text-center px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-100">
                    <p className="text-2xl font-bold text-yellow-700">{unpurchasedCount}</p>
                    <p className="text-xs text-yellow-600">Belum Dibeli</p>
                  </div>
                )}
              </div>
            </div>

            {/* CTA beli semua */}
            {unpurchasedCount > 0 && (
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">
                    {unpurchasedCount} foto belum Anda beli
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">Dapatkan versi hi-res berkualitas tinggi dari fotografer</p>
                </div>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 gap-1.5 flex-shrink-0"
                  onClick={() => navigate("/user/photos")}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />Beli Foto
                </Button>
              </div>
            )}
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-24">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Event Tidak Ditemukan</h2>
              <p className="text-muted-foreground mb-6">Event ini mungkin sudah tidak tersedia.</p>
              <Button onClick={() => navigate("/user/events")}>Kembali ke Daftar Event</Button>
            </div>
          )
        )}

        {/* ── Filter & Toolbar ── */}
        {(photos.length > 0 || isLoading) && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari foto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Tab filter */}
            <div className="flex gap-1.5 p-1 rounded-xl bg-muted">
              {(["all", "purchased", "unpurchased"] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterTab === tab
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "all" ? "Semua" : tab === "purchased" ? "Dimiliki" : "Belum Dibeli"}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl h-10"
                onClick={() => setShowSort((v) => !v)}
              >
                <SortAsc className="h-4 w-4" />
                {sortLabels[sortBy]}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {showSort && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg w-44 overflow-hidden">
                  {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                        sortBy === key ? "font-semibold text-blue-600" : "text-foreground"
                      }`}
                      onClick={() => { setSortBy(key); setShowSort(false); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex gap-1 p-1 rounded-xl bg-muted">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Jumlah hasil */}
        {!isLoading && photos.length > 0 && (
          <p className="text-xs text-muted-foreground mb-4">
            Menampilkan <strong>{processedPhotos.length}</strong> dari {photos.length} foto
            {search && ` untuk "${search}"`}
          </p>
        )}

        {/* ── Foto Grid / List ── */}
        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>
            {Array.from({ length: 8 }).map((_, i) => <PhotoSkeleton key={i} view={viewMode} />)}
          </div>
        ) : processedPhotos.length === 0 ? (
          <div className="text-center py-24">
            <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">
              {search ? "Tidak Ada Hasil" : filterTab !== "all" ? "Tidak Ada Foto" : "Belum Ada Foto"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {search ? `Tidak ada foto yang cocok dengan "${search}"` : ""}
            </p>
            {search && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearch("")}>
                Hapus Pencarian
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          // ── GRID VIEW ──
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {processedPhotos.map((photo) => (
              <article
                key={photo.photo_id}
                className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <AuthenticatedImage
                    src={photo.preview_url || aiService.getPreviewUrl(photo.photo_id)}
                    alt={photo.filename}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Overlay saat hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Badge purchased */}
                  {photo.is_purchased ? (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold">
                      <CheckCircle className="h-3 w-3" />Dimiliki
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold">
                      {formatRupiahShort(photo.price_cash)}
                    </div>
                  )}

                  {/* Match score */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold">
                    <Star className="h-3 w-3 text-yellow-400" />
                    {Math.round((photo.similarity || 0) * 100)}%
                  </div>
                </div>

                {/* Footer card */}
                <div className="p-3">
                  <p className="text-xs font-medium truncate text-foreground">{photo.filename}</p>
                  <div className="flex items-center justify-between mt-2">
                    {photo.is_purchased ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.download_url) {
                            const a = document.createElement("a");
                            a.href = photo.download_url;
                            a.download = photo.filename;
                            a.click();
                          }
                        }}
                      >
                        <Download className="h-3 w-3" />Download
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPhoto(photo);
                        }}
                      >
                        <ShoppingCart className="h-3 w-3" />
                        {formatRupiah(photo.price_cash)}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          // ── LIST VIEW ──
          <div className="space-y-3">
            {processedPhotos.map((photo) => (
              <article
                key={photo.photo_id}
                className="flex gap-4 p-4 rounded-2xl border border-border bg-card hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                  <AuthenticatedImage
                    src={photo.preview_url || aiService.getPreviewUrl(photo.photo_id)}
                    alt={photo.filename}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  {photo.is_purchased && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{photo.filename}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {Math.round((photo.similarity || 0) * 100)}% cocok
                      </span>
                      {photo.price_cash && (
                        <span className="font-medium text-foreground">
                          {formatRupiah(photo.price_cash)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    {photo.is_purchased ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.download_url) {
                            const a = document.createElement("a");
                            a.href = photo.download_url;
                            a.download = photo.filename;
                            a.click();
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />Download
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPhoto(photo);
                        }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />Beli
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Modal foto */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onBuy={handleBuyPhoto}
        />
      )}
    </div>
  );
};

export default UserEventPage;