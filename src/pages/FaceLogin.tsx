import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { FaceCamera } from "@/components/camera/FaceCamera";
import { useAuth } from "@/contexts/AuthContext";

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

const FaceLogin = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // ============================
  // TURNSTILE STATE
  // ============================
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const { loginWithFace, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ============================
  // Redirect jika sudah login
  // ============================
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/user/photos");
    }
  }, [isAuthenticated, navigate]);

  // ============================
  // Load Turnstile Script
  // ============================
  useEffect(() => {
    if (document.getElementById("cf-turnstile-script")) {
      if ((window as any).turnstile) {
        setTurnstileReady(true);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setTurnstileReady(true);
    document.head.appendChild(script);

    return () => {
      if (turnstileWidgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetIdRef.current);
      }
    };
  }, []);

  // ============================
  // Render Turnstile
  // ============================
  useEffect(() => {
    if (!turnstileReady || !turnstileRef.current) return;
    if (turnstileWidgetId) return;

    const widgetId = (window as any).turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      language: "id",
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      "expired-callback": () => {
        setTurnstileToken(null);
      },
      "error-callback": () => {
        setTurnstileToken(null);
      },
    });

    turnstileWidgetIdRef.current = widgetId;
    setTurnstileWidgetId(widgetId);
  }, [turnstileReady]);

  // ============================
  // Reset Turnstile
  // ============================
  const resetTurnstile = () => {
    if (turnstileWidgetId && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId);
    }
    setTurnstileToken(null);
  };

  // ============================
  // Handle Face Capture
  // ============================
  const handleCapture = async (imageData: string) => {
    if (!turnstileToken) return;

    setIsProcessing(true);

    try {
      const result = await loginWithFace(imageData, turnstileToken);

      sessionStorage.setItem("auto_match_photos", "true");
      sessionStorage.setItem("auto_match_source", "face_login");

      const role =
        (result as any)?.user?.role || (result as any)?.role;

      if (role === "photographer") {
        navigate("/photographer/dashboard");
      } else {
        navigate("/user/photos", { state: { autoMatch: true } });
      }
    } catch (error) {
      resetTurnstile(); // token hanya bisa dipakai sekali
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
      <div className="w-full max-w-lg">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Login
        </Link>

        <Card className="shadow-strong border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              Masuk dengan Pengenalan Wajah
            </CardTitle>
            <CardDescription>
              Posisikan wajah Anda dalam bingkai — galeri foto Anda langsung tampil setelah login
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ✅ Turnstile */}
            <div className="flex justify-center">
              <div ref={turnstileRef} />
              {!turnstileReady && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat verifikasi keamanan...
                </div>
              )}
            </div>

            {/* Face Camera */}
            <FaceCamera
              onCapture={handleCapture}
              mode="scan"
              isProcessing={isProcessing || !turnstileToken}
            />

            <p className="text-xs text-center text-muted-foreground">
              Data wajah Anda dienkripsi dan tidak akan pernah dibagikan.
              Kami menggunakannya hanya untuk memverifikasi identitas Anda.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FaceLogin;