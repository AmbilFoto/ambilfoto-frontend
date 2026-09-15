import { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Camera, Download, Check, X, ChevronLeft, ChevronRight,
  Search, ImageOff, Loader2,
} from "lucide-react";

const EVENT_SLUG = "bayan-open-craft";
const EVENT_NAME = "Bayan Open 2026";
const EVENT_LOCATION = "Balikpapan, Kalimantan Timur";
const EVENT_DATE_LABEL = "24–29 Agustus 2026";
const EVENT_START_DATE = "2026-08-24";
const EVENT_TOTAL_DAYS = 8;

const API_BASE_URL = "https://gallery.bayanopen.com";
const BIOMETRIC_BASE = `${API_BASE_URL}/api/user/biometric`;
const PHOTOS_BY_USER_ENDPOINT = `${API_BASE_URL}/api/user/my_photos_by_id`;
const IMAGE_ENDPOINT = (filename: string) => `${API_BASE_URL}/api/preview/${filename}`;
const DOWNLOAD_ENDPOINT = (filename: string) => `${API_BASE_URL}/api/download/${filename}`;
const STORAGE_KEY = `ambilfoto_user_id_${EVENT_SLUG}`;
const MIN_ANGLES = 4;
const BIO_CAPTURE_INTERVAL_MS = 600;
const NEAR_MATCH_THRESHOLD = 0.85;
const CHALLENGE_TRANSITION_MS = 450; // must match the setTimeout delay used when switching challenges

type Direction = "CENTER" | "LEFT" | "RIGHT" | "UP" | "DOWN";
type ArrowDir = "up" | "down" | "left" | "right" | null;

const DIRECTION_META: Record<Direction, { arrow: ArrowDir; label: string }> = {
  CENTER: { arrow: null, label: "Lihat lurus ke kamera" },
  LEFT: { arrow: "left", label: "Tolehkan kepala ke KIRI" },
  RIGHT: { arrow: "right", label: "Tolehkan kepala ke KANAN" },
  UP: { arrow: "up", label: "Angkat dagu / lihat ke ATAS" },
  DOWN: { arrow: "down", label: "Tundukkan kepala ke BAWAH" },
};

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

interface FrameResponse {
  success: boolean;
  error?: string;
  matched?: boolean;
  message?: string;
  pose_progress?: number;
  progress?: { current_step: number };
  next_challenge?: Direction;
  done?: boolean;
}

interface CompleteResponse {
  success: boolean;
  error?: string;
  user_id?: string;
  liveness_score?: number;
  liveness_status?: string;
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
      return 'Akses kamera ditolak. Izinkan akses kamera pada browser Anda (ikon gembok di address bar), lalu coba lagi.';
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

/** Detect a "challenge out of order" error coming back from the biometric API,
 *  so we can silently skip that single frame instead of hard-failing the whole session. */
function isSequenceMismatchError(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("tidak sesuai urutan") || m.includes("out of order") || m.includes("sequence");
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

/* ═══════════════════════ BIOMETRIC SCAN MODAL ═══════════════════════
   Fullscreen multi-angle liveness scan: CENTER → LEFT → RIGHT → UP/DOWN.
   Talks to /api/user/biometric/{start,frame,complete,retry}. */
interface BiometricScanModalProps {
  onComplete: (userId: string, data: CompleteResponse) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

function BiometricScanModal({ onComplete, onCancel, onError }: BiometricScanModalProps) {
  const [phase, setPhase] = useState<"starting" | "scanning" | "completing" | "status">("starting");
  const [statusScreen, setStatusScreen] = useState<{ icon: string; title: string; sub?: string; withRetry?: boolean } | null>(null);

  const [challengeSequence, setChallengeSequence] = useState<Direction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<Direction | null>(null);
  const [instruction, setInstruction] = useState("Menyiapkan kamera…");
  const [feedback, setFeedback] = useState("");
  const [feedbackErr, setFeedbackErr] = useState(false);
  const [ovalState, setOvalState] = useState<"idle" | "progress" | "near" | "matched" | "error">("idle");
  const [flash, setFlash] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [showArrow, setShowArrow] = useState<ArrowDir>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentChallengeRef = useRef<Direction | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const frameInFlightRef = useRef(false);
  const closedRef = useRef(false);
  const flashTimeoutRef = useRef<number | null>(null);

  // NEW: locks the capture loop during the window between "server matched this
  // challenge" and "client has actually switched currentChallengeRef to the
  // next one". Without this lock, a capture tick that fires inside that window
  // sends a frame tagged with a stale/incorrect challenge and the server
  // rejects it with "Challenge tidak sesuai urutan".
  const transitioningRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const cleanupCamera = useCallback(() => {
    if (captureTimerRef.current) {
      window.clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const applyChallenge = useCallback((challenge: Direction) => {
    const meta = DIRECTION_META[challenge] || DIRECTION_META.CENTER;
    currentChallengeRef.current = challenge;
    setCurrentChallenge(challenge);
    setInstruction(meta.label);
    setFeedback("");
    setFeedbackErr(false);
    setOvalState("idle");
    setShowCheck(false);
    setShowArrow(meta.arrow);
  }, []);

  const startCaptureLoop = useCallback(() => {
    if (captureTimerRef.current) window.clearInterval(captureTimerRef.current);
    captureTimerRef.current = window.setInterval(() => {
      captureAndSubmitRef.current();
    }, BIO_CAPTURE_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complete = useCallback(async () => {
    setPhase("completing");
    setInstruction("Memverifikasi…");
    setFeedback("");
    try {
      const resp = await fetch(`${BIOMETRIC_BASE}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionIdRef.current }),
      });
      const data: CompleteResponse = await resp.json();
      if (!data.success || !data.user_id) {
        setPhase("status");
        setStatusScreen({ icon: "⚠️", title: "Verifikasi gagal", sub: data.error, withRetry: true });
        return;
      }
      setPhase("status");
      setStatusScreen({
        icon: "✅",
        title: "Wajah terverifikasi!",
        sub: `Liveness score: ${((data.liveness_score || 0) * 100).toFixed(0)}%`,
      });
      cleanupCamera();
      window.setTimeout(() => {
        if (closedRef.current) return;
        closedRef.current = true;
        onComplete(data.user_id as string, data);
      }, 900);
    } catch (err: any) {
      setPhase("status");
      setStatusScreen({ icon: "⚠️", title: "Gagal menyelesaikan verifikasi", sub: err?.message, withRetry: true });
      onError(err?.message || "Gagal menyelesaikan verifikasi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupCamera, onComplete, onError]);

  const captureAndSubmit = useCallback(async () => {
    if (
      frameInFlightRef.current ||
      transitioningRef.current || // NEW: skip capture entirely while switching challenges
      closedRef.current ||
      !sessionIdRef.current ||
      !currentChallengeRef.current
    ) return;
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    frameInFlightRef.current = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.85);

      // Snapshot the challenge we're actually sending, in case it changes
      // mid-flight (defensive — shouldn't happen now thanks to transitioningRef,
      // but keeps the request/response pairing honest either way).
      const sentChallenge = currentChallengeRef.current;

      const resp = await fetch(`${BIOMETRIC_BASE}/frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          challenge: sentChallenge,
          frame: imageData,
        }),
      });
      const data: FrameResponse = await resp.json();

      if (!data.success) {
        // NEW: if this is just a sequence race (stale frame arrived after we'd
        // already moved on), drop it silently instead of tearing down the
        // whole session — it's not a real failure, just a late/duplicate frame.
        if (isSequenceMismatchError(data.error)) {
          console.warn("[BiometricScan] dropped stale/out-of-order frame:", data.error);
          return;
        }
        if (captureTimerRef.current) {
          window.clearInterval(captureTimerRef.current);
          captureTimerRef.current = null;
        }
        setPhase("status");
        setStatusScreen({ icon: "⚠️", title: "Sesi bermasalah", sub: data.error, withRetry: true });
        return;
      }

      if (!data.matched) {
        const isErr = data.pose_progress === undefined;
        const progress = data.pose_progress || 0;
        setFeedback(data.message || "Lanjutkan gerakan…");
        setFeedbackErr(isErr);
        if (isErr) {
          setOvalState("error");
        } else if (progress >= NEAR_MATCH_THRESHOLD) {
          setOvalState("near");
        } else if (progress > 0.05) {
          setOvalState("progress");
        } else {
          setOvalState("idle");
        }
        return;
      }

      setFeedback("Bagus! Tertangkap wajahmu");
      setFeedbackErr(false);
      setOvalState("matched");
      setShowCheck(true);
      setShowArrow(null);
      if (data.progress) setCurrentStep(data.progress.current_step);

      setFlash(true);
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = window.setTimeout(() => setFlash(false), 650);

      if (data.done) {
        // Lock capturing — we're finishing up, no more frames should go out.
        transitioningRef.current = true;
        if (captureTimerRef.current) {
          window.clearInterval(captureTimerRef.current);
          captureTimerRef.current = null;
        }
        await complete();
      } else if (data.next_challenge) {
        // NEW: lock the capture loop for the duration of the transition so no
        // frame is captured/sent while currentChallengeRef still points at the
        // challenge the server has already advanced past.
        transitioningRef.current = true;
        if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = window.setTimeout(() => {
          applyChallenge(data.next_challenge as Direction);
          transitioningRef.current = false;
          transitionTimeoutRef.current = null;
        }, CHALLENGE_TRANSITION_MS);
      }
    } catch (err) {
      console.error("[BiometricScan] frame submit error:", err);
    } finally {
      frameInFlightRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyChallenge, complete]);

  const captureAndSubmitRef = useRef(captureAndSubmit);
  useEffect(() => {
    captureAndSubmitRef.current = captureAndSubmit;
  }, [captureAndSubmit]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setPhase("status");
      setStatusScreen({ icon: "🚫", title: "Kamera tidak bisa diakses", sub: getCameraErrorMessage(err) });
      onError(getCameraErrorMessage(err));
      return;
    }

    try {
      const resp = await fetch(`${BIOMETRIC_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_slug: EVENT_SLUG, min_angles: MIN_ANGLES }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Gagal memulai sesi");

      sessionIdRef.current = data.session_id;
      setChallengeSequence(data.challenge);
      setCurrentStep(0);
      transitioningRef.current = false;
      applyChallenge(data.challenge[0]);
      setPhase("scanning");
      startCaptureLoop();
    } catch (err: any) {
      setPhase("status");
      setStatusScreen({ icon: "⚠️", title: "Gagal memulai verifikasi", sub: err?.message });
      onError(err?.message || "Gagal memulai verifikasi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyChallenge, startCaptureLoop, onError]);

  const retryFromScratch = useCallback(async () => {
    setStatusScreen(null);
    setInstruction("Menyiapkan ulang…");
    try {
      if (sessionIdRef.current) {
        await fetch(`${BIOMETRIC_BASE}/retry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionIdRef.current, scope: "session" }),
        }).catch(() => {});
      }
      const resp = await fetch(`${BIOMETRIC_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_slug: EVENT_SLUG, min_angles: MIN_ANGLES }),
      });
      const data = await resp.json();
      if (!data.success) {
        setPhase("status");
        setStatusScreen({ icon: "⚠️", title: "Gagal memulai ulang", sub: data.error, withRetry: true });
        return;
      }
      sessionIdRef.current = data.session_id;
      setChallengeSequence(data.challenge);
      setCurrentStep(0);
      transitioningRef.current = false;
      applyChallenge(data.challenge[0]);
      setPhase("scanning");
      startCaptureLoop();
    } catch (err: any) {
      setPhase("status");
      setStatusScreen({ icon: "⚠️", title: "Gagal memulai ulang", sub: err?.message, withRetry: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyChallenge, startCaptureLoop]);

  useEffect(() => {
    start();
    document.body.style.overflow = "hidden";
    return () => {
      closedRef.current = true;
      cleanupCamera();
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = useCallback(() => {
    closedRef.current = true;
    cleanupCamera();
    onCancel();
  }, [cleanupCamera, onCancel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleCancel]);

  const ovalBorderColor =
    ovalState === "matched" || ovalState === "near"
      ? "#22c55e"
      : ovalState === "progress"
      ? "#facc15"
      : ovalState === "error"
      ? "#ef4444"
      : "rgba(255,255,255,.5)";

  return (
    <div className="fixed inset-0 z-[99999] bg-[rgba(8,11,20,0.78)] backdrop-blur-md flex items-center justify-center">
      <div
        className="relative bg-[#05070d] overflow-hidden"
        style={{
          width: "min(400px, 92vw)",
          height: "min(820px, 88vh)",
          borderRadius: 44,
          border: "8px solid #14171f",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", background: "#000" }}
        />

        {/* Badge */}
        <div className="absolute top-[18px] left-4 z-10 bg-[rgba(15,23,42,.55)] text-[#cfe0ff] text-[11px] font-semibold tracking-wide px-2.5 py-1.5 rounded-full backdrop-blur">
          Verifikasi Wajah
        </div>

        {/* Close */}
        <button
          onClick={handleCancel}
          aria-label="Tutup"
          className="absolute top-[18px] right-4 z-10 w-[34px] h-[34px] rounded-full bg-[rgba(15,23,42,.55)] text-white text-lg flex items-center justify-center backdrop-blur hover:bg-[rgba(15,23,42,.75)]"
        >
          ×
        </button>

        {/* Progress dots */}
        {phase === "scanning" && challengeSequence.length > 0 && (
          <div className="absolute top-[62px] left-0 right-0 z-10 flex gap-1.5 justify-center">
            {challengeSequence.map((_, i) => (
              <div
                key={i}
                className="w-[9px] h-[9px] rounded-full transition-all"
                style={{
                  background: i < currentStep ? "#22c55e" : i === currentStep ? "#3b82f6" : "rgba(255,255,255,.28)",
                  transform: i === currentStep ? "scale(1.4)" : undefined,
                }}
              />
            ))}
          </div>
        )}

        {/* Guide oval */}
        {phase !== "status" && (
          <div className="absolute inset-0 z-[6] flex flex-col items-center justify-center pointer-events-none pb-[12%]">
            <div
              className="relative"
              style={{
                width: "64%",
                aspectRatio: "3 / 4",
                borderRadius: "50%",
                border: `4px solid ${ovalBorderColor}`,
                boxShadow: flash
                  ? "0 0 0 9999px rgba(34,197,94,.55), 0 0 40px 10px rgba(34,197,94,.8)"
                  : ovalState === "matched" || ovalState === "near"
                  ? "0 0 0 9999px rgba(5,7,13,.45), 0 0 26px 4px rgba(34,197,94,.55)"
                  : "0 0 0 9999px rgba(5,7,13,.45)",
                transition: "border-color .25s ease, box-shadow .25s ease",
                animation: ovalState === "error" ? "bsm-shake .35s ease" : undefined,
              }}
            >
              {showArrow && (
                <div
                  className="absolute w-[42px] h-[42px]"
                  style={{
                    filter: "drop-shadow(0 1px 3px rgba(0,0,0,.5))",
                    animation: "bsm-pulse 1.1s ease-in-out infinite",
                    ...(showArrow === "up" && { top: -56, left: "50%", transform: "translateX(-50%)" }),
                    ...(showArrow === "down" && { bottom: -56, left: "50%", transform: "translateX(-50%) rotate(180deg)" }),
                    ...(showArrow === "left" && { left: -56, top: "50%", transform: "translateY(-50%) rotate(-90deg)" }),
                    ...(showArrow === "right" && { right: -56, top: "50%", transform: "translateY(-50%) rotate(90deg)" }),
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 4 L12 20 M12 4 L6 10 M12 4 L18 10" stroke="#facc15" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${showCheck ? "opacity-100" : "opacity-0"}`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-[60px] h-[60px]">
                  <circle cx="12" cy="12" r="11" fill="#22c55e" />
                  <path d="M7 12.5 L10.5 16 L17 8.5" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Instruction sheet */}
        {phase !== "status" && (
          <div
            className="absolute left-0 right-0 bottom-0 z-10 px-6 pt-9 pb-7 text-center"
            style={{ background: "linear-gradient(to top, rgba(2,4,10,.92) 20%, rgba(2,4,10,0))" }}
          >
            <div className="text-white text-lg font-bold mb-1.5">{instruction}</div>
            <div className={`text-[13px] min-h-[18px] ${feedbackErr ? "text-red-300" : "text-slate-300"}`}>{feedback}</div>
          </div>
        )}

        {/* Status screen (success / error) */}
        {phase === "status" && statusScreen && (
          <div className="absolute inset-0 z-20 bg-[#05070d] flex flex-col items-center justify-center text-center px-8 gap-2.5">
            <div className="text-[46px]">{statusScreen.icon}</div>
            <div className="text-white text-[17px] font-bold">{statusScreen.title}</div>
            {statusScreen.sub && <div className="text-slate-400 text-[13.5px] max-w-[260px]">{statusScreen.sub}</div>}
            {statusScreen.withRetry && (
              <button
                onClick={retryFromScratch}
                className="mt-3.5 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13.5px]"
              >
                🔄 Coba Lagi
              </button>
            )}
          </div>
        )}

        <style>{`
          @keyframes bsm-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
          @keyframes bsm-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        `}</style>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
const EventPublicBayanOpenCraft = () => {
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [currentDay, setCurrentDay] = useState("all");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [gallerySearched, setGallerySearched] = useState(false);

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const visiblePhotos = currentDay === "all" ? allPhotos : allPhotos.filter((p) => p.metadata?.day === currentDay);

  const loadPhotos = useCallback(async (userId: string) => {
    setGallerySearched(true);
    setLoadingPhotos(true);
    try {
      const res = await fetch(PHOTOS_BY_USER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, event_slug: EVENT_SLUG }),
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

  /* Restore previous session */
  useEffect(() => {
    const storedUserId = localStorage.getItem(STORAGE_KEY);
    if (storedUserId) {
      loadPhotos(storedUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const handleScanComplete = useCallback((userId: string, data: CompleteResponse) => {
    localStorage.setItem(STORAGE_KEY, userId);
    setScanModalOpen(false);
    setStatusMsg({
      type: "success",
      text: `Wajah berhasil dikenali (liveness ${((data.liveness_score || 0) * 100).toFixed(0)}%). Mencari foto Anda…`,
    });
    loadPhotos(userId);
  }, [loadPhotos]);

  const handleScanCancel = useCallback(() => {
    setScanModalOpen(false);
  }, []);

  const handleScanError = useCallback((message: string) => {
    setStatusMsg({ type: "error", text: message });
  }, []);

  const resetFaceData = useCallback(() => {
    if (!window.confirm("Ulangi pencarian wajah? Data wajah yang tersimpan akan dihapus dari perangkat ini.")) return;
    localStorage.removeItem(STORAGE_KEY);
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
      `}</style>

      <Header />

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-16 pb-14 md:pt-20 md:pb-16">
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

      {/* ═══ FACE VERIFICATION (biometric liveness scan) ═══════════ */}
      {!gallerySearched && (
        <section className="py-6 bg-white">
          <div className="container max-w-2xl mx-auto px-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-8 md:p-10 text-center">
              <h2 className="playfair text-2xl md:text-3xl font-black text-slate-900 mb-2">
                Cari Fotomu dengan Wajah
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                Ikuti instruksi arah kepala di popup, lalu sistem akan
                mencari semua foto yang memuat wajah Anda.
              </p>

              <div className="flex gap-2.5 justify-center flex-wrap mb-5">
                <button
                  onClick={() => {
                    setStatusMsg(null);
                    setScanModalOpen(true);
                  }}
                  className="btn-primary inline-flex items-center gap-2 text-white text-xs font-bold px-6 py-3 rounded-xl"
                >
                  <Camera className="w-3.5 h-3.5" /> Nyalakan Kamera & Verifikasi
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

      {scanModalOpen && (
        <BiometricScanModal
          onComplete={handleScanComplete}
          onCancel={handleScanCancel}
          onError={handleScanError}
        />
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