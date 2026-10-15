import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Camera, Download, Check, X, ChevronLeft, ChevronRight,
  Search, ImageOff, Loader2,
} from "lucide-react";

const EVENT_SLUG = "bayan-run-2026";
const EVENT_NAME = "Bayan Run 2026";
const EVENT_LOCATION = "Balikpapan, Kalimantan Timur";
const EVENT_DATE_LABEL = "9-11 Oktober 2026";

/* Zona waktu sumber metadata (Balikpapan = WITA, UTC+8). Dipakai untuk
   timestamp tanpa zona dan konversi timestamp ber-zona ke tanggal kalender. */
const EVENT_TZ = "Asia/Makassar";
const EVENT_TZ_OFFSET = "+08:00";

/* Urutan tombol filter: terbaru dulu. */
const EVENT_DAYS = [
  { key: "2026-10-11", label: "11 Okt" },
  { key: "2026-10-10", label: "10 Okt" },
  { key: "2026-10-09", label: "9 Okt" },
] as const;

const API_BASE_URL = "https://engine-af.ambilfoto.id"; // tanpa trailing slash

const BIOMETRIC_API_BASE =
  `${API_BASE_URL}/api/user/biometric`;

const AUDIO_BASE_URL =
  `${API_BASE_URL}/api/audio`;

const SCAN_MODAL_SCRIPT_URL =
  `${API_BASE_URL}/static/js/scan-modal.js`;

const PHOTOS_ENDPOINT =
  `${API_BASE_URL}/api/user/my_photos_by_id`;

const DOWNLOAD_ENDPOINT =
  `${API_BASE_URL}/api/user/download_encrypted`;

const PREVIEW_MATCH_ENDPOINT = (filename: string) =>
  `${API_BASE_URL}/api/user/preview_match_encrypted_by_id/${encodeURIComponent(filename)}`;

const PREVIEW_CACHE_KEY_ENDPOINT = (filename: string) =>
  `${API_BASE_URL}/api/user/preview_cache_key_by_id/${encodeURIComponent(filename)}`;

const STORAGE_KEY =
  `ambilfoto_user_id_${EVENT_SLUG}`;

/* Margin observer: area di luar viewport yang masih dianggap "dekat". */
const THUMB_ROOT_MARGIN = "200px 0px";
const MAX_CONCURRENT_PREVIEWS = 3;

/* Batas blob URL yang disimpan di memori (LRU). ~150 x 200KB = ~30MB.
   Blob yang sedang tampil (refs > 0) tidak pernah di-revoke. */
const MAX_CACHED_PREVIEWS = 150;

/* Persistent face-match metadata cache (IndexedDB). */
const IDB_NAME = "ambilfoto_preview_cache";
const IDB_STORE = "face_match_metadata";
const IDB_VERSION = 1;
const METADATA_SCHEMA_VERSION = 1;
/* Harus sama dengan METADATA_VERSION di backend. Naikkan jika sistem koordinat berubah. */
const METADATA_VERSION = "face-match-v1";

/* Buka halaman dengan ?debugFaces=1 untuk melihat sumber preview & jumlah kotak per foto. */
const DEBUG_FACES =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debugFaces");

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
  day?: string;      // label hari event, mis. "10 Okt" (kosong kalau di luar 9-11 Okt)
  dateKey?: string;  // tanggal kalender "YYYY-MM-DD" hasil normalisasi, kosong kalau tidak valid
}

interface Photo {
  photo_id: string;
  filename: string;
  distance?: number;
  url?: string;
  preview_url?: string;
  metadata?: PhotoMeta;
}

type FaceBox = [number, number, number, number];

/* Record persisten di IndexedDB (tanpa embedding / data biometrik mentah). */
interface FaceMatchMetadata {
  cacheKey: string;
  userId: string;
  photoId: string;
  filename: string;

  width: number;
  height: number;

  matchedFaces: FaceBox[];

  schemaVersion: number;
  metadataVersion: string;
  cachedAt: number;
}

interface PreviewAsset {
  src: string;
  source: "cdn" | "fallback";
  matchedFaces: number[][];
  width: number | null;
  height: number | null;
}

interface PreviewPayload {
  bytes: ArrayBuffer;
  source: "cdn" | "fallback";
  metadata: FaceMatchMetadata | null;
}

/* Metadata ringan untuk mengambil bytes gambar (URL CDN + kunci). Bukan koordinat wajah. */
interface PreviewMeta {
  url: string;
  wrappedDek: string;
  fileNonce: string;
}

/* ═══════════════ TANGGAL: normalisasi, label, sorting ═══════════════ */

const HAS_ZONE_RE = /(Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_RE = /^(\d{4}-\d{2}-\d{2})$/;
const NAIVE_DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ]/;

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: EVENT_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}); // en-CA -> YYYY-MM-DD

/**
 * Tanggal kalender (YYYY-MM-DD) dari metadata.date, atau null kalau tidak valid.
 * - "2026-10-11" / "2026-10-11T08:00:00" (tanpa zona): tanggal diambil apa adanya.
 * - Timestamp dengan Z / offset: dikonversi ke zona event (WITA), bukan UTC.
 */
function getPhotoDateKey(value?: string): string | null {
  if (!value) return null;
  const s = String(value).trim();

  const dateOnly = s.match(DATE_ONLY_RE);
  if (dateOnly) return dateOnly[1];

  const naive = s.match(NAIVE_DATETIME_RE);
  if (naive && !HAS_ZONE_RE.test(s)) return naive[1];

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateKeyFormatter.format(parsed);
}

/** Epoch ms untuk sorting; NaN kalau tidak valid. Tanpa zona dianggap WITA. */
function getPhotoSortTime(value?: string): number {
  if (!value) return NaN;
  const s = String(value).trim();
  if (DATE_ONLY_RE.test(s)) return Date.parse(`${s}T00:00:00${EVENT_TZ_OFFSET}`);
  const iso = s.replace(" ", "T");
  return Date.parse(HAS_ZONE_RE.test(iso) ? iso : `${iso}${EVENT_TZ_OFFSET}`);
}

/** Label hari event ("9 Okt" / "10 Okt" / "11 Okt"), atau "" kalau di luar 9-11 Okt. */
function getDayLabel(dateKey: string | null): string {
  return EVENT_DAYS.find((d) => d.key === dateKey)?.label ?? "";
}

/** Terbaru -> terlama. Tanggal tidak valid di paling akhir. Urutan awal dipertahankan (stabil). */
function sortPhotosByDate(photos: Photo[]): Photo[] {
  return photos
    .map((photo, index) => ({ photo, index, t: getPhotoSortTime(photo.metadata?.date) }))
    .sort((a, b) => {
      const validA = Number.isFinite(a.t);
      const validB = Number.isFinite(b.t);
      if (!validA && !validB) return a.index - b.index;
      if (!validA) return 1;
      if (!validB) return -1;
      return b.t - a.t || a.index - b.index;
    })
    .map((x) => x.photo);
}

/* ═══════════════ FACE-MATCH METADATA CACHE: memori -> IndexedDB -> API ═══════════════
   - Server tetap menjadi sumber kebenaran (deteksi, validasi, otorisasi).
   - Client hanya menyimpan koordinat + dimensi dan menggambar SVG overlay.
   - Tidak menyimpan embedding, private key, atau gambar plaintext. */

const faceMetadataCache = new Map<string, FaceMatchMetadata>();
const faceMetadataReadInflight = new Map<string, Promise<FaceMatchMetadata | null>>();
let idbPromise: Promise<IDBDatabase | null> | null = null;

function buildFaceCacheKey(userId: string, photoId: string): string {
  return `${userId}:${photoId}:${METADATA_VERSION}`;
}

function isValidBox(value: unknown): value is FaceBox {
  if (!Array.isArray(value) || value.length !== 4) return false;
  if (!value.every((n) => typeof n === "number" && Number.isFinite(n))) return false;
  const [x1, y1, x2, y2] = value as number[];
  return x2 > x1 && y2 > y1;
}

function isValidFaceMetadata(
  record: unknown,
  userId: string,
  photoId: string
): record is FaceMatchMetadata {
  if (!record || typeof record !== "object") return false;
  const r = record as Partial<FaceMatchMetadata>;
  return (
    r.schemaVersion === METADATA_SCHEMA_VERSION &&
    r.metadataVersion === METADATA_VERSION &&
    r.userId === userId &&
    r.photoId === photoId &&
    r.cacheKey === buildFaceCacheKey(userId, photoId) &&
    typeof r.width === "number" && Number.isFinite(r.width) && r.width > 0 &&
    typeof r.height === "number" && Number.isFinite(r.height) && r.height > 0 &&
    Array.isArray(r.matchedFaces) &&
    r.matchedFaces.length > 0 &&
    r.matchedFaces.every(isValidBox)
  );
}

function openFaceDb(): Promise<IDBDatabase | null> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          const store = db.createObjectStore(IDB_STORE, { keyPath: "cacheKey" });
          store.createIndex("userId", "userId", { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          idbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbPromise;
}

function idbRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, mode);
      const req = run(tx.objectStore(IDB_STORE));
      let result: T | undefined;
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function idbGetFaceMetadata(cacheKey: string): Promise<unknown> {
  const db = await openFaceDb();
  if (!db) return null;
  return (await idbRequest<unknown>(db, "readonly", (s) => s.get(cacheKey))) ?? null;
}

async function idbPutFaceMetadata(record: FaceMatchMetadata): Promise<void> {
  const db = await openFaceDb();
  if (!db) return;
  await idbRequest(db, "readwrite", (s) => s.put(record));
}

async function idbDeleteFaceMetadata(cacheKey: string): Promise<void> {
  const db = await openFaceDb();
  if (!db) return;
  await idbRequest(db, "readwrite", (s) => s.delete(cacheKey));
}

/** Hapus semua metadata milik satu user (reset data biometrik / logout). */
async function clearFaceMetadataForUser(userId: string | null): Promise<void> {
  for (const [key, record] of faceMetadataCache) {
    if (!userId || record.userId === userId) faceMetadataCache.delete(key);
  }
  faceMetadataReadInflight.clear();

  const db = await openFaceDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      if (!userId) {
        store.clear();
      } else {
        const cursorReq = store.index("userId").openCursor(IDBKeyRange.only(userId));
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Lookup terpusat: cache memori -> IndexedDB. Return null kalau tidak ada / tidak valid
 * (pemanggil lalu mengambil dari API). Pembacaan bersamaan untuk key yang sama di-dedupe.
 */
async function getFaceMatchMetadata(
  userId: string,
  photoId: string
): Promise<FaceMatchMetadata | null> {
  const cacheKey = buildFaceCacheKey(userId, photoId);

  const inMemory = faceMetadataCache.get(cacheKey);
  if (inMemory) return inMemory;

  const pending = faceMetadataReadInflight.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const record = await idbGetFaceMetadata(cacheKey);
      if (!record) return null;
      if (!isValidFaceMetadata(record, userId, photoId)) {
        await idbDeleteFaceMetadata(cacheKey); // record rusak / versi lama -> buang
        return null;
      }
      faceMetadataCache.set(cacheKey, record);
      return record;
    } catch {
      return null;
    }
  })().finally(() => {
    faceMetadataReadInflight.delete(cacheKey);
  });

  faceMetadataReadInflight.set(cacheKey, promise);
  return promise;
}

/** Simpan ke memori + IndexedDB. Error storage tidak pernah menggagalkan galeri. */
async function saveFaceMatchMetadata(record: FaceMatchMetadata): Promise<void> {
  faceMetadataCache.set(record.cacheKey, record);
  try {
    await idbPutFaceMetadata(record);
  } catch (error) {
    console.warn("Gagal menyimpan metadata wajah ke IndexedDB:", error);
  }
}

interface RawFaceMetadata {
  matched_faces?: unknown;
  preview_width?: unknown;
  preview_height?: unknown;
  metadata_version?: unknown;
}

/** Validasi respons API -> record siap simpan. null kalau data tidak lengkap / tidak valid. */
function buildFaceMetadataFromApi(
  userId: string,
  photo: Photo,
  raw: RawFaceMetadata
): { record: FaceMatchMetadata; persist: boolean } | null {
  const width = Number(raw.preview_width);
  const height = Number(raw.preview_height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;
  if (!Array.isArray(raw.matched_faces) || raw.matched_faces.length === 0) return null;

  const faces: FaceBox[] = [];
  for (const box of raw.matched_faces) {
    if (!Array.isArray(box) || box.length !== 4) return null;
    const nums = box.map(Number);
    if (!isValidBox(nums)) return null;
    faces.push(nums as FaceBox);
  }

  return {
    record: {
      cacheKey: buildFaceCacheKey(userId, photo.photo_id),
      userId,
      photoId: photo.photo_id,
      filename: photo.filename,
      width,
      height,
      matchedFaces: faces,
      schemaVersion: METADATA_SCHEMA_VERSION,
      metadataVersion: METADATA_VERSION,
      cachedAt: Date.now(),
    },
    // Versi server berbeda dengan client -> tetap dipakai untuk render, tapi tidak dipersist.
    persist: raw.metadata_version === undefined || raw.metadata_version === METADATA_VERSION,
  };
}

let deviceKeyPairPromise: Promise<CryptoKeyPair> | null = null;
let activePreviewRequests = 0;
const previewWaiters: Array<() => void> = [];
/* Cache memori URL CDN + kunci terbungkus (sesi halaman saja; key pair device ikut hilang saat refresh). */
const previewMetaCache = new Map<string, PreviewMeta>();

async function acquirePreviewSlot(): Promise<() => void> {
  if (activePreviewRequests < MAX_CONCURRENT_PREVIEWS) {
    activePreviewRequests += 1;
  } else {
    await new Promise<void>((resolve) => previewWaiters.push(resolve));
    activePreviewRequests += 1;
  }

  return () => {
    activePreviewRequests = Math.max(0, activePreviewRequests - 1);
    previewWaiters.shift()?.();
  };
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function getDeviceKeyPair(): Promise<CryptoKeyPair> {
  if (!deviceKeyPairPromise) {
    deviceKeyPairPromise = crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    ) as Promise<CryptoKeyPair>;
  }

  return deviceKeyPairPromise;
}

async function decryptEncryptedResponse(
  response: Response,
  keyPair: CryptoKeyPair
): Promise<ArrayBuffer> {
  return decryptPreviewCiphertext(
    await response.arrayBuffer(),
    response.headers.get("X-Wrapped-DEK") || "",
    response.headers.get("X-Encrypted-File-Nonce") || "",
    keyPair
  );
}

async function decryptPreviewCiphertext(
  ciphertext: ArrayBuffer,
  wrappedDekValue: string,
  fileNonceValue: string,
  keyPair: CryptoKeyPair
): Promise<ArrayBuffer> {
  const wrappedDek = base64ToArrayBuffer(wrappedDekValue);
  const fileNonce = base64ToArrayBuffer(fileNonceValue);

  if (!wrappedDek.byteLength || fileNonce.byteLength !== 12) {
    throw new Error("Metadata enkripsi tidak lengkap");
  }

  const dek = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    keyPair.privateKey,
    wrappedDek
  );
  const aesKey = await crypto.subtle.importKey(
    "raw",
    dek,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fileNonce },
    aesKey,
    ciphertext
  );
}

async function fetchPreviewViaMeta(
  meta: PreviewMeta,
  keyPair: CryptoKeyPair
): Promise<ArrayBuffer> {
  const imageResponse = await fetch(meta.url, { cache: "force-cache" });
  if (!imageResponse.ok) {
    throw new Error(`CDN preview gagal (${imageResponse.status})`);
  }
  return decryptPreviewCiphertext(
    await imageResponse.arrayBuffer(),
    meta.wrappedDek,
    meta.fileNonce,
    keyPair
  );
}

/** Metadata overlay dari header endpoint fallback (X-Matched-Faces, X-Preview-Width/Height, ...). */
function readFallbackMetadata(response: Response): RawFaceMetadata {
  let matchedFaces: unknown = [];
  try {
    matchedFaces = JSON.parse(response.headers.get("X-Matched-Faces") || "[]");
  } catch {
    matchedFaces = [];
  }
  return {
    matched_faces: matchedFaces,
    preview_width: response.headers.get("X-Preview-Width"),
    preview_height: response.headers.get("X-Preview-Height"),
    metadata_version: response.headers.get("X-Metadata-Version") ?? undefined,
  };
}

async function fetchPreviewBytes(
  photo: Photo,
  userId: string,
  keyPair: CryptoKeyPair
): Promise<PreviewPayload> {
  const { filename } = photo;
  const cacheKey = `${userId}:${filename}`;

  // 1) Memori -> IndexedDB. Kalau valid, koordinat tidak diminta lagi dari API.
  const stored = await getFaceMatchMetadata(userId, photo.photo_id);

  // Cache URL CDN sesi ini (tanpa POST ulang) — hanya dipakai kalau metadata sudah ada.
  const cached = previewMetaCache.get(cacheKey);
  if (cached && stored) {
    try {
      const bytes = await fetchPreviewViaMeta(cached, keyPair);
      return { bytes, source: "cdn", metadata: stored };
    } catch (error) {
      // URL CDN mungkin kedaluwarsa -> buang cache, ulangi dari awal
      previewMetaCache.delete(cacheKey);
      console.warn("Preview meta cache tidak valid, meminta ulang:", error);
    }
  } else if (cached) {
    previewMetaCache.delete(cacheKey); // metadata belum ada -> satu request ke API
  }

  // 2) API: endpoint CDN terenkripsi
  try {
    const keyResponse = await fetch(PREVIEW_CACHE_KEY_ENDPOINT(filename), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        public_key: await crypto.subtle.exportKey("jwk", keyPair.publicKey),
      }),
    });

    if (keyResponse.ok) {
      const keyData = await keyResponse.json();
      const meta: PreviewMeta = {
        url: keyData.url,
        wrappedDek: keyData.wrapped_dek,
        fileNonce: keyData.file_nonce,
      };
      const bytes = await fetchPreviewViaMeta(meta, keyPair);
      previewMetaCache.set(cacheKey, meta);

      let metadata = stored;
      if (!metadata) {
        const built = buildFaceMetadataFromApi(userId, photo, keyData);
        if (built) {
          metadata = built.record;
          if (built.persist) await saveFaceMatchMetadata(built.record);
        }
      }
      return { bytes, source: "cdn", metadata };
    }
  } catch (error) {
    console.warn("Encrypted CDN preview tidak tersedia, memakai fallback:", error);
  }

  // 3) Fallback: preview terenkripsi dari server (metadata lewat header respons)
  const response = await fetch(PREVIEW_MATCH_ENDPOINT(filename), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      public_key: await crypto.subtle.exportKey("jwk", keyPair.publicKey),
    }),
  });
  if (!response.ok) {
    throw new Error("Personal preview gagal");
  }

  let metadata = stored;
  if (!metadata) {
    const built = buildFaceMetadataFromApi(userId, photo, readFallbackMetadata(response));
    if (built) {
      metadata = built.record;
      if (built.persist) await saveFaceMatchMetadata(built.record);
    }
  }
  return {
    bytes: await decryptEncryptedResponse(response, keyPair),
    source: "fallback",
    metadata,
  };
}

/* ═══════════════ CACHE BLOB URL GLOBAL (LRU) ═══════════════
   - Thumb & modal berbagi cache yang sama -> modal terbuka instan.
   - Blob TIDAK di-revoke saat keluar viewport / unmount, hanya saat
     jumlah cache melebihi MAX_CACHED_PREVIEWS dan blob tidak sedang dipakai.
   - Urutan insert di Map = urutan LRU (paling lama di depan). */

interface CachedPreview {
  asset: PreviewAsset;
  refs: number; // jumlah komponen yang sedang memakai
}

interface InflightPreview {
  promise: Promise<PreviewAsset>;
  waiters: number; // komponen yang masih menunggu hasil
}

/* Sentinel: request dibatalkan di antrean karena tidak ada lagi yang menunggu */
const PREVIEW_SKIPPED = new Error("preview skipped");

const previewAssetCache = new Map<string, CachedPreview>();
const previewInflight = new Map<string, InflightPreview>();

function touchPreview(key: string, entry: CachedPreview) {
  previewAssetCache.delete(key);
  previewAssetCache.set(key, entry); // pindah ke ujung (paling baru)
}

function evictPreviews() {
  if (previewAssetCache.size <= MAX_CACHED_PREVIEWS) return;
  for (const [key, entry] of previewAssetCache) {
    if (previewAssetCache.size <= MAX_CACHED_PREVIEWS) break;
    if (entry.refs > 0) continue; // jangan revoke yang sedang tampil
    URL.revokeObjectURL(entry.asset.src);
    previewAssetCache.delete(key);
  }
}

function clearPreviewAssets() {
  for (const entry of previewAssetCache.values()) URL.revokeObjectURL(entry.asset.src);
  previewAssetCache.clear();
  previewInflight.clear();
}

/* Dedupe: thumb & modal yang minta foto sama berbagi satu fetch.
   Kalau semua peminta sudah pergi sebelum dapat slot antrean, fetch dilewati. */
function requestPreviewAsset(photo: Photo, userId: string): InflightPreview {
  const key = `${userId}:${photo.filename}`;

  const existing = previewInflight.get(key);
  if (existing) {
    existing.waiters += 1;
    return existing;
  }

  const inflight: InflightPreview = {
    waiters: 1,
    promise: null as unknown as Promise<PreviewAsset>,
  };

  inflight.promise = (async () => {
    const release = await acquirePreviewSlot();
    try {
      if (inflight.waiters <= 0) throw PREVIEW_SKIPPED;

      const keyPair = await getDeviceKeyPair();
      const payload = await fetchPreviewBytes(photo, userId, keyPair);
      const src = URL.createObjectURL(new Blob([payload.bytes], { type: "image/jpeg" }));
      return {
        src,
        source: payload.source,
        matchedFaces: payload.metadata?.matchedFaces ?? [],
        width: payload.metadata?.width ?? null,
        height: payload.metadata?.height ?? null,
      } as PreviewAsset;
    } finally {
      release();
    }
  })().finally(() => {
    if (previewInflight.get(key) === inflight) previewInflight.delete(key);
  });

  previewInflight.set(key, inflight);
  return inflight;
}

/**
 * Saat `enabled` true  -> ambil dari cache (instan) atau fetch + decrypt + simpan ke cache.
 * Saat `enabled` false / unmount -> hanya melepas referensi; blob tetap di cache
 * sampai kena eviction LRU atau resetFaceData.
 */
function usePersonalPreview(
  photo: Photo,
  userId: string | null,
  enabled = true
) {
  const [preview, setPreview] = useState<PreviewAsset | null>(null);
  const { filename, photo_id: photoId } = photo;

  useEffect(() => {
    // Tidak aktif / keluar viewport: kosongkan state (bebaskan decode gambar di DOM),
    // tapi blob tetap di cache -> kembali ke viewport langsung muncul.
    if (!userId || !enabled) {
      setPreview(null);
      return;
    }

    const key = `${userId}:${filename}`;
    let cancelled = false;
    let held: CachedPreview | null = null;
    let inflight: InflightPreview | null = null;
    let settled = false;

    const hold = (entry: CachedPreview) => {
      entry.refs += 1;
      held = entry;
      touchPreview(key, entry);
      setPreview(entry.asset);
    };

    const cached = previewAssetCache.get(key);
    if (cached) {
      hold(cached); // instan, tanpa loading
    } else {
      setPreview(null);
      inflight = requestPreviewAsset({ ...photo, filename, photo_id: photoId }, userId);
      inflight.promise
        .then((asset) => {
          settled = true;
          let entry = previewAssetCache.get(key);
          if (!entry) {
            entry = { asset, refs: 0 };
            previewAssetCache.set(key, entry);
          }
          if (!cancelled) hold(entry);
          evictPreviews();
        })
        .catch((error) => {
          settled = true;
          if (error === PREVIEW_SKIPPED || cancelled) return;
          console.error("Preview gagal:", error);
          setPreview(null);
        });
    }

    return () => {
      cancelled = true;
      if (held) held.refs = Math.max(0, held.refs - 1);
      if (inflight && !settled) inflight.waiters = Math.max(0, inflight.waiters - 1);
      evictPreviews();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, filename, photoId, userId]);

  return preview;
}

function FaceBoxesOverlay({
  preview,
  preserveAspectRatio,
  strokePx = 1.5,
}: {
  preview: PreviewAsset;
  preserveAspectRatio: "xMidYMid slice" | "xMidYMid meet";
  strokePx?: number;
}) {
  if (!preview.width || !preview.height || preview.matchedFaces.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${preview.width} ${preview.height}`}
      preserveAspectRatio={preserveAspectRatio}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {preview.matchedFaces.map((box, index) => {
        const [x1, y1, x2, y2] = box;
        return (
          <rect
            key={`${index}-${x1}-${y1}`}
            x={x1}
            y={y1}
            width={Math.max(0, x2 - x1)}
            height={Math.max(0, y2 - y1)}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokePx}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
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
  // Modal: pakai cache bersama dengan thumb (instan kalau thumb sudah ter-load)
  const preview = usePersonalPreview(photo, userId);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imageLoaded = preview !== null && loadedSrc === preview.src;

  return preview ? (
    <div className={`relative inline-block max-w-full max-h-full ${className}`}>
      <img
        src={preview.src}
        alt="Foto hasil pencarian"
        className={`block max-w-full max-h-full object-contain transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoadedSrc(preview.src)}
      />
      <FaceBoxesOverlay preview={preview} preserveAspectRatio="xMidYMid meet" strokePx={2.5} />
    </div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const preview = usePersonalPreview(photo, userId, inView);
  const imageLoaded = preview !== null && loadedSrc === preview.src;

  // Lazy load saat masuk viewport. Keluar viewport hanya melepas referensi,
  // blob tetap di cache global (lihat usePersonalPreview).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: THUMB_ROOT_MARGIN }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-900">
      {preview && (
        <img
          src={preview.src}
          alt="Foto hasil pencarian"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoadedSrc(preview.src)}
        />
      )}
      {preview && <FaceBoxesOverlay preview={preview} preserveAspectRatio="xMidYMid slice" strokePx={1.5} />}
      {DEBUG_FACES && preview && (
        <div
          className={`absolute bottom-8 left-2 z-10 rounded px-1.5 py-0.5 text-[9px] font-mono text-white ${
            preview.matchedFaces.length > 0 && preview.width && preview.height ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {preview.source} · {preview.matchedFaces.length} box · {preview.width ?? "?"}x{preview.height ?? "?"}
        </div>
      )}
      {!imageLoaded && <div className="absolute inset-0 bg-slate-900 animate-pulse" />}
    </div>
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
  const [currentDay, setCurrentDay] = useState<string>("all"); // "all" | "YYYY-MM-DD"
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [gallerySearched, setGallerySearched] = useState(false);

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const scanSessionRef = useRef<{ close: () => void } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  /* allPhotos sudah terurut (terbaru -> terlama) saat disimpan; filter tidak mengubah sumber. */
  const visiblePhotos = useMemo(
    () =>
      currentDay === "all"
        ? allPhotos
        : allPhotos.filter((p) => p.metadata?.dateKey === currentDay),
    [allPhotos, currentDay]
  );

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPhotos.length };
    for (const day of EVENT_DAYS) counts[day.key] = 0;
    for (const photo of allPhotos) {
      const key = photo.metadata?.dateKey;
      if (key && key in counts) counts[key] += 1;
    }
    return counts;
  }, [allPhotos]);

  const selectDay = useCallback((key: string) => {
    setCurrentDay(key);
    setModalIndex(null);
  }, []);

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
        const photos: Photo[] = (data.photos as Photo[]).map((p) => {
          const dateKey = getPhotoDateKey(p.metadata?.date);
          return {
            ...p,
            metadata: {
              ...(p.metadata || {}),
              dateKey: dateKey ?? undefined,
              day: getDayLabel(dateKey),
            },
          };
        });
        setAllPhotos(sortPhotosByDate(photos));
        setCurrentDay("all");
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
        text: "Modul verifikasi wajah gagal dimuat. Periksa koneksi internet lalu coba lagi.",
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
    const currentUserId = userId;
    localStorage.removeItem(STORAGE_KEY);
    previewMetaCache.clear();
    clearPreviewAssets();
    // Hapus metadata wajah persisten (memori + IndexedDB) milik user ini.
    void clearFaceMetadataForUser(currentUserId);
    setUserId(null);
    setAllPhotos([]);
    setCurrentDay("all");
    setModalIndex(null);
    setGallerySearched(false);
    setStatusMsg(null);
  }, [userId]);

  /* Bersihkan semua blob saat halaman ditinggalkan (unmount) */
  useEffect(() => {
    return () => {
      clearPreviewAssets();
    };
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
        const keyPair = await getDeviceKeyPair();
        const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const response = await fetch(DOWNLOAD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            photo_id: photo.photo_id,
            public_key: publicKey,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Download gagal (${response.status})`);
        }

        const plaintext = await decryptEncryptedResponse(response, keyPair);
        const blob = new Blob([plaintext], { type: "image/jpeg" });
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

  /* Cleanup timer toast saat unmount */
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);


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
            src="https://res.cloudinary.com/oebvbdwf/image/upload/f_auto,q_auto/ALK_0777"
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
                Klik tombol di bawah, lalu ikuti instruksi arah kepala di layar. Sistem akan mencari semua
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

            {allPhotos.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
                  Filter Tanggal Foto
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[{ key: "all", label: "Semua Hari" }, ...EVENT_DAYS].map((d) => (
                    <button
                      key={d.key}
                      onClick={() => selectDay(d.key)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                        currentDay === d.key
                          ? "btn-primary text-white"
                          : "bg-white border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                      }`}
                    >
                      {d.label} ({dayCounts[d.key] ?? 0})
                    </button>
                  ))}
                </div>
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
                {allPhotos.length > 0 ? (
                  <>
                    <p className="font-bold text-slate-800">Tidak Ada Foto di Hari Ini</p>
                    <p className="text-sm text-slate-400 max-w-sm">
                      Coba pilih tanggal lain atau kembali ke Semua Hari.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-800">Belum Ada Foto Ditemukan</p>
                    <p className="text-sm text-slate-400 max-w-sm">
                      Wajah Anda belum terdeteksi. Coba cek kembali nanti setelah panitia mengunggah lebih
                      banyak foto.
                    </p>
                  </>
                )}
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
              downloadPhoto(visiblePhotos[modalIndex]);
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