import { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Camera, Download, Check, X, ChevronLeft, ChevronRight,
  Search, ImageOff, Loader2,
} from "lucide-react";

const EVENT_SLUG = "bayan-run-2026";
const EVENT_NAME = "Bayan Run 2026";
const EVENT_LOCATION = "Balikpapan, Kalimantan Timur";
const EVENT_DATE_LABEL = "10-11 Oktober 2026";
const EVENT_START_DATE = "2026-10-10";
const EVENT_TOTAL_DAYS = 1; // ganti kalau race day + expo dianggap multi-hari

// ── Local backend (ganti ke domain production kalau sudah deploy) ──
const API_BASE_URL = "http://localhost:5050";

const BIOMETRIC_API_BASE =
  `${API_BASE_URL}/api/user/biometric`;

const AUDIO_BASE_URL =
  `${API_BASE_URL}/api/audio`;

const SCAN_MODAL_SCRIPT_URL =
  `${API_BASE_URL}/static/js/scan-modal.js`;

const PHOTOS_ENDPOINT =
  `${API_BASE_URL}/api/user/my_photos_by_id`;

const DOWNLOAD_ENDPOINT =
  `${API_BASE_URL}/api/user/download`;

const PREVIEW_MATCH_ENDPOINT = (filename: string) =>
  `${API_BASE_URL}/api/user/preview_match_by_id/${encodeURIComponent(filename)}`;

const STORAGE_KEY =
  `ambilfoto_user_id_${EVENT_SLUG}`;

declare global {
  interface Window {
    AmbilFotoScan: {
      open: (options: {
        apiBase: string;
        audioBase?: string;
        soundEnabled?: boolean;
        minAngles?: number;
        onComplete?: (data: any) => void;
        onCancel?: () => void;
        onError?: (err: Error) => void;
      }) => { close: () => void };
    };
  }
}

interface PhotoMeta {
  date?: string;
  event_name?: string;
  location?: string;
  photographer?: string;
  day?: string;
}

interface Photo {
  photo_id: string;
  filename: string;
  distance?: number;
  url?: string;
  preview_url?: string;
  metadata?: PhotoMeta;
}

function computeDayLabel(dateStr?: string): string {
  if (!dateStr) return "";
  const start = new Date(`${EVENT_START_DATE}T00:00:00`);
  const photoDate = new Date(dateStr);
  if (isNaN(photoDate.getTime())) return "";
  const diffDays = Math.floor((photoDate.getTime() - start.getTime()) / 86400000);
  const dayNum = diffDays + 1;
  if (dayNum < 1 || dayNum > EVENT_TOTAL_DAYS) return "";
  return `Day ${dayNum}`;
}

function getPhotoImageUrl(photo: Photo) {
  return photo.preview_url || (photo.filename);
}

function usePersonalPreview(
  filename: string,
  userId: string | null
) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    setSrc(null);

    if (!userId) {
      return;
    }

    fetch(PREVIEW_MATCH_ENDPOINT(filename), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Personal preview gagal");
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((error) => {
        console.error("Preview gagal:", error);
        if (!cancelled) {
          setSrc(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [filename, userId]);

  return src;
}

function PersonalPreviewImage({
  photo,
  userId,
  className,
}: {
  photo: Photo;
  userId: string | null;
  className: string;
}) {
  const src = usePersonalPreview(photo.filename, userId);

  return src ? (
    <img
      src={src}
      alt="Foto hasil pencarian"
      className={className}
    />
  ) : (
    <div className={`${className} bg-slate-900 animate-pulse`} />
  );
}

function PhotoThumb({
  photo,
  userId,
}: {
  photo: Photo;
  userId: string | null;
}) {
  const src = usePersonalPreview(
    photo.filename,
    userId
  );

  return (
    <img
      src={src}
      alt={photo.filename}
      loading="lazy"
      className="w-full h-full object-cover"
    />
  );
}


/* ────────────────────────── TOAST ─────────────────────────── */
function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-5 right-5 z-[10002] max-w-sm bg-slate-900 border border-white/10 rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3 animate-in slide-in-from-right">
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <span className="text-white text-xs leading-relaxed">{message}</span>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════ */
const EventPublicBayanRun2026 = () => {
  const [verifying, setVerifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [currentDay, setCurrentDay] = useState("all");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [gallerySearched, setGallerySearched] = useState(false);

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const scanSessionRef = useRef<{ close: () => void } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const visiblePhotos = currentDay === "all" ? allPhotos : allPhotos.filter((p) => p.metadata?.day === currentDay);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  /* ══ LOAD PHOTOS ══ */
  const loadPhotos = useCallback(async (uid: string) => {
    setGallerySearched(true);
    setLoadingPhotos(true);
    try {
      const res = await fetch(PHOTOS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, event_slug: EVENT_SLUG }),
      });
      const data = await res.json();
      if (data.success && data.photos?.length > 0) {
        const photos: Photo[] = data.photos.map((p: Photo) => ({
          ...p,
          metadata: { ...(p.metadata || {}), day: computeDayLabel(p.metadata?.date) },
        }));
        setAllPhotos(photos);
      } else {
        setAllPhotos([]);
      }
    } catch (error) {
      console.error("Gagal memuat foto:", error);
      setAllPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  /* Restore sesi sebelumnya */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUserId(stored);
      loadPhotos(stored);
    }
    return () => {
      scanSessionRef.current?.close();
    };
  }, [loadPhotos]);

  const ensureScanModalScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.AmbilFotoScan) return resolve();
      const existing = document.querySelector(`script[src="${SCAN_MODAL_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Gagal memuat modul verifikasi wajah")));
        return;
      }
      const script = document.createElement("script");
      script.src = SCAN_MODAL_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Gagal memuat modul verifikasi wajah"));
      document.body.appendChild(script);
    });
  }, []);

  /* ══ VERIFICATION — popup phone-style scan (scan-modal.js) ══ */
  const startVerification = useCallback(async () => {
    setVerifying(true);
    setStatusMsg({ type: "info", text: "Menyiapkan kamera verifikasi…" });
    try {
      await ensureScanModalScript();
    } catch (err) {
      setVerifying(false);
      setStatusMsg({
        type: "error",
        text: "Modul verifikasi wajah gagal dimuat. Pastikan server lokal (localhost:5050) sedang berjalan.",
      });
      return;
    }

    scanSessionRef.current = window.AmbilFotoScan.open({
      apiBase: BIOMETRIC_API_BASE,
      audioBase: AUDIO_BASE_URL,
      soundEnabled: true,
      minAngles: 4,
      onComplete: (data) => {
        scanSessionRef.current = null;
        setVerifying(false);
        localStorage.setItem(STORAGE_KEY, data.user_id);
        setUserId(data.user_id);
        setStatusMsg({
          type: "success",
          text: `Wajah terverifikasi! (liveness score: ${(data.liveness_score * 100).toFixed(0)}%). Mencari foto Anda…`,
        });
        loadPhotos(data.user_id);
      },
      onCancel: () => {
        scanSessionRef.current = null;
        setVerifying(false);
        setStatusMsg({ type: "info", text: "Verifikasi dibatalkan." });
      },
      onError: (err) => {
        scanSessionRef.current = null;
        setVerifying(false);
        setStatusMsg({ type: "error", text: err.message || "Verifikasi wajah gagal." });
      },
    });
  }, [ensureScanModalScript, loadPhotos]);

  const resetFaceData = useCallback(() => {
    if (!window.confirm("Ulangi pencarian wajah? Data verifikasi yang tersimpan akan dihapus dari perangkat ini.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setUserId(null);
    setAllPhotos([]);
    setCurrentDay("all");
    setGallerySearched(false);
    setStatusMsg(null);
  }, []);

  /* ══ DOWNLOAD ══ */
  const downloadPhoto = useCallback(
  async (photo: Photo) => {
    if (!userId) {
      showToast("Sesi wajah belum tersedia.");
      return;
    }

    if (!photo.photo_id) {
      showToast("ID foto tidak tersedia.");
      return;
    }

    setDownloadingKey(photo.filename);
    showToast("Mempersiapkan unduhan…");

    try {
      const response = await fetch(
        DOWNLOAD_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            photo_id: photo.photo_id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.error ||
            `Download gagal (${response.status})`
        );
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = photo.filename || "foto.jpg";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 4000);

      showToast("Download dimulai.");
    } catch (error) {
      console.error("Download error:", error);
      showToast("Foto tidak dapat diunduh.");
    } finally {
      setDownloadingKey(null);
    }
  },
  [userId, showToast]
);

  /* ══ MODAL NAV ══ */
  const navigatePhoto = useCallback((direction: number) => {
    setModalIndex((idx) => {
      if (idx === null || visiblePhotos.length === 0) return idx;
      return (idx + direction + visiblePhotos.length) % visiblePhotos.length;
    });
  }, [visiblePhotos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalIndex === null) return;
      if (e.key === "Escape") setModalIndex(null);
      if (e.key === "ArrowLeft") navigatePhoto(-1);
      if (e.key === "ArrowRight") navigatePhoto(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalIndex, navigatePhoto]);


  /* ══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: "'Sora',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .playfair{font-family:'Sora',system-ui,sans-serif;font-weight:800;letter-spacing:-0.02em;}
        .gradient-text{background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .gradient-text-warm{background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .btn-primary{background:linear-gradient(135deg,#1d4ed8,#2563eb);box-shadow:0 8px 32px rgba(29,78,216,.25),0 2px 8px rgba(29,78,216,.15);transition:all .25s cubic-bezier(.4,0,.2,1);}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(29,78,216,.4),0 4px 12px rgba(29,78,216,.25);}
        .btn-primary:disabled{opacity:.5;pointer-events:none;transform:none;}
        .btn-outline{border:1.5px solid rgba(29,78,216,.25);transition:all .25s;}
        .btn-outline:hover{background:rgba(29,78,216,.05);border-color:rgba(29,78,216,.5);}
        .section-pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:100px;}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
        .live-dot{animation:pulse-dot 1.8s ease-in-out infinite;}
        @keyframes fgcard{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fg-card-in{animation:fgcard .5s ease-out forwards;}
      `}</style>

      <Header />

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-16 pb-14 md:pt-20 md:pb-16">
        <div className="absolute inset-0 bg-slate-800">
          <img
            src="https://ik.imagekit.io/nwtwwkdgu/20251012053734%20-%20BOM_6641.jpg"
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement).style.background = "linear-gradient(135deg,#1e293b,#0f172a)";
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="container max-w-4xl mx-auto px-6 relative text-center">
          <div className="section-pill bg-white/10 text-blue-300 border border-white/20 mb-5 mx-auto w-fit backdrop-blur">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            Galeri Foto Berbasis Face AI
          </div>
          <h1 className="playfair text-4xl md:text-5xl font-black leading-tight text-white mb-3">
            Galeri Foto {EVENT_NAME}
          </h1>
          <p className="text-slate-300 text-sm">
            {EVENT_LOCATION} &nbsp;·&nbsp; {EVENT_DATE_LABEL}
          </p>
        </div>
      </section>

      {/* ═══ FACE VERIFICATION CTA ══════════════════════════════ */}
      {!gallerySearched && (
        <section className="py-6 bg-white">
          <div className="container max-w-2xl mx-auto px-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-8 md:p-10 text-center">
              <h2 className="playfair text-2xl md:text-3xl font-black text-slate-900 mb-2">
                Cari Fotomu dengan Wajah
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                Klik tombol di bawah, lalu ikuti instruksi arah kepala di layar. Proses ini juga
                memastikan yang scan adalah orang asli, bukan foto/video. Sistem akan mencari semua
                foto lari yang memuat wajah Anda.
              </p>

              <div className="flex gap-2.5 justify-center flex-wrap mb-5">
                <button
                  onClick={startVerification}
                  disabled={verifying}
                  className="btn-primary inline-flex items-center gap-2 text-white text-xs font-bold px-6 py-3 rounded-xl"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {verifying ? "Memverifikasi…" : "Mulai Verifikasi Wajah"}
                </button>
              </div>

              {statusMsg && (
                <div
                  className={`text-xs leading-relaxed rounded-xl px-4 py-3 text-left ${
                    statusMsg.type === "success"
                      ? "bg-emerald-500 text-white"
                      : statusMsg.type === "error"
                      ? "bg-red-500 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {statusMsg.text}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ GALLERY ═════════════════════════════════════════════ */}
      {gallerySearched && (
        <section className="py-14 bg-slate-50/70">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <div className="section-pill bg-amber-50 text-amber-700 border border-amber-100 mb-3">
                  <Search className="w-3 h-3" /> Foto Anda
                </div>
                <h2 className="playfair text-3xl md:text-4xl font-black text-slate-900">
                  Ditemukan <span className="gradient-text-warm">{visiblePhotos.length} foto</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://ambilfoto.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:border-blue-200 hover:text-blue-600 transition-colors"
                >
                  Managed by AmbilFoto.id
                </a>
                <button
                  onClick={resetFaceData}
                  className="btn-outline text-blue-600 text-xs font-bold px-5 py-2.5 rounded-xl bg-white whitespace-nowrap"
                >
                  Ulangi Pencarian
                </button>
              </div>
            </div>

            {allPhotos.length > 0 && EVENT_TOTAL_DAYS > 1 && (
              <div className="flex gap-2 flex-wrap mb-8">
                {["all", ...Array.from({ length: EVENT_TOTAL_DAYS }, (_, i) => `Day ${i + 1}`)].map((d) => (
                  <button
                    key={d}
                    onClick={() => setCurrentDay(d)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                      currentDay === d
                        ? "btn-primary text-white"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                    }`}
                  >
                    {d === "all" ? "Semua Hari" : d}
                  </button>
                ))}
              </div>
            )}

            {loadingPhotos && (
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                <p className="text-xs font-bold tracking-widest uppercase text-slate-300">Mencari foto Anda…</p>
              </div>
            )}

            {!loadingPhotos && visiblePhotos.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <ImageOff className="w-11 h-11 text-slate-200" />
                <p className="font-bold text-slate-800">Belum Ada Foto Ditemukan</p>
                <p className="text-sm text-slate-400 max-w-sm">
                  Wajah Anda belum terdeteksi. Coba cek kembali nanti setelah panitia mengunggah lebih
                  banyak foto.
                </p>
              </div>
            )}

            {!loadingPhotos && visiblePhotos.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {visiblePhotos.map((photo, i) => (
                  <div
                    key={photo.filename + i}
                    className="fg-card-in group relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-slate-100"
                    style={{ animationDelay: `${Math.min(i * 0.05, 0.6)}s`, opacity: 0 }}
                    onClick={() => setModalIndex(i)}
                  >
                    <div className="relative" style={{ aspectRatio: "4/3" }}>
                      <PhotoThumb photo={photo} userId={userId} />
                      {photo.metadata?.day && (
                        <div className="absolute top-3 left-3 bg-slate-900 text-blue-400 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border border-blue-500/20">
                          {photo.metadata.day}
                        </div>
                      )}
                      <a
                        href="https://ambilfoto.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-3 bottom-2.5 text-white/60 hover:text-white text-[10px] font-medium transition-colors"
                        style={{ textShadow: "0 1px 4px rgba(0,0,0,.6)" }}
                      >
                        © AmbilFoto.id
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadPhoto(photo);
                        }}
                        disabled={downloadingKey === photo.filename}
                        className="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-full bg-black/35 border border-white/25 flex items-center justify-center text-white/85 hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {downloadingKey === photo.filename ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ MODAL PREVIEW ══════════════════════════════════════ */}
      {modalIndex !== null && visiblePhotos[modalIndex] && (
        <div
          className="fixed inset-0 z-[9998] bg-black flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalIndex(null);
          }}
        >
          <button
            onClick={() => setModalIndex(null)}
            className="absolute top-5 right-6 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }}
            className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <PersonalPreviewImage
            photo={visiblePhotos[modalIndex]}
            userId={userId}
            className="max-w-full max-h-full object-contain"
          />
          <a
            href="https://ambilfoto.id"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-7 bottom-6 text-white/60 hover:text-white text-xs transition-colors"
          >
            © AmbilFoto.id
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const p = visiblePhotos[modalIndex];
              downloadPhoto(p);
            }}
            disabled={downloadingKey === visiblePhotos[modalIndex].filename}
            className="absolute right-7 bottom-4 text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            {downloadingKey === visiblePhotos[modalIndex].filename ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Download className="w-6 h-6" />
            )}
          </button>
        </div>
      )}

      {toast && <Toast message={toast} />}

      <Footer />
    </div>
  );
};

export default EventPublicBayanRun2026;