import { useCallback, useEffect, useState } from 'react';
import { bayanOpenService, BayanOpenSummary } from '@/services/api/bayan-open.service';

interface State {
  data: BayanOpenSummary | null;
  isLoading: boolean;
  error: string | null;
}

export function useBayanOpenSummary() {
  const [state, setState] = useState<State>({ data: null, isLoading: true, error: null });

  const fetchSummary = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await bayanOpenService.getSummary();
      setState({ data, isLoading: false, error: null });
    } catch {
      setState((s) => ({ ...s, isLoading: false, error: 'Unable to load summary statistics.' }));
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { ...state, refetch: fetchSummary };
}
