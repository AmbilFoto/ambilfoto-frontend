import { useCallback, useEffect, useState } from 'react';
import {
  bayanOpenService,
  BayanOpenGalleryItem,
  BayanOpenGalleryDate,
} from '@/services/api/bayan-open.service';

export function useBayanOpenGalleryDates() {
  const [dates, setDates] = useState<BayanOpenGalleryDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await bayanOpenService.getGalleryDates();
      setDates(data);
    } catch {
      setError('Unable to load available gallery dates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  return { dates, isLoading, error, refetch: fetchDates };
}

interface GalleryState {
  photos: BayanOpenGalleryItem[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export function useBayanOpenGallery(page: number, limit: number, date?: string) {
  const [state, setState] = useState<GalleryState>({
    photos: [],
    total: 0,
    totalPages: 0,
    isLoading: true,
    error: null,
  });

  const fetchGallery = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await bayanOpenService.getGallery(page, limit, date);
      setState({
        photos: res.photos,
        total: res.total,
        totalPages: res.total_pages,
        isLoading: false,
        error: null,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false, error: 'Unable to load gallery photos.' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, date]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  return { ...state, refetch: fetchGallery };
}
