import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBayanOpenAuth } from '@/contexts/BayanOpenAuthContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';

const BAYAN_OPEN_LOGO =
  'https://res.cloudinary.com/viecqvpk/image/upload/q_auto/f_auto/v1787043179/LOGO_BO2026_WHITEALL_fjymjq.png';
const AMBILFOTO_LOGO =
  'https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png';

const BayanOpenLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isCheckingAuth, login } = useBayanOpenAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/clientarea/bayan-open';

  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingAuth, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error === 'Invalid email or password' ? 'Invalid email or password' : res.error ?? 'Terjadi kesalahan.');
      return;
    }
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Left — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-center px-16 overflow-hidden bg-[#0B2C57]">
        {/* decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* soft glow */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#2E7BC4]/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#0B2C57] blur-2xl" />

        <div className="relative z-10 max-w-md">
          <img src={BAYAN_OPEN_LOGO} alt="Bayan Open" className="h-28 w-auto mb-6" />

          <span className="text-sm font-medium tracking-wide text-[#7FB2E8]">
            AmbilFoto.id Client Portal
          </span>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-white">
            Statistik & Galeri Foto
            <br />
            Bayan Open <span className="text-[#7FB2E8]">2026</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70 max-w-sm">
            Akses statistik, tren, dan galeri foto untuk memantau aktivitas foto event perusahaanmu.
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* logo shown on mobile only, where left panel is hidden */}
          <img src={BAYAN_OPEN_LOGO} alt="Bayan Open" className="h-12 w-auto mb-8 lg:hidden" />

          <h2 className="text-2xl font-bold text-[#0B2C57]">Masuk ke Client Area</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gunakan akun yang terdaftar untuk mengakses portal.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 mt-6">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#0B2C57]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                placeholder="you@bayanopen.com"
                className="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0B2C57] outline-none transition-colors focus:border-[#2E7BC4] focus:ring-2 focus:ring-[#2E7BC4]/20 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#0B2C57]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="••••••••••••"
                  className="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-[#0B2C57] outline-none transition-colors focus:border-[#2E7BC4] focus:ring-2 focus:ring-[#2E7BC4]/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2C57]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#2E7BC4] focus:ring-[#2E7BC4]/30"
              />
              Remember me
            </label>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gap-2 bg-[#0B2C57] hover:bg-[#0E3670] text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-10">
            <span className="text-xs text-muted-foreground tracking-wide">Powered by</span>
            <img src={AMBILFOTO_LOGO} alt="AmbilFoto" className="h-14 w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BayanOpenLogin;