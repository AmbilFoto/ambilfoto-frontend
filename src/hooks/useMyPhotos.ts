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
  type: photo.type || (photo.event_id ? "event" : "standalone"),
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

  // ── Matches from biometric enrollment ─────────────────────────
  const fetchAllPhotos = useCallback(async (): Promise<UserPhoto[]> => {
    const response = await userService.getMyPhotos({ limit: 200 });
    if (!response.success) throw new Error(response.error || "Gagal memuat foto");
    return (response.data || []).map(normalisePhoto);
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

  // ── Step 2: Poll for matches saved by biometric enrollment or upload events ─
  const checkForNewPhotos = useCallback(async () => {
    try {
      const currentPhotos = await fetchAllPhotos();

      if (!isMountedRef.current) return;

      const currentCount = currentPhotos.length;

      if (currentCount > prevCountRef.current) {
        const diff = currentCount - prevCountRef.current;
        setNewPhotosCount(diff);
        setShowNewBanner(true);
        setPhotos(currentPhotos);
        prevCountRef.current = currentCount;
        setMatchState("found");
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
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
  }, [fetchAllPhotos]);

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
      // Liveness enrollment already triggers matching; only poll for its result.
      const startPollingAfter = setTimeout(() => {
        if (!isMountedRef.current) return;
        pollingRef.current = setInterval(checkForNewPhotos, 5000);
      }, 5000);

      return () => {
        isMountedRef.current = false;
        clearTimeout(startPollingAfter);
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }

    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [autoRefresh, checkForNewPhotos, loadCached]);

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