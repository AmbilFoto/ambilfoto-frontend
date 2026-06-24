import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ShoppingCart, Heart, Eye, MapPin, Calendar } from "lucide-react";
import { UserPhoto } from "@/services/api/user.service";
import { aiService } from "@/services/api/ai.service";
import { cn } from "@/lib/utils";

interface PhotoCardProps {
  photo: UserPhoto;
  onDownload: (photoId: string) => void;
  onBuy?: () => void;
  onToggleFavorite?: () => void;
  isDownloading: boolean;
  onClick: () => void;
}

export const PhotoCard = ({
  photo,
  onDownload,
  onBuy,
  onToggleFavorite,
  isDownloading,
  onClick,
}: PhotoCardProps) => {
  const isPurchased = photo.is_purchased === true || photo.is_purchased === 1;
  const isFree =
    photo.is_for_sale === false ||
    (photo.price_cash === 0 && photo.price_points === 0);

  const cta = isPurchased
    ? ("DOWNLOAD" as const)
    : isFree
    ? ("FREE_DOWNLOAD" as const)
    : photo.cta || ("BUY" as const);

  const isStandalone = photo.type === "standalone";

  // ✅ FIX: standalone photos use photo_id for download, event photos use event_photo_id
  const downloadId = isStandalone
    ? photo.photo_id
    : photo.event_photo_id || photo.photo_id;

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cta === "BUY") {
      onBuy?.();
    } else {
      onDownload(downloadId);
    }
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const priceDisplay =
    photo.price_display ||
    (photo.price_cash && photo.price_cash > 0
      ? `Rp ${photo.price_cash.toLocaleString("id-ID")}`
      : photo.price_points && photo.price_points > 0
      ? `${photo.price_points} FotoPoin`
      : "GRATIS");

  return (
    <Card
      className="group overflow-hidden border-2 border-gray-200 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer bg-white"
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        <img
          src={photo.preview_url || aiService.getPreviewUrl(photo.photo_id)}
          alt={photo.filename}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top row: match badge + favorite button */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            {photo.similarity && photo.similarity > 0 && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg">
                {Math.round((photo.similarity || 0) * 100)}% Match
              </Badge>
            )}
            {/* ✅ NEW: standalone badge so user knows this isn't an event photo */}
            {isStandalone && (
              <Badge className="bg-blue-500/90 text-white font-medium shadow-sm text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                Standalone
              </Badge>
            )}
          </div>

          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteToggle}
              className={cn(
                "h-8 w-8 p-0 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300",
                photo.is_favorited
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-white/90 hover:bg-white text-gray-700"
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
        </div>

        {/* Purchase Status Badge */}
        {isPurchased && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg">
              <Download className="h-3 w-3 mr-1" />
              Dimiliki
            </Badge>
          </div>
        )}

        {/* Bottom Info on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="space-y-2">
            {isStandalone ? (
              <>
                {photo.place_name && (
                  <p className="text-xs text-white/90 font-semibold truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {photo.place_name}
                  </p>
                )}
                <p className="text-xs text-white/80 truncate">
                  {photo.photographer_name}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-white/90 font-semibold truncate flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {photo.event_name || "Event Tidak Diketahui"}
                </p>
                {photo.event_location && (
                  <p className="text-xs text-white/80 truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {photo.event_location}
                  </p>
                )}
                {photo.event_date && (
                  <p className="text-xs text-white/80">
                    {new Date(photo.event_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className="p-3 bg-white border-t-2 border-gray-100">
        <Button
          onClick={handleAction}
          disabled={isDownloading}
          className={cn(
            "w-full font-bold shadow-md hover:shadow-lg transition-all",
            cta === "BUY" &&
              "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600",
            (cta === "DOWNLOAD" || cta === "FREE_DOWNLOAD") &&
              "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          )}
        >
          {isDownloading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Mengunduh...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {cta === "BUY" && (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  {priceDisplay}
                </>
              )}
              {(cta === "DOWNLOAD" || cta === "FREE_DOWNLOAD") && (
                <>
                  <Download className="h-4 w-4" />
                  {cta === "FREE_DOWNLOAD" ? "Unduh Gratis" : "Unduh"}
                </>
              )}
              {cta === "VIEW" && (
                <>
                  <Eye className="h-4 w-4" />
                  Lihat
                </>
              )}
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
};