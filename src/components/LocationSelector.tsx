import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Loader2 } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/services/api/api.config";

const API_URL = API_BASE_URL;

interface Province {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  province_id: string;
}

interface LocationData {
  province_id: string;
  province_name: string;
  city_id: string;
  city_name: string;
}

interface LocationSelectorProps {
  onLocationChange: (location: LocationData | null) => void;
  required?: boolean;
  className?: string;
}

export const LocationSelector = ({ 
  onLocationChange, 
  required = false,
  className = "" 
}: LocationSelectorProps) => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string>("");

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    setLoadingProvinces(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/master/provinces`);
      if (response.data.success && response.data.data) {
        setProvinces(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load provinces:', err);
      setError('Gagal memuat daftar provinsi. Silakan refresh halaman.');
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadCities = async (provinceId: string) => {
    setLoadingCities(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/master/cities`, {
        params: { province_id: provinceId }
      });
      if (response.data.success && response.data.data) {
        setCities(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load cities:', err);
      setError('Gagal memuat daftar kota. Silakan coba lagi.');
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleProvinceChange = (provinceId: string) => {
    const province = provinces.find(p => p.id === provinceId);
    if (province) {
      setSelectedProvince(province);
      setSelectedCity(null);
      setCities([]);
      loadCities(provinceId);
      
      // Notify parent that location is incomplete
      onLocationChange(null);
    }
  };

  const handleCityChange = (cityId: string) => {
    const city = cities.find(c => c.id === cityId);
    if (city && selectedProvince) {
      setSelectedCity(city);
      
      // Notify parent with complete location data
      onLocationChange({
        province_id: selectedProvince.id,
        province_name: selectedProvince.name,
        city_id: city.id,
        city_name: city.name
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Province Selector */}
      <div className="space-y-2">
        <Label htmlFor="province">
          <MapPin className="h-4 w-4 inline mr-1" />
          Provinsi {required && <span className="text-red-500">*</span>}
        </Label>
        
        {loadingProvinces ? (
          <div className="flex items-center justify-center h-10 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Memuat provinsi...</span>
          </div>
        ) : (
          <Select
            value={selectedProvince?.id || ""}
            onValueChange={handleProvinceChange}
            disabled={loadingProvinces || provinces.length === 0}
          >
            <SelectTrigger id="province">
              <SelectValue placeholder="Pilih Provinsi" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province.id} value={province.id}>
                  {province.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {!loadingProvinces && provinces.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Gagal memuat provinsi. <button onClick={loadProvinces} className="text-primary hover:underline">Coba lagi</button>
          </p>
        )}
      </div>

      {/* City Selector */}
      <div className="space-y-2">
        <Label htmlFor="city">
          <MapPin className="h-4 w-4 inline mr-1" />
          Kota/Kabupaten {required && <span className="text-red-500">*</span>}
        </Label>
        
        {loadingCities ? (
          <div className="flex items-center justify-center h-10 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Memuat kota...</span>
          </div>
        ) : (
          <Select
            value={selectedCity?.id || ""}
            onValueChange={handleCityChange}
            disabled={!selectedProvince || loadingCities || cities.length === 0}
          >
            <SelectTrigger id="city">
              <SelectValue 
                placeholder={
                  !selectedProvince 
                    ? "Pilih provinsi terlebih dahulu" 
                    : cities.length === 0
                    ? "Tidak ada kota tersedia"
                    : "Pilih Kota/Kabupaten"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {selectedProvince && !loadingCities && cities.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Tidak ada kota untuk provinsi ini. <button onClick={() => loadCities(selectedProvince.id)} className="text-primary hover:underline">Coba lagi</button>
          </p>
        )}
      </div>

      {/* Helper Text */}
      {!required && (
        <p className="text-xs text-muted-foreground">
          Opsional - Membantu admin melihat sebaran photographer
        </p>
      )}
    </div>
  );
};