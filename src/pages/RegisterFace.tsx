import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import { BiometricLivenessScan } from "@/components/camera/BiometricLivenessScan";
import { BiometricCompleteResponse } from "@/services/api/ai.service";
import { useToast } from "@/hooks/use-toast";

const RegisterFace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userData = location.state as {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: "user" | "photographer";
  };

  if (!userData) {
    navigate("/register");
    return null;
  }

  const handleComplete = (_result: BiometricCompleteResponse) => {
      // ✅ Set flag: dashboard harus auto-load matched photos
      // Flag ini dibaca oleh UserDashboard & PhotoGallery saat pertama mount
      sessionStorage.setItem("auto_match_photos", "true");
      sessionStorage.setItem("auto_match_source", "register");

      toast({
        title: "Wajah terdaftar! 🎉",
        description: "Mencari foto-foto Anda sekarang...",
      });

      // Redirect ke gallery langsung (bukan dashboard) agar user langsung lihat foto
      if (userData.role === "photographer") {
        navigate("/photographer/dashboard");
      } else {
        // Langsung ke gallery dengan flag auto-match
        navigate("/user/photos", { state: { autoMatch: true } });
      }
  };

  const handleSkip = () => {
    toast({
      title: "Info",
      description: "Anda dapat mendaftarkan wajah nanti di pengaturan profil.",
    });

    if (userData.role === "photographer") {
      navigate("/photographer/dashboard");
    } else {
      navigate("/user/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
      <div className="w-full max-w-lg">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Pendaftaran
        </Link>

        <Card className="shadow-strong border-border/50">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">Daftarkan Wajah Anda</CardTitle>
            </div>
            <CardDescription>
              Ambil foto wajah Anda — setelah itu kami langsung carikan foto Anda dari semua event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress steps */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">✓</span>
                Data diri
              </span>
              <div className="h-px flex-1 bg-border" />
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <span className="h-5 w-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">2</span>
                Daftarkan wajah
              </span>
              <div className="h-px flex-1 bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">3</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Lihat foto Anda
                </span>
              </span>
            </div>

            <BiometricLivenessScan onComplete={handleComplete} />

            {/* What happens next */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
              <p className="font-medium text-blue-800 flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                Setelah mendaftar, kami otomatis:
              </p>
              <ul className="text-blue-700 space-y-0.5 text-xs list-disc list-inside">
                <li>Mencocokkan wajah Anda dengan semua foto event</li>
                <li>Langsung menampilkan galeri foto personal Anda</li>
                <li>Tidak perlu klik apapun lagi</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h3 className="font-medium text-sm">Tips untuk hasil terbaik:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Pastikan pencahayaan yang baik pada wajah Anda</li>
                <li>Lihat langsung ke kamera</li>
                <li>Lepaskan kacamata hitam atau penutup wajah</li>
                <li>Pastikan wajah Anda berada di tengah lingkaran</li>
              </ul>
            </div>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={handleSkip}
            >
              Lewati, daftarkan nanti
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterFace;