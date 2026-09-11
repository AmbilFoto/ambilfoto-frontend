import { Link } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Camera, Download, Check, X, ChevronLeft, ChevronRight,
  Search, ScanFace, ShieldCheck, Sparkles, ImageOff, Loader2,
} from "lucide-react";

const EVENT_SLUG = "bayan-open-craft";
const EVENT_NAME = "Bayan Open 2026";
const EVENT_LOCATION = "Balikpapan, Kalimantan Timur";
const EVENT_DATE_LABEL = "24–29 Agustus 2026";
const EVENT_START_DATE = "2026-08-24";
const EVENT_TOTAL_DAYS = 5;

const API_BASE_URL = "https://gallery.bayanopen.com";
const REGISTER_ENDPOINT = `${API_BASE_URL}/api/user/register_face`;
const PHOTOS_ENDPOINT = `${API_BASE_URL}/api/user/my_photos`;
const IMAGE_ENDPOINT = (filename: string) => `${API_BASE_URL}/api/preview/${filename}`;
const DOWNLOAD_ENDPOINT = (filename: string) => `${API_BASE_URL}/api/download/${filename}`;
const STORAGE_KEY = `ambilfoto_face_embedding_${EVENT_SLUG}`;
const FACE_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
const FACE_API_SRC = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const STABLE_FRAMES_NEEDED = 6;
const DETECT_INTERVAL_MS = 250;

declare global {
  interface Window {
    faceapi: any;
  }
}

type ScanState = "idle" | "red" | "yellow" | "green";

interface PhotoMeta {
  date?: string;
  event_name?: string;
  location?: string;
  photographer?: string;
  day?: string;
}

interface Photo {
  filename: string;
  photo_id?: string;
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

function toHttps(url: string) {
  return url.replace(/^http:/i, "https:");
}

function getPhotoImageUrl(photo: Photo) {
  const url = photo.preview_url || IMAGE_ENDPOINT(photo.filename);
  return toHttps(url);
}

function getPhotoDownloadUrl(photo: Photo) {
  return photo.url || DOWNLOAD_ENDPOINT(photo.filename);
}

function getCameraErrorMessage(error: any): string {
  const name = error?.name;
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return 'Akses kamera ditolak. Izinkan akses kamera pada browser Anda (ikon gembok di address bar), lalu klik "Nyalakan Kamera" lagi.';
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Kamera tidak ditemukan di perangkat ini. Pastikan perangkat Anda memiliki kamera yang aktif.";
    case "NotReadableError":
    case "TrackStartError":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi/tab lain yang menggunakan kamera, lalu coba lagi.";
    case "OverconstrainedError":
      return "Kamera pada perangkat Anda tidak mendukung pengaturan yang dibutuhkan. Coba gunakan perangkat lain.";
    case "SecurityError":
      return "Akses kamera diblokir. Pastikan halaman ini dibuka melalui koneksi aman (https).";
    default:
      return "Kamera tidak bisa diakses. Pastikan Anda sudah mengizinkan akses kamera pada browser, lalu coba lagi.";
  }
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
const EventPublicBayanOpenCraft = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanLabel, setScanLabel] = useState("Mencari wajah…");
  const [statusMsg, setStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [currentDay, setCurrentDay] = useState("all");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [gallerySearched, setGallerySearched] = useState(false);

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimerRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);
  const autoCaptureLockRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const visiblePhotos = currentDay === "all" ? allPhotos : allPhotos.filter((p) => p.metadata?.day === currentDay);

  /* Restore previous session */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const embedding = JSON.parse(stored);
        setFaceEmbedding(embedding);
        loadPhotos(embedding);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load face-api.js from CDN once */
  const ensureFaceApiScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.faceapi) return resolve();
      const existing = document.querySelector(`script[src="${FACE_API_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("face-api load failed")));
        return;
      }
      const script = document.createElement("script");
      script.src = FACE_API_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("face-api load failed"));
      document.body.appendChild(script);
    });
  }, []);

  const ensureModelsLoaded = useCallback(async () => {
    try {
      await ensureFaceApiScript();
      if (!window.faceapi) return false;
      await window.faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
      setModelsLoaded(true);
      return true;
    } catch (e) {
      console.error("Gagal memuat model AI:", e);
      setModelsLoaded(false);
      return false;
    }
  }, [ensureFaceApiScript]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  /* ══ CAMERA ══ */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setScanState("red");
      setScanLabel("Menyiapkan AI deteksi wajah…");
      setStatusMsg({ type: "info", text: "Kamera aktif. Posisikan wajah Anda di dalam bingkai." });

      const ok = await ensureModelsLoaded();
      if (ok) {
        setScanState("red");
        setScanLabel("Mencari wajah…");
        stableCountRef.current = 0;
        autoCaptureLockRef.current = false;
        startDetectionLoop();
      } else {
        setScanState("red");
        setScanLabel("Deteksi otomatis tidak tersedia");
        setStatusMsg({ type: "error", text: 'Deteksi otomatis gagal dimuat — gunakan tombol "Ambil Manual" di bawah.' });
      }
    } catch (error) {
      console.error("Camera error:", error);
      setStatusMsg({ type: "error", text: getCameraErrorMessage(error) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureModelsLoaded]);

  const stopCamera = useCallback(() => {
    if (detectTimerRef.current) {
      window.clearInterval(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    stableCountRef.current = 0;
    autoCaptureLockRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setScanState("idle");
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const runFaceDetection = useCallback(async () => {
    if (autoCaptureLockRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !window.faceapi) return;

    try {
      const result = await window.faceapi.detectSingleFace(
        video,
        new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      );

      if (!result) {
        stableCountRef.current = 0;
        setScanState("red");
        setScanLabel("Mencari wajah…");
        return;
      }

      const box = result.box;
      const vw = video.videoWidth, vh = video.videoHeight;
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const centered = Math.abs(cx - vw / 2) < vw * 0.28 && Math.abs(cy - vh / 2) < vh * 0.28;
      const bigEnough = box.width > vw * 0.18;

      if (!centered || !bigEnough) {
        stableCountRef.current = Math.max(0, stableCountRef.current - 1);
        setScanState("yellow");
        setScanLabel("Dekatkan & tengahkan wajah Anda");
        return;
      }

      stableCountRef.current++;
      if (stableCountRef.current < STABLE_FRAMES_NEEDED) {
        setScanState("yellow");
        setScanLabel("Tahan, jangan bergerak…");
      } else {
        setScanState("green");
        setScanLabel("Terdeteksi! Mengambil foto…");
        autoCaptureLockRef.current = true;
        if (detectTimerRef.current) window.clearInterval(detectTimerRef.current);
        window.setTimeout(() => captureAndRegister(), 350);
      }
    } catch (e) {
      console.error("Deteksi wajah error:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDetectionLoop = useCallback(() => {
    if (detectTimerRef.current) window.clearInterval(detectTimerRef.current);
    detectTimerRef.current = window.setInterval(runFaceDetection, DETECT_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cameraActive && modelsLoaded && !detectTimerRef.current) {
      startDetectionLoop();
    }
  }, [cameraActive, modelsLoaded, startDetectionLoop]);

  const captureAndRegister = useCallback(async () => {
    if (detectTimerRef.current) {
      window.clearInterval(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    autoCaptureLockRef.current = true;
    setCapturing(true);

    const video = videoRef.current;
    if (!video) {
      setCapturing(false);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      return;
    }
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.85);

    setStatusMsg({ type: "info", text: "Memproses wajah Anda…" });

    try {
      const res = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, event_slug: EVENT_SLUG }),
      });
      const data = await res.json();

      if (data.success) {
        setFaceEmbedding(data.embedding);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.embedding));
        setStatusMsg({ type: "success", text: "Wajah berhasil dikenali. Mencari foto Anda…" });
        stopCamera();
        window.setTimeout(() => loadPhotos(data.embedding), 700);
      } else {
        console.error("Register face gagal:", data.error);
        setStatusMsg({
          type: "error",
          text: "Wajah belum berhasil dikenali. Coba lagi dengan pencahayaan lebih terang, hadapkan wajah lurus ke kamera, dan pastikan tidak terhalang masker atau kacamata gelap.",
        });
        setScanState("red");
        setScanLabel("Gagal, coba lagi…");
        stableCountRef.current = 0;
        autoCaptureLockRef.current = false;
        if (modelsLoaded && streamRef.current) startDetectionLoop();
      }
    } catch (error) {
      console.error("Register face error:", error);
      setStatusMsg({ type: "error", text: "Koneksi ke server bermasalah. Periksa koneksi internet Anda, lalu coba lagi." });
      stableCountRef.current = 0;
      autoCaptureLockRef.current = false;
      if (modelsLoaded && streamRef.current) startDetectionLoop();
    } finally {
      setCapturing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded, stopCamera, startDetectionLoop]);

  /* ══ LOAD PHOTOS ══ */
  const loadPhotos = useCallback(async (embedding: number[]) => {
    setGallerySearched(true);
    setLoadingPhotos(true);
    try {
      const res = await fetch(PHOTOS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding, event_slug: EVENT_SLUG }),
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

  const resetFaceData = useCallback(() => {
    if (!window.confirm("Ulangi pencarian wajah? Data wajah yang tersimpan akan dihapus dari perangkat ini.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setFaceEmbedding(null);
    setAllPhotos([]);
    setCurrentDay("all");
    setGallerySearched(false);
    setStatusMsg(null);
  }, []);

  /* ══ DOWNLOAD ══ */
  const downloadPhoto = useCallback(async (url: string, filename: string) => {
    const secureUrl = toHttps(url);
    setDownloadingKey(filename);
    showToast("Mempersiapkan unduhan…");
    try {
      const response = await fetch(secureUrl, { mode: "cors" });
      if (!response.ok) throw new Error(`Respons server tidak OK (${response.status})`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "foto.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
      showToast("Unduhan dimulai — kualitas HD penuh.");
    } catch (error) {
      console.error("Download error:", error);
      showToast("Tidak bisa mengunduh langsung, membuka foto di tab baru.");
      window.open(secureUrl, "_blank");
    } finally {
      setDownloadingKey(null);
    }
  }, [showToast]);

  /* ══ MODAL NAV ══ */
  const navigatePhoto = useCallback((direction: number) => {
    setModalIndex((idx) => {
      if (idx === null || visiblePhotos.length === 0) return idx;
      return (idx + direction + visiblePhotos.length) % visiblePhotos.length;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const scanColor =
    scanState === "green" ? "#10b981" : scanState === "yellow" ? "#fbbf24" : "#ef4444";

  /* ══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: "'Sora',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .playfair{font-family:'Sora',system-ui,sans-serif;font-weight:800;letter-spacing:-0.02em;}
        .gradient-text{background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .gradient-text-warm{background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .mesh-bg{background-color:#fff;background-image:radial-gradient(at 0% 0%,rgba(59,130,246,.08) 0px,transparent 60%),radial-gradient(at 100% 0%,rgba(251,191,36,.06) 0px,transparent 50%);}
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
        @keyframes scanline{0%{top:6%}50%{top:92%}100%{top:6%}}
        .scan-laser{animation:scanline 1.6s linear infinite;}
        @keyframes tintpulse{0%,100%{opacity:.32}50%{opacity:.6}}
        .tint-pulse{animation:tintpulse 1.2s ease infinite;}
      `}</style>

      <Header />

    {/* ═══ HERO ═══════════════════════════════════════════════ */}
    <section className="relative overflow-hidden pt-16 pb-14 md:pt-20 md:pb-16">
    {/* Background photo collage */}
    <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4">
       {[
        "https://ik.imagekit.io/zaekg3ju7/Bayan-1739_e0mi1r.jpg?updatedAt=1787801440413",
        "https://ik.imagekit.io/zaekg3ju7/AR__2907.JPG?updatedAt=1787807725544",
        "https://ik.imagekit.io/zaekg3ju7/AR__3022.JPG?updatedAt=1789117499043",
        "https://ik.imagekit.io/zaekg3ju7/ALK_2912.JPG?updatedAt=1789117677832",
        ].map((src, i) => (
        <div key={i} className="relative h-full overflow-hidden bg-slate-800">
            <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.background = "linear-gradient(135deg,#1e293b,#0f172a)";
                e.currentTarget.style.display = "none";
            }}
            />
        </div>
        ))}
    </div>
    {/* Black overlay for readability */}
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

      {/* ═══ FACE REGISTRATION ══════════════════════════════════ */}
      {!gallerySearched && (
        <section className="py-6 bg-white">
          <div className="container max-w-2xl mx-auto px-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-8 md:p-10 text-center">
              <h2 className="playfair text-2xl md:text-3xl font-black text-slate-900 mb-2">
                Cari Fotomu dengan Wajah
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                Nyalakan kamera, posisikan wajah di dalam bingkai, lalu ambil foto. Sistem akan mencari
                semua foto pertandingan yang memuat wajah Anda.
              </p>

              {/* Camera frame */}
              <div
                className="relative w-full max-w-md mx-auto mb-6 rounded-3xl overflow-hidden border-[1.5px] bg-slate-900 transition-all duration-300"
                style={{
                  aspectRatio: "4/3",
                  borderColor: cameraActive ? `${scanColor}b3` : "rgba(29,78,216,0.15)",
                  boxShadow: cameraActive ? `0 0 0 3px ${scanColor}30, 0 0 40px 8px ${scanColor}40` : undefined,
                }}
              >
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30">
                    <Camera className="w-9 h-9" />
                    <span className="text-xs font-bold tracking-widest uppercase">Kamera belum aktif</span>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)", display: cameraActive ? "block" : "none" }}
                />

                {cameraActive && (
                  <>
                    {/* Color wash */}
                    <div
                      className={`absolute inset-0 pointer-events-none mix-blend-screen ${scanState !== "green" ? "tint-pulse" : ""}`}
                      style={{
                        background: `radial-gradient(circle at 50% 45%, ${scanColor}d9 0%, ${scanColor}26 65%, transparent 100%)`,
                        opacity: 0.45,
                      }}
                    />
                    {/* Laser scan line */}
                    {scanState !== "green" && (
                      <div
                        className="absolute left-0 right-0 h-0.5 scan-laser pointer-events-none"
                        style={{ background: `linear-gradient(90deg, transparent, ${scanColor}, transparent)`, boxShadow: `0 0 12px 2px ${scanColor}cc` }}
                      />
                    )}
                    {/* Scan corners */}
                    <div className="absolute inset-[14%] pointer-events-none">
                      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                        <span
                          key={pos}
                          className="absolute w-6 h-6"
                          style={{
                            borderColor: scanColor,
                            borderStyle: "solid",
                            borderWidth: pos.includes("t") ? "3px 0 0 3px" : "0 0 3px 3px",
                            ...(pos === "tl" && { top: 0, left: 0, borderRadius: "8px 0 0 0" }),
                            ...(pos === "tr" && { top: 0, right: 0, borderWidth: "3px 3px 0 0", borderRadius: "0 8px 0 0" }),
                            ...(pos === "bl" && { bottom: 0, left: 0, borderRadius: "0 0 0 8px" }),
                            ...(pos === "br" && { bottom: 0, right: 0, borderWidth: "0 3px 3px 0", borderRadius: "0 0 8px 0" }),
                          }}
                        />
                      ))}
                    </div>
                    {/* Traffic light */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-black/40 rounded-full px-1.5 py-2 backdrop-blur">
                      {(["red", "yellow", "green"] as const).map((c) => (
                        <span
                          key={c}
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: scanState === c ? (c === "red" ? "#ef4444" : c === "yellow" ? "#fbbf24" : "#10b981") : "rgba(255,255,255,0.15)",
                            boxShadow: scanState === c ? `0 0 8px 2px ${c === "red" ? "#ef4444" : c === "yellow" ? "#fbbf24" : "#10b981"}b3` : undefined,
                          }}
                        />
                      ))}
                    </div>
                    {/* Status pill */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-2 bg-black/55 backdrop-blur rounded-full px-4 py-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full live-dot"
                        style={{ background: scanColor }}
                      />
                      <span className="text-white text-xs font-bold tracking-wide uppercase whitespace-nowrap">{scanLabel}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2.5 justify-center flex-wrap mb-5">
                {!cameraActive ? (
                  <button onClick={startCamera} className="btn-primary inline-flex items-center gap-2 text-white text-xs font-bold px-6 py-3 rounded-xl">
                    <Camera className="w-3.5 h-3.5" /> Nyalakan Kamera
                  </button>
                ) : (
                  <>
                    <button
                      onClick={captureAndRegister}
                      disabled={capturing}
                      className="btn-primary inline-flex items-center gap-2 text-white text-xs font-bold px-6 py-3 rounded-xl"
                    >
                      Scan Manual
                    </button>
                    <button
                      onClick={stopCamera}
                      className="btn-outline inline-flex items-center gap-2 text-blue-600 text-xs font-bold px-6 py-3 rounded-xl bg-white"
                    >
                      Matikan Kamera
                    </button>
                  </>
                )}
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

            {/* Day tabs */}
            {allPhotos.length > 0 && (
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
                  Wajah Anda belum terdeteksi pada hari yang dipilih. Coba pilih hari lain atau cek kembali nanti
                  setelah panitia mengunggah lebih banyak foto.
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
                      <img
                        src={getPhotoImageUrl(photo)}
                        alt={photo.filename}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget.closest(".fg-card-in") as HTMLElement).style.display = "none";
                        }}
                      />
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
                          downloadPhoto(getPhotoDownloadUrl(photo), photo.filename);
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

          <img
            src={getPhotoImageUrl(visiblePhotos[modalIndex])}
            alt="Foto pertandingan"
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
              downloadPhoto(getPhotoDownloadUrl(p), p.filename);
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

export default EventPublicBayanOpenCraft;