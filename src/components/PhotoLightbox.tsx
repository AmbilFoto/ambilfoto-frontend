import { useEffect, useCallback } from "react";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Photo, aiService } from "@/services/api/ai.service";

interface PhotoLightboxProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onDownload: (photoId: string) => void;
  isDownloading: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export const PhotoLightbox = ({
  photo,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onDownload,
  isDownloading,
  hasNext = false,
  hasPrevious = false,
}: PhotoLightboxProps) => {
  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowLeft":
        if (hasPrevious && onPrevious) onPrevious();
        break;
      case "ArrowRight":
        if (hasNext && onNext) onNext();
        break;
    }
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !photo) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Black overlay background */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" />
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white hover:bg-white/10 h-12 w-12 rounded-full"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Download button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-10 text-white/80 hover:text-white hover:bg-white/10 h-12 w-12 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          onDownload(photo.photo_id);
        }}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Download className="h-6 w-6" />
        )}
      </Button>

      {/* Navigation - Previous */}
      {hasPrevious && onPrevious && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white hover:bg-white/10 h-14 w-14 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Navigation - Next */}
      {hasNext && onNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white hover:bg-white/10 h-14 w-14 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Image */}
      <div 
        className="relative max-w-[90vw] max-h-[90vh] z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthenticatedImage
          src={aiService.getPreviewUrl(photo.photo_id)}
          alt={photo.filename}
          loading="eager"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        
        {/* Photo info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
          <p className="text-white font-medium text-lg">
            {photo.metadata?.event_name || photo.filename}
          </p>
          {photo.metadata?.date && (
            <p className="text-white/70 text-sm">
              {new Date(photo.metadata.date).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </div>
      </div>

      {/* Photo counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/60 text-sm">
        Press ESC to close • Use arrow keys to navigate
      </div>
    </div>
  );
};
