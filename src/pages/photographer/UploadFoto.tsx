import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { photographerService } from "@/services/api/photographer.service";
import { useToast } from "@/hooks/use-toast";
import RupiahInput from "@/components/RupiahInput";
import { formatRupiah } from "@/utils/currency";
import {
  ArrowLeft, Upload, ImageIcon, Loader2, CheckCircle,
  DollarSign, Tag, Info, X, MapPin, Search,
} from "lucide-react";

// Fix Leaflet default marker icon (webpack/vite breaks asset paths)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadFormState {
  price_cash: number;
  is_for_sale: boolean;
}

interface PreviewFile {
  file: File;
  preview: string;
  base64: string;
}

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface SelectedLocation {
  lat: number;
  lng: number;
  placeName: string;
}

// ── Map Preview Component ─────────────────────────────────────────────────────
// Dibuat sebagai komponen terpisah agar MapContainer tidak re-mount tiap render

interface MapPreviewProps {
  location: SelectedLocation;
}

const MapPreview = ({ location }: MapPreviewProps) => {
  return (
    <div className="rounded-xl overflow-hidden border border-green-200 shadow-sm" style={{ height: 220 }}>
      <MapContainer
        key={`${location.lat}-${location.lng}`}
        center={[location.lat, location.lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[location.lat, location.lng]}>
          <Popup>
            <span className="text-xs">{location.placeName}</span>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const UploadPhoto = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const isStandalone = !eventId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const [pricing, setPricing] = useState<UploadFormState>({
    price_cash: 0,
    is_for_sale: true,
  });

  // Location state
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Location Search ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isStandalone) return;
    if (!locationQuery || locationQuery.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (selectedLocation && locationQuery !== selectedLocation.placeName) {
      setSelectedLocation(null);
    }

    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);

    locationDebounceRef.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "id" } }
        );
        const data: LocationSuggestion[] = await res.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // silent fail
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);

    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, [locationQuery, isStandalone]);

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    const loc: SelectedLocation = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      placeName: suggestion.display_name,
    };
    setSelectedLocation(loc);
    setLocationQuery(suggestion.display_name);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    setLocationQuery("");
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  // ── File Handlers ─────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowed = files.slice(0, 20);
    if (files.length > 20) {
      toast({ title: "Maks. 20 foto sekaligus", variant: "destructive" });
    }

    const readers = allowed.map(
      (file) =>
        new Promise<PreviewFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = (ev.target?.result as string) || "";
            resolve({ file, preview: URL.createObjectURL(file), base64 });
          };
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((results) => {
      setPreviews((prev) => [...prev, ...results]);
    });

    e.target.value = "";
  };

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Upload Handler ────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!previews.length) return;

    if (isStandalone && !selectedLocation) {
      toast({ title: "Pilih lokasi terlebih dahulu", variant: "destructive" });
      return;
    }

    if (!isStandalone && !eventId) {
      toast({ title: "Event ID tidak ditemukan", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadedCount(0);
    let successCount = 0;

    for (let i = 0; i < previews.length; i++) {
      const { file, base64 } = previews[i];
      try {
        if (isStandalone) {
          const response = await photographerService.uploadStandalonePhoto({
            face_image: base64,
            filename: file.name,
            location: {
              lat: selectedLocation!.lat,
              lng: selectedLocation!.lng,
              placeName: selectedLocation!.placeName,
            },
            price_cash: pricing.is_for_sale ? pricing.price_cash : 0,
            is_for_sale: pricing.is_for_sale,
            extract_gps: false,
          } as any);

          if (response.success) { successCount++; setUploadedCount(successCount); }
        } else {
          const response = await photographerService.uploadPhoto(eventId!, {
            face_image: base64,
            filename: file.name,
            upload_order: i + 1,
            price_cash: pricing.is_for_sale ? pricing.price_cash : 0,
            is_for_sale: pricing.is_for_sale,
          } as any);

          if (response.success) { successCount++; setUploadedCount(successCount); }
        }
      } catch (err) {
        console.error(`Gagal upload ${file.name}:`, err);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast({
        title: `${successCount} foto berhasil diupload!`,
        description: pricing.is_for_sale
          ? `Harga: ${formatRupiah(pricing.price_cash)} per foto`
          : "Foto diset sebagai gratis",
      });
      navigate(`/photographer/my-photos`);
    } else {
      toast({ title: "Semua foto gagal diupload", variant: "destructive" });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const progress = previews.length > 0 ? Math.round((uploadedCount / previews.length) * 100) : 0;
  const isUploadDisabled = previews.length === 0 || isUploading || (isStandalone && !selectedLocation);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(`/photographer/my-photos`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Foto Saya
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Foto
              {isStandalone && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Tanpa Event
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isStandalone
                ? "Upload foto standalone dengan lokasi dan atur harga"
                : "Upload foto ke event dan atur harga untuk foto Anda"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* ── Pilih Foto ── */}
            <div>
              <Label className="mb-2 block">Pilih Foto (maks. 20)</Label>
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 hover:border-blue-400 transition-all cursor-pointer p-8"
              >
                <div className="p-3 rounded-full bg-blue-50">
                  <ImageIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">Klik untuk pilih foto</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — maks. 20 foto sekaligus</p>
                </div>
              </label>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* ── Preview Grid ── */}
            {previews.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{previews.length} foto dipilih</Label>
                  <button
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={() => {
                      previews.forEach((p) => URL.revokeObjectURL(p.preview));
                      setPreviews([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Hapus Semua
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={p.preview} alt={p.file.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePreview(i)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                        <p className="text-white text-[9px] truncate">{p.file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Lokasi (Standalone only) ── */}
            {isStandalone && (
              <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-sm">Lokasi Foto</h3>
                  <span className="text-xs text-red-500">*wajib</span>
                </div>

                {/* Search input */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Cari lokasi, contoh: Gelora Bung Karno, Jakarta..."
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                      className="pl-9 pr-9"
                    />
                    {isSearchingLocation && (
                      <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {selectedLocation && !isSearchingLocation && (
                      <CheckCircle className="absolute right-3 h-4 w-4 text-green-500" />
                    )}
                  </div>

                  {/* Dropdown suggestions */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border bg-background shadow-lg overflow-hidden">
                      {locationSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.place_id}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors border-b last:border-b-0"
                          onClick={() => handleSelectLocation(suggestion)}
                        >
                          <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <span className="text-sm leading-snug line-clamp-2">
                            {suggestion.display_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tidak ditemukan */}
                {!selectedLocation && locationQuery.length >= 3 && !isSearchingLocation && locationSuggestions.length === 0 && (
                  <p className="text-xs text-muted-foreground">Lokasi tidak ditemukan. Coba kata kunci lain.</p>
                )}

                {/* ── Map Preview ── */}
                {selectedLocation && (
                  <div className="space-y-2">
                    {/* Info lokasi */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-green-800">Lokasi dipilih</p>
                        <p className="text-xs text-green-700 mt-0.5 break-words">{selectedLocation.placeName}</p>
                        <p className="text-xs text-green-600 mt-1">
                          {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </p>
                      </div>
                      <button
                        className="shrink-0 p-0.5 rounded-full hover:bg-green-200 transition-colors"
                        onClick={handleClearLocation}
                        title="Hapus lokasi"
                      >
                        <X className="h-3.5 w-3.5 text-green-700" />
                      </button>
                    </div>

                    {/* Peta */}
                    <MapPreview location={selectedLocation} />
                  </div>
                )}
              </div>
            )}

            {/* ── Pengaturan Harga ── */}
            <div className="space-y-4 p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-sm">Harga Foto</h3>
                <span className="text-xs text-muted-foreground">(berlaku untuk semua foto yang diupload)</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Jual Foto Ini</Label>
                  <p className="text-xs text-muted-foreground">Nonaktifkan untuk menjadikan foto gratis</p>
                </div>
                <Switch
                  checked={pricing.is_for_sale}
                  onCheckedChange={(v) => setPricing((p) => ({ ...p, is_for_sale: v }))}
                />
              </div>

              {pricing.is_for_sale && (
                <div className="pt-2 border-t">
                  <RupiahInput
                    id="price_cash"
                    label="Harga (Rupiah)"
                    value={pricing.price_cash}
                    onChange={(v) => setPricing((p) => ({ ...p, price_cash: v }))}
                    placeholder="50000"
                    step={1000}
                    hint="Masukkan kelipatan Rp 1.000 — set 0 untuk gratis"
                  />
                </div>
              )}

              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                pricing.is_for_sale ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"
              }`}>
                <div className={`p-1.5 rounded-full ${pricing.is_for_sale ? "bg-blue-100" : "bg-green-100"}`}>
                  {pricing.is_for_sale
                    ? <DollarSign className="h-4 w-4 text-blue-600" />
                    : <CheckCircle className="h-4 w-4 text-green-600" />
                  }
                </div>
                <div>
                  <p className={`text-sm font-semibold ${pricing.is_for_sale ? "text-blue-800" : "text-green-800"}`}>
                    {pricing.is_for_sale
                      ? `Harga: ${formatRupiah(pricing.price_cash)} per foto`
                      : "Foto dapat didownload gratis"}
                  </p>
                  <p className={`text-xs mt-0.5 ${pricing.is_for_sale ? "text-blue-600" : "text-green-600"}`}>
                    {pricing.is_for_sale && pricing.price_cash === 0
                      ? "⚠️ Harga 0 — pembeli bisa download gratis"
                      : pricing.is_for_sale
                      ? `Berlaku untuk ${previews.length || 0} foto yang dipilih`
                      : "Semua peserta event bisa download tanpa biaya"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Harga tidak dapat diubah setelah foto terjual.
                </p>
              </div>
            </div>

            {/* ── Progress Upload ── */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mengupload...</span>
                  <span className="font-semibold">{uploadedCount}/{previews.length}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── Tombol ── */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/photographer/my-photos`)}
                disabled={isUploading}
              >
                Batal
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleUpload}
                disabled={isUploadDisabled}
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Mengupload ({uploadedCount}/{previews.length})</>
                ) : (
                  <><Upload className="h-4 w-4" />Upload {previews.length > 0 ? `${previews.length} Foto` : "Foto"}</>
                )}
              </Button>
            </div>

          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default UploadPhoto;