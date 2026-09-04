import { useCallback, useEffect, useState } from 'react';
import {
  bayanOpenService,
  BayanOpenUserDailyPoint,
  BayanOpenFaceDailyPoint,
  BayanOpenPhotoDailyPoint,
} from '@/services/api/bayan-open.service';

interface DailyState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
}

function useDaily<T>(
  fetcher: (days: number) => Promise<T[]>,
  days: number,
  errorMessage: string
) {
  const [state, setState] = useState<DailyState<T>>({ data: [], isLoading: true, error: null });

  const fetchData = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await fetcher(days);
      setState({ data, isLoading: false, error: null });
    } catch {
      setState((s) => ({ ...s, isLoading: false, error: errorMessage }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

export function useBayanOpenUserDaily(days: number) {
  return useDaily(bayanOpenService.getUsersDaily, days, 'Unable to load user scan activity.');
}

export function useBayanOpenFaceDaily(days: number) {
  return useDaily(bayanOpenService.getFacesDaily, days, 'Unable to load face database statistics.');
}

export function useBayanOpenPhotoDaily(days: number) {
  return useDaily(bayanOpenService.getPhotosDaily, days, 'Unable to load photo upload statistics.');
}

export type {
  BayanOpenUserDailyPoint as UserDailyPoint,
  BayanOpenFaceDailyPoint as FaceDailyPoint,
  BayanOpenPhotoDailyPoint as PhotoDailyPoint,
};
