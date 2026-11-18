import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import PhotographerHeader from "@/components/layout/HeaderPhoto";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { photographerService, PhotographerProfile } from "@/services/api/photographer.service";
import { useToast } from "@/hooks/use-toast";
import { Camera, Building, Link as LinkIcon, Loader2, CreditCard } from "lucide-react";

const PhotographerProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  
  const [formData, setFormData] = useState({
    business_name: "",
    bio: "",
    portfolio_url: "",
    bank_name: "",
    bank_account: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await photographerService.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setFormData({
          business_name: response.data.business_name || "",
          bio: response.data.bio || "",
          portfolio_url: response.data.portfolio_url || "",
          bank_name: response.data.bank_name || "",
          bank_account: response.data.bank_account || "",
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast({
        title: "Error",
        description: "Gagal memuat profil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await photographerService.updateProfile({
        business_name: formData.business_name || undefined,
        bio: formData.bio || undefined,
        portfolio_url: formData.portfolio_url || undefined,
        bank_name: formData.bank_name || undefined,
        bank_account: formData.bank_account || undefined,
      });

      if (response.success) {
        toast({
          title: "Berhasil",
          description: "Profil berhasil diperbarui",
        });
        fetchProfile();
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui profil",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PhotographerHeader />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PhotographerHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Profil Bisnis</h1>

        {/* Kartu Informasi Pengguna */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Informasi Akun
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">{profile?.full_name || user?.full_name}</p>
                <p className="text-muted-foreground">{profile?.email || user?.email}</p>
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulir Profil Bisnis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Detail Bisnis
            </CardTitle>
            <CardDescription>
              Perbarui informasi profil bisnis Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nama Bisnis</Label>
                <Input
                  id="business_name"
                  placeholder="Nama bisnis fotografi Anda"
                  value={formData.business_name}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Ceritakan kepada klien tentang gaya fotografi dan pengalaman Anda..."
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio_url" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  URL Portofolio
                </Label>
                <Input
                  id="portfolio_url"
                  type="url"
                  placeholder="https://portofolioanda.com"
                  value={formData.portfolio_url}
                  onChange={(e) => handleChange('portfolio_url', e.target.value)}
                />
              </div>

              {/* Informasi Pembayaran */}
              <div className="pt-4 border-t">
                <h3 className="font-medium flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4" />
                  Informasi Pembayaran
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Nama Bank</Label>
                    <Input
                      id="bank_name"
                      placeholder="mis. BCA, Mandiri"
                      value={formData.bank_name}
                      onChange={(e) => handleChange('bank_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_account">Nomor Rekening</Label>
                    <Input
                      id="bank_account"
                      placeholder="Nomor rekening bank Anda"
                      value={formData.bank_account}
                      onChange={(e) => handleChange('bank_account', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PhotographerProfilePage;