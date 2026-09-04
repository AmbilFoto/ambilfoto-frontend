import { useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BayanOpenGalleryItem, resolveGalleryImageUrl } from '@/services/api/bayan-open.service';

interface GalleryPreviewModalProps {
  photo: BayanOpenGalleryItem | null;
  onClose: () => void;
}

// Strip leading "YYYYMMDD_HHMMSS_hash_" pattern from generated filenames,
// leaving only the meaningful part (e.g. "AR__9484.JPG").
function cleanFilename(filename: string): string {
  return filename.replace(/^\d{8}_\d{6}_[0-9a-fA-F]{5,10}_/, '');
}

function fDateOnly(dateStr: string): string {
  return format(new Date(dateStr), 'd MMM yyyy', { locale: idLocale });
}

function fTimeOnly(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm', { locale: idLocale });
}

export function GalleryPreviewModal({ photo, onClose }: GalleryPreviewModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
    >
      <div
        className="bg-card rounded-xl overflow-hidden max-w-lg w-full shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-muted">
          <img
            src={resolveGalleryImageUrl(photo.preview_url)}
            alt={`Photo uploaded ${photo.uploaded_at}`}
            className="w-full h-auto max-h-[70vh] object-contain"
          />
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-smooth"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-1.5">
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="text-muted-foreground shrink-0">Tanggal :</span>
            <span className="font-medium">{fDateOnly(photo.uploaded_at)}</span>
          </div>
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="text-muted-foreground shrink-0">Waktu Upload :</span>
            <span className="font-medium">{fTimeOnly(photo.uploaded_at)}</span>
          </div>
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="text-muted-foreground shrink-0">Nama File :</span>
            <span className="font-medium truncate max-w-[220px]">{cleanFilename(photo.filename)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}