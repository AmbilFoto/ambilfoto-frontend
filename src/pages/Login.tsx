import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Scan, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectParam = new URLSearchParams(location.search).get("redirect");

  // =============================================
  // Load Cloudflare Turnstile script
  // =============================================
  useEffect(() => {
    // Cek apakah script sudah ada
    if (document.getElementById("cf-turnstile-script")) {
      if ((window as any).turnstile) {
        setTurnstileReady(true);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setTurnstileReady(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup widget saat unmount
      if (turnstileWidgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetIdRef.current);
      }
    };
  }, []);

  // =============================================
  // Render Turnstile widget setelah script ready
  // =============================================
  useEffect(() => {
    if (!turnstileReady || !turnstileRef.current) return;

    // Hindari render ganda
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

  // =============================================
  // Redirect jika sudah login
  // =============================================
  useEffect(() => {
    if (isAuthenticated && user) {
      handlePostLoginRedirect(user.role);
    }
  }, [isAuthenticated, user]);

  const handlePostLoginRedirect = (role: string) => {
    if (redirectParam) {
      navigate(redirectParam, { replace: true });
      return;
    }
    switch (role) {
      case "photographer":
        navigate("/photographer/dashboard", { replace: true });
        break;
      case "admin":
        navigate("/admin/dashboard", { replace: true });
        break;
      default:
        navigate("/user/dashboard", { replace: true });
    }
  };

  // =============================================
  // Reset Turnstile widget
  // =============================================
  const resetTurnstile = () => {
    if (turnstileWidgetId && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId);
    }
    setTurnstileToken(null);
  };

  // =============================================
  // Handle Login Submit
  // =============================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) return;

    setLoading(true);
    setRemainingAttempts(null);

    try {
      const result = await login(email, password, turnstileToken);

      if (result?.user) {
        handlePostLoginRedirect(result.user.role);
      }
    } catch (error: any) {
      // Reset turnstile setelah gagal (token hanya bisa dipakai sekali)
      resetTurnstile();

      if (error.response?.data?.remainingAttempts !== undefined) {
        setRemainingAttempts(error.response.data.remainingAttempts);
      }
      // Toast error sudah dihandle di AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center w-full transition-all duration-200 hover:opacity-80"
        >
          <img
            src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png"
            alt="AmbilFoto.id Logo"
            className="h-24 mx-auto w-auto"
          />
        </Link>

        <Card className="shadow-strong border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Selamat Datang!</CardTitle>
            <CardDescription>
              {redirectParam?.includes("/developer/checkout")
                ? "Masuk dulu untuk melanjutkan pembayaran paket API"
                : "Masuk ke akun kamu"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Failed Attempts Warning */}
            {remainingAttempts !== null && remainingAttempts < 5 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {remainingAttempts === 0 ? (
                    <strong>
                      Akun terkunci sementara. Silakan coba lagi nanti atau
                      reset password Anda.
                    </strong>
                  ) : (
                    <>
                      <strong>Percobaan login gagal!</strong>
                      <br />
                      Sisa percobaan:{" "}
                      <strong>{remainingAttempts}</strong> kali lagi
                      {remainingAttempts <= 2 && (
                        <div className="mt-2">
                          <Link
                            to="/forgot"
                            className="underline font-semibold"
                          >
                            Lupa password? Klik di sini
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    disabled={loading}
                  />
                  <span className="text-muted-foreground">Ingat saya</span>
                </label>
                <Link
                  to="/forgot"
                  className="text-primary hover:underline font-medium"
                >
                  Lupa kata sandi?
                </Link>
              </div>

              {/* ✅ Cloudflare Turnstile Widget */}
              <div className="flex justify-center">
                <div ref={turnstileRef} />
                {!turnstileReady && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat verifikasi keamanan...
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !turnstileToken}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Atau</span>
              </div>
            </div>

            {/* Face Login */}
            <Link to="/login/face">
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                size="lg"
              >
                <Scan className="mr-2 h-4 w-4" />
                Masuk dengan Face Scan
              </Button>
            </Link>

            {/* Register Link */}
            <p className="text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link
                to={
                  redirectParam
                    ? `/register?redirect=${encodeURIComponent(redirectParam)}`
                    : "/register"
                }
                className="text-primary hover:underline font-medium"
              >
                Daftar
              </Link>
            </p>

            {/* Cloudflare Branding (opsional, tapi bagus untuk UX) */}
            <p className="text-center text-xs text-muted-foreground/60">
              <a
                href="https://www.cloudflare.com/products/turnstile/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;