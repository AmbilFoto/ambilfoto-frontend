import { useState, useEffect, useRef } from "react";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  photographerService,
  PublicEventDetail,
  PublicEventPhoto,
} from "@/services/api/photographer.service";
import {
  ArrowLeft, Calendar, MapPin, Users, Image as ImageIcon,
  UserPlus, CheckCircle, Lock, Loader2, Globe, Camera,
  Upload, ShieldCheck, Sparkles, Hash, X, AlertCircle,
  Pencil, Check, DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import PhotographerHeader from "@/components/layout/HeaderPhoto";
import { Footer } from "@/components/layout/Footer";
import { formatRupiah } from "@/utils/currency";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding", birthday: "Ulang Tahun", corporate: "Korporat",
  graduation: "Wisuda", concert: "Konser", sports: "Olahraga", other: "Lainnya",
};
const TYPE_COLORS: Record<string, string> = {
  wedding:    "bg-pink-100 text-pink-700 border-pink-200",
  birthday:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  corporate:  "bg-slate-100 text-slate-700 border-slate-200",
  graduation: "bg-emerald-100 text-emerald-700 border-emerald-200",
  concert:    "bg-violet-100 text-violet-700 border-violet-200",
  sports:     "bg-orange-100 text-orange-700 border-orange-200",
  other:      "bg-gray-100 text-gray-600 border-gray-200",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadingPhoto {
  id: string; file: File; preview: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number; facesDetected?: number; error?: string;
}

// Photo dengan local price state untuk optimistic update
type PhotoWithPrice = PublicEventPhoto & {
  localPriceCash?: number;
  localIsForSale?: boolean;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) => (
  <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border">
    <div className="p-2 rounded-xl bg-background border border-border">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

function CTAButton({ event, isOwner, isCollaborator, isFull, isJoining, onJoin, onUploadClick }: {
  event: PublicEventDetail; isOwner: boolean; isCollaborator: boolean;
  isFull: boolean; isJoining: boolean; onJoin: () => void; onUploadClick: () => void;
}) {
  if (isOwner) return (
    <Button className="w-full rounded-xl gap-2" onClick={onUploadClick}>
      <Upload className="h-4 w-4" /> Upload Foto
    </Button>
  );
  if (isCollaborator) return (
    <Button className="w-full rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onUploadClick}>
      <Upload className="h-4 w-4" /> Upload Foto
    </Button>
  );
  if (!event.is_collaborative) return (
    <Button className="w-full rounded-xl gap-2" variant="secondary" disabled>
      <Lock className="h-4 w-4" /> Tidak Bisa Bergabung
    </Button>
  );
  if (isFull) return (
    <Button className="w-full rounded-xl gap-2" variant="secondary" disabled>
      <Lock className="h-4 w-4" /> Slot Penuh
    </Button>
  );
  return (
    <Button className="w-full rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={onJoin} disabled={isJoining}>
      {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {isJoining ? "Bergabung..." : "Gabung sebagai Kolaborator"}
    </Button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PublicEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [event, setEvent]                     = useState<PublicEventDetail | null>(null);
  const [photos, setPhotos]                   = useState<PhotoWithPrice[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [isPhotosLoading, setIsPhotosLoading] = useState(true);
  const [isJoining, setIsJoining]             = useState(false);
  const [showUpload, setShowUpload]           = useState(false);

  // ID photographer yang sedang login — diambil dari localStorage
  const [myPhotographerId, setMyPhotographerId] = useState<string | null>(null);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState<UploadingPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Price edit state
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingCash, setEditingCash]       = useState<string>("");
  const [isSavingPrice, setIsSavingPrice]   = useState(false);

  // Ambil photographer ID dari localStorage saat mount
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        // Coba berbagai kemungkinan key
        const pgId = parsed.photographer_id ?? parsed.photographerId ?? null;
        setMyPhotographerId(pgId);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Fetch event ───────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const res = await photographerService.getPublicEventDetail(eventId);
        if (res.success && res.data) {
          setEvent(res.data);
        } else {
          toast({ title: "Event tidak ditemukan", variant: "destructive" });
          navigate("/photographer/events/discover");
        }
      } catch {
        toast({ title: "Gagal memuat event", variant: "destructive" });
        navigate("/photographer/events/discover");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [eventId]);

  // ── Fetch photos ──────────────────────────────────────────────
  const fetchPhotos = async () => {
    if (!eventId) return;
    setIsPhotosLoading(true);
    try {
      const res = await photographerService.getEventPhotos(eventId);
      if (res.data?.photos) setPhotos(res.data.photos);
    } catch { /* silent */ }
    finally { setIsPhotosLoading(false); }
  };

  useEffect(() => { if (eventId) fetchPhotos(); }, [eventId]);

  // ── Join ──────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!event) return;
    setIsJoining(true);
    try {
      const res = await photographerService.joinEvent(event.id);
      if (res.success) {
        toast({ title: "Berhasil bergabung! 🎉", description: "Anda sekarang bisa upload foto ke event ini." });
        setEvent(prev => prev
          ? { ...prev, my_role: "collaborator", my_status: "approved", can_join: false, can_upload: true }
          : prev);
      } else {
        toast({ title: "Gagal bergabung", description: res.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" });
    } finally { setIsJoining(false); }
  };

  // ── Upload ────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const items: UploadingPhoto[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file, preview: URL.createObjectURL(file), status: "pending", progress: 0,
    }));
    setUploadQueue(prev => [...prev, ...items]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const startUpload = async () => {
    if (!eventId || uploadQueue.length === 0) return;
    setIsUploading(true);
    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      if (item.status !== "pending") continue;
      setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: "uploading", progress: 20 } : p));
      try {
        const base64 = await fileToBase64(item.file);
        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, progress: 60 } : p));
        const res = await photographerService.uploadPhoto(eventId, {
          face_image: base64, filename: item.file.name, upload_order: i + 1,
        });
        if (res.success && res.data) {
          setUploadQueue(prev => prev.map(p => p.id === item.id
            ? { ...p, status: "success", progress: 100, facesDetected: res.data!.faces_detected } : p));
        } else throw new Error(res.error || "Upload gagal");
      } catch (err: any) {
        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: "error", error: err.message } : p));
      }
    }
    setIsUploading(false);
    fetchPhotos();
    const ok  = uploadQueue.filter(p => p.status === "success").length;
    const bad = uploadQueue.filter(p => p.status === "error").length;
    if (ok > 0) toast({ title: "Upload selesai", description: `${ok} foto berhasil${bad > 0 ? `, ${bad} gagal` : ""}` });
  };

  const clearDone = () => {
    setUploadQueue(prev => {
      prev.forEach(p => { if (p.status !== "pending" && p.status !== "uploading") URL.revokeObjectURL(p.preview); });
      return prev.filter(p => p.status === "pending" || p.status === "uploading");
    });
  };

  // ── Price edit ────────────────────────────────────────────────
  const startEditPrice = (photo: PhotoWithPrice) => {
    setEditingPhotoId(photo.id);
    const current = photo.localPriceCash ?? photo.price_cash ?? 0;
    setEditingCash(current === 0 ? "" : String(current));
  };

  const cancelEditPrice = () => {
    setEditingPhotoId(null);
    setEditingCash("");
  };

  const savePrice = async (photo: PhotoWithPrice) => {
    if (!eventId) return;

    const rawNum = parseInt(editingCash.replace(/[^0-9]/g, ""), 10) || 0;

    if (rawNum > 0 && rawNum % 1000 !== 0) {
      toast({
        title: "Harga tidak valid",
        description: "Harga harus kelipatan Rp 1.000. Contoh: 5.000, 25.000, 50.000",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPrice(true);
    try {
      const res = await photographerService.updatePhotoPricing(eventId, photo.id, {
        price_cash:   rawNum,
        price_points: 0,
        is_for_sale:  rawNum > 0,
      });

      if (res.success) {
        setPhotos(prev => prev.map(p => p.id === photo.id
          ? { ...p, localPriceCash: rawNum, localIsForSale: rawNum > 0, price_cash: rawNum, is_for_sale: rawNum > 0 }
          : p
        ));
        toast({
          title: rawNum === 0 ? "Foto diset gratis ✓" : "Harga disimpan ✓",
          description: rawNum === 0
            ? "Foto dapat didownload gratis"
            : `Harga: ${formatRupiah(rawNum)}`,
        });
        cancelEditPrice();
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({ title: "Gagal menyimpan harga", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingPrice(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <PhotographerHeader />
      <div className="h-56 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 animate-pulse" />
      <main className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        <Skeleton className="h-64 rounded-2xl" />
      </main>
    </div>
  );

  if (!event) return null;

  const tColor         = TYPE_COLORS[event.event_type?.toLowerCase() ?? "other"] ?? TYPE_COLORS.other;
  const tLabel         = TYPE_LABELS[event.event_type?.toLowerCase() ?? "other"] ?? event.event_type ?? "Lainnya";
  const isFull         = event.slots_remaining !== null && event.slots_remaining <= 0;
  const isOwner        = event.my_role === "owner";
  const isCollaborator = event.my_role === "collaborator" && event.my_status === "approved";
  const canUpload      = isOwner || isCollaborator;

  return (
    <div className="min-h-screen bg-background">
      <PhotographerHeader />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-56 h-56 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        </div>

        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <Button variant="ghost" size="sm" onClick={() => navigate("/photographer/events/discover")}
            className="mb-6 text-white/60 hover:text-white hover:bg-white/10 gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Discover
          </Button>

          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${tColor}`}>{tLabel}</span>
                {event.is_collaborative
                  ? <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30"><Users className="h-3 w-3" /> Kolaboratif</span>
                  : <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-white/10 text-white/60 border border-white/20"><Globe className="h-3 w-3" /> Publik</span>
                }
                {isOwner && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-400/20 text-amber-300 border border-amber-400/30">Event Anda</span>}
                {isCollaborator && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"><ShieldCheck className="h-3 w-3" /> Kolaborator</span>}
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3 break-words">{event.event_name}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/55 text-sm">
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(new Date(event.event_date), "d MMMM yyyy", { locale: localeId })}</span>
                {event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span>}
                <span className="flex items-center gap-1.5"><Camera className="h-4 w-4" />{event.business_name || event.photographer_name}</span>
              </div>
            </div>
            <div className="hidden md:block min-w-[200px]">
              <CTAButton event={event} isOwner={isOwner} isCollaborator={isCollaborator}
                isFull={isFull} isJoining={isJoining} onJoin={handleJoin}
                onUploadClick={() => setShowUpload(v => !v)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <main className="container mx-auto px-4 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={ImageIcon} label="Total Foto" value={photos.length || event.photo_count} />
          <StatCard icon={Users} label="Kolaborator" value={event.collaborator_count}
            sub={event.max_collaborators ? `dari ${event.max_collaborators}` : undefined} />
          {event.slots_remaining !== null && (
            <StatCard icon={Sparkles} label="Slot Tersisa" value={isFull ? "Penuh" : event.slots_remaining!} />
          )}
          <StatCard icon={Hash} label="Status Saya"
            value={isOwner ? "Owner" : isCollaborator ? "Kolaborator" : "Belum Bergabung"} />
        </div>

        {/* ── Upload Panel ── */}
        {canUpload && showUpload && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2 text-blue-900">
                <Upload className="h-4 w-4 text-blue-600" /> Upload Foto ke Event
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>Jangan ubah nama file dari kamera. Nama file original diperlukan untuk pencocokan foto hi-res.</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <Upload className="h-8 w-8 mx-auto text-blue-400 mb-2" />
              <p className="font-medium text-blue-700 text-sm">Klik untuk pilih foto</p>
              <p className="text-xs text-blue-500 mt-1">JPG, PNG, WEBP</p>
            </div>

            {uploadQueue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Antrian ({uploadQueue.length})</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearDone} disabled={isUploading}>Hapus Selesai</Button>
                    <Button size="sm" onClick={startUpload}
                      disabled={isUploading || uploadQueue.every(p => p.status !== "pending")}
                      className="bg-blue-600 hover:bg-blue-700 text-white">
                      {isUploading
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Uploading...</>
                        : <><Upload className="h-3.5 w-3.5 mr-1" />Upload Semua</>}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {uploadQueue.map(item => (
                    <div key={item.id} className="relative">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted border relative">
                        <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                          {item.status === "pending"   && <span className="text-white text-xs">Menunggu</span>}
                          {item.status === "uploading" && <><Loader2 className="h-5 w-5 text-white animate-spin mb-1" /><span className="text-white text-xs">{item.progress}%</span></>}
                          {item.status === "success"   && <><CheckCircle className="h-5 w-5 text-emerald-400 mb-1" /><span className="text-white text-xs">{item.facesDetected} wajah</span></>}
                          {item.status === "error"     && <><AlertCircle className="h-5 w-5 text-red-400 mb-1" /><span className="text-white text-xs">Gagal</span></>}
                        </div>
                        {item.status === "pending" && (
                          <button onClick={() => removeFromQueue(item.id)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs truncate mt-1 text-muted-foreground">{item.file.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">

          {/* Left */}
          <div className="md:col-span-2 space-y-5">

            {event.description && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-semibold text-base mb-2">Tentang Event</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Status notices */}
            {isCollaborator && !isOwner && (
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">Anda adalah Kolaborator</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Anda bisa upload foto dan mengatur harga foto Anda sendiri di event ini.</p>
                </div>
              </div>
            )}
            {isOwner && (
              <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800 text-sm">Ini Event Anda</p>
                  <p className="text-xs text-blue-700 mt-0.5">Anda adalah creator event ini. Anda bisa mengatur harga foto Anda sendiri.</p>
                </div>
              </div>
            )}
            {!event.is_collaborative && !isOwner && !isCollaborator && (
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <Lock className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-700 text-sm">Event Hanya Baca</p>
                  <p className="text-xs text-slate-500 mt-0.5">Event ini tidak membuka kolaborasi.</p>
                </div>
              </div>
            )}
            {event.is_collaborative && isFull && !isOwner && !isCollaborator && (
              <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 p-4">
                <Lock className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">Slot Penuh</p>
                  <p className="text-xs text-red-600 mt-0.5">Semua slot kolaborator sudah terisi.</p>
                </div>
              </div>
            )}

            {/* ── Photo Gallery ── */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Foto Event
                  {photos.length > 0 && <span className="text-xs font-normal text-muted-foreground">({photos.length})</span>}
                </h2>
                {canUpload && (
                  <Button size="sm" variant={showUpload ? "default" : "outline"}
                    className="gap-1.5 rounded-xl h-8 text-xs"
                    onClick={() => setShowUpload(v => !v)}>
                    <Upload className="h-3.5 w-3.5" />
                    {showUpload ? "Tutup Upload" : "Upload Foto"}
                  </Button>
                )}
              </div>

              {isPhotosLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada foto di event ini</p>
                  {canUpload && (
                    <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowUpload(true)}>
                      <Upload className="h-3.5 w-3.5" /> Upload foto pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map(photo => {
                    const isEditing = editingPhotoId === photo.id;
                    const priceCash = photo.localPriceCash ?? photo.price_cash ?? 0;
                    const isForSale = photo.localIsForSale ?? photo.is_for_sale;

                    // Foto ini milik photographer yang login jika:
                    // 1. Ada myPhotographerId dari localStorage DAN cocok dengan uploaded_by
                    // 2. Fallback: jika myPhotographerId belum ada tapi canUpload, izinkan (untuk kompatibilitas)
                    const isMyPhoto = myPhotographerId
                      ? myPhotographerId === photo.uploaded_by_photographer_id
                      : false;

                    // Tampilkan nama uploader
                    const uploaderDisplay =
                      photo.uploader_business_name ||
                      photo.uploader_name ||
                      'Fotografer';

                    return (
                      <div key={photo.id} className="group rounded-xl overflow-hidden border border-border bg-card">
                        {/* Image */}
                        <div className="aspect-square relative overflow-hidden bg-muted">
                          <AuthenticatedImage
                            src={photo.preview_url}
                            alt={photo.filename}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {/* Faces badge */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                            <Users className="h-2.5 w-2.5" />{photo.faces_count}
                          </div>
                        </div>

                        {/* Info + price editor */}
                        <div className="p-2.5 space-y-2">
                          <p className="text-xs font-medium truncate text-foreground/80">{photo.filename}</p>

                          {/* Uploader badge */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Camera className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate flex-1">{uploaderDisplay}</span>
                            {isMyPhoto && (
                              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                                Anda
                              </span>
                            )}
                          </div>

                          {/* Price section */}
                          {isMyPhoto ? (
                            // ── Editable: foto milik sendiri ──
                            isEditing ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center border rounded-md overflow-hidden flex-1 focus-within:ring-1 focus-within:ring-primary/40 bg-background">
                                    <span className="px-2 py-1 text-xs text-muted-foreground bg-muted border-r font-medium">Rp</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      autoFocus
                                      placeholder="0 = gratis"
                                      value={editingCash}
                                      onChange={e => setEditingCash(e.target.value.replace(/[^0-9]/g, ""))}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") savePrice(photo);
                                        if (e.key === "Escape") cancelEditPrice();
                                      }}
                                      className="w-full px-2 py-1 text-xs outline-none bg-transparent"
                                    />
                                  </div>
                                  <Button size="icon" className="h-7 w-7 flex-shrink-0"
                                    onClick={() => savePrice(photo)} disabled={isSavingPrice}>
                                    {isSavingPrice
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <Check className="h-3 w-3" />}
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0"
                                    onClick={cancelEditPrice}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className={`text-xs font-medium ${editingCash && parseInt(editingCash) > 0 ? "text-primary" : "text-green-600"}`}>
                                  {editingCash && parseInt(editingCash) > 0
                                    ? `= ${formatRupiah(parseInt(editingCash))}`
                                    : "= Gratis"}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className={`text-xs font-semibold ${isForSale ? "text-foreground" : "text-green-600"}`}>
                                    {formatRupiah(priceCash)}
                                  </span>
                                </div>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => startEditPrice(photo)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          ) : (
                            // ── Read only: foto milik fotografer lain ──
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatRupiah(priceCash)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Info Event</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Fotografer</dt>
                    <dd className="font-medium">{event.business_name || event.photographer_name}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Tanggal</dt>
                    <dd className="font-medium">{format(new Date(event.event_date), "EEEE, d MMMM yyyy", { locale: localeId })}</dd>
                  </div>
                </div>
                {event.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Lokasi</dt>
                      <dd className="font-medium">{event.location}</dd>
                    </div>
                  </div>
                )}
                {event.max_collaborators && (
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Kapasitas</dt>
                      <dd className="font-medium">{event.collaborator_count} / {event.max_collaborators} kolaborator</dd>
                    </div>
                  </div>
                )}
              </dl>

              {event.max_collaborators && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Slot terisi</span>
                    <span>{Math.round((event.collaborator_count / event.max_collaborators) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min(100, (event.collaborator_count / event.max_collaborators) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CTA mobile */}
            <div className="md:hidden">
              <CTAButton event={event} isOwner={isOwner} isCollaborator={isCollaborator}
                isFull={isFull} isJoining={isJoining} onJoin={handleJoin}
                onUploadClick={() => setShowUpload(v => !v)} />
            </div>
            {/* CTA desktop */}
            <div className="hidden md:block">
              <CTAButton event={event} isOwner={isOwner} isCollaborator={isCollaborator}
                isFull={isFull} isJoining={isJoining} onJoin={handleJoin}
                onUploadClick={() => setShowUpload(v => !v)} />
            </div>

            {/* Tips harga — hanya tampil jika ada foto milik sendiri */}
            {canUpload && photos.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Tips Harga
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hover foto Anda lalu klik ikon <Pencil className="inline h-3 w-3" /> untuk atur harga dalam{" "}
                  <strong className="text-foreground">Rupiah</strong>.
                  Hanya foto yang Anda upload yang dapat diubah harganya.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Rp 0 = Gratis</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Kelipatan Rp 1.000</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}