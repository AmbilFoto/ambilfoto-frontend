import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, RotateCw } from 'lucide-react';
import { useBayanOpenGalleryDates, useBayanOpenGallery } from '@/hooks/bayan-open/useBayanOpenGallery';
import { BayanOpenGalleryItem } from '@/services/api/bayan-open.service';
import { GalleryFilters } from './GalleryFilters';
import { GalleryCard } from './GalleryCard';
import { GalleryPagination } from './GalleryPagination';
import { GalleryPreviewModal } from './GalleryPreviewModal';
import { fDateShort } from '../lib/format';

export function Gallery() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [previewPhoto, setPreviewPhoto] = useState<BayanOpenGalleryItem | null>(null);

  const { dates, isLoading: datesLoading } = useBayanOpenGalleryDates();
  const { photos, total, totalPages, isLoading, error, refetch } = useBayanOpenGallery(
    page,
    limit,
    selectedDate
  );

  const handleSelectDate = (date: string | undefined) => {
    setSelectedDate(date);
    setPage(1);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Photo Gallery
        </CardTitle>
        {selectedDate && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Menampilkan foto dari <span className="font-medium">{fDateShort(selectedDate)}</span>
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <GalleryFilters
          dates={dates}
          isLoading={datesLoading}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          limit={limit}
          onLimitChange={handleLimitChange}
        />

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: limit > 10 ? 10 : limit }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={refetch}>
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-1" />
            <p className="text-sm font-medium">No photos found</p>
            <p className="text-xs text-muted-foreground">
              {selectedDate
                ? 'There are no photos uploaded on this date.'
                : 'There are no photos uploaded yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((photo) => (
                <GalleryCard key={photo.photo_id} photo={photo} onClick={() => setPreviewPhoto(photo)} />
              ))}
            </div>
            <GalleryPagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>

      <GalleryPreviewModal photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </Card>
  );
}
