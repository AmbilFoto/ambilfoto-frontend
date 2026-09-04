import { BayanOpenGalleryItem, resolveGalleryImageUrl } from '@/services/api/bayan-open.service';
import { fDateTime } from '../lib/format';

interface GalleryCardProps {
  photo: BayanOpenGalleryItem;
  onClick: () => void;
}

// Strip leading "YYYYMMDD_HHMMSS_hash_" pattern from generated filenames,
// leaving only the meaningful part (e.g. "AR__9484.JPG").
function cleanFilename(filename: string): string {
  return filename.replace(/^\d{8}_\d{6}_[0-9a-fA-F]{5,10}_/, '');
}

export function GalleryCard({ photo, onClick }: GalleryCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-lg border border-border bg-card overflow-hidden hover:shadow-soft transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        <img
          src={resolveGalleryImageUrl(photo.preview_url)}
          alt={`Photo uploaded ${fDateTime(photo.uploaded_at)}`}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
        />
      </div>
      <div className="px-2.5 py-2">
        <p className="text-xs font-medium truncate">{cleanFilename(photo.filename)}</p>
      </div>
    </button>
  );
}