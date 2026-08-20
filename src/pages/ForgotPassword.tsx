import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/api/auth.service";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Email Tidak Valid",
        description: "Silakan masukkan alamat email yang valid.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // ✅ FIX: sebelumnya manggil authApi.post() langsung dari komponen.
      // Sekarang lewat authService, konsisten sama semua flow auth lain.
      const response = await authService.requestPasswordReset(email.trim());

      if (response.success) {
        setSent(true);
        toast({
          title: "✅ Email Terkirim",
          description: "Silakan cek email Anda untuk instruksi reset password.",
        });

        // Save email for resend functionality
        sessionStorage.setItem('reset_email', email.trim());
      }
    } catch (error: any) {
      console.error('Password reset request error:', error);
      
      // Even on error, show success message (anti-enumeration)
      // But show actual error in development
      if (process.env.NODE_ENV === 'development') {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Terjadi kesalahan. Silakan coba lagi.",
          variant: "destructive",
        });
      } else {
        // In production, always show success to prevent email enumeration
        setSent(true);
        toast({
          title: "✅ Email Terkirim",
          description: "Jika email terdaftar, Anda akan menerima instruksi reset password.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setSent(false);
    setEmail(sessionStorage.getItem('reset_email') || '');
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
        <Card className="w-full max-w-md shadow-strong">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Email Terkirim!</CardTitle>
            <CardDescription className="text-base">
              Kami telah mengirimkan link reset password ke email Anda. Silakan cek inbox atau folder spam Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Link akan kadaluarsa dalam 1 jam.</strong>
                <br />
                Jika Anda tidak melihat email, cek folder spam atau junk.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={handleResend} 
                variant="outline" 
                className="w-full"
              >
                Kirim Ulang Email
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Kembali ke Login
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>Belum menerima email?</p>
              <button 
                onClick={handleResend}
                className="text-primary hover:underline font-medium"
              >
                Klik di sini untuk kirim ulang
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/login" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Login
        </Link>
        
        <Card className="shadow-strong">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Lupa Password?</CardTitle>
            <CardDescription>
              Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Alamat Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Masukkan email yang terdaftar di akun Anda
                </p>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-xs">
                  <strong>Catatan:</strong> Pastikan email yang Anda masukkan sudah terdaftar di sistem kami. Link reset akan dikirim ke email tersebut.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Link Reset Password"
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Atau
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Ingat password Anda?{" "}
                <Link 
                  to="/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Login
                </Link>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <Link 
                  to="/register" 
                  className="text-primary hover:underline font-medium"
                >
                  Daftar Sekarang
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-4 bg-muted/50">
          <CardContent className="pt-6">
            <h4 className="text-sm font-semibold mb-2">Butuh Bantuan?</h4>
            <p className="text-xs text-muted-foreground">
              Jika Anda mengalami masalah saat reset password, silakan hubungi tim support kami di{" "}
              <a href="mailto:support@ambilfoto.id" className="text-primary hover:underline">
                support@ambilfoto.id
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;