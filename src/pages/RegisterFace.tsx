import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { FaceCamera } from "@/components/camera/FaceCamera";
import { useToast } from "@/hooks/use-toast";
import { aiService, type BiometricStart } from "@/services/api/ai.service";

const challengeLabel = (value?: string) => {
  const key = (value || "").toUpperCase();
  const labels: Record<string, string> = {
    CENTER: "Lihat lurus ke kamera",
    LEFT: "Putar wajah ke kiri",
    RIGHT: "Putar wajah ke kanan",
    UP: "Arahkan wajah sedikit ke atas",
    DOWN: "Arahkan wajah sedikit ke bawah",
    BLINK: "Kedipkan mata",
    SMILE: "Tersenyum",
  };
  return labels[key] || "Ikuti instruksi dan posisikan wajah di kamera";
};

const RegisterFace = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [session, setSession] = useState<BiometricStart | null>(null);
  const [challenge, setChallenge] = useState("");
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userData = location.state as {
    email: string; password: string; full_name: string; phone?: string;
    role?: "user" | "photographer";
  };

  useEffect(() => {
    if (!userData) { navigate("/register"); return; }
    let active = true;
    aiService.startBiometricEnrollment()
      .then((result) => {
        if (!active) return;
        setSession(result);
        setChallenge(result.challenge?.[0] || "CENTER");
      })
      .catch((error: any) => toast({
        title: "Tidak dapat memulai verifikasi wajah",
        description: error?.response?.data?.error || error.message,
        variant: "destructive",
      }))
      .finally(() => active && setIsStarting(false));
    return () => { active = false; };
  }, []);

  if (!userData) return null;

  const handleCapture = async (imageData: string) => {
    if (!session || !challenge || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await aiService.submitBiometricFrame(session.session_id, challenge, imageData);
      setProgress(result.pose_progress || progress);
      if (result.done) {
        const completed = await aiService.completeBiometricEnrollment(session.session_id);
        sessionStorage.setItem("auto_match_photos", "true");
        sessionStorage.setItem("auto_match_source", "register");
        toast({
          title: "Biometrik berhasil didaftarkan",
          description: `${completed.matched_photos || 0} foto cocok ditemukan. Liveness ${completed.liveness_status}.`,
        });
        if (userData.role === "photographer") navigate("/photographer/dashboard");
        else navigate("/user/photos", { state: { autoMatch: true } });
        return;
      }
      setChallenge(result.next_challenge || challenge);
      toast({ title: "Tantangan diterima", description: result.message || "Lanjutkan ke instruksi berikutnya." });
    } catch (error: any) {
      toast({
        title: "Verifikasi belum berhasil",
        description: error?.response?.data?.error || error.message || "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const restart = async () => {
    setIsStarting(true);
    setSession(null);
    setChallenge("");
    setProgress(0);
    try {
      const result = await aiService.startBiometricEnrollment();
      setSession(result);
      setChallenge(result.challenge?.[0] || "CENTER");
    } catch (error: any) {
      toast({ title: "Gagal memulai ulang", description: error?.message, variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSkip = () => {
    toast({ title: "Info", description: "Anda dapat mendaftarkan biometrik nanti dari pengaturan profil." });
    if (userData.role === "photographer") navigate("/photographer/dashboard");
    else navigate("/user/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
      <div className="w-full max-w-lg">
        <Link to="/register" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Pendaftaran
        </Link>
        <Card className="shadow-strong border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Daftarkan Biometrik Wajah</CardTitle>
            <CardDescription>
              Ikuti beberapa instruksi gerakan wajah. Template biometrik diproses dan disimpan hanya oleh Python AI Platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/40 p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Instruksi saat ini</p>
              <p className="font-semibold">{challengeLabel(challenge)}</p>
              <p className="text-xs text-muted-foreground">Progres: {Math.round(progress * 100)}%</p>
            </div>
            {isStarting ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan sesi biometrik...
              </div>
            ) : session ? (
              <FaceCamera onCapture={handleCapture} mode="register" isProcessing={isProcessing} />
            ) : (
              <Button className="w-full" onClick={restart}>Mulai ulang sesi biometrik</Button>
            )}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
              <p className="font-medium text-blue-800 flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5" /> Verifikasi keamanan
              </p>
              <ul className="text-blue-700 space-y-0.5 text-xs list-disc list-inside">
                <li>Ikuti instruksi gerakan wajah satu per satu</li>
                <li>Pastikan pencahayaan cukup dan wajah terlihat jelas</li>
                <li>Embedding dan template biometrik tidak dikirim ke Auth Service atau browser</li>
              </ul>
            </div>
            <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={handleSkip} disabled={isProcessing}>
              Lewati, daftarkan nanti
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterFace;
