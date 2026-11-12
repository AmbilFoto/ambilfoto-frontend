import { useState, useEffect, useCallback } from 'react';
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Search,
  Camera,
  Download,
  ShoppingCart,
  MapPin,
  Crosshair,
  Map as MapIcon,
  Globe
} from 'lucide-react';
import { geoPhotoService, GeoPhoto, EventMapData } from '@/services/api/geophoto.service';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom photo markers
const createPhotoMarker = (color: string) => {
  return L.divIcon({
    className: 'custom-photo-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// Event location marker with animation
const eventMarker = L.divIcon({
  className: 'event-marker',
  html: `
    <div style="
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #5c73f6, #0933c9);
      border: 4px solid white;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(16, 58, 249, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    ">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    </style>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -44]
});

const purchasedMarker = createPhotoMarker('#22c55e');
const freeMarker = createPhotoMarker('#3b82f6');
const paidMarker = createPhotoMarker('#f97316');

// Locate user control
function LocateButton({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const map = useMap();

  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 16 });
    
    map.on('locationfound', (e) => {
      onLocationFound(e.latlng.lat, e.latlng.lng);
      toast.success('Lokasi ditemukan!');
    });
    
    map.on('locationerror', () => {
      toast.error('Tidak dapat menemukan lokasi');
    });
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-6 right-6 z-[1000] bg-white hover:bg-gray-50 rounded-full p-3.5 shadow-xl border border-gray-200 transition-all hover:scale-105"
      title="Temukan Lokasi Saya"
    >
      <Crosshair className="h-5 w-5 text-gray-700" />
    </button>
  );
}

// Map events handler
function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: string) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const boundsStr = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
      onBoundsChange(boundsStr);
    },
  });
  return null;
}

export default function FotoMap() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  
  const [mapData, setMapData] = useState<EventMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bounds, setBounds] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Helper to safely convert to number
  const toNumber = (value: any): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? undefined : num;
  };

  // Load map data
  const loadMapData = useCallback(async () => {
    if (!eventId) return;
    
    try {
      setIsLoading(true);
      const data = await geoPhotoService.getEventPhotosMap(eventId, {
        zoom: 14,
        cluster: false,
        bounds: bounds || undefined,
      });
      setMapData(data);
      console.log('✅ Map loaded:', data.photos.length, 'photos');
    } catch (error) {
      console.error('Map load error:', error);
      toast.error('Gagal memuat peta');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, bounds]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  const getPhotoIcon = (photo: GeoPhoto) => {
    if (photo.is_purchased) return purchasedMarker;
    if (!photo.is_for_sale || photo.price_points === 0) return freeMarker;
    return paidMarker;
  };

  const filteredPhotos = mapData?.photos.filter(p => 
    searchQuery === '' || p.filename.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading && !mapData) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-14 w-14 rounded-full mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
          <Skeleton className="h-3 w-40 mx-auto" />
        </div>
      </div>
    );
  }

  // Get coordinates
  const eventLat = toNumber(mapData?.event.event_latitude);
  const eventLng = toNumber(mapData?.event.event_longitude);
  const hasEventLocation = eventLat !== undefined && eventLng !== undefined;

  // Determine center
  let center: [number, number] = [-1.2687, 116.8312]; // Balikpapan default
  
  if (hasEventLocation) {
    center = [eventLat!, eventLng!];
  } else if (mapData?.bounds?.center) {
    center = [mapData.bounds.center.latitude, mapData.bounds.center.longitude];
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Floating Header */}
      <div className="absolute top-4 left-4 right-4 z-[1001] flex gap-3">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg border border-gray-200 transition-all hover:scale-105"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>

        {/* 🆕 NEW: Go to Global Events Map Button */}
        <button
          onClick={() => navigate('/user/events/map')}
          className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full px-4 py-3 shadow-lg border border-blue-800 transition-all hover:scale-105 flex items-center gap-2"
          title="Lihat Semua Events"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium hidden sm:inline">Semua Events</span>
        </button>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari foto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-white shadow-lg border-gray-200 rounded-full"
            />
          </div>
        </div>

        {/* Photo Counter Badge */}
        <div className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-2">
          <Camera className="h-4 w-4 text-gray-600" />
          <span className="font-semibold text-sm">{filteredPhotos.length}</span>
        </div>
      </div>

      {/* Event Info Bar (if has location) */}
      {hasEventLocation && mapData?.event && (
        <div className="absolute top-20 left-4 z-[1001] bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-3 max-w-md">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{mapData.event.event_name}</p>
              <code className="text-xs text-gray-500">
                📍 {eventLat!.toFixed(6)}, {eventLng!.toFixed(6)}
              </code>
            </div>
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {mapData.event.geo_enabled_photos} GPS
            </Badge>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={hasEventLocation ? 15 : 13}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapEvents onBoundsChange={setBounds} />
          <LocateButton onLocationFound={(lat, lng) => setUserLocation({ lat, lng })} />

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: 'user-location-marker',
                html: `
                  <div style="
                    width: 20px;
                    height: 20px;
                    background: #3b82f6;
                    border: 4px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(0,0,0,0.2);
                  "></div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            >
              <Popup className="custom-popup" maxWidth={240}>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Crosshair className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="font-bold text-sm">Lokasi Anda</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">Koordinat GPS:</p>
                    <code className="text-xs font-mono font-semibold text-gray-800">
                      📍 {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </code>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Event Location Marker */}
          {hasEventLocation && (
            <Marker position={[eventLat!, eventLng!]} icon={eventMarker}>
              <Popup className="custom-popup" maxWidth={280}>
                <div className="p-3">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm mb-1">{mapData?.event.event_name}</p>
                      {mapData?.event.location && (
                        <p className="text-xs text-gray-600 mb-2">{mapData.event.location}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
                    <p className="text-xs text-gray-500 mb-1">Koordinat GPS:</p>
                    <code className="text-xs font-mono font-semibold text-gray-800">
                      {eventLat!.toFixed(6)}, {eventLng!.toFixed(6)}
                    </code>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Camera className="h-3 w-3" />
                    <span>{mapData?.event.geo_enabled_photos} foto dengan GPS</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Photo Markers */}
          {filteredPhotos.map((photo) => {
            const photoLat = toNumber(photo.latitude) || 0;
            const photoLng = toNumber(photo.longitude) || 0;
            
            return (
              <Marker
                key={photo.id}
                position={[photoLat, photoLng]}
                icon={getPhotoIcon(photo)}
              >
                <Popup className="custom-popup" maxWidth={280}>
                  <div className="w-full">
                    <AuthenticatedImage
                      src={photo.preview_url}
                      alt={photo.filename}
                      className="w-full h-44 object-cover rounded-lg mb-3"
                    />
                    
                    <p className="font-semibold text-sm mb-2 truncate">{photo.filename}</p>
                    
                    <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-gray-500 mb-1">Koordinat GPS:</p>
                      <code className="text-xs font-mono text-gray-800">
                        📍 {photoLat.toFixed(6)}, {photoLng.toFixed(6)}
                      </code>
                    </div>

                    <div className="flex gap-2">
                      {photo.is_purchased ? (
                        <Button size="sm" className="flex-1 gap-1.5 h-9">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      ) : photo.price_points > 0 ? (
                        <Button size="sm" className="flex-1 gap-1.5 h-9">
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {photo.price_points} Poin
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="flex-1 gap-1.5 h-9">
                          <Download className="h-3.5 w-3.5" />
                          Gratis
                        </Button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Floating Bottom Buttons */}
        <div className="absolute bottom-6 left-6 z-[1000] flex gap-3">
          {/* Legend Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <p className="font-semibold text-xs text-gray-500 mb-3 uppercase tracking-wide">Legenda</p>
            <div className="space-y-2.5">
              {hasEventLocation && (
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-blue-600 to-blue-700 flex-shrink-0"></div>
                  <span className="text-xs font-medium">Lokasi Event</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex-shrink-0"></div>
                <span className="text-xs">Sudah Dibeli</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                <span className="text-xs">Gratis</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex-shrink-0"></div>
                <span className="text-xs">Berbayar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}