// frontend/src/hooks/usePhotographerLocationCheck.ts
import { useState, useEffect, useCallback } from 'react';
import { photographerService, ProfileCompletion } from '@/services/api/photographer.service';

type LocationData = ProfileCompletion['current_data'];

interface UsePhotographerLocationCheckReturn {
  showModal: boolean;
  profileComplete: boolean;
  loading: boolean;
  locationData: LocationData | null;
  handleModalClose: () => void;
  handleLocationComplete: (newLocationData: LocationData) => void;
  reopenModal: () => void;
  recheckCompletion: () => Promise<void>;
}

const DISMISS_KEY = 'location_modal_dismissed';

const getDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
};

const setDismissed = (value: boolean): void => {
  try {
    if (value) {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } else {
      sessionStorage.removeItem(DISMISS_KEY);
    }
  } catch {
    // storage unavailable (private mode, etc.) - ignore
  }
};

const usePhotographerLocationCheck = (): UsePhotographerLocationCheckReturn => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [profileComplete, setProfileComplete] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const checkProfileCompletion = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const response = await photographerService.checkProfileCompletion();

      if (response.success && response.data) {
        const completion: ProfileCompletion = response.data;

        setProfileComplete(completion.is_complete);
        setLocationData(completion.current_data);

        if (!completion.is_complete && !getDismissed()) {
          setShowModal(true);
        }
      }
    } catch {
      // Fail silently; keep default state so the user isn't blocked.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkProfileCompletion();
  }, [checkProfileCompletion]);

  const handleModalClose = useCallback((): void => {
    setShowModal(false);
    setDismissed(true);
  }, []);

  const handleLocationComplete = useCallback((newLocationData: LocationData): void => {
    setProfileComplete(true);
    setLocationData(newLocationData);
    setShowModal(false);
    setDismissed(false);
  }, []);

  const reopenModal = useCallback((): void => {
    setShowModal(true);
    setDismissed(false);
  }, []);

  return {
    showModal,
    profileComplete,
    loading,
    locationData,
    handleModalClose,
    handleLocationComplete,
    reopenModal,
    recheckCompletion: checkProfileCompletion,
  };
};

export default usePhotographerLocationCheck;