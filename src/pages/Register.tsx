import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/api/auth.service";

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get("redirect");

  // =============================================
  // Redirect jika sudah login
  // =============================================
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/user/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // =============================================
  // Load Cloudflare Turnstile script
  // =============================================
  useEffect(() => {
    if (document.getElementById("cf-turnstile-script")) {
      if ((window as any).turnstile) setTurnstileReady(true);
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
      if (turnstileWidgetId && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetId);
      }
    };
  }, []);

  // =============================================
  // Render Turnstile widget setelah script ready
  // =============================================
  useEffect(() => {
    if (!turnstileReady || !turnstileRef.current || turnstileWidgetId) return;

    const widgetId = (window as any).turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      language: "id",
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(null),
      "error-callback": () => setTurnstileToken(null),
    });

    setTurnstileWidgetId(widgetId);
  }, [turnstileReady]);

  const resetTurnstile = () => {
    if (turnstileWidgetId && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId);
    }
    setTurnstileToken(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // =============================================
  // Handle Register Submit
  // =============================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" });
      return;
    }
    if (formData.password.length < 8) {
      toast({ title: "Error", description: "Password minimal 8 karakter", variant: "destructive" });
      return;
    }
    if (!turnstileToken) {
      toast({ title: "Error", description: "Silakan selesaikan verifikasi keamanan", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const res = await authService.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.name,
        phone: formData.phone,
        role: 'user',
        captcha_token: turnstileToken, // ✅ Kirim token Turnstile
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Register failed');
      }

      localStorage.setItem('auth_token', res.data.token);

      toast({ title: "Berhasil!", description: "Akun berhasil dibuat. Silakan daftarkan wajah Anda." });

      navigate('/register/face', {
        state: {
          userId: res.data.user.id,
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          phone: formData.phone,
          role: 'user',
        }
      });

    } catch (err: any) {
      resetTurnstile(); // ← Reset widget setelah gagal
      toast({
        title: "Register gagal",
        description: err.response?.data?.error || err.message || "Terjadi kesalahan saat mendaftar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img
            src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png"
            alt="AmbilFoto.id Logo"
            className="h-24 mx-auto w-auto"
          />
        </Link>

        <Card className="shadow-strong border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Daftar Akun</CardTitle>
            <CardDescription>
              Buat akun baru untuk mulai menggunakan AmbilFoto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  minLength={3}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08123456789"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Masukkan kembali password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-900">
                  💡 <strong>Ingin jadi Photographer?</strong> Anda dapat upgrade ke akun photographer setelah registrasi selesai.
                </p>
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

              <div className="text-xs text-muted-foreground">
                Dengan membuat akun, Anda setuju dengan{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                dan{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !turnstileToken}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mendaftarkan Akun...
                  </>
                ) : (
                  "Daftar Akun"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link
                to={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
                className="text-primary hover:underline font-medium"
              >
                Masuk
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;