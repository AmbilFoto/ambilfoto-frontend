import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, ChevronLeft, ChevronRight, Calendar, MapPin, Camera, Sparkles, Eye, ShoppingCart, Coins, FileImage, Tag, Clock, CheckCircle, Heart } from "lucide-react";
import { UserPhoto } from "@/services/api/user.service";
import { aiService } from "@/services/api/ai.service";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PhotoDetailModalProps {
  photo: UserPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (photoId: string) => void;
  onBuy?: (photoId: string) => void;
  onToggleFavorite?: () => void;  // ← NEW: Added favorite toggle
  onView: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isDownloading: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export const PhotoDetailModal = ({
  photo,
  isOpen,
  onClose,
  onDownload,
  onBuy,
  onToggleFavorite,  // ← NEW
  onView,
  onNext,
  onPrevious,
  isDownloading,
  hasNext = false,
  hasPrevious = false,
}: PhotoDetailModalProps) => {
  if (!photo) return null;

  const matchPercentage = photo.similarity ? Math.round(photo.similarity * 100) : 0;
  
  const photoId = photo.event_photo_id || photo.photo_id;
  const eventName = photo.event_name || 'Untitled Photo';
  const eventDate = photo.event_date;
  const location = photo.event_location;
  const photographer = photo.photographer_name;

  // Get price
  const isPurchased = photo.is_purchased;
  const isForSale = photo.is_for_sale !== false;
  const priceCash = photo.price_cash || photo.price || photo.purchase_price || 0;
  const pricePoints = photo.price_points || photo.price_in_points || Math.ceil(priceCash / 5000);

  // Get additional metadata
  const eventId = photo.event_id;
  const eventType = photo.event_type;
  const eventDescription = photo.event_description;
  const matchDate = photo.match_date;
  const uploadTimestamp = photo.upload_timestamp;

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (percentage >= 70) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-card/95 backdrop-blur-xl border-border/50 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header with gradient */}
        <div className="relative">
          {/* Close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Image Preview */}
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            <AuthenticatedImage
              src={photo.preview_url || aiService.getPreviewUrl(photo.photo_id)}
              alt={photo.filename}
              className="w-full h-full object-cover"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            
            {/* Navigation Arrows */}
            {hasPrevious && onPrevious && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            
            {hasNext && onNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}

            {/* Badges Row */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              {/* Match Badge */}
              {matchPercentage > 0 && (
                <Badge 
                  variant="outline" 
                  className={`${getMatchColor(matchPercentage)} border backdrop-blur-sm px-3 py-1.5 text-sm font-semibold`}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {matchPercentage}% Match
                </Badge>
              )}

              {/* Favorite Button - NEW */}
              {onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                  className={cn(
                    "h-9 px-3 rounded-full backdrop-blur-sm transition-all",
                    photo.is_favorited 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "bg-black/40 hover:bg-black/60 text-white"
                  )}
                >
                  <Heart 
                    className={cn(
                      "h-4 w-4 mr-1.5",
                      photo.is_favorited && "fill-current"
                    )} 
                  />
                  {photo.is_favorited ? 'Favorit' : 'Suka'}
                </Button>
              )}
            </div>

            {/* Purchase Badge */}
            {isPurchased && (
              <div className="absolute top-14 left-3">
                <Badge className="bg-green-500/90 text-white border-green-400/50 backdrop-blur-sm">
                  ✓ Sudah Dibeli
                </Badge>
              </div>
            )}

            {/* Event name overlay */}
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white font-bold text-xl drop-shadow-lg">
                {eventName}
              </h3>
              {location && (
                <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Info Cards - Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            {eventDate && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Event</p>
                  <p className="text-sm font-medium">
                    {format(new Date(eventDate), "d MMM yyyy", { locale: idLocale })}
                  </p>
                </div>
              </div>
            )}

            {photographer && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fotografer</p>
                  <p className="text-sm font-medium truncate">
                    {photographer}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Match Stats */}
          {matchPercentage > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Tingkat Kecocokan Wajah</span>
                <span className="text-2xl font-bold text-primary">{matchPercentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  style={{ width: `${matchPercentage}%` }}
                />
              </div>
              {matchDate && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Ditemukan pada: {format(new Date(matchDate), "d MMM yyyy, HH:mm", { locale: idLocale })}
                </p>
              )}
            </div>
          )}

          {/* Additional Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <FileImage className="h-4 w-4 text-muted-foreground" />
              <span className="truncate font-mono">{photo.filename}</span>
            </div>
            {eventId && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">Event ID: {eventId.substring(0, 8)}...</span>
              </div>
            )}
          </div>

          {/* Event Type Badge */}
          {eventType && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {eventType.replace('_', ' ')}
              </Badge>
            </div>
          )}

          {/* Event Description if available */}
          {eventDescription && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Deskripsi Event</p>
              <p className="text-sm">{eventDescription}</p>
            </div>
          )}

          {/* Upload Timestamp */}
          {uploadTimestamp && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Di-upload: {format(new Date(uploadTimestamp), "d MMM yyyy, HH:mm", { locale: idLocale })}</span>
            </div>
          )}

          {/* Price Info for unpurchased photos that are for sale */}
          {!isPurchased && isForSale && priceCash > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Harga Foto</p>
                    <p className="text-xs text-muted-foreground">Pilih metode pembayaran saat beli</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-background/60 border border-border/50 hover:border-primary/50 transition-colors">
                  <p className="text-xs text-muted-foreground mb-1">💵 Bayar Cash</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(priceCash)}
                  </p>
                  <p className="text-xs text-muted-foreground">Via Midtrans</p>
                </div>
                <div className="p-3 rounded-lg bg-background/60 border border-border/50 hover:border-yellow-500/50 transition-colors">
                  <p className="text-xs text-muted-foreground mb-1">🪙 Bayar FOTOPOIN</p>
                  <p className="text-lg font-bold text-yellow-600 flex items-center gap-1">
                    <Coins className="h-4 w-4" />
                    {pricePoints} Points
                  </p>
                  <p className="text-xs text-muted-foreground">Instant download</p>
                </div>
              </div>
            </div>
          )}

          {/* Free photo (not for sale or price is 0) */}
          {!isPurchased && (!isForSale || priceCash === 0) && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Download className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-blue-600">Foto Gratis!</p>
                  <p className="text-xs text-muted-foreground">
                    Anda bisa langsung download foto ini
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Already purchased info */}
          {isPurchased && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-green-600">Foto Sudah Dibeli!</p>
                  <p className="text-xs text-muted-foreground">
                    Anda bisa download foto ini kapan saja dalam resolusi HD
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline"
              onClick={onView}
              className="flex-1 h-12 rounded-xl font-semibold"
            >
              <Eye className="mr-2 h-4 w-4" />
              Lihat Fullscreen
            </Button>
            {!isPurchased && isForSale && priceCash > 0 ? (
              <Button 
                onClick={() => onBuy?.(photoId)}
                disabled={isDownloading}
                className="flex-1 h-12 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isDownloading ? (
                  "Processing..."
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Beli Sekarang
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={() => onDownload(photoId)}
                disabled={isDownloading}
                className="flex-1 h-12 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
              >
                {isDownloading ? (
                  "Downloading..."
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download HD
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};