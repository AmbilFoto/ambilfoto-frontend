import { useState, useEffect, useRef, useCallback } from "react";
import { userService, UserPhoto } from "@/services/api/user.service";

export type MatchState = "idle" | "searching" | "found" | "empty";

interface UseMyPhotosReturn {
  photos: UserPhoto[];
  loading: boolean;
  reloading: boolean;
  matchState: MatchState;
  newPhotosCount: number;
  showNewBanner: boolean;
  reloadPhotos: () => Promise<void>;
  dismissBanner: () => void;
}

const normalisePhoto = (photo: UserPhoto): UserPhoto => ({
  ...photo,
  event_photo_id: photo.event_photo_id || photo.photo_id,
  photo_id: photo.photo_id || photo.event_photo_id,
  type: photo.type || "event",
});

export function useMyPhotos(autoRefresh = false): UseMyPhotosReturn {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [matchState, setMatchState] = useState<MatchState>("idle");
  const [newPhotosCount, setNewPhotosCount] = useState(0);
  const [showNewBanner, setShowNewBanner] = useState(false);

  const prevCountRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 12; // 12 × 5s = 60 detik

  // ── Gabungkan event + standalone ──────────────────────────────
  const fetchAllPhotos = useCallback(async (): Promise<UserPhoto[]> => {
    const [eventRes, standaloneRes] = await Promise.all([
      userService.getMyPhotos({ limit: 100 }),
      userService.getMyStandalonePhotos({ limit: 100 }),
    ]);

    const eventPhotos: UserPhoto[] =
      eventRes.success && eventRes.data
        ? eventRes.data.map(normalisePhoto)
        : [];

    const standalonePhotos: UserPhoto[] =
      standaloneRes.success && standaloneRes.data
        ? standaloneRes.data.map(normalisePhoto)
        : [];

    return [...eventPhotos, ...standalonePhotos];
  }, []);

  // ── Step 1: Ambil cache dari DB (instant) ─────────────────────
  const loadCached = useCallback(async () => {
    try {
      const merged = await fetchAllPhotos();
      if (!isMountedRef.current) return;

      setPhotos(merged);
      prevCountRef.current = merged.length;

      // FIX #3: Jika tidak ada autoRefresh, langsung set state final
      // Jangan stuck di "searching" kalau tidak ada AI yang jalan
      if (!autoRefresh) {
        setMatchState(merged.length > 0 ? "found" : "empty");
      } else {
        // Kalau autoRefresh, set "searching" dulu — AI akan jalan setelah ini
        setMatchState(merged.length > 0 ? "found" : "searching");
      }
    } catch {
      if (isMountedRef.current) setMatchState("empty");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [fetchAllPhotos, autoRefresh]);

  // ── Step 2: Trigger AI background match (pakai embedding dari sessionStorage) ──
  const triggerBackgroundMatch = useCallback(async () => {
    try {
      // FIX #1: Ambil embedding yang disimpan saat scan wajah
      const embeddingRaw = sessionStorage.getItem("face_embedding");
      const userId = sessionStorage.getItem("user_id") ||
        JSON.parse(localStorage.getItem("user_data") || "{}").id;

      if (!embeddingRaw || !userId) {
        // Tidak ada embedding → tidak bisa trigger AI match
        // Tetap update state supaya tidak stuck di "searching"
        if (isMountedRef.current) {
          setMatchState((prev) => prev === "searching" ? "empty" : prev);
        }
        return;
      }

      const embedding = JSON.parse(embeddingRaw);

      // Panggil endpoint AI Python yang melakukan face matching
      await userService.matchMyPhotos({ embedding, user_id: userId });

      // Setelah AI selesai, langsung reload foto (tidak perlu tunggu polling)
      if (!isMountedRef.current) return;

      const merged = await fetchAllPhotos();
      if (!isMountedRef.current) return;

      const newCount = merged.length - prevCountRef.current;
      if (newCount > 0) {
        setNewPhotosCount(newCount);
        setShowNewBanner(true);
      }

      setPhotos(merged);
      prevCountRef.current = merged.length;
      setMatchState(merged.length > 0 ? "found" : "empty");

      // Stop polling — sudah dapat hasil dari AI langsung
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (err) {
      console.error("Background match error:", err);
      // Tetap update state supaya tidak stuck di "searching"
      if (isMountedRef.current) {
        setMatchState((prev) => prev === "searching" ? "empty" : prev);
      }
    }
  }, [fetchAllPhotos]);

  // ── Step 3: Polling — fallback jika triggerBackgroundMatch gagal ─
  const checkForNewPhotos = useCallback(async () => {
    try {
      // FIX #2: Hitung total event + standalone
      const [eventRes, standaloneRes] = await Promise.all([
        userService.getMyPhotos({ page: 1, limit: 1 }),
        userService.getMyStandalonePhotos({ page: 1, limit: 1 }),
      ]);

      if (!isMountedRef.current) return;

      const eventTotal = eventRes.pagination?.total ?? 0;
      const standaloneTotal = standaloneRes.pagination?.total ?? 0;
      const currentCount = eventTotal + standaloneTotal;

      if (currentCount > prevCountRef.current) {
        const diff = currentCount - prevCountRef.current;
        setNewPhotosCount(diff);
        setShowNewBanner(true);
        // Stop polling — sudah ada foto baru
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }

      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLLS) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        // Setelah 60 detik tidak ada match baru → set final state
        if (isMountedRef.current) {
          setMatchState((prev) => prev === "searching" ? "empty" : prev);
        }
      }
    } catch {
      // Abaikan error polling
    }
  }, []);

  // ── Step 4: User klik banner → reload daftar ─────────────────
  const reloadPhotos = useCallback(async () => {
    if (!isMountedRef.current) return;
    setReloading(true);
    setShowNewBanner(false);
    setNewPhotosCount(0);

    try {
      const merged = await fetchAllPhotos();
      if (!isMountedRef.current) return;
      setPhotos(merged);
      prevCountRef.current = merged.length;
      setMatchState(merged.length > 0 ? "found" : "empty");
    } catch {
      // Biarkan foto lama tetap tampil
    } finally {
      if (isMountedRef.current) setReloading(false);
    }
  }, [fetchAllPhotos]);

  const dismissBanner = useCallback(() => {
    setShowNewBanner(false);
  }, []);

  // ── Mount ─────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    pollCountRef.current = 0;

    // Step 1: Langsung tampilkan cache dari DB
    loadCached();

    if (autoRefresh) {
      // Step 2: Trigger AI matching langsung (pakai embedding dari sessionStorage)
      // Sedikit delay supaya loadCached selesai dulu
      const matchTimeout = setTimeout(() => {
        if (isMountedRef.current) triggerBackgroundMatch();
      }, 500);

      // Step 3: Polling sebagai fallback (jika AI match endpoint tidak tersedia)
      const startPollingAfter = setTimeout(() => {
        if (!isMountedRef.current) return;
        pollingRef.current = setInterval(checkForNewPhotos, 5000);
      }, 5000);

      return () => {
        isMountedRef.current = false;
        clearTimeout(matchTimeout);
        clearTimeout(startPollingAfter);
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }

    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return {
    photos,
    loading,
    reloading,
    matchState,
    newPhotosCount,
    showNewBanner,
    reloadPhotos,
    dismissBanner,
  };
}