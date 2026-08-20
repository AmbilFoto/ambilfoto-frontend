import {
  Camera, Users, Target, Heart, Sparkles, TrendingUp,
  Award, Globe, Zap, Shield, Clock, ArrowRight, Check
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/* ─────────────────────────────────────────────────────────
   DESIGN TOKENS & SHARED CSS
───────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  .pg { font-family:'Sora',system-ui,sans-serif; }
  .mono { font-family:'DM Mono',monospace; }
  .fw8 { font-weight:800; letter-spacing:-0.03em; }

  /* Gradient text */
  .g-blue { background:linear-gradient(135deg,#1d4ed8,#2563eb); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .g-warm { background:linear-gradient(135deg,#f59e0b,#ea580c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

  /* Buttons */
  .btn-b { display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:14px;border:none;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;box-shadow:0 6px 20px rgba(29,78,216,0.28);transition:transform .2s,box-shadow .2s; }
  .btn-b:hover { transform:translateY(-2px);box-shadow:0 12px 32px rgba(29,78,216,0.38); }
  .btn-o { display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;background:white;color:#1e40af;border:1.5px solid rgba(29,78,216,0.22);transition:all .2s; }
  .btn-o:hover { background:#eff6ff;border-color:rgba(29,78,216,0.45);transform:translateY(-1px); }
  .btn-g { display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;background:rgba(255,255,255,0.13);color:white;border:1.5px solid rgba(255,255,255,0.28);transition:all .2s; }
  .btn-g:hover { background:rgba(255,255,255,0.22);transform:translateY(-1px); }

  /* Pill label */
  .pill { display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase; }

  /* Card */
  .card { background:white;border:1.5px solid #f1f5f9;border-radius:20px;padding:26px;transition:border-color .28s,box-shadow .28s,transform .28s; }
  .card:hover { border-color:rgba(59,130,246,.2);box-shadow:0 10px 36px rgba(59,130,246,.09);transform:translateY(-4px); }

  /* ─── Scroll reveal ──────────────────────────────────────
     Start state — elements are invisible
     Transition is FAST (0.45s) and starts EARLY (threshold 5%)
     easing: ease-out-quart for smooth decel
  ────────────────────────────────────────────────────────── */
  .rv {
    opacity: 0;
    will-change: opacity, transform;
  }
  /* Direction variants */
  .rv-u  { transform: translateY(28px); }
  .rv-l  { transform: translateX(-36px); }
  .rv-r  { transform: translateX(36px); }
  .rv-s  { transform: scale(0.94); }

  /* Visible state */
  .rv.in {
    opacity: 1;
    transform: none;
    transition:
      opacity  .45s cubic-bezier(0.22,1,0.36,1),
      transform .45s cubic-bezier(0.22,1,0.36,1);
  }

  /* Stagger delays — keep them SHORT */
  .rv[data-i="0"] { }
  .rv[data-i="1"] { transition-delay: .06s; }
  .rv[data-i="2"] { transition-delay: .12s; }
  .rv[data-i="3"] { transition-delay: .18s; }

  /* ─── Hero entrance (CSS keyframes, plays immediately) ─── */
  .h-in {
    opacity: 0;
    animation: hIn .65s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  @keyframes hIn { to { opacity:1; transform:none; } }
  .h-in.from-y { transform: translateY(24px); }
  .h-d0 { animation-delay:.04s; }
  .h-d1 { animation-delay:.16s; }
  .h-d2 { animation-delay:.28s; }
  .h-d3 { animation-delay:.38s; }

  /* ─── Float (photo) — GPU-friendly transform only ──────── */
  @keyframes flt { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
  .flt { animation: flt 5s ease-in-out infinite; }

  /* ─── Live dot ──────────────────────────────────────────── */
  @keyframes ld { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.78)} }
  .ldot { display:inline-block;width:7px;height:7px;border-radius:50%;background:#3b82f6;animation:ld 1.8s ease-in-out infinite; }

  /* Timeline */
  .tl::before { content:'';position:absolute;left:17px;top:4px;bottom:4px;width:2px;background:linear-gradient(to bottom,#dbeafe,#bfdbfe 80%,transparent); }

  /* Achievement rows */
  .ach-row { display:flex;align-items:flex-start;gap:12px;padding:9px 0;border-bottom:1px solid #f8fafc;transition:all .2s; }
  .ach-row:last-child { border-bottom:none; }
  .ach-ic { width:22px;height:22px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;transition:all .2s; }
  .ach-row:hover .ach-ic { background:#1d4ed8; }
`;

/* ─────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────── */

/** Observe ALL .rv elements — including those added later by React renders */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target); // fire once, no reverse jitter
          }
        });
      },
      {
        threshold: 0.05,          // trigger very early
        rootMargin: "0px 0px -20px 0px",
      }
    );

    const observe = () =>
      document.querySelectorAll(".rv").forEach((el) => obs.observe(el));

    observe();

    // Also catch late-rendered elements (e.g. async plan cards)
    const mut = new MutationObserver(observe);
    mut.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mut.disconnect();
    };
  }, []);
}

/** Canvas network particle background */
function useCanvas(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let id: number;

    const rs = () => {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    };
    rs();
    window.addEventListener("resize", rs);

    const N = 40;
    const dots = Array.from({ length: N }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      a: Math.random() * 0.12 + 0.04,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > c.width) d.vx *= -1;
        if (d.y < 0 || d.y > c.height) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${d.a})`;
        ctx.fill();
      });
      for (let i = 0; i < N; i++)
        for (let j = i + 1; j < N; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${0.045 * (1 - dist / 90)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", rs);
    };
  }, []);
}

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
const About = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCanvas(canvasRef);
  useReveal();

  /* ── Data ── */
  const stats = [
    { val: "50K+", label: "Pengguna Aktif", Icon: Users,  c: "text-blue-600",   bg: "bg-blue-50"   },
    { val: "1M+",  label: "Foto Diproses",  Icon: Camera, c: "text-amber-600",  bg: "bg-amber-50"  },
    { val: "95%+", label: "Akurasi AI",     Icon: Target, c: "text-blue-600",   bg: "bg-blue-50"   },
    { val: "500+", label: "Event Partner",  Icon: Award,  c: "text-orange-600", bg: "bg-orange-50" },
  ];

  const values = [
    { Icon: Heart,      title: "Customer First",    desc: "Kepuasan pengguna adalah prioritas. Setiap fitur dirancang dengan user experience terbaik.",         a: "bg-orange-50 text-orange-500" },
    { Icon: Shield,     title: "Privacy & Security",desc: "Data wajah dienkripsi AES-256 end-to-end. Privasi Anda adalah hak yang kami jaga sepenuhnya.",      a: "bg-blue-50 text-blue-600"    },
    { Icon: Sparkles,   title: "Innovation",        desc: "Terus berinovasi menggunakan teknologi AI terkini untuk pengalaman terbaik bagi pengguna.",          a: "bg-amber-50 text-amber-600"  },
    { Icon: TrendingUp, title: "Continuous Growth", desc: "Berkembang bersama komunitas, meningkatkan layanan berdasarkan feedback nyata para pengguna.",       a: "bg-blue-50 text-blue-600"    },
  ];

  const timeline = [
    { year: "2023", title: "Awal Perjalanan",      desc: "AmbilFoto.id diluncurkan dengan visi membuat pencarian foto acara lebih mudah menggunakan AI." },
    { year: "2024", title: "Ekspansi Nasional",    desc: "Bermitra dengan 200+ event organizer di seluruh Indonesia, mencapai 10.000 pengguna aktif pertama." },
    { year: "2025", title: "Marketplace & AI 2.0", desc: "Meluncurkan marketplace foto dan meningkatkan akurasi AI hingga 95%+ dengan deep learning terbaru." },
  ];

  const achievements = [
    "Teknologi Face Recognition Akurasi 95%+",
    "Partnership dengan 500+ Event Organizer Terkemuka",
    "Pemrosesan Foto Real-time dalam Hitungan Detik",
    "Keamanan Data Berstandar Internasional AES-256",
    "Customer Support Responsif 7 Hari Seminggu",
    "Interface User-Friendly di Semua Device",
  ];

  const tech = [
    { Icon: Zap,    title: "Deep Learning",         desc: "Neural networks canggih untuk pengenalan wajah 95%+ di berbagai kondisi cahaya dan sudut.", a: "bg-amber-50 text-amber-600"  },
    { Icon: Shield, title: "End-to-End Encryption", desc: "Semua data wajah dienkripsi AES-256 sejak upload hingga penghapusan. Keamanan setara bank.",  a: "bg-blue-50 text-blue-600"    },
    { Icon: Clock,  title: "Real-time Processing",  desc: "Cloud computing GPU memproses ribuan foto secara paralel. Hasil tampil dalam hitungan detik.", a: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="pg flex min-h-screen flex-col bg-white">
      <style>{STYLES}</style>
      <Header />

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100 pt-20 pb-24 md:pt-28">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Static gradient blobs — no animation, no GPU thrash */}
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(219,234,254,0.55) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -right-24 w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(254,243,199,0.45) 0%, transparent 70%)" }} />

        <div className="container max-w-3xl mx-auto px-6 text-center relative">
          {/* Pill */}
          <div className="h-in h-d0 from-y pill bg-blue-50 text-blue-700 border border-blue-200 mb-7 mx-auto w-fit">
            <span className="ldot" /> Tentang Kami
          </div>

          {/* Heading */}
          <h1 className="h-in h-d1 from-y fw8 text-5xl md:text-6xl lg:text-7xl text-slate-900 leading-[1.05] mb-5">
            Misi Kami:<br />
            <span className="g-blue">Membuat Setiap Momen</span><br />
            Mudah Ditemukan
          </h1>

          {/* Sub */}
          <p className="h-in h-d2 from-y text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
            AmbilFoto.id adalah platform AI photo marketplace yang membantu kamu menemukan dan membeli foto dari acara apapun mudah, cepat, dan aman.
          </p>

          {/* CTA 
          <div className="h-in h-d3 from-y flex gap-3 justify-center flex-wrap">
            <Link to="/register"><button className="btn-b"><Camera className="w-4 h-4" />Mulai Sekarang</button></Link>
            <Link to="/contact"><button className="btn-o">Hubungi Kami <ArrowRight className="w-4 h-4" /></button></Link>
          </div>*/}
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════════ 
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ val, label, Icon, c, bg }, i) => (
              <div key={i} className="rv rv-u card text-center" data-i={i}>
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={`w-5 h-5 ${c}`} />
                </div>
                <p className={`text-3xl font-black mb-1 ${c}`}>{val}</p>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>*/}

      {/* ══ STORY ═══════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            <div className="rv rv-l">
              <div className="pill bg-blue-50 text-blue-700 border border-blue-100 mb-5">📖 Cerita Kami</div>
              <h2 className="fw8 text-4xl text-slate-900 mb-5 leading-tight">
                Lahir dari <span className="g-blue">Frustrasi Nyata</span>
              </h2>
              <div className="space-y-4 text-slate-500 text-sm leading-relaxed">
                <p>AmbilFoto.id lahir dari pengalaman pribadi kami yang sering kesulitan menemukan foto diri sendiri setelah menghadiri berbagai acara. Betapa frustrasinya harus scroll ratusan foto hanya untuk menemukan beberapa foto diri kita.</p>
                <p>Dengan teknologi AI dan Face Recognition terkini, kami menciptakan solusi yang membuat proses ini menjadi instant. Upload wajah sekali, biarkan AI bekerja menemukan semua fotomu dari berbagai acara.</p>
                <p>Hari ini, kami bangga membantu puluhan ribu pengguna menemukan momen-momen berharga mereka.</p>
              </div>
            </div>

            <div className="rv rv-r flex justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-3xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse, rgba(219,234,254,0.6) 0%, rgba(254,243,199,0.4) 100%)", filter: "blur(24px)" }} />
                <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-slate-200/60 border-4 border-white flt">
                  <img src="https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg"
                    alt="Team" className="w-full max-w-sm aspect-square object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ VALUES ══════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50/60 border-y border-slate-100">
        <div className="container max-w-5xl mx-auto px-6">

          <div className="rv rv-u text-center mb-12">
            <div className="pill bg-orange-50 text-orange-700 border border-orange-100 mb-4">💡 Nilai-Nilai Kami</div>
            <h2 className="fw8 text-4xl text-slate-900 mb-3">Prinsip yang Memandu Kami</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Setiap keputusan dan inovasi berlandaskan empat prinsip utama</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map(({ Icon, title, desc, a }, i) => (
              <div key={i} className="rv rv-u card group cursor-default" data-i={i}>
                <div className={`w-12 h-12 ${a} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="fw8 text-base text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══ TIMELINE ════════════════════════════════════════ 
      <section className="py-20 bg-white">
        <div className="container max-w-3xl mx-auto px-6">

          <div className="rv rv-u text-center mb-14">
            <div className="pill bg-blue-50 text-blue-700 border border-blue-100 mb-4">🚀 Perjalanan Kami</div>
            <h2 className="fw8 text-4xl text-slate-900 mb-3">Dari Ide ke Platform Terpercaya</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Tiga tahun membangun produk yang dicintai ribuan pengguna</p>
          </div>

          <div className="relative tl space-y-8 pl-2">
            {timeline.map(({ year, title, desc }, i) => (
              <div key={i} className="rv rv-l flex items-start gap-5" data-i={i}>
                <div className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-black"
                  style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: "0 4px 12px rgba(29,78,216,0.3)" }}>
                  {i + 1}
                </div>
                <div className="flex-1 pb-2">
                  <span className="mono text-xs font-bold text-blue-600 tracking-widest">{year}</span>
                  <h3 className="fw8 text-lg text-slate-900 mt-1 mb-1">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>*/}

      {/* ══ ACHIEVEMENTS ════════════════════════════════════ 
      <section className="py-20 bg-slate-50/60 border-y border-slate-100">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            <div className="rv rv-s">
              <div className="relative">
                <div className="absolute -inset-3 rounded-3xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse, rgba(254,243,199,0.5) 0%, rgba(219,234,254,0.4) 100%)", filter: "blur(24px)" }} />
                <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-slate-200/60 border-4 border-white">
                  <img src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg"
                    alt="Technology" className="w-full aspect-square object-cover" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-xl px-3 py-2 shadow-lg">
                    <p className="text-xs text-slate-500 font-medium">Pengguna puas</p>
                    <p className="text-2xl font-black text-amber-500">98%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rv rv-r">
              <div className="pill bg-amber-50 text-amber-700 border border-amber-100 mb-5">🏆 Keunggulan Kami</div>
              <h2 className="fw8 text-4xl text-slate-900 mb-6 leading-tight">
                Apa yang Membuat Kami <span className="g-warm">Berbeda</span>
              </h2>
              {achievements.map((a, i) => (
                <div key={i} className="ach-row group">
                  <div className="ach-ic"><Check className="w-3 h-3 text-blue-600" /></div>
                  <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">{a}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>*/}

      {/* ══ TECHNOLOGY ══════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-6">

          <div className="rv rv-u text-center mb-12">
            <div className="pill bg-blue-50 text-blue-700 border border-blue-100 mb-4">⚙️ Teknologi Kami</div>
            <h2 className="fw8 text-4xl text-slate-900 mb-3">Ditenagai AI Mutakhir</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Infrastruktur teknologi kelas dunia untuk hasil yang dapat diandalkan</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {tech.map(({ Icon, title, desc, a }, i) => (
              <div key={i} className="rv rv-u card group cursor-default" data-i={i}>
                <div className={`w-12 h-12 ${a} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="fw8 text-base text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="container max-w-2xl mx-auto px-6 text-center">
          <div className="rv rv-s relative overflow-hidden rounded-3xl p-12 md:p-16 shadow-2xl shadow-blue-100"
            style={{ background: "linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)" }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
            <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -right-16 w-60 h-60 rounded-full bg-amber-300/10 blur-2xl" />
            <div className="relative">
              <Globe className="w-12 h-12 text-amber-300 mx-auto mb-5" />
              <h2 className="fw8 text-4xl text-white mb-4">Bergabunglah Bersama Kami</h2>
              <p className="text-blue-100 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Mari bersama membuat pencarian foto acara lebih mudah dan menyenangkan untuk semua orang.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                {/*<Link to="/register">
                  <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 shadow-lg transition-all hover:-translate-y-0.5">
                    <Camera className="w-4 h-4" /> Mulai Sekarang
                  </button>
                </Link>*/}
                <Link to="/contact">
                  <button className="btn-g text-sm">Hubungi Kami <ArrowRight className="w-4 h-4" /></button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;