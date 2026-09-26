/**
 * DeveloperPricing.tsx — AmbilFoto design system
 * Palette: blue + amber + orange | Font: Sora
 * Animations: CSS IntersectionObserver + MutationObserver for async cards
 *             fast easing (0.45s cubic-bezier), threshold 5%, unobserve after fire
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlanCard } from "@/components/developer/PlanCard";
import { developerService, Plan, BillingCycle } from "@/services/api/developer.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Code2, Zap, Shield, BarChart3, Headphones,
  ArrowRight, Check, Sparkles, Globe, Lock, Key,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  .pg { font-family:'Sora',system-ui,sans-serif; }
  .mono { font-family:'DM Mono',monospace; }
  .fw8 { font-weight:800; letter-spacing:-0.03em; }
  .g-blue { background:linear-gradient(135deg,#1d4ed8,#2563eb); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

  /* Buttons */
  .btn-b { display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:14px;border:none;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;box-shadow:0 6px 20px rgba(29,78,216,0.28);transition:transform .2s,box-shadow .2s; }
  .btn-b:hover { transform:translateY(-2px);box-shadow:0 12px 32px rgba(29,78,216,0.38); }
  .btn-o { display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;background:white;color:#1e40af;border:1.5px solid rgba(29,78,216,0.22);transition:all .2s; }
  .btn-o:hover { background:#eff6ff;border-color:rgba(29,78,216,0.45);transform:translateY(-1px); }
  .btn-g { display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;background:rgba(255,255,255,0.13);color:white;border:1.5px solid rgba(255,255,255,0.28);transition:all .2s; }
  .btn-g:hover { background:rgba(255,255,255,0.22);transform:translateY(-1px); }

  /* Pill */
  .pill { display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase; }

  /* Cards */
  .af-card { background:white;border:1.5px solid #f1f5f9;border-radius:20px;padding:24px;transition:border-color .28s,box-shadow .28s,transform .28s; }
  .af-card:hover { border-color:rgba(59,130,246,.2);box-shadow:0 8px 28px rgba(59,130,246,.09);transform:translateY(-3px); }

  .fpill { display:flex;align-items:center;gap:12px;padding:14px 18px;background:white;border:1.5px solid #f1f5f9;border-radius:16px;transition:border-color .25s,box-shadow .25s; }
  .fpill:hover { border-color:rgba(59,130,246,.2);box-shadow:0 4px 16px rgba(59,130,246,.08); }

  /* ── Scroll reveal ─────────────────────────────────────
     0.45s duration, ease-out-quart, fires at 5% visibility
     unobserve after first fire → no flickering on scroll-up
  ─────────────────────────────────────────────────────── */
  .rv { opacity:0; will-change:opacity,transform; }
  .rv.rv-u  { transform:translateY(28px); }
  .rv.rv-l  { transform:translateX(-36px); }
  .rv.rv-r  { transform:translateX(36px); }
  .rv.rv-s  { transform:scale(0.94); }
  .rv.in    {
    opacity:1 !important; transform:none !important;
    transition: opacity .45s cubic-bezier(0.22,1,0.36,1),
                transform .45s cubic-bezier(0.22,1,0.36,1);
  }
  .rv[data-i="1"] { transition-delay:.06s; }
  .rv[data-i="2"] { transition-delay:.12s; }
  .rv[data-i="3"] { transition-delay:.18s; }

  /* Hero */
  .h-in { opacity:0; animation:hIn .65s cubic-bezier(0.22,1,0.36,1) forwards; }
  @keyframes hIn { to { opacity:1; transform:none; } }
  .from-y { transform:translateY(24px); }
  .h-d0{animation-delay:.04s} .h-d1{animation-delay:.16s} .h-d2{animation-delay:.28s} .h-d3{animation-delay:.38s} .h-d4{animation-delay:.48s}

  /* Toggle */
  .tgl-track { width:52px;height:28px;border-radius:999px;border:none;cursor:pointer;padding:3px;display:flex;align-items:center;outline:none;flex-shrink:0;transition:background-color .3s cubic-bezier(.4,0,.2,1); }
  .tgl-thumb { width:22px;height:22px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .3s cubic-bezier(.4,0,.2,1);flex-shrink:0;display:block; }

  /* Code block */
  .code-blk { background:#0f172a;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,.08); }
  .code-bar { display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08); }
  .cdot { width:12px;height:12px;border-radius:50%; }
  .code-body { padding:20px;font-family:'DM Mono',monospace;font-size:12px;line-height:1.9; }

  /* Live dot */
  @keyframes ld { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.78)} }
  .ldot { display:inline-block;width:7px;height:7px;border-radius:50%;background:#3b82f6;animation:ld 1.8s ease-in-out infinite; }

  /* Trust check */
  .chk { display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b; }
`;

/* ─────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────── */

/**
 * useReveal: IntersectionObserver + MutationObserver
 * - threshold: 0.05 → triggers very early (5% visible)
 * - rootMargin: -20px → slight offset from bottom edge
 * - unobserve after fire → no reverse/flicker on scroll-up
 * - MutationObserver re-scans for newly added .rv elements
 *   (needed because plan cards render after async fetch)
 */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );

    const scan = () =>
      document.querySelectorAll(".rv:not(.in)").forEach((el) => obs.observe(el));

    scan();

    const mut = new MutationObserver(scan);
    mut.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mut.disconnect();
    };
  }, []);
}

/** Canvas dot network */
function useCanvas(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let id: number;
    const rs = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    rs();
    window.addEventListener("resize", rs);
    const N = 50;
    const dots = Array.from({ length: N }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
      a: Math.random() * 0.22 + 0.06,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      dots.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > c.width) d.vx *= -1;
        if (d.y < 0 || d.y > c.height) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${d.a})`; ctx.fill();
      });
      for (let i = 0; i < N; i++)
        for (let j = i + 1; j < N; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${0.055 * (1 - dist / 100)})`;
            ctx.lineWidth = 1; ctx.stroke();
          }
        }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", rs); };
  }, []);
}

/* ─────────────────────────────────────────────────────────
   BILLING TOGGLE
───────────────────────────────────────────────────────── */
function BillingToggle({ value, onChange, plans }: {
  value: BillingCycle; onChange: (v: BillingCycle) => void; plans: Plan[];
}) {
  const avg = plans.length > 0
    ? Math.round(
        plans.filter(p => !p.is_custom && p.discount_yearly_pct > 0)
          .reduce((s, p) => s + p.discount_yearly_pct, 0) /
        Math.max(plans.filter(p => !p.is_custom && p.discount_yearly_pct > 0).length, 1)
      )
    : 8;

  return (
    <div className="flex items-center justify-center gap-4 mb-10">
      <span
        onClick={() => onChange("monthly")}
        className={`text-sm font-bold cursor-pointer select-none transition-colors ${value === "monthly" ? "text-slate-900" : "text-slate-400"}`}
      >
        Bulanan
      </span>
      <button
        type="button" role="switch" aria-checked={value === "yearly"}
        onClick={() => onChange(value === "monthly" ? "yearly" : "monthly")}
        className="tgl-track"
        style={{ backgroundColor: value === "yearly" ? "#1d4ed8" : "#cbd5e1" }}
      >
        <span className="tgl-thumb" style={{ transform: value === "yearly" ? "translateX(24px)" : "translateX(0)" }} />
      </button>
      <span
        onClick={() => onChange("yearly")}
        className={`text-sm font-bold cursor-pointer select-none transition-colors flex items-center gap-2 ${value === "yearly" ? "text-slate-900" : "text-slate-400"}`}
      >
        Tahunan
        {avg > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300"
            style={{
              backgroundColor: value === "yearly" ? "#d1fae5" : "#f1f5f9",
              color: value === "yearly" ? "#065f46" : "#94a3b8",
            }}>
            Hemat s/d {avg}%
          </span>
        )}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */

// TODO: ganti dengan nomor WhatsApp sales yang sebenarnya (format: kode negara tanpa "+" atau "0" di depan)
const WHATSAPP_SALES_NUMBER = "6281234567890";

const DeveloperPricing = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useCanvas(canvasRef);
  useReveal();

  useEffect(() => {
    developerService.getPlans()
      .then(res => { if (res.success) setPlans(res.data); })
      .catch(() => toast({ title: "Gagal memuat paket", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (plan: Plan) => {
    // ─── Alur pembayaran/login asli — dinonaktifkan sementara ───
    // if (plan.is_custom) {
    //   window.open("mailto:support@ambilfoto.id?subject=Custom API Plan", "_blank");
    //   return;
    // }
    // if (!isAuthenticated) {
    //   sessionStorage.setItem("pending_plan_id", plan.id);
    //   sessionStorage.setItem("pending_billing_cycle", billingCycle);
    //   navigate(`/login?redirect=${encodeURIComponent(`/developer/checkout?plan_id=${plan.id}&billing_cycle=${billingCycle}`)}`);
    //   return;
    // }
    // navigate(`/developer/checkout?plan_id=${plan.id}&billing_cycle=${billingCycle}`);

    // ─── Sementara: semua paket arahkan ke WhatsApp sales ───────
    const cycleLabel = billingCycle === "yearly" ? "Tahunan" : "Bulanan";
    const message = encodeURIComponent(
      `Halo, saya tertarik dengan paket ${plan.name} (${cycleLabel}). Bisa dibantu proses selanjutnya?`
    );
    window.open(`https://wa.me/${WHATSAPP_SALES_NUMBER}?text=${message}`, "_blank");
  };

  // Plan custom/enterprise selalu ditaruh paling akhir, apa pun urutan dari API —
  // supaya tidak "kesisipan" di tengah baris pertama.
  const sortedPlans = [...plans].sort((a, b) => Number(a.is_custom) - Number(b.is_custom));

  const popularIndex = sortedPlans.findIndex(p => p.slug === "developer" || p.slug === "super-2");

  const features = [
    { Icon: Code2,      l: "API Dual Key",      d: "Dev + Production key"   },
    { Icon: Shield,     l: "99.9% Uptime",      d: "SLA terjamin"           },
    { Icon: BarChart3,  l: "Usage Dashboard",   d: "Monitor real-time"      },
    { Icon: Headphones, l: "Support Prioritas", d: "Email & WhatsApp"       },
    { Icon: Lock,       l: "Enkripsi AES-256",  d: "Data wajah aman"        },
    { Icon: Zap,        l: "Aktivasi Instan",   d: "Langsung setelah bayar" },
    { Icon: Globe,      l: "REST API",           d: "JSON standar industri"  },
    { Icon: Sparkles,   l: "AI Model Terbaru",  d: "Diperbarui otomatis"    },
  ];

  return (
    <div className="pg flex min-h-screen flex-col bg-white">
      <style>{STYLES}</style>
      <Header />

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100 py-24 md:py-32">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Static gradient blobs — no CSS animation to avoid GPU thrash */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(219,234,254,0.55) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(254,243,199,0.4) 0%, transparent 70%)" }} />

        <div className="container max-w-3xl mx-auto px-6 text-center relative">
          <div className="h-in h-d0 from-y pill bg-blue-50 text-blue-700 border border-blue-200 mb-7 mx-auto w-fit">
            <span className="ldot" /> Developer API Platform
          </div>

          <h1 className="fw8 h-in h-d1 from-y text-5xl md:text-6xl lg:text-7xl text-slate-900 leading-[1.05] mb-6">
            Integrasikan<br />
            <span className="g-blue">AI Face Recognition</span><br />
            ke Aplikasimu
          </h1>

          <p className="h-in h-d2 from-y text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
            REST API berbasis subscription dengan dual key, usage analytics, dan support level berbeda tiap paket. Aktif instan setelah pembayaran.
          </p>

          <div className="h-in h-d3 from-y flex flex-wrap gap-3 justify-center mb-10">
            <button onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })} className="btn-b">
              Lihat Paket <ArrowRight className="w-4 h-4" />
            </button>
            <a href="/docs">
              <button className="btn-o"><Code2 className="w-4 h-4 text-blue-600" /> Baca Dokumentasi</button>
            </a>
          </div>

          <div className="h-in h-d4 from-y flex flex-wrap gap-x-6 gap-y-2 justify-center">
            {["Aktif instan setelah bayar", "Hemat s/d 8% tahunan", "Enkripsi end-to-end", "99.9% uptime SLA"].map(t => (
              <div key={t} className="chk">
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════════ */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { val: "512-dim", label: "Face Embedding",  sub: "Akurasi tinggi",       c: "text-blue-600",    bg: "bg-blue-50",    Icon: Key       },
              { val: "<200ms",  label: "Response Time",   sub: "API latency rata-rata", c: "text-amber-600",   bg: "bg-amber-50",   Icon: Zap       },
              { val: "40K+",    label: "Hit API/bulan",   sub: "Paket Enterprise",      c: "text-blue-600",    bg: "bg-blue-50",    Icon: BarChart3 },
              { val: "99.9%",   label: "Uptime SLA",      sub: "Terjamin kontrak",      c: "text-emerald-600", bg: "bg-emerald-50", Icon: Shield    },
            ].map(({ val, label, sub, c, bg, Icon }, i) => (
              <div key={i} className="rv rv-u af-card text-center" data-i={i}>
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={`w-5 h-5 ${c}`} />
                </div>
                <p className={`text-2xl font-black mb-0.5 ${c}`}>{val}</p>
                <p className="text-xs font-bold text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES INCLUDED ═══════════════════════════════ */}
      <section className="py-14 bg-white border-b border-slate-100">
        <div className="container max-w-4xl mx-auto px-6">
          <p className="rv rv-u text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-8">
            Semua paket sudah termasuk
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {features.map(({ Icon, l, d }, i) => (
              <div key={i} className="rv rv-u fpill" data-i={i % 4}>
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{l}</p>
                  <p className="text-xs text-slate-500">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PLANS ═══════════════════════════════════════════ */}
      <section id="plans" className="py-20 bg-slate-50/60 border-b border-slate-100">
        <div className="container max-w-6xl mx-auto px-6">

          <div className="rv rv-u text-center mb-8">
            <div className="pill bg-blue-50 text-blue-700 border border-blue-100 mb-4">💡 Transparan tanpa biaya tersembunyi</div>
            <h2 className="fw8 text-4xl md:text-5xl text-slate-900 mb-3">
              Pilih Paket yang <span className="g-blue">Tepat</span>
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Bayar sesuai kebutuhan, upgrade kapan saja tanpa penalti.</p>
          </div>

          <BillingToggle value={billingCycle} onChange={setBillingCycle} plans={plans} />

          {/*
            NOTE: menggunakan flex + flex-wrap (bukan grid) supaya baris terakhir
            yang tidak penuh (mis. 5 plan → 4 + 1) otomatis ter-center, bukan
            nempel rata kiri seperti pada grid biasa.
          */}
          {loading ? (
            <div className="flex flex-wrap justify-center gap-5">
              {[1, 2, 3, 4].map(i => (
                <Skeleton
                  key={i}
                  className="h-[420px] rounded-2xl w-full md:w-[calc(50%-10px)] lg:w-[calc(33.333%-13.33px)]"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-5">
              {sortedPlans.map((plan, i) => (
                // Each wrapper gets .rv — MutationObserver will pick it up
                <div
                  key={plan.id}
                  className="rv rv-u w-full md:w-[calc(50%-10px)] lg:w-[calc(33.333%-13.33px)]"
                  data-i={i % 4}
                >
                  <PlanCard
                    plan={plan}
                    billingCycle={billingCycle}
                    isPopular={i === popularIndex}
                    onSelect={handleSelect}
                    loading={false}
                  />
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-8">
            Butuh lebih dari 40.000 hit/bulan atau SLA khusus?{" "}
            <a href="mailto:support@ambilfoto.id?subject=Custom API Plan" className="text-blue-600 hover:underline font-bold">
              Hubungi kami untuk paket Custom →
            </a>
          </p>
        </div>
      </section>

      {/* ══ CODE PREVIEW ════════════════════════════════════ */}
      <section className="py-20 bg-slate-900">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div className="rv rv-l">
              <div className="pill bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-6">
                <Code2 className="w-3.5 h-3.5" /> Quick Integration
              </div>
              <h2 className="fw8 text-4xl text-white mb-4 leading-tight">
                Integrasi dalam{" "}
                <span style={{ background: "linear-gradient(135deg,#60a5fa,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Hitungan Menit
                </span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                SDK tersedia untuk Node.js, Python, PHP, dan Go. Dokumentasi lengkap dengan contoh kode untuk setiap endpoint.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { Icon: Key,       l: "Dual Key",      d: "Dev + Production"   },
                  { Icon: BarChart3, l: "Analytics",     d: "Real-time dashboard" },
                  { Icon: Shield,    l: "SLA 99.9%",     d: "Uptime terjamin"    },
                  { Icon: Globe,     l: "500+ Developer", d: "Sudah menggunakan"  },
                ].map(({ Icon, l, d }, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/10 transition-colors">
                    <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">{l}</p>
                      <p className="text-xs text-slate-500">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })} className="btn-b">
                  Lihat Paket <ArrowRight className="w-4 h-4" />
                </button>
                <a href="/docs"><button className="btn-g"><Code2 className="w-4 h-4" /> Dokumentasi</button></a>
              </div>
            </div>

            <div className="rv rv-r code-blk">
              <div className="code-bar">
                <div className="cdot" style={{ background: "#ef4444" }} />
                <div className="cdot" style={{ background: "#f59e0b" }} />
                <div className="cdot" style={{ background: "#10b981" }} />
                <span className="ml-3 text-xs text-slate-500 mono">ambilfoto-api.js</span>
              </div>
              <div className="code-body">
                <div><span style={{ color: "#60a5fa" }}>const</span> <span style={{ color: "#93c5fd" }}>client</span> <span style={{ color: "#e2e8f0" }}>=</span> <span style={{ color: "#34d399" }}>AmbilFoto</span><span style={{ color: "#e2e8f0" }}>{"({"}</span></div>
                <div className="pl-4"><span style={{ color: "#fcd34d" }}>apiKey</span><span style={{ color: "#e2e8f0" }}>:</span> <span style={{ color: "#6ee7b7" }}>'af_live_xxxxxxxx'</span><span style={{ color: "#e2e8f0" }}>,</span></div>
                <div className="pl-4"><span style={{ color: "#fcd34d" }}>version</span><span style={{ color: "#e2e8f0" }}>:</span> <span style={{ color: "#6ee7b7" }}>'v2'</span></div>
                <div><span style={{ color: "#e2e8f0" }}>{"})"}</span></div>
                <div className="mt-2 text-slate-600">{"// Search faces from event"}</div>
                <div><span style={{ color: "#60a5fa" }}>const</span> <span style={{ color: "#93c5fd" }}>result</span> <span style={{ color: "#e2e8f0" }}>=</span> <span style={{ color: "#60a5fa" }}>await</span> <span style={{ color: "#93c5fd" }}>client</span><span style={{ color: "#e2e8f0" }}>.</span></div>
                <div className="pl-4"><span style={{ color: "#fde68a" }}>faceSearch</span><span style={{ color: "#e2e8f0" }}>{"({"}</span></div>
                <div className="pl-8"><span style={{ color: "#fcd34d" }}>image</span><span style={{ color: "#e2e8f0" }}>:</span> <span style={{ color: "#93c5fd" }}>faceBuffer</span><span style={{ color: "#e2e8f0" }}>,</span></div>
                <div className="pl-8"><span style={{ color: "#fcd34d" }}>eventId</span><span style={{ color: "#e2e8f0" }}>:</span> <span style={{ color: "#6ee7b7" }}>'wisuda-ui-2025'</span><span style={{ color: "#e2e8f0" }}>,</span></div>
                <div className="pl-8"><span style={{ color: "#fcd34d" }}>limit</span><span style={{ color: "#e2e8f0" }}>:</span> <span style={{ color: "#fbbf24" }}>50</span></div>
                <div className="pl-4"><span style={{ color: "#e2e8f0" }}>{"})"}</span></div>
                <div className="mt-2 text-slate-600">{"// ✅ { photos: 24, confidence: 0.97 }"}</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="container max-w-2xl mx-auto px-6 text-center">
          <div className="rv rv-s relative overflow-hidden rounded-3xl p-12 shadow-2xl shadow-blue-100"
            style={{ background: "linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)" }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
            <div className="absolute -top-14 -left-14 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-14 -right-14 w-56 h-56 rounded-full bg-amber-300/10 blur-2xl" />
            <div className="relative">
             {/* <span className="pill bg-white/10 text-blue-100 border border-white/20 mb-5 inline-flex">
                🚀 Sudah 500+ developer aktif
              </span>*/}
              <h2 className="fw8 text-4xl text-white mt-3 mb-3 leading-tight">Sudah Punya Akun Developer?</h2>
              <p className="text-blue-100 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Masuk ke dashboard untuk kelola API keys, monitor quota, dan lihat riwayat penggunaan secara real-time.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={() => navigate("/developer/login")}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 shadow-lg transition-all hover:-translate-y-0.5">
                  Masuk ke Dashboard <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate("/register")} className="btn-g text-sm">
                  Daftar Gratis
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DeveloperPricing;