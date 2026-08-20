import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock, Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/api/auth.service";

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<'otp' | 'success'>('otp');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Form states
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer for OTP expiry — backend generates OTP dengan masa berlaku 15
  // menit (lihat RequestPasswordReset: DATE_ADD(NOW(), INTERVAL 15 MINUTE)),
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Ambil email dari sessionStorage yang diisi ForgotPassword.tsx. Kalau
  // nggak ada (misal user langsung buka /reset-password tanpa lewat form),
  // nggak ada cara buat tau OTP ini punya siapa — lempar balik.
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('reset_email');
    if (!storedEmail) {
      toast({
        title: "❌ Sesi Tidak Ditemukan",
        description: "Silakan mulai lagi dari halaman lupa password.",
        variant: "destructive",
      });
      navigate('/forgot-password');
      return;
    }
    setEmail(storedEmail);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast({
        title: "❌ OTP Tidak Lengkap",
        description: "Silakan masukkan 6 digit kode OTP.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "❌ Password Tidak Cocok",
        description: "Password dan konfirmasi password harus sama.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "❌ Password Terlalu Pendek",
        description: "Password minimal 8 karakter.",
        variant: "destructive",
      });
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast({
        title: "⚠️ Password Lemah",
        description: "Password harus mengandung huruf besar, huruf kecil, dan angka.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await authService.confirmPasswordReset(email, otpCode, password);

      if (response.success) {
        setStep('success');
        sessionStorage.removeItem('reset_email');
        toast({
          title: "✅ Berhasil!",
          description: "Password Anda berhasil direset.",
        });
      } else {
        throw new Error(response.error || 'Reset password gagal');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: "❌ Reset Gagal",
        description: error.response?.data?.error || error.message || "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      await authService.requestPasswordReset(email);
      setTimeLeft(15 * 60);
      setOtp(["", "", "", "", "", ""]);
      toast({
        title: "✅ OTP Terkirim",
        description: "Kode OTP baru telah dikirim ke email Anda.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Gagal Kirim OTP",
        description: error.response?.data?.error || "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
        <Card className="w-full max-w-md shadow-strong">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Password Berhasil Direset!</CardTitle>
            <CardDescription className="text-base">
              Anda sekarang bisa login dengan password baru Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Selamat!</strong> Password Anda telah berhasil diubah. Silakan login dengan password baru Anda.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => navigate('/login')}
              className="w-full"
              size="lg"
            >
              Login Sekarang
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Pastikan Anda mengingat password baru Anda</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-strong">
          <CardHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Masukkan kode OTP yang dikirim ke <strong>{email ? maskEmail(email) : '...'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* OTP Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Kode OTP (6 Digit)
                </Label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className="w-12 h-12 text-center text-lg font-semibold"
                      disabled={loading}
                      required
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`text-muted-foreground ${timeLeft < 60 ? 'text-red-600 font-semibold' : ''}`}>
                    ⏱️ Kadaluarsa dalam: {formatTime(timeLeft)}
                  </span>
                  {timeLeft > 0 ? (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-primary hover:underline font-medium"
                      disabled={resending}
                    >
                      {resending ? 'Mengirim...' : 'Kirim Ulang'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-red-600 font-semibold hover:underline"
                      disabled={resending}
                    >
                      {resending ? 'Mengirim...' : 'OTP Kadaluarsa — Kirim Ulang'}
                    </button>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`h-1 flex-1 rounded ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={password.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}>
                        {password.length >= 8 ? '✓' : '○'} 8 karakter
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`h-1 flex-1 rounded ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                        {/[A-Z]/.test(password) && /[a-z]/.test(password) ? '✓' : '○'} Huruf besar & kecil
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`h-1 flex-1 rounded ${/\d/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={/\d/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                        {/\d/.test(password) ? '✓' : '○'} Angka
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Masukkan kembali password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                    {password === confirmPassword ? '✓ Password cocok' : '✗ Password tidak cocok'}
                  </p>
                )}
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-xs">
                  <strong>Tips Keamanan:</strong> Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, dan angka. Jangan gunakan password yang mudah ditebak.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mereset Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
              <Link
                to="/forgot-password"
                className="block text-primary hover:underline"
              >
                ← Kembali ke halaman reset password
              </Link>
              <Link
                to="/login"
                className="block text-muted-foreground hover:text-foreground"
              >
                Sudah punya akun? Login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mt-4 bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Keamanan Akun</h4>
                <p className="text-xs text-muted-foreground">
                  Jika Anda tidak meminta reset password, segera hubungi tim support kami untuk mengamankan akun Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;