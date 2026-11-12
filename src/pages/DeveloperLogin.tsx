'use client';

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "@/services/api/auth.service";
import { developerService } from "@/services/api/developer.service";

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Step = "credentials" | "loading" | "success";

// ─────────────────────────────────────────────────────────────────────────────
// Animated Terminal Line
// ─────────────────────────────────────────────────────────────────────────────
const TerminalLine = ({
  text,
  delay = 0,
  type = "normal",
}: {
  text: string;
  delay?: number;
  type?: "normal" | "success" | "error" | "dim" | "command";
}) => {
  const [visible, setVisible] = useState(false);
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 18);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  if (!visible) return null;

  const colors: Record<string, string> = {
    normal: "#1e293b",
    success: "#4ade80",
    error: "#f87171",
    dim: "#64748b",
    command: "#2563eb",
  };

  return (
    <div style={{ color: colors[type], fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12px", lineHeight: "1.6" }}>
      {type === "command" && <span style={{ color: "#f59e0b" }}>$ </span>}
      {displayed}
      {displayed.length < text.length && (
        <span style={{ animation: "blink 1s step-end infinite", color: "#f59e0b" }}>▌</span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Panel
// ─────────────────────────────────────────────────────────────────────────────
const TerminalPanel = ({ authenticated }: { authenticated: boolean }) => {
  const lines = authenticated
    ? [
        { text: "ambilfoto-cli connect --env production", type: "command" as const, delay: 0 },
        { text: "Resolving developer endpoint...", type: "dim" as const, delay: 600 },
        { text: "Validating credentials...", type: "dim" as const, delay: 1200 },
        { text: "✓ Authentication successful", type: "success" as const, delay: 1800 },
        { text: "✓ Subscription active", type: "success" as const, delay: 2100 },
        { text: "✓ API keys loaded", type: "success" as const, delay: 2400 },
        { text: "Redirecting to dashboard...", type: "dim" as const, delay: 2800 },
      ]
    : [
        { text: "ambilfoto-cli auth --mode developer", type: "command" as const, delay: 0 },
        { text: "Connecting to auth service...", type: "dim" as const, delay: 700 },
        { text: "→ POST /api/auth/login", type: "dim" as const, delay: 1300 },
        { text: "→ GET /api/developer/me", type: "dim" as const, delay: 1700 },
        { text: "Awaiting credentials...", type: "dim" as const, delay: 2200 },
        { text: "", type: "dim" as const, delay: 2400 },
        { text: "// Platform v2.4.1 — Stable", type: "dim" as const, delay: 2700 },
        { text: "// api_hit_limit: enforced", type: "dim" as const, delay: 2900 },
        { text: "// billing_cycle: monthly|yearly", type: "dim" as const, delay: 3100 },
      ];

  return (
    <div style={{ background: "#f1f5f9", border: "1px solid rgba(37, 99, 235, 0.08)", borderRadius: "12px", padding: "20px", minHeight: "200px" }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />
        <span style={{ color: "#94a3b8", fontSize: "11px", marginLeft: "8px", fontFamily: "monospace" }}>ambilfoto — terminal</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {lines.map((l, i) => (
          <TerminalLine key={i} text={l.text} delay={l.delay} type={l.type} />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat Badge
// ─────────────────────────────────────────────────────────────────────────────
const StatBadge = ({ label, value }: { label: string; value: string }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Input Field
// ─────────────────────────────────────────────────────────────────────────────
const DevInput = ({
  id, label, type, value, onChange, placeholder, disabled, autoFocus, suffix,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; autoFocus?: boolean; suffix?: React.ReactNode;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label htmlFor={id} style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: focused ? "#2563eb" : "#64748b", transition: "color 0.2s", fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: "100%", background: focused ? "rgba(37, 99, 235, 0.04)" : "#ffffff", border: `1px solid ${focused ? "rgba(37, 99, 235, 0.5)" : "#d1d5db"}`, borderRadius: "8px", padding: suffix ? "12px 44px 12px 14px" : "12px 14px", color: "#1e293b", fontSize: "14px", fontFamily: "'JetBrains Mono', monospace", outline: "none", transition: "all 0.2s", boxSizing: "border-box", boxShadow: focused ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none" }}
        />
        {suffix && <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}>{suffix}</div>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const DeveloperLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ✅ Turnstile states
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const redirectParam = new URLSearchParams(location.search).get("redirect");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    authService.verifyToken().then((res) => {
      if (res?.success) redirectAfterLogin(res.data?.role, res.data?.id);
    }).catch(() => {});
  }, []);

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
      if (turnstileWidgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetIdRef.current);
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

    turnstileWidgetIdRef.current = widgetId;
    setTurnstileWidgetId(widgetId);
  }, [turnstileReady]);

  const resetTurnstile = () => {
    if (turnstileWidgetId && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId);
    }
    setTurnstileToken(null);
  };

  const redirectAfterLogin = async (role: string, userId?: string) => {
    if (redirectParam) { navigate(redirectParam, { replace: true }); return; }
    if (role === "admin") { navigate("/admin/dashboard", { replace: true }); return; }
    try {
      const me = await developerService.getMe();
      if (me?.has_developer_account && me.data?.developer_id) {
        navigate(`/developer/${me.data.developer_id}`, { replace: true });
        return;
      }
    } catch {}
    navigate("/developer/pricing", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email dan password wajib diisi."); return; }
    if (!turnstileToken) { setError("Silakan selesaikan verifikasi keamanan Cloudflare."); return; }

    setError(null);
    setLoading(true);

    try {
      const res = await authService.login({
        email,
        password,
        captcha_token: turnstileToken, // ✅ Kirim token Turnstile
      });

      if (!res?.success || !res?.data?.token) {
        throw new Error(res?.error || res?.message || "Login gagal. Periksa email dan password kamu.");
      }

      localStorage.setItem("auth_token", res.data.token);
      localStorage.setItem("user_data", JSON.stringify(res.data.user));

      setStep("success");
      await new Promise((r) => setTimeout(r, 2800));
      await redirectAfterLogin(res.data.user.role, res.data.user.id);

    } catch (err: any) {
      resetTurnstile(); // ← Reset widget setelah gagal
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Terjadi kesalahan. Coba lagi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.2); } 70% { box-shadow: 0 0 0 12px rgba(37,99,235,0); } 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); } }
        @keyframes grid-scroll { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        @keyframes scanline { 0% { top: -2px; } 100% { top: 100%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dev-btn:hover:not(:disabled) { background: linear-gradient(135deg, #0284c7, #0369a1) !important; transform: translateY(-1px); box-shadow: 0 8px 30px rgba(56,189,248,0.35) !important; }
        .dev-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .dev-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        input::placeholder { color: #475569; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f8fafc", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Space Grotesk', sans-serif" }}>
        {/* Animated grid background */}
        <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(100,116,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.07) 1px, transparent 1px)", backgroundSize: "40px 40px", animation: "grid-scroll 8s linear infinite", pointerEvents: "none" }} />
        <div style={{ position: "fixed", top: "-200px", right: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: "-200px", left: "-200px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.08), transparent)", animation: "scanline 6s linear infinite", pointerEvents: "none", zIndex: 0 }} />

        {/* Main card */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "940px", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)" }}>

            {/* ── LEFT: Branding / Terminal ── */}
            <div style={{ background: "linear-gradient(160deg, #eff6ff 0%, #dbeafe 100%)", borderRight: "1px solid #e2e8f0", padding: "44px 36px", display: "flex", flexDirection: "column", gap: "32px", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "80px", height: "80px", background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <img src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png" alt="AmbilFoto" style={{ width: "44px", height: "44px", borderRadius: "10px" }} />
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: "700", color: "#1e293b", letterSpacing: "-0.02em" }}>AmbilFoto</div>
                    <div style={{ fontSize: "10px", color: "#2563eb", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>Developer API</div>
                  </div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)", borderRadius: "20px", padding: "3px 10px", marginTop: "10px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", animation: "pulse-ring 2s infinite" }} />
                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>API Status: Operational</span>
                </div>
              </div>

              <div>
                <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#1e293b", lineHeight: "1.25", letterSpacing: "-0.03em", marginBottom: "10px" }}>
                  Developer<br />
                  <span style={{ background: "linear-gradient(135deg, #00b3ff, #00308a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Access Portal</span>
                </h1>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>Masuk untuk mengakses dashboard API, kelola API keys, dan monitor usage subscription kamu.</p>
              </div>

              <TerminalPanel authenticated={step === "success"} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                <StatBadge label="Uptime" value="99.9%" />
                <StatBadge label="Endpoints" value="12+" />
                <StatBadge label="Avg resp." value="~80ms" />
              </div>
            </div>

            {/* ── RIGHT: Form ── */}
            <div style={{ padding: "44px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {step === "success" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", minHeight: "360px", animation: "fadeIn 0.4s ease" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", animation: "pulse-ring 1.5s infinite" }}>✓</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Authentication Successful</div>
                    <div style={{ fontSize: "13px", color: "#64748b", fontFamily: "monospace" }}>Redirecting to developer dashboard...</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb", animation: `blink 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ animation: "fadeSlideUp 0.4s ease" }}>
                  <div style={{ marginBottom: "28px" }}>
                    <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#0080ff", letterSpacing: "-0.02em", marginBottom: "6px" }}>Sign in</h2>
                    <p style={{ fontSize: "13px", color: "#64748b" }}>Masuk dengan akun AmbilFoto kamu</p>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderLeft: "3px solid #ef4444", borderRadius: "8px", padding: "12px 14px", marginBottom: "20px", display: "flex", alignItems: "flex-start", gap: "10px", animation: "fadeSlideUp 0.3s ease" }}>
                      <span style={{ color: "#f87171", fontSize: "14px", marginTop: "1px" }}>⚠</span>
                      <span style={{ fontSize: "13px", color: "#ef4444", lineHeight: "1.5" }}>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <DevInput id="email" label="Email address" type="email" value={email} onChange={setEmail} placeholder="developer@company.com" disabled={loading} autoFocus />
                    <DevInput
                      id="password" label="Password" type={showPassword ? "text" : "password"}
                      value={password} onChange={setPassword} placeholder="••••••••••••" disabled={loading}
                      suffix={
                        <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ background: "none", border: "none", padding: 0, color: "#64748b", cursor: "pointer", fontSize: "13px" }} tabIndex={-1}>
                          {showPassword ? "🙈" : "👁"}
                        </button>
                      }
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b", cursor: "pointer" }}>
                        <input type="checkbox" style={{ width: "14px", height: "14px", accentColor: "#2563eb", cursor: "pointer" }} />
                        Ingat saya
                      </label>
                      <Link to="/forgot" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontFamily: "monospace" }}>
                        Lupa password?
                      </Link>
                    </div>

                    {/* ✅ Cloudflare Turnstile Widget */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <div ref={turnstileRef} />
                        {!turnstileReady && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b", padding: "12px 0", fontFamily: "monospace" }}>
                            <span style={{ width: "14px", height: "14px", border: "2px solid rgba(100,116,139,0.3)", borderTopColor: "#64748b", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                            Memuat verifikasi keamanan...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading || !turnstileToken}
                      className="dev-btn"
                      style={{
                        width: "100%", padding: "13px",
                        background: (loading || !turnstileToken) ? "rgba(56,189,248,0.2)" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                        border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: "600",
                        fontFamily: "'Space Grotesk', sans-serif",
                        cursor: (loading || !turnstileToken) ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        boxShadow: (loading || !turnstileToken) ? "none" : "0 4px 20px rgba(14,165,233,0.25)",
                        letterSpacing: "0.01em", marginTop: "4px",
                      }}
                    >
                      {loading ? (
                        <>
                          <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", opacity: 0.7 }}>→</span>
                          Sign in to Dashboard
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "24px 0" }}>
                    <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>OR</span>
                    <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                  </div>

                  {/* Face login */}
                  <Link to="/login/face" style={{ textDecoration: "none" }}>
                    <button
                      type="button"
                      style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#64748b", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { const b = (e.target as HTMLElement).closest("button")!; b.style.borderColor = "rgba(37,99,235,0.3)"; b.style.color = "#2563eb"; }}
                      onMouseLeave={(e) => { const b = (e.target as HTMLElement).closest("button")!; b.style.borderColor = "#e2e8f0"; b.style.color = "#64748b"; }}
                    >
                      <span>👤</span>
                      Masuk dengan Face Scan
                    </button>
                  </Link>

                  {/* Footer links */}
                  <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                      Belum punya akun?{" "}
                      <Link to={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"} style={{ color: "#2563eb", textDecoration: "none", fontWeight: "500" }}>
                        Daftar sekarang
                      </Link>
                    </p>
                    <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                      Ingin lihat pricing?{" "}
                      <Link to="/developer/pricing" style={{ color: "#64748b", textDecoration: "none" }}>Lihat paket API →</Link>
                    </p>
                  </div>

                  {/* Security note */}
                  <div style={{ marginTop: "24px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>Ambil Foto Platform</span>
                    <span style={{ marginLeft: "auto", fontSize: "11px", color: "#cbd5e1", fontFamily: "monospace" }}>v1.0</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom links */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "20px" }}>
            {["Documentation", "API Status", "Support"].map((label) => (
              <a key={label} href="#" style={{ fontSize: "11px", color: "#94a3b8", textDecoration: "none", fontFamily: "monospace", transition: "color 0.2s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#64748b")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#94a3b8")}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default DeveloperLogin;