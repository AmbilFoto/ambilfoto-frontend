/**
 * Features.tsx — AmbilFoto design system
 * Palette: blue + amber + orange | Font: Sora
 * Animations: CSS IntersectionObserver + MutationObserver
 *             fast easing (0.45s cubic-bezier), threshold 5%, unobserve after fire
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Camera, Zap, Shield, Brain, Download, Search,
  Clock, Smartphone, Users, Globe, Lock, BarChart3,
  ArrowRight, Check, Sparkles, Image, TrendingUp,
  CheckCircle2, Star, Heart,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  .pg { font-family:'Sora',system-ui,sans-serif; }
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

  /* Tab */
  .tab-active { background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;border-color:transparent;box-shadow:0 6px 20px rgba(29,78,216,0.22); }
  .tab-inactive { background:white;color:#64748b;border:1.5px solid #f1f5f9; }
  .tab-inactive:hover { border-color:rgba(29,78,216,0.2);color:#1d4ed8; }

  /* Scroll reveal */
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

  /* Live dot */
  @keyframes ld { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.78)} }
  .ldot { display:inline-block;width:7px;height:7px;border-radius:50%;background:#3b82f6;animation:ld 1.8s ease-in-out infinite; }

  /* Trust check */
  .chk { display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b; }

  /* Step line connector */
  .step-line { position:absolute;top:24px;left:calc(50% + 28px);width:calc(100% - 56px);height:1.5px;background:linear-gradient(90deg,#bfdbfe,#e0f2fe);z-index:0; }
`;

/* ─────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────── */
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
    return () => { obs.disconnect(); mut.disconnect(); };
  }, []);
}

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
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const Features = () => {
  const [activeTab, setActiveTab] = useState<"user" | "photographer">("user");
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useCanvas(canvasRef);
  useReveal();

  const mainFeatures = [
    { Icon: Brain,    title: "AI Face Recognition", desc: "Akurasi 95%+ di ribuan foto",        c: "text-blue-600",   bg: "bg-blue-50"   },
    { Icon: Zap,      title: "Instant Search",       desc: "Temukan foto dalam hitungan detik",  c: "text-amber-600",  bg: "bg-amber-50"  },
    { Icon: Shield,   title: "Privacy First",        desc: "Enkripsi end-to-end, data aman",     c: "text-blue-600",   bg: "bg-blue-50"   },
    { Icon: Download, title: "Easy Download",        desc: "Download semua foto sekaligus",       c: "text-emerald-600",bg: "bg-emerald-50"},
  ];

  const howItWorks = [
    { step: "1", Icon: Camera,   title: "Upload Foto Wajah",   desc: "Upload foto selfie atau portrait. AI kami akan memprosesnya otomatis."      },
    { step: "2", Icon: Search,   title: "Pilih Event",         desc: "Pilih event yang ingin Anda cari dari daftar event yang tersedia."           },
    { step: "3", Icon: Sparkles, title: "AI Mencarikan Foto",  desc: "Face recognition kami menyisir ribuan foto dan menampilkan hasilnya."        },
    { step: "4", Icon: Download, title: "Download & Bagikan",  desc: "Download foto favorit Anda atau bagikan langsung ke media sosial."           },
  ];

  const userFeatures = [
    {
      Icon: Camera, title: "Upload Wajah Sekali",
      desc: "Cukup upload satu kali, sistem mengingat untuk pencarian berikutnya.",
      benefits: ["Upload selfie atau portrait", "Multiple face angles", "Tidak perlu upload ulang tiap event"]
    },
    {
      Icon: Search, title: "Smart Search Algorithm",
      desc: "Algoritma pintar yang terus belajar dan meningkat seiring waktu.",
      benefits: ["Machine learning adaptif", "Cari di multiple events sekaligus", "Filter tanggal dan lokasi"]
    },
    {
      Icon: Image, title: "High Quality Photos",
      desc: "Semua foto tersedia dalam resolusi penuh tanpa kompresi.",
      benefits: ["Download kualitas original", "Preview loading cepat", "Support JPG, PNG, HEIC"]
    },
    {
      Icon: Clock, title: "Real-time Processing",
      desc: "Pemrosesan foto secara real-time begitu photographer upload.",
      benefits: ["Notifikasi instant", "Live update event berlangsung", "Akses tanpa delay"]
    },
    {
      Icon: Smartphone, title: "Mobile Friendly",
      desc: "Optimal di smartphone, tablet, maupun desktop.",
      benefits: ["Responsive semua device", "Progressive Web App (PWA)", "Offline mode tersedia"]
    },
    {
      Icon: Users, title: "Multi-Event Support",
      desc: "Cari foto dari berbagai event dalam satu platform.",
      benefits: ["Dashboard semua event", "History pencarian tersimpan", "Bookmark event favorit"]
    },
  ];

  const photographerFeatures = [
    {
      Icon: Camera, title: "Bulk Photo Upload",
      desc: "Upload ratusan foto sekaligus dengan batch processing yang handal.",
      benefits: ["Upload hingga 10.000 foto/event", "Auto-indexing wajah saat upload", "Progress tracking real-time"]
    },
    {
      Icon: Brain, title: "Auto Face Indexing",
      desc: "Deteksi dan indeks semua wajah secara otomatis saat foto diupload.",
      benefits: ["Deteksi wajah akurasi 95%+", "Proses background tanpa interupsi", "Laporan indexing setelah selesai"]
    },
    {
      Icon: Globe, title: "Event Management",
      desc: "Kelola semua event foto dalam satu dashboard yang mudah.",
      benefits: ["Buat dan atur event dengan mudah", "Kontrol akses per event", "Statistik unduhan per foto"]
    },
    {
      Icon: BarChart3, title: "Analytics & Insights",
      desc: "Pantau performa event dan foto yang paling banyak dicari.",
      benefits: ["Dashboard analytics real-time", "Laporan unduhan harian/mingguan", "Insight pencarian terpopuler"]
    },
    {
      Icon: Lock, title: "Watermark & Protection",
      desc: "Lindungi karya dengan watermark otomatis sebelum peserta download.",
      benefits: ["Custom watermark per event", "Kontrol kualitas unduhan", "Lindungi foto original"]
    },
    {
      Icon: Zap, title: "API Integration",
      desc: "Integrasikan platform Anda langsung ke sistem kami via REST API.",
      benefits: ["REST API lengkap & terdokumentasi", "Webhook notifikasi real-time", "SDK multi-bahasa tersedia"]
    },
  ];

  const benefits = [
    { Icon: Star,      stat: "95%",     title: "Hemat Waktu",    desc: "30 menit scroll foto jadi 30 detik"              },
    { Icon: Heart,     stat: "100%",    title: "Menyenangkan",   desc: "Nikmati event tanpa khawatir cari foto"          },
    { Icon: TrendingUp,stat: "95%+",    title: "Akurasi Tinggi", desc: "Face recognition AI terdepan"                    },
    { Icon: Shield,    stat: "256-bit", title: "Aman & Privat",  desc: "Enkripsi tingkat bank untuk semua data"          },
  ];

  const activeFeatures = activeTab === "user" ? userFeatures : photographerFeatures;

  return (
    <div className="pg flex min-h-screen flex-col bg-white">
      <style>{STYLES}</style>
      <Header />

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100 py-24 md:py-32">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(219,234,254,0.55) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(254,243,199,0.4) 0%, transparent 70%)" }} />

        <div className="container max-w-3xl mx-auto px-6 text-center relative">
          <div className="h-in h-d0 from-y pill bg-blue-50 text-blue-700 border border-blue-200 mb-7 mx-auto w-fit">
            <span className="ldot" /> Fitur Unggulan AmbilFoto
          </div>

          <h1 className="fw8 h-in h-d1 from-y text-5xl md:text-6xl lg:text-7xl text-slate-900 leading-[1.05] mb-6">
            Cari Foto Event<br />
            <span className="g-blue">dengan Wajah Anda</span>
          </h1>

          <p className="h-in h-d2 from-y text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
            Teknologi AI face recognition yang mengenali wajah Anda di ribuan foto dalam hitungan detik. Cepat, akurat, dan aman.
          </p>

          <div className="h-in h-d3 from-y flex flex-wrap gap-3 justify-center mb-10">
            <button onClick={() => navigate("/register")} className="btn-b">
              Coba Gratis Sekarang <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="btn-o">
              <Sparkles className="w-4 h-4 text-blue-600" /> Cara Kerja
            </button>
          </div>

          <div className="h-in h-d4 from-y flex flex-wrap gap-x-6 gap-y-2 justify-center">
            {["Akurasi AI 95%+", "Proses dalam 30 detik", "Enkripsi end-to-end", "Gratis untuk dicoba"].map(t => (
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
              { val: "95%+",    label: "Akurasi AI",        sub: "Face recognition",      c: "text-blue-600",    bg: "bg-blue-50",    Icon: Brain    },
              { val: "<30 dtk", label: "Kecepatan Cari",    sub: "Rata-rata per search",  c: "text-amber-600",   bg: "bg-amber-50",   Icon: Zap      },
              { val: "10K+",    label: "Foto per Event",    sub: "Kapasitas indexing",    c: "text-blue-600",    bg: "bg-blue-50",    Icon: Image    },
              { val: "256-bit", label: "Enkripsi",          sub: "Keamanan data wajah",   c: "text-emerald-600", bg: "bg-emerald-50", Icon: Shield   },
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

      {/* ══ MAIN FEATURES PILLS ═════════════════════════════ */}
      <section className="py-14 bg-white border-b border-slate-100">
        <div className="container max-w-4xl mx-auto px-6">
          <p className="rv rv-u text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-8">
            Teknologi utama yang kami tawarkan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mainFeatures.map(({ Icon, title, desc, c, bg }, i) => (
              <div key={i} className="rv rv-u fpill" data-i={i % 4}>
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${c}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 bg-slate-50/60 border-b border-slate-100">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="rv rv-u text-center mb-14">
            <div className="pill bg-blue-50 text-blue-700 border border-blue-100 mb-4">4 Langkah Mudah</div>
            <h2 className="fw8 text-4xl md:text-5xl text-slate-900 mb-3">
              Cara <span className="g-blue">Kerja</span>
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Dari upload wajah hingga download foto — semuanya dalam hitungan detik.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {howItWorks.map(({ step, Icon, title, desc }, i) => (
              <div key={i} className="rv rv-u relative text-center" data-i={i}>
                <div className="relative inline-flex mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                    style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-black flex items-center justify-center shadow">
                    {step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TAB: PESERTA / FOTOGRAFER ═══════════════════════ */}
      <section className="py-8 bg-white border-b border-slate-100">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="flex justify-center gap-3">
            {(["user", "photographer"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${activeTab === tab ? "tab-active" : "tab-inactive"}`}
              >
                {tab === "user" ? <Users className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {tab === "user" ? "Untuk Peserta" : "Untuk Fotografer"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DETAILED FEATURES ═══════════════════════════════ */}
      <section className="py-20 bg-slate-50/60 border-b border-slate-100">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="rv rv-u text-center mb-12">
            <h2 className="fw8 text-4xl md:text-5xl text-slate-900 mb-3">
              Fitur <span className="g-blue">Lengkap</span>
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              {activeTab === "user"
                ? "Semua yang Anda butuhkan untuk menemukan foto dengan mudah"
                : "Tools lengkap untuk mengelola dan mendistribusikan foto event"}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activeFeatures.map(({ Icon, title, desc, benefits }, i) => (
              <div key={`${activeTab}-${i}`} className="rv rv-u af-card" data-i={i % 3}>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{desc}</p>
                <div className="space-y-2">
                  {benefits.map((b, bi) => (
                    <div key={bi} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      </div>
                      <p className="text-xs text-slate-500">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BENEFITS / WHY US ═══════════════════════════════ */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="rv rv-u text-center mb-12">
            <div className="pill bg-blue-50 text-blue-700 border border-blue-100 mb-4">Kenapa Memilih Kami</div>
            <h2 className="fw8 text-4xl md:text-5xl text-slate-900 mb-3">
              Manfaat yang <span className="g-blue">Nyata</span>
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Bukan sekadar janji — ini yang benar-benar Anda rasakan saat menggunakan AmbilFoto.id
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {benefits.map(({ Icon, stat, title, desc }, i) => (
              <div key={i} className="rv rv-u af-card text-center" data-i={i}>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-black mb-1"
                  style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {stat}
                </p>
                <p className="text-xs font-bold text-slate-800 mb-1">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
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
              <h2 className="fw8 text-4xl text-white mt-3 mb-3 leading-tight">Siap Menemukan Foto Anda?</h2>
              <p className="text-blue-100 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Bergabung dengan ribuan pengguna yang sudah merasakan kemudahan mencari foto dengan AI face recognition.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={() => navigate("/register")}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 shadow-lg transition-all hover:-translate-y-0.5">
                  Mulai Gratis <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate("/pricing")} className="btn-g text-sm">
                  Lihat Harga
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

export default Features;