import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, Upload, AlertCircle, CheckCircle, ArrowLeft, 
  FileText, User, Building, Phone, Link2, CreditCard, Image as ImageIcon,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { photographerUpgradeService } from "@/services/api/photographer.upgrade.service";
import { LocationSelector } from "@/components/LocationSelector";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const PhotographerUpgradeRequest = () => {
  const [formData, setFormData] = useState({
    ktp_number: "",
    ktp_name: "",
    business_name: "",
    business_address: "",
    business_phone: "",
    portfolio_url: "",
  });
  
  // 🆕 NEW: Location state
  const [locationData, setLocationData] = useState<{
    province_id: string;
    province_name: string;
    city_id: string;
    city_name: string;
  } | null>(null);
  
  const [ktpImage, setKtpImage] = useState<string>("");
  const [ktpPreview, setKtpPreview] = useState<string>("");
  const [faceImage, setFaceImage] = useState<string>("");
  const [facePreview, setFacePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'location' | 'ktp' | 'face' | 'review'>('form');
  
  const ktpInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleKtpImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Ukuran file maksimal 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setKtpImage(base64);
      setKtpPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFaceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Ukuran file maksimal 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFaceImage(base64);
      setFacePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const validateKtpNumber = (ktp: string): boolean => {
    const ktpRegex = /^\d{16}$/;
    return ktpRegex.test(ktp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ktpNumber = formData.ktp_number.trim();
    const ktpName = formData.ktp_name.trim();
    const businessName = formData.business_name.trim();
    const businessAddress = formData.business_address.trim();
    const businessPhone = formData.business_phone.trim();

    // Validation
    if (!ktpName || !businessName || !businessAddress || !businessPhone) {
      toast({
        title: "Error",
        description: "Nama KTP dan semua informasi bisnis wajib diisi",
        variant: "destructive",
      });
      return;
    }

    if (!validateKtpNumber(ktpNumber)) {
      toast({
        title: "Error",
        description: "Nomor KTP harus 16 digit",
        variant: "destructive",
      });
      return;
    }

    if (!ktpImage) {
      toast({
        title: "Error",
        description: "Foto KTP wajib diunggah",
        variant: "destructive",
      });
      return;
    }

    if (!faceImage) {
      toast({
        title: "Error",
        description: "Foto selfie dengan KTP wajib diunggah",
        variant: "destructive",
      });
      return;
    }

    if (businessPhone.length < 10) {
      toast({
        title: "Error",
        description: "Nomor telepon bisnis tidak valid",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const photoKeys = await photographerUpgradeService.uploadUpgradePhotos(ktpImage, faceImage);
      // 🆕 NEW: Include location in submission
      const response = await photographerUpgradeService.submitUpgradeRequest({
        ktp_number: ktpNumber,
        ktp_name: ktpName,
        ...photoKeys,
        business_name: businessName,
        business_address: businessAddress,
        business_phone: businessPhone,
        portfolio_url: formData.portfolio_url.trim() || undefined,
        // Add location data if available
        ...(locationData && {
          province_id: String(locationData.province_id),
          province_name: locationData.province_name,
          city_id: String(locationData.city_id),
          city_name: locationData.city_name,
        }),
      });

      if (response.success) {
        toast({
          title: "Berhasil!",
          description: response.data?.is_resubmission 
            ? `Re-submission berhasil (Percobaan #${response.data.attempt_number})`
            : "Permintaan upgrade berhasil dikirim dan sedang dalam review",
        });
        
        navigate('/user/upgrade-status');
      } else {
        throw new Error(response.error || 'Submit gagal');
      }
    } catch (error: any) {
      toast({
        title: "Gagal mengirim permintaan",
        description: error.response?.data?.error || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/user/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Upgrade ke Photographer</h1>
          <p className="text-muted-foreground">
            Lengkapi formulir dan unggah dokumen untuk memulai proses verifikasi
          </p>
        </div>

        {/* Progress Steps - 🆕 Added location step */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto">
          {[
            { id: 'form', label: 'Data Bisnis', icon: Building },
            { id: 'location', label: 'Lokasi', icon: MapPin },
            { id: 'ktp', label: 'Upload KTP', icon: CreditCard },
            { id: 'face', label: 'Selfie KTP', icon: Camera },
            { id: 'review', label: 'Review', icon: CheckCircle }
          ].map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex flex-col items-center flex-1 ${
                step === s.id ? 'text-primary' : 'text-muted-foreground'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  step === s.id ? 'bg-primary text-white' : 'bg-muted'
                }`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium hidden md:block">{s.label}</span>
              </div>
              {idx < 4 && (
                <div className={`h-0.5 flex-1 mx-2 ${
                  ['location', 'ktp', 'face', 'review'].indexOf(step) > idx - 1 ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Form Data */}
          {step === 'form' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Informasi Bisnis
                </CardTitle>
                <CardDescription>
                  Masukkan detail bisnis fotografi Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ktp_number">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Nomor KTP
                    </Label>
                    <Input
                      id="ktp_number"
                      placeholder="3201234567890123"
                      value={formData.ktp_number}
                      onChange={handleChange}
                      maxLength={16}
                      required
                    />
                    <p className="text-xs text-muted-foreground">16 digit angka</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ktp_name">
                      <User className="h-4 w-4 inline mr-1" />
                      Nama Sesuai KTP
                    </Label>
                    <Input
                      id="ktp_name"
                      placeholder="Nama lengkap di KTP"
                      value={formData.ktp_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name">
                    <Building className="h-4 w-4 inline mr-1" />
                    Nama Bisnis
                  </Label>
                  <Input
                    id="business_name"
                    placeholder="Contoh: Studio Foto Bahagia"
                    value={formData.business_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_address">
                    Alamat Bisnis
                  </Label>
                  <Textarea
                    id="business_address"
                    placeholder="Alamat lengkap studio/bisnis fotografi"
                    value={formData.business_address}
                    onChange={handleChange}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_phone">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Nomor Telepon Bisnis
                    </Label>
                    <Input
                      id="business_phone"
                      type="tel"
                      placeholder="08123456789"
                      value={formData.business_phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio_url">
                      <Link2 className="h-4 w-4 inline mr-1" />
                      Portfolio URL (Opsional)
                    </Label>
                    <Input
                      id="portfolio_url"
                      type="url"
                      placeholder="https://instagram.com/yourportfolio"
                      value={formData.portfolio_url}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <Button 
                  type="button" 
                  className="w-full" 
                  onClick={() => setStep('location')}
                  disabled={
                    !formData.ktp_number.trim() ||
                    !formData.ktp_name.trim() ||
                    !formData.business_name.trim() ||
                    !formData.business_address.trim() ||
                    !formData.business_phone.trim()
                  }
                >
                  Lanjut ke Lokasi
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 🆕 NEW: Step 2 - Location Selection */}
          {step === 'location' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Lokasi Domisili
                </CardTitle>
                <CardDescription>
                  Pilih provinsi dan kota tempat bisnis Anda beroperasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Opsional namun disarankan:</strong>
                    <p className="mt-1 text-sm">
                      Data lokasi membantu admin melihat sebaran photographer di Indonesia dan mempermudah user mencari photographer di area mereka.
                    </p>
                  </AlertDescription>
                </Alert>

                <LocationSelector
                  onLocationChange={setLocationData}
                  required={false}
                />

                {locationData && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      Lokasi terpilih: <strong>{locationData.city_name}, {locationData.province_name}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('form')} className="flex-1">
                    Kembali
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep('ktp')} 
                    className="flex-1"
                  >
                    {locationData ? 'Lanjut ke Upload KTP' : 'Lewati & Lanjut'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Upload KTP */}
          {step === 'ktp' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Upload Foto KTP
                </CardTitle>
                <CardDescription>
                  Pastikan foto KTP jelas dan dapat dibaca
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tips foto KTP yang baik:</strong>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      <li>Pastikan pencahayaan baik dan tidak ada bayangan</li>
                      <li>Foto seluruh bagian KTP dengan jelas</li>
                      <li>Hindari pantulan cahaya/silau</li>
                      <li>Semua teks harus dapat dibaca</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => ktpInputRef.current?.click()}
                >
                  {ktpPreview ? (
                    <div className="space-y-4">
                      <img src={ktpPreview} alt="KTP Preview" className="max-h-64 mx-auto rounded-lg" />
                      <Button type="button" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        setKtpImage("");
                        setKtpPreview("");
                      }}>
                        Ganti Foto
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">Klik untuk upload foto KTP</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG maksimal 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={ktpInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleKtpImageUpload}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('location')} className="flex-1">
                    Kembali
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep('face')} 
                    disabled={!ktpImage}
                    className="flex-1"
                  >
                    Lanjut ke Selfie
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Upload Face/Selfie */}
          {step === 'face' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Selfie dengan KTP
                </CardTitle>
                <CardDescription>
                  Ambil foto selfie Anda sambil memegang KTP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tips selfie yang baik:</strong>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      <li>Wajah dan KTP harus terlihat jelas</li>
                      <li>Pencahayaan yang baik di wajah</li>
                      <li>Posisi KTP di samping wajah</li>
                      <li>Fokus kamera pada wajah dan KTP</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => faceInputRef.current?.click()}
                >
                  {facePreview ? (
                    <div className="space-y-4">
                      <img src={facePreview} alt="Selfie Preview" className="max-h-64 mx-auto rounded-lg" />
                      <Button type="button" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        setFaceImage("");
                        setFacePreview("");
                      }}>
                        Ganti Foto
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">Klik untuk ambil foto selfie</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG maksimal 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={faceInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFaceImageUpload}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('ktp')} className="flex-1">
                    Kembali
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep('review')} 
                    disabled={!faceImage}
                    className="flex-1"
                  >
                    Lanjut ke Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Review & Kirim
                </CardTitle>
                <CardDescription>
                  Periksa kembali semua informasi sebelum mengirim
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Info */}
                <div>
                  <h3 className="font-semibold mb-3">Informasi Bisnis</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nomor KTP</p>
                      <p className="font-medium">{formData.ktp_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nama di KTP</p>
                      <p className="font-medium">{formData.ktp_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nama Bisnis</p>
                      <p className="font-medium">{formData.business_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telepon</p>
                      <p className="font-medium">{formData.business_phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground">Alamat</p>
                      <p className="font-medium">{formData.business_address}</p>
                    </div>
                    {formData.portfolio_url && (
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground">Portfolio</p>
                        <a href={formData.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {formData.portfolio_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🆕 NEW: Location Info */}
                {locationData && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Lokasi Domisili
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Provinsi</p>
                        <p className="font-medium">{locationData.province_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Kota/Kabupaten</p>
                        <p className="font-medium">{locationData.city_name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Uploaded Images */}
                <div>
                  <h3 className="font-semibold mb-3">Dokumen yang Diunggah</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Foto KTP</p>
                      <img src={ktpPreview} alt="KTP" className="rounded-lg border" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Selfie dengan KTP</p>
                      <img src={facePreview} alt="Selfie" className="rounded-lg border" />
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Dengan mengirim permintaan ini, Anda menyatakan bahwa semua informasi yang diberikan adalah benar dan akurat.
                    Proses verifikasi akan dilakukan oleh tim kami dalam 1-3 hari kerja.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('face')} className="flex-1" disabled={loading}>
                    Kembali
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Mengirim..." : "Kirim Permintaan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default PhotographerUpgradeRequest;