import axios from 'axios';
import { API_BASE_URL } from './gateway';

const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== TYPES ====================

export interface GeoPhoto {
  id: string;
  ai_photo_id: string;
  filename: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  location_source: 'exif' | 'manual' | 'none';
  location_accuracy?: number;
  price_points: number;
  price_cash: number;
  is_for_sale: boolean;
  faces_count: number;
  matched_users: number;
  is_purchased: boolean;
  preview_url: string;
  download_url: string;
  distance?: number;
  cta?: 'BUY' | 'DOWNLOAD' | 'FREE_DOWNLOAD';
}

export interface MapCluster {
  center: { lat: number; lng: number };
  count: number;
  photo_ids: string[];
  preview_thumbnails: string[];
  price_range: { min: number; max: number };
}

export interface EventCluster {
  center: { lat: number; lng: number };
  count: number;
  event_ids: string[];
  preview_photos: string[];
  total_photos: number;
  date_range: {
    earliest: number;
    latest: number;
  };
}

export interface MapBounds {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  center: { latitude: number; longitude: number };
}

export interface Photographer {
  id: string;
  name: string;
  photo?: string;
}

export interface GlobalEvent {
  event_slug: any;
  event_id: string;
  event_name: string;
  event_date: string;
  location: string | null;
  latitude: number;
  longitude: number;
  total_photos: number;
  geo_photos: number;
  geo_percentage: number;
  photos_for_sale: number;
  photographer: Photographer;
  preview_photos: string[];
  is_public: boolean;
}

export interface GlobalEventsMapData {
  events: GlobalEvent[];
  clusters: EventCluster[];
  bounds: MapBounds | null;
  stats: {
    total_events: number;
    total_photos: number;
    total_geo_photos: number;
  };
}

export interface EventMapData {
  event: {
    id: string;
    event_name: string;
    event_date: string;
    total_photos: number;
    geo_enabled_photos: number;
    geo_percentage: number;
    event_latitude?: number | string | null;
    event_longitude?: number | string | null;
    location?: string | null;
  };
  photos: GeoPhoto[];
  clusters: MapCluster[];
  bounds: MapBounds | null;
}

export interface NearbyPhotosData {
  center: { lat: number; lng: number };
  radius: number;
  photos: GeoPhoto[];
  total_found: number;
  search_params: {
    radius_meters: number;
    max_distance: number;
  };
}

export interface LocationStats {
  total_photos: number;
  geo_enabled_photos: number;
  geo_percentage: number;
  sources: {
    exif: number;
    manual: number;
    none: number;
  };
  accuracy: {
    average: number;
    best: number;
    worst: number;
  } | null;
  coverage_area: {
    center: { latitude: number; longitude: number };
    radius_meters: number;
  } | null;
  bounds: MapBounds | null;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  altitude?: number;
  reason?: string;
}

export interface BulkLocationUpdate {
  photo_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface BulkUpdateResult {
  photo_id: string;
  status: 'updated' | 'failed';
  error?: string;
}

// ==================== SERVICE ====================

export const geoPhotoService = {
  /**
   * 🆕 NEW: Get global events map for discovery
   */
  async getGlobalEventsMap(options?: { 
    bounds?: string; 
    zoom?: number; 
    cluster?: boolean;
    with_stats?: boolean;
    limit?: number;
  }): Promise<GlobalEventsMapData> {
    const params = new URLSearchParams();
    if (options?.bounds) params.append('bounds', options.bounds);
    if (options?.zoom) params.append('zoom', options.zoom.toString());
    if (options?.cluster !== undefined) params.append('cluster', options.cluster.toString());
    if (options?.with_stats !== undefined) params.append('with_stats', options.with_stats.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `/geophoto/events/map${params.toString() ? '?' + params.toString() : ''}`;
    
    console.log('🌍 Fetching global events map:', { url, params: params.toString() });

    const response = await api.get(url);
    return response.data.data;
  },

  /**
   * Get photos for map view with clustering
   */
  async getEventPhotosMap(
    eventId: string,
    options?: { bounds?: string; zoom?: number; cluster?: boolean }
  ): Promise<EventMapData> {
    // CRITICAL FIX: Validate eventId before making request
    if (!eventId || eventId === ':eventId' || eventId.includes(':')) {
      throw new Error('Invalid event ID provided');
    }

    const params = new URLSearchParams();
    if (options?.bounds) params.append('bounds', options.bounds);
    if (options?.zoom) params.append('zoom', options.zoom.toString());
    if (options?.cluster !== undefined) params.append('cluster', options.cluster.toString());

    // Build URL properly - eventId should already be a real ID, not :eventId
    const url = `/geophoto/events/${eventId}/map${params.toString() ? '?' + params.toString() : ''}`;
    
    console.log('🔍 Fetching event photos map:', { eventId, url, params: params.toString() });

    const response = await api.get(url);
    return response.data.data;
  },

  /**
   * Get photos within radius of user's location
   */
  async getPhotosNearby(
    eventId: string,
    lat: number,
    lng: number,
    options?: { radius?: number; limit?: number }
  ): Promise<NearbyPhotosData> {
    // Validate eventId
    if (!eventId || eventId === ':eventId' || eventId.includes(':')) {
      throw new Error('Invalid event ID provided');
    }

    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });
    if (options?.radius) params.append('radius', options.radius.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `/geophoto/events/${eventId}/nearby?${params.toString()}`;
    console.log('📍 Fetching nearby photos:', { eventId, url });

    const response = await api.get(url);
    return response.data.data;
  },

  /**
   * Update photo location manually (photographer only)
   */
  async updatePhotoLocation(photoId: string, data: LocationUpdate): Promise<{
    photo_id: string;
    old_location: { latitude: number; longitude: number; source: string } | null;
    new_location: { latitude: number; longitude: number; altitude: number | null; source: string; updated_at: string };
  }> {
    if (!photoId || photoId === ':photoId' || photoId.includes(':')) {
      throw new Error('Invalid photo ID provided');
    }

    const response = await api.put(`/geophoto/photos/${photoId}/location`, data);
    return response.data.data;
  },

  /**
   * Bulk update photo locations (photographer only)
   */
  async bulkUpdateLocations(
    eventId: string,
    photos: BulkLocationUpdate[],
    reason?: string
  ): Promise<{
    total: number;
    updated: number;
    failed: number;
    results: BulkUpdateResult[];
  }> {
    // Validate eventId
    if (!eventId || eventId === ':eventId' || eventId.includes(':')) {
      throw new Error('Invalid event ID provided');
    }

    const response = await api.put(`/geophoto/events/${eventId}/locations/bulk`, {
      photos,
      reason,
    });
    return response.data.data;
  },

  /**
   * Get location statistics for event
   */
  async getLocationStats(eventId: string): Promise<LocationStats> {
    // Validate eventId
    if (!eventId || eventId === ':eventId' || eventId.includes(':')) {
      throw new Error('Invalid event ID provided');
    }

    console.log('📊 Fetching location stats for event:', eventId);
    const response = await api.get(`/geophoto/events/${eventId}/stats`);
    return response.data.data;
  },
};