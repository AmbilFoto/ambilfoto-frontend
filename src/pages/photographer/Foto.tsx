import axios from "axios";
import { useState, useEffect, useCallback, useRef } from "react";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload, ImageIcon, MapPin, Search, Filter,
  TrendingUp, Loader2, X, Check, AlertTriangle,
  Camera, Grid3x3, List, Globe, Lock, RefreshCw,
  DollarSign, ArrowLeft, Plus, Calendar, Users, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import HeaderDash from "@/components/layout/HeaderDash";
import { Footer } from "@/components/layout/Footer";
import { photographerService, StandalonePhoto } from "@/services/api/photographer.service";
import { formatRupiah } from "@/utils/currency";
import { toast } from "sonner";
import RupiahInput from "@/components/RupiahInput";
import { Pencil, Trash2 } from "lucide-react";

// ─── Edit Pricing Modal (standalone only) ────────────────────────────────────

const EditPricingModal = ({
  photo, onClose, onSave,
}: {
  photo: StandalonePhoto;
  onClose: () => void;
  onSave: (photoId: string, data: any) => Promise<void>;
}) => {
  const [priceCash, setPriceCash]   = useState(photo.price_cash);
  const [visibility, setVisibility] = useState(photo.visibility);
  const [saving, setSaving]         = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(photo.photo_id, { price_cash: priceCash, visibility });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Edit Harga & Visibilitas</h2>
              <p className="text-blue-200 text-sm mt-0.5 truncate max-w-[260px]">{photo.filename}</p>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <RupiahInput
            id="edit_price_cash"
            label="Harga (Rupiah)"
            value={priceCash}
            onChange={setPriceCash}
            hint="Set 0 untuk gratis"
            step={1000}
          />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Visibilitas</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "PUBLIC",  icon: Globe, label: "Publik",  desc: "Semua orang bisa lihat" },
                { value: "PRIVATE", icon: Lock,  label: "Privat",  desc: "Hanya Anda" },
              ].map(opt => {
                const Icon = opt.icon;
                const active = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value as any)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mb-1 ${active ? "text-blue-600" : "text-gray-500"}`} />
                    <p className={`text-xs font-bold ${active ? "text-blue-700" : "text-gray-700"}`}>{opt.label}</p>
                    <p className="text-[10px] text-gray-500">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border">
            <p className="text-xs text-gray-500 mb-1">Preview harga akhir:</p>
            {priceCash === 0
              ? <p className="text-emerald-600 font-bold text-sm">GRATIS — siapapun bisa download</p>
              : <p className="text-gray-800 font-bold text-sm">{formatRupiah(priceCash)}</p>
            }
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Batal</Button>
          <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</>
              : <><Check className="h-4 w-4 mr-2" />Simpan</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirm ───────────────────────────────────────────────────────────

const DeleteConfirm = ({
  photo, onClose, onConfirm,
}: {
  photo: StandalonePhoto;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) => {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Hapus Foto?</h3>
            <p className="text-sm text-gray-500 truncate max-w-[200px]">{photo.filename}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Foto ini akan dihapus permanen dan tidak bisa dikembalikan.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Batal</Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl"
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

const SourceBadge = ({ photo }: { photo: StandalonePhoto }) => {
  if (photo.source === "standalone") {
    return (
      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
        Standalone
      </span>
    );
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      photo.event_role === "owner"
        ? "bg-purple-100 text-purple-700"
        : "bg-orange-100 text-orange-700"
    }`}>
      {photo.event_role === "owner" ? "Event (Owner)" : "Event (Collab)"}
    </span>
  );
};

const OriginalUploadAction = ({ photo, onUploaded }: {
  photo: StandalonePhoto;
  onUploaded: (photoId: string) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const result = await photographerService.uploadOriginalPhoto(photo.photo_id, file);
      if (!result.success) throw new Error(result.error || "Original gagal diunggah");
      onUploaded(photo.photo_id);
      toast.success("Original foto berhasil diunggah");
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error || error.message
        : error instanceof Error ? error.message : "Original gagal diunggah";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  if (photo.original_uploaded) {
    return <p className="mt-2 text-xs font-medium text-emerald-700">Original siap diunduh</p>;
  }

  return (
    <div className="mt-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {uploading ? "Mengunggah original..." : "Upload original"}
      </Button>
    </div>
  );
};

// ─── Grid Card ────────────────────────────────────────────────────────────────

const PhotoGridCard = ({
  photo, onEdit, onDelete, onOriginalUploaded,
}: {
  photo: StandalonePhoto;
  onEdit: (p: StandalonePhoto) => void;
  onDelete: (p: StandalonePhoto) => void;
  onOriginalUploaded: (photoId: string) => void;
}) => {
  const isStandalone = photo.source === "standalone";

  return (
    <Card className="group overflow-hidden border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 rounded-2xl bg-white">
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <AuthenticatedImage
          src={photo.preview_url}
          alt={photo.filename}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Source badge top-left */}
        <div className="absolute top-2 left-2">
          <SourceBadge photo={photo} />
        </div>

        {/* Face count bottom-right */}
        {photo.faces_count > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {photo.faces_count} wajah
          </div>
        )}

        {/* Hover actions — hanya standalone */}
        {isStandalone && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              onClick={() => onEdit(photo)}
              className="bg-white text-gray-900 p-2.5 rounded-xl hover:bg-blue-50 transition-colors"
              title="Edit harga"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(photo)}
              className="bg-white text-red-600 p-2.5 rounded-xl hover:bg-red-50 transition-colors"
              title="Hapus foto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {/* Filename selalu ada */}
        <p className="text-xs font-semibold text-gray-800 truncate">{photo.filename}</p>

        {/* Standalone: tampilkan harga & lokasi */}
        {isStandalone && (
          <>
            {photo.place_name && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1 truncate">
                <MapPin className="h-3 w-3 text-blue-400 flex-shrink-0" />
                {photo.place_name}
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-bold ${photo.price_cash === 0 ? "text-emerald-600" : "text-gray-800"}`}>
                {photo.price_cash === 0 ? "Gratis" : formatRupiah(photo.price_cash)}
              </span>
              <span className="flex items-center gap-0.5 text-gray-400 text-[11px]">
                <TrendingUp className="h-3 w-3" />
                {photo.total_purchases || 0}
              </span>
            </div>
          </>
        )}

        {/* Event photo: tampilkan nama event saja */}
        {!isStandalone && photo.event_name && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1 truncate">
            <Calendar className="h-3 w-3 text-purple-400 flex-shrink-0" />
            {photo.event_name}
          </p>
        )}
        <OriginalUploadAction photo={photo} onUploaded={onOriginalUploaded} />
      </CardContent>
    </Card>
  );
};

// ─── List Row ─────────────────────────────────────────────────────────────────

const PhotoListRow = ({
  photo, onEdit, onDelete, onOriginalUploaded,
}: {
  photo: StandalonePhoto;
  onEdit: (p: StandalonePhoto) => void;
  onDelete: (p: StandalonePhoto) => void;
  onOriginalUploaded: (photoId: string) => void;
}) => {
  const isStandalone = photo.source === "standalone";

  return (
    <Card className="border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            <AuthenticatedImage src={photo.preview_url} alt={photo.filename} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-semibold text-sm text-gray-800 truncate">{photo.filename}</p>
              <SourceBadge photo={photo} />
            </div>

            {/* Standalone: lokasi + visibilitas */}
            {isStandalone && (
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                {photo.place_name && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-400" />{photo.place_name}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  photo.visibility === "PUBLIC" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {photo.visibility === "PUBLIC" ? "Publik" : "Privat"}
                </span>
              </div>
            )}

            {/* Event photo: nama event */}
            {!isStandalone && photo.event_name && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3 text-purple-400" />{photo.event_name}
              </p>
            )}
          </div>

          {/* Harga — hanya standalone */}
          {isStandalone && (
            <div className="text-right flex-shrink-0 hidden sm:block">
              <p className={`font-bold text-sm ${photo.price_cash === 0 ? "text-emerald-600" : "text-gray-800"}`}>
                {photo.price_cash === 0 ? "GRATIS" : formatRupiah(photo.price_cash)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{photo.total_purchases || 0} terjual</p>
            </div>
          )}

          {/* Actions — hanya standalone */}
          {isStandalone && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => onEdit(photo)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(photo)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <OriginalUploadAction photo={photo} onUploaded={onOriginalUploaded} />
      </CardContent>
    </Card>
  );
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const StatsBar = ({ photos }: { photos: StandalonePhoto[] }) => {
  const standalone = photos.filter(p => p.source === "standalone");
  const eventPhotos = photos.filter(p => p.source === "event");
  const totalRevenue = standalone.reduce((s, p) => s + (p.total_revenue || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total Foto",      value: photos.length,     icon: ImageIcon,  color: "text-blue-600",   bg: "bg-blue-50"   },
        { label: "Standalone",      value: standalone.length, icon: Upload,     color: "text-green-600",  bg: "bg-green-50"  },
        { label: "Via Event",       value: eventPhotos.length,icon: Calendar,   color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Pendapatan",      value: totalRevenue > 0 ? formatRupiah(totalRevenue) : "Rp 0",
                                                              icon: DollarSign, color: "text-yellow-700", bg: "bg-yellow-50" },
      ].map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="border-2 border-gray-100 rounded-2xl">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-black text-gray-800">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterSource = "all" | "standalone" | "event";
type FilterRole   = "all" | "owner" | "collaborator";

export default function PhotographerMyPhotos() {
  const navigate = useNavigate();

  const [photos, setPhotos]         = useState<StandalonePhoto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");
  const [search, setSearch]         = useState("");
  const [filterSource, setFilterSource] = useState<FilterSource>("all");
  const [filterRole, setFilterRole]     = useState<FilterRole>("all");
  const [filterVis, setFilterVis]       = useState<"all" | "PUBLIC" | "PRIVATE">("all");
  const [sortBy, setSortBy]         = useState<"newest" | "oldest" | "price" | "sales">("newest");

  const [editPhoto, setEditPhoto]     = useState<StandalonePhoto | null>(null);
  const [deletePhoto, setDeletePhoto] = useState<StandalonePhoto | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await photographerService.getMyAllPhotos({ limit: 100 });
      if (res.success && res.data) setPhotos(res.data);
    } catch {
      toast.error("Gagal memuat foto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const handleUpdatePhoto = async (photoId: string, data: any) => {
    try {
      const res = await photographerService.updateStandalonePhoto(photoId, data);
      if (res.success) {
        toast.success("Foto berhasil diperbarui");
        setPhotos(prev => prev.map(p => p.photo_id === photoId ? { ...p, ...data } : p));
      } else {
        toast.error(res.error || "Gagal memperbarui foto");
        throw new Error(res.error);
      }
    } catch (err: any) {
      if (err?.response?.data?.error) toast.error(err.response.data.error);
      throw err;
    }
  };

  const handleDeletePhoto = async () => {
    if (!deletePhoto) return;
    try {
      const res = await photographerService.deleteStandalonePhoto(deletePhoto.photo_id);
      if (res.success) {
        toast.success("Foto berhasil dihapus");
        setPhotos(prev => prev.filter(p => p.photo_id !== deletePhoto.photo_id));
        setDeletePhoto(null);
      } else {
        toast.error(res.error || "Gagal menghapus foto");
      }
    } catch {
      toast.error("Gagal menghapus foto");
    }
  };

  const handleOriginalUploaded = (photoId: string) => {
    setPhotos((previous) => previous.map((photo) =>
      photo.photo_id === photoId ? { ...photo, original_uploaded: true } : photo
    ));
  };

  const filtered = photos
    .filter(p => {
      // Filter source
      if (filterSource !== "all" && p.source !== filterSource) return false;
      // Filter role (hanya relevan untuk event photos)
      if (filterRole !== "all") {
        if (p.source !== "event") return false;
        if (p.event_role !== filterRole) return false;
      }
      // Filter visibilitas (hanya relevan untuk standalone)
      if (filterVis !== "all") {
        if (p.source !== "standalone") return false;
        if (p.visibility !== filterVis) return false;
      }
      // Search
      if (search) {
        const q = search.toLowerCase();
        return (
          p.filename.toLowerCase().includes(q) ||
          p.place_name?.toLowerCase().includes(q) ||
          p.event_name?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "price":  return (b.price_cash || 0) - (a.price_cash || 0);
        case "sales":  return (b.total_purchases || 0) - (a.total_purchases || 0);
        default:       return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Reset role filter saat source bukan event
  const handleSourceChange = (val: FilterSource) => {
    setFilterSource(val);
    if (val !== "event") setFilterRole("all");
    if (val !== "standalone") setFilterVis("all");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HeaderDash />

      <main className="flex-1 py-8">
        <div className="container max-w-7xl">

          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate("/photographer/dashboard")}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-all group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Kembali ke Dashboard
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1">Foto Saya</h1>
                <p className="text-gray-500 text-sm">Semua foto — standalone maupun via event</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadPhotos} className="rounded-xl border-2">
                  <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
                <Link to="/photographer/upload">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 shadow-md">
                    <Plus className="h-4 w-4" />Upload Foto Baru
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          {!loading && photos.length > 0 && <StatsBar photos={photos} />}

          {/* Filter bar */}
          <Card className="mb-6 border-2 border-gray-100 rounded-2xl shadow-sm bg-white/70 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 flex-wrap">

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari nama file, lokasi, atau event..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-2 focus:border-blue-400 bg-white"
                  />
                </div>

                {/* Filter: Source */}
                <Select value={filterSource} onValueChange={v => handleSourceChange(v as FilterSource)}>
                  <SelectTrigger className="w-full md:w-[170px] border-2 rounded-xl bg-white">
                    <Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Semua Sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Sumber</SelectItem>
                    <SelectItem value="standalone">Standalone</SelectItem>
                    <SelectItem value="event">Via Event</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filter: Role — muncul hanya jika source = event atau all */}
                {(filterSource === "event" || filterSource === "all") && (
                  <Select value={filterRole} onValueChange={v => setFilterRole(v as FilterRole)}>
                    <SelectTrigger className="w-full md:w-[170px] border-2 rounded-xl bg-white">
                      <Users className="mr-2 h-4 w-4" /><SelectValue placeholder="Semua Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Role</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Filter: Visibilitas — muncul hanya jika source = standalone atau all */}
                {(filterSource === "standalone" || filterSource === "all") && (
                  <Select value={filterVis} onValueChange={v => setFilterVis(v as any)}>
                    <SelectTrigger className="w-full md:w-[160px] border-2 rounded-xl bg-white">
                      <Globe className="mr-2 h-4 w-4" /><SelectValue placeholder="Visibilitas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Visibilitas</SelectItem>
                      <SelectItem value="PUBLIC">Publik</SelectItem>
                      <SelectItem value="PRIVATE">Privat</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Sort */}
                <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
                  <SelectTrigger className="w-full md:w-[160px] border-2 rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Terbaru</SelectItem>
                    <SelectItem value="oldest">Terlama</SelectItem>
                    <SelectItem value="price">Harga Tertinggi</SelectItem>
                    <SelectItem value="sales">Paling Laku</SelectItem>
                  </SelectContent>
                </Select>

                {/* View toggle */}
                <div className="flex gap-1 border-2 border-gray-200 rounded-xl p-1 bg-white self-start">
                  <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-8 w-8 p-0 rounded-lg">
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 w-8 p-0 rounded-lg">
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {!loading && (
            <p className="text-sm text-gray-500 mb-4">
              {filtered.length} foto {search && `untuk "${search}"`}
            </p>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className={viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-3"
            }>
              {Array.from({ length: 10 }).map((_, i) => (
                viewMode === "grid"
                  ? <Skeleton key={i} className="aspect-square rounded-2xl" />
                  : <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && photos.length === 0 && (
            <Card className="border-2 border-dashed border-gray-300 bg-white/80 rounded-3xl">
              <CardContent className="py-20 text-center">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
                  <Camera className="h-10 w-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">Belum ada foto</h3>
                <p className="text-gray-500 mb-6 max-w-xs mx-auto">Upload foto pertama Anda.</p>
                <Link to="/photographer/upload">
                  <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">
                    <Upload className="h-4 w-4" />Upload Foto Sekarang
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* No result */}
          {!loading && photos.length > 0 && filtered.length === 0 && (
            <Card className="border-2 border-gray-200 bg-white/80 rounded-2xl">
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold mb-1">Tidak ada hasil</p>
                <p className="text-sm text-gray-400">Coba ubah kata kunci atau filter</p>
                <button
                  className="mt-4 text-sm text-blue-600 hover:underline"
                  onClick={() => { setSearch(""); setFilterSource("all"); setFilterRole("all"); setFilterVis("all"); }}
                >
                  Reset filter
                </button>
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          {!loading && filtered.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(photo => (
                <PhotoGridCard
                  key={photo.photo_id}
                  photo={photo}
                  onEdit={setEditPhoto}
                  onDelete={setDeletePhoto}
                  onOriginalUploaded={handleOriginalUploaded}
                />
              ))}
            </div>
          )}

          {/* List */}
          {!loading && filtered.length > 0 && viewMode === "list" && (
            <div className="space-y-3">
              {filtered.map(photo => (
                <PhotoListRow
                  key={photo.photo_id}
                  photo={photo}
                  onEdit={setEditPhoto}
                  onDelete={setDeletePhoto}
                  onOriginalUploaded={handleOriginalUploaded}
                />
              ))}
            </div>
          )}

        </div>
      </main>

      <Footer />

      {editPhoto && (
        <EditPricingModal
          photo={editPhoto}
          onClose={() => setEditPhoto(null)}
          onSave={handleUpdatePhoto}
        />
      )}

      {deletePhoto && (
        <DeleteConfirm
          photo={deletePhoto}
          onClose={() => setDeletePhoto(null)}
          onConfirm={handleDeletePhoto}
        />
      )}
    </div>
  );
}