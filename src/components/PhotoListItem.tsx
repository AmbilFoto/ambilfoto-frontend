import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Calendar,
  MapPin,
  Loader2,
  AlertCircle,
  Eye,
  Sparkles,
  ShoppingCart,
  Coins,
  Heart,
} from "lucide-react";
import { UserPhoto } from "@/services/api/user.service";
import { cn } from "@/lib/utils";

interface PhotoListItemProps {
  photo: UserPhoto;
  onDownload: (photoId: string) => void;
  onBuy?: () => void;
  onToggleFavorite?: () => void;
  isDownloading: boolean;
  onClick: () => void;
}

export const PhotoListItem = ({
  photo,
  onDownload,
  onBuy,
  onToggleFavorite,
  isDownloading,
  onClick,
}: PhotoListItemProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const matchScore = photo.similarity ? Math.round(photo.similarity * 100) : 0;
  const isStandalone = photo.type === "standalone";

  // ✅ FIX: standalone uses photo_id, event photo uses event_photo_id
  const downloadId = isStandalone
    ? photo.photo_id
    : photo.event_photo_id || photo.photo_id;

  const previewUrl = photo.preview_url;

  // Display info differs per type
  const primaryLabel = isStandalone
    ? photo.place_name || photo.photographer_name || "Foto Standalone"
    : photo.event_name || "Unknown Event";

  const secondaryDate = isStandalone ? null : photo.event_date;
  const locationLabel = isStandalone
    ? photo.photographer_name
    : photo.event_location;

  const isPurchased = photo.is_purchased === true || photo.is_purchased === 1;
  const isFree =
    photo.is_for_sale === false ||
    (photo.price_cash === 0 && photo.price_points === 0);

  const cta = isPurchased
    ? ("DOWNLOAD" as const)
    : isFree
    ? ("FREE_DOWNLOAD" as const)
    : photo.cta || ("BUY" as const);

  const priceDisplay = photo.price_display || "";

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90)
      return "bg-green-500/10 text-green-500 border-green-500/30";
    if (percentage >= 70)
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    return "bg-orange-500/10 text-orange-500 border-orange-500/30";
  };

  return (
    <Card className="border-2 border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden bg-white">
      <div className="p-4 flex items-center gap-4">
        {/* Thumbnail */}
        <div
          className="h-20 w-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 relative overflow-hidden cursor-pointer group"
          onClick={onClick}
        >
          {!imageLoaded && !imageError && (
            <Skeleton className="absolute inset-0" />
          )}

          {imageError ? (
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          ) : (
            <>
              <img
                src={previewUrl}
                alt={photo.filename}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-semibold truncate text-base text-gray-800">
              {primaryLabel}
            </h3>
            {/* ✅ NEW: standalone badge */}
            {isStandalone && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs shrink-0">
                <MapPin className="h-3 w-3 mr-0.5" />
                Standalone
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {secondaryDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(secondaryDate).toLocaleDateString("id-ID")}
                </span>
              </div>
            )}
            {locationLabel && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[150px]">{locationLabel}</span>
              </div>
            )}
            {matchScore > 0 && (
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getMatchColor(
                  matchScore
                )}`}
              >
                <Sparkles className="h-3 w-3" />
                <span>{matchScore}% Match</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0 items-center">
          {cta === "BUY" && (
            <Badge
              variant="secondary"
              className="gap-1 hidden sm:flex bg-yellow-100 text-yellow-700"
            >
              <Coins className="h-3 w-3" />
              {priceDisplay || `${photo.price_points || 5} FOTOPOIN`}
            </Badge>
          )}
          {cta === "FREE_DOWNLOAD" && (
            <Badge
              variant="outline"
              className="gap-1 hidden sm:flex text-green-600 border-green-500/30 bg-green-50"
            >
              GRATIS
            </Badge>
          )}
          {cta === "DOWNLOAD" && isPurchased && (
            <Badge className="gap-1 hidden sm:flex bg-blue-100 text-blue-700 border-blue-200">
              ✓ Dibeli
            </Badge>
          )}

          {/* Favorite */}
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                "h-9 w-9 p-0 rounded-lg transition-all",
                photo.is_favorited
                  ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                  : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-all",
                  photo.is_favorited && "fill-current"
                )}
              />
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="rounded-lg border-2 hover:border-blue-400 hover:bg-blue-50"
            onClick={onClick}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">View</span>
          </Button>

          {cta === "BUY" ? (
            <Button
              size="sm"
              className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onBuy?.();
              }}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Beli</span>
                </>
              )}
            </Button>
          ) : cta === "FREE_DOWNLOAD" ? (
            <Button
              size="sm"
              className="rounded-lg bg-green-600 hover:bg-green-500 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(downloadId);
              }}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">...</span>
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Free</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(downloadId);
              }}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">...</span>
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};