import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import HeaderDash from "@/components/layout/HeaderDash";
import { Footer } from "@/components/layout/Footer";
import { userService, UserPhoto } from "@/services/api/user.service";
import { aiService } from "@/services/api/ai.service";
import {
  Calendar, MapPin, Image as ImageIcon, Search, Camera,
  ChevronRight, TrendingUp, Download, ShoppingCart,
  Sparkles, Grid2x2, List, X, Star, CheckCircle,
  Clock, Globe, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ─── Tipe ────────────────────────────────────────────────────────────────────

interface EventGroup {
  event_id: string;
  event_name: string;
  event_date: string;
  event_location: string;
  event_type?: string;
  photographer_name?: string;
  photos: UserPhoto[];
  purchased_count: number;
  avg_similarity: number;
  total_value: number;
}

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

type SortOption = "date" | "photos" | "match";
type ViewMode = "grid" | "list";

// ─── Skeleton ────────────────────────────────────────────────────────────────

const EventSkeleton = ({ view }: { view: ViewMode }) =>
  view === "grid" ? (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      <Skeleton className="h-40 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1 rounded-xl" />
          <Skeleton className="h-8 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  ) : (
    <div className="flex gap-4 p-4 rounded-2xl border border-border bg-card">
      <Skeleton className="w-24 h-24 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );

// ─── Main Component ───────────────────────────────────────────────────────────

const UserEventsListPage = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await userService.getMyPhotos();
        if (res.success && res.data) setPhotos(res.data);
      } catch {}
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  // Group foto berdasarkan event
  const events = useMemo<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>();
    photos.forEach((p) => {
      const key = p.event_id || p.event_name || "unknown";
      const existing = map.get(key);
      if (existing) {
        existing.photos.push(p);
        if (p.is_purchased) existing.purchased_count++;
        existing.avg_similarity += p.similarity || 0;
        existing.total_value += p.price_cash || 0;
      } else {
        map.set(key, {
          event_id: p.event_id || key,
          event_name: p.event_name || "Event Tidak Diketahui",
          event_date: p.event_date || "",
          event_location: p.event_location || "",
          event_type: p.event_type,
          photographer_name: p.photographer_name,
          photos: [p],
          purchased_count: p.is_purchased ? 1 : 0,
          avg_similarity: p.similarity || 0,
          total_value: p.price_cash || 0,
        });
      }
    });

    return Array.from(map.values()).map((e) => ({
      ...e,
      avg_similarity: e.photos.length ? e.avg_similarity / e.photos.length : 0,
    }));
  }, [photos]);

  // Filter + sort
  const processed = useMemo(() => {
    let result = [...events];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.event_name.toLowerCase().includes(q) ||
          e.event_location.toLowerCase().includes(q) ||
          e.photographer_name?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime());
        break;
      case "photos":
        result.sort((a, b) => b.photos.length - a.photos.length);
        break;
      case "match":
        result.sort((a, b) => b.avg_similarity - a.avg_similarity);
        break;
    }
    return result;
  }, [events, search, sortBy]);

  const totalPhotos = photos.length;
  const totalPurchased = photos.filter((p) => p.is_purchased).length;
  const totalUnpurchased = totalPhotos - totalPurchased;

  // Navigasi ke detail event
  const goToEvent = (event: EventGroup) => {
    const slug = event.event_name.toLowerCase().replace(/\s+/g, "-");
    navigate(`/user/events/${slug}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderDash />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Event Saya</h1>
              <p className="text-muted-foreground mt-1">
                {isLoading ? "Memuat..." : `${events.length} event • ${totalPhotos} foto ditemukan`}
              </p>
            </div>
            <Link to="/user/scan-face">
              <Button className="gap-2">
                <Camera className="h-4 w-4" />Pindai Wajah
              </Button>
            </Link>
          </div>

          {/* Summary stats */}
          {!isLoading && totalPhotos > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{events.length}</p>
                <p className="text-xs text-blue-600 mt-0.5">Event</p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{totalPurchased}</p>
                <p className="text-xs text-green-600 mt-0.5">Dibeli</p>
              </div>
              <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">{totalUnpurchased}</p>
                <p className="text-xs text-yellow-600 mt-0.5">Belum Dibeli</p>
              </div>
            </div>
          )}
        </div>

        {/* CTA scan jika belum ada foto */}
        {!isLoading && photos.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <Camera className="h-12 w-12 text-blue-300" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Belum Ada Event</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Pindai wajah Anda untuk menemukan foto dari event yang pernah Anda hadiri.
            </p>
            <Link to="/user/scan-face">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-5 w-5" />Mulai Pindai Wajah
              </Button>
            </Link>
          </div>
        )}

        {/* ── Toolbar ── */}
        {(photos.length > 0 || isLoading) && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari event atau lokasi..."
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

            {/* Sort */}
            <div className="flex gap-1.5 p-1 rounded-xl bg-muted">
              {(["date", "photos", "match"] as SortOption[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "date" ? "Terbaru" : s === "photos" ? "Terbanyak" : "Kecocokan"}
                </button>
              ))}
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
        {!isLoading && events.length > 0 && (
          <p className="text-xs text-muted-foreground mb-4">
            Menampilkan <strong>{processed.length}</strong> dari {events.length} event
            {search && ` untuk "${search}"`}
          </p>
        )}

        {/* ── List/Grid Event ── */}
        {isLoading ? (
          <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-4"}>
            {Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} view={viewMode} />)}
          </div>
        ) : processed.length === 0 && events.length > 0 ? (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold mb-1">Tidak Ada Hasil</h3>
            <p className="text-sm text-muted-foreground">Tidak ada event yang cocok dengan "{search}"</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearch("")}>Hapus Pencarian</Button>
          </div>
        ) : viewMode === "grid" ? (
          // ── GRID VIEW ──
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {processed.map((event) => {
              const coverPhoto = event.photos[0];
              const unpurchased = event.photos.length - event.purchased_count;
              const tColor = TYPE_COLORS[event.event_type ?? "other"] ?? TYPE_COLORS.other;
              const tLabel = TYPE_LABELS[event.event_type ?? "other"] ?? "Lainnya";

              return (
                <article
                  key={event.event_id}
                  className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer"
                  onClick={() => goToEvent(event)}
                >
                  {/* Cover */}
                  <div className="relative h-44 bg-muted overflow-hidden">
                    {coverPhoto && (
                      <AuthenticatedImage
                        src={coverPhoto.preview_url || aiService.getPreviewUrl(coverPhoto.photo_id)}
                        alt={event.event_name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      {event.event_type && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tColor}`}>
                          {tLabel}
                        </span>
                      )}
                    </div>

                    {/* Bottom info */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-bold text-white text-base truncate">{event.event_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {event.event_date && (
                          <div className="flex items-center gap-1 text-white/80 text-xs">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(event.event_date), "d MMM yyyy", { locale: localeId })}
                          </div>
                        )}
                        {event.event_location && (
                          <div className="flex items-center gap-1 text-white/80 text-xs truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{event.event_location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{event.photos.length}</span>
                        <span className="text-muted-foreground text-xs">foto</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-green-700">{event.purchased_count}</span>
                        <span className="text-muted-foreground text-xs">dimiliki</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold text-xs">{Math.round(event.avg_similarity * 100)}%</span>
                      </div>
                    </div>

                    {/* Photographer */}
                    {event.photographer_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <Camera className="h-3 w-3" />{event.photographer_name}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl h-8 text-xs"
                        onClick={(e) => { e.stopPropagation(); goToEvent(event); }}
                      >
                        Lihat Foto
                      </Button>
                      {unpurchased > 0 && (
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl h-8 text-xs gap-1"
                          onClick={(e) => { e.stopPropagation(); goToEvent(event); }}
                        >
                          <ShoppingCart className="h-3 w-3" />
                          Beli ({unpurchased})
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          // ── LIST VIEW ──
          <div className="space-y-3">
            {processed.map((event) => {
              const coverPhoto = event.photos[0];
              const unpurchased = event.photos.length - event.purchased_count;
              const tColor = TYPE_COLORS[event.event_type ?? "other"] ?? TYPE_COLORS.other;
              const tLabel = TYPE_LABELS[event.event_type ?? "other"] ?? "Lainnya";

              return (
                <article
                  key={event.event_id}
                  className="flex gap-4 p-4 rounded-2xl border border-border bg-card hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                  onClick={() => goToEvent(event)}
                >
                  {/* Thumbnail */}
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                    {coverPhoto && (
                      <AuthenticatedImage
                        src={coverPhoto.preview_url || aiService.getPreviewUrl(coverPhoto.photo_id)}
                        alt={event.event_name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {/* Mini stack indicator */}
                    {event.photos.length > 1 && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                        +{event.photos.length}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {event.event_type && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tColor}`}>
                              {tLabel}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm truncate">{event.event_name}</h3>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.event_date), "d MMM yyyy", { locale: localeId })}
                            </span>
                          )}
                          {event.event_location && (
                            <span className="flex items-center gap-1 truncate max-w-[160px]">
                              <MapPin className="h-3 w-3 flex-shrink-0" />{event.event_location}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">{event.photos.length}</strong> foto
                      </span>
                      <span className="text-green-600">
                        <strong>{event.purchased_count}</strong> dimiliki
                      </span>
                      {unpurchased > 0 && (
                        <span className="text-yellow-600">
                          <strong>{unpurchased}</strong> belum dibeli
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-muted-foreground ml-auto">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {Math.round(event.avg_similarity * 100)}%
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg"
                        onClick={(e) => { e.stopPropagation(); goToEvent(event); }}
                      >
                        <ImageIcon className="h-3 w-3 mr-1" />Lihat
                      </Button>
                      {unpurchased > 0 && (
                        <Button
                          size="sm"
                          className="h-7 text-xs rounded-lg gap-1"
                          onClick={(e) => { e.stopPropagation(); goToEvent(event); }}
                        >
                          <ShoppingCart className="h-3 w-3" />Beli {unpurchased} Foto
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default UserEventsListPage;