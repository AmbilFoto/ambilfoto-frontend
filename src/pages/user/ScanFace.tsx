import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BiometricLivenessScan } from "@/components/camera/BiometricLivenessScan";
import HeaderDash from "@/components/layout/HeaderDash";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BiometricCompleteResponse } from "@/services/api/ai.service";

const ScanFace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = (result: BiometricCompleteResponse) => {
    const photoCount = result.matched_photos;
    toast({
      title: photoCount > 0 ? "Foto ditemukan! 🎉" : "Wajah terverifikasi",
      description: photoCount > 0
        ? `Kami menemukan ${photoCount} foto Anda`
        : "Belum ada foto yang cocok. Foto baru akan dicocokkan otomatis.",
    });
    sessionStorage.setItem("auto_match_photos", "true");
    sessionStorage.setItem("auto_match_source", "biometric_liveness");
    navigate("/user/photos", { state: { autoMatch: true } });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderDash />
      
      <main className="flex-1 py-8">
        <div className="container max-w-2xl">
          <Link 
            to="/user/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>
          
          <Card className="shadow-strong border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">Pindai Wajah Anda</CardTitle>
              <CardDescription>
                Posisikan wajah Anda dengan jelas di kamera untuk menemukan semua foto Anda secara otomatis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BiometricLivenessScan onComplete={handleComplete} />
              
              <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2">
                <h3 className="font-medium text-sm">Tips untuk hasil terbaik:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Pastikan pencahayaan yang baik pada wajah Anda</li>
                  <li>Lihat langsung ke kamera</li>
                  <li>Lepaskan kacamata hitam atau penutup wajah</li>
                  <li>Pastikan wajah Anda berada di tengah lingkaran</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ScanFace;