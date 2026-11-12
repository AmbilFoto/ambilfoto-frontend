import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Camera, ImageIcon, Download,
  Eye, Settings, Share2, Globe, Lock, Edit2, Map as MapIconLucide,
  X, ZoomIn, Clock, Users, Sparkles, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { photographerService } from '@/services/api/photographer.service';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { EventDetail, PublicEventPhoto } from '@/services/api/photographer.service';
import { formatRupiah } from '@/utils/currency';

// ─── Photo Card ───────────────────────────────────────────────────────────────

const PhotoCard = ({
  photo,
  index,
  onClick,
}: {
  photo: PublicEventPhoto;
  index: number;
  onClick: () => void;
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-gray-900 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative overflow-hidden aspect-[3/4]">
        {/* Skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
        )}

        <AuthenticatedImage
          src={photo.preview_url}
          alt={photo.filename}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImgLoaded(true)}
        />

        {/* Gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {photo.has_location && (
            <span className="bg-green-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />GPS
            </span>
          )}
        </div>

        {/* Bottom hover reveal */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex items-center gap-3 text-white/60 text-xs mb-3">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />{photo.matched_users}
            </span>
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3" />{photo.faces_count} wajah
            </span>
          </div>
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={onClick}
              className="flex-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              Lihat Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Photo Modal ──────────────────────────────────────────────────────────────

const PhotoModal = ({
  photo,
  photos,
  event,
  onClose,
  onNavigate,
}: {
  photo: PublicEventPhoto;
  photos: PublicEventPhoto[];
  event: EventDetail;
  onClose: () => void;
  onNavigate: (photo: PublicEventPhoto) => void;
}) => {
  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(photos[currentIndex + 1]);
  }, [hasNext, currentIndex, photos, onNavigate]);

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(photos[currentIndex - 1]);
  }, [hasPrev, currentIndex, photos, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 text-white/50 hover:text-white transition-colors bg-black/40 hover:bg-black/60 rounded-full p-2"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-white/40 text-sm tabular-nums">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Prev button */}
      {hasPrev && (
        <button
          onClick={e => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 z-10 text-white/60 hover:text-white transition-colors bg-black/40 hover:bg-black/70 rounded-full p-3"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={e => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 z-10 text-white/60 hover:text-white transition-colors bg-black/40 hover:bg-black/70 rounded-full p-3"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-w-5xl w-full mx-16 flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Image with ambient shadow */}
        <div className="relative">
          {/* Ambient glow */}
          <div className="absolute inset-0 scale-95 blur-2xl opacity-30 rounded-2xl overflow-hidden">
            <AuthenticatedImage src={photo.preview_url} alt="" className="w-full h-full object-cover" />
          </div>

          <AuthenticatedImage
            src={photo.preview_url}
            alt={photo.filename}
            className="relative z-10 max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
          />
        </div>

        {/* Bottom info bar */}
        <div className="relative z-10 mt-4 flex items-center gap-4 text-sm">
          <span className="text-white/40 font-mono text-xs">{photo.filename}</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1 text-white/40 text-xs">
            <Eye className="h-3 w-3" />{photo.matched_users} matches
          </span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1 text-white/40 text-xs">
            <Camera className="h-3 w-3" />{photo.faces_count} wajah
          </span>
          {photo.has_location && (
            <>
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1 text-green-400/70 text-xs">
                <MapPin className="h-3 w-3" />GPS
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PhotographerEventPublicView() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();

  const [event, setEvent]               = useState<EventDetail | null>(null);
  const [photos, setPhotos]             = useState<PublicEventPhoto[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PublicEventPhoto | null>(null);

  const isPhotog = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user_data') || '{}');
      return user.role === 'photographer';
    } catch { return false; }
  })();

  // ── Load data ──
  useEffect(() => {
    if (!eventSlug) return;
    (async () => {
      try {
        setIsLoading(true);
        const eventRes = await photographerService.getEventBySlug(eventSlug);
        const eventData = eventRes.data.event;
        setEvent(eventData);
        const photosRes = await photographerService.getEventPhotos(eventData.id);
        setPhotos(photosRes.data.photos);
      } catch (err: any) {
        if (err.response?.status === 404) toast.error('Event tidak ditemukan');
        else toast.error('Gagal memuat data event');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [eventSlug]);

  // ── Share ──
  const handleShare = async () => {
    const url = event?.event_slug
      ? `${window.location.origin}/event/${event.event_slug}`
      : window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: event?.event_name, url }); toast.success('Berhasil share!'); }
      catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link disalin!');
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'EEEE, dd MMMM yyyy', { locale: id }); }
    catch { return d; }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <Camera className="absolute inset-0 m-auto h-8 w-8 text-blue-400" />
          </div>
          <p className="text-gray-400 text-sm tracking-widest uppercase">Memuat event...</p>
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-gray-800 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-center px-4">
        <div>
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-900 flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-gray-700" />
          </div>
          <h1 className="text-3xl font-black mb-2">Event Tidak Ditemukan</h1>
          <p className="text-gray-500 mb-8">Event yang Anda cari tidak tersedia</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-2xl transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Hero section ── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Background mosaic dari foto event */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/20 via-gray-950/55 to-gray-950 z-10" />
          {photos.slice(0, 5).map((p, i) => (
            <div
              key={p.id}
              className="absolute h-full opacity-40"
              style={{ width: '20%', left: `${i * 20}%` }}
            >
              <AuthenticatedImage src={p.preview_url} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>

        {/* Navbar overlay */}
        <div className="relative z-20">
          <div className="container max-w-7xl py-5 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Kembali
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Bagikan</span>
              </button>
              {isPhotog && (
                <>
                  <button
                    onClick={() => navigate(`/photographer/events/${event.id}`)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Kelola</span>
                  </button>
                  <button
                    onClick={() => navigate(`/photographer/fotomap/${event.id}`)}
                    className="flex items-center gap-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 text-blue-300 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    <MapIconLucide className="h-4 w-4" />
                    <span className="hidden sm:inline">Peta</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-20 container max-w-7xl pb-16 pt-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-blue-400" />
              <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">
                {event.is_public ? 'Event Publik' : 'Event Privat'}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black mb-4 leading-none tracking-tight">
              {event.event_name}
            </h1>

            {event.description && (
              <p className="text-gray-400 text-base mb-6 max-w-lg">{event.description}</p>
            )}

            {/* Meta pills */}
            <div className="flex flex-wrap gap-3 mb-6">
              {event.location && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300">{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300">{formatDate(event.event_date)}</span>
              </div>
              {event.photographer && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                  <Camera className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300">{event.photographer.name}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <ImageIcon className="h-4 w-4 text-blue-400" />
                <span className="text-white font-semibold">{photos.length}</span>
                <span className="text-gray-400">foto tersedia</span>
              </div>
              {event.geo_enabled_photos > 0 && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-semibold">{event.geo_enabled_photos} foto GPS</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-xl border-b border-white/5">
        <div className="container max-w-7xl py-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              <span className="text-white font-semibold">{photos.length}</span> foto
            </p>
            {isPhotog && event.geo_enabled_photos > 0 && (
              <button
                onClick={() => navigate(`/photographer/fotomap/${event.id}`)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                <MapIconLucide className="h-3.5 w-3.5" />
                Lihat di Peta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Gallery ── */}
      <main className="container max-w-7xl py-8">
        {/* Empty state */}
        {photos.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="h-10 w-10 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">Belum ada foto</h3>
            <p className="text-gray-600 mb-6">Event ini belum memiliki foto yang tersedia</p>
            {isPhotog && (
              <button
                onClick={() => navigate(`/photographer/events/${event.id}`)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-2xl transition-colors"
              >
                <Camera className="h-4 w-4 inline mr-2" />
                Upload Foto
              </button>
            )}
          </div>
        )}

        {/* Masonry grid */}
        {photos.length > 0 && (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
            {photos.map((photo, i) => (
              <div key={photo.id} className="break-inside-avoid mb-3">
                <PhotoCard
                  photo={photo}
                  index={i}
                  onClick={() => setSelectedPhoto(photo)}
                />
              </div>
            ))}
          </div>
        )}

        {/* CTA fotografer */}
        {!isPhotog && photos.length > 0 && (
          <div className="mt-20 rounded-3xl border border-white/5 bg-gradient-to-br from-blue-950/50 to-gray-950 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/20">
              <Camera className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Kamu ada di event ini?</h3>
              <p className="text-gray-400">
                Pindai wajah Anda untuk menemukan foto-foto yang menampilkan Anda secara otomatis.
              </p>
            </div>
            <button
              onClick={() => navigate('/user/scan-face')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-colors whitespace-nowrap"
            >
              <Camera className="h-4 w-4" />
              Pindai Wajah Saya
            </button>
          </div>
        )}
      </main>

      {/* ── Photo Modal ── */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          photos={photos}
          event={event}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={(photo) => setSelectedPhoto(photo)}
        />
      )}
    </div>
  );
}