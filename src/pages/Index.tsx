import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import {
  Camera, Scan, Download, Zap, Shield,
  Code2, ArrowRight, Key, BarChart3, Sparkles,
  Check, Star, Users, Image as ImageIcon, Globe,
  Search, Heart, ShoppingBag, TrendingUp, Award,
  Layers, Eye, MapPin, Aperture, Mountain, Music,
  Mic2, GraduationCap, Building2, Cpu, Lock
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

/* ────────────────────────── COUNTER ─────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = to / 60;
      const timer = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(timer); }
        else setVal(Math.floor(start));
      }, 16);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ────────────────────────── PHOTO CARD (no image) ──────────── */
const CARD_GRADS = [
  "from-blue-400 to-indigo-600",
  "from-violet-400 to-purple-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-500",
];
const CARD_ICONS = [GraduationCap, Music, Mic2, Building2];

function PhotoCard({ price, event, photographer, liked, gradIdx }: {
  price: string; event: string; photographer: string; liked?: boolean; gradIdx: number;
}) {
  const [isLiked, setIsLiked] = useState(liked || false);
  const [hov, setHov] = useState(false);
  const Icon = CARD_ICONS[gradIdx % CARD_ICONS.length];
  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-100"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className={`relative bg-gradient-to-br ${CARD_GRADS[gradIdx % CARD_GRADS.length]} flex items-center justify-center`} style={{ aspectRatio: "4/3" }}>
        <Icon className="w-12 h-12 text-white/30" />
        <div className="absolute top-3 left-3 flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
        </div>
        <div className="absolute bottom-3 left-3 text-xs font-bold text-white/80 bg-black/20 rounded-full px-2 py-0.5">HD</div>
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-3 transition-opacity duration-300" style={{ opacity: hov ? 1 : 0 }}>
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
        </div>
        <button
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:scale-110 transition-transform"
          onClick={(e) => { e.stopPropagation(); setIsLiked(v => !v); }}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-orange-500 text-orange-500" : "text-slate-400"}`} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-slate-800 font-semibold text-sm mb-0.5 truncate">{event}</p>
        <p className="text-slate-400 text-xs mb-2">oleh {photographer}</p>
        <div className="flex items-center justify-between">
          <span className="text-blue-600 font-bold text-sm">{price}</span>
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">RAW+JPG</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── PHOTOGRAPHER CARD ──────────────── */
const PGR_GRADS = ["from-blue-500 to-blue-700", "from-violet-500 to-purple-700", "from-rose-500 to-pink-700", "from-emerald-500 to-teal-700"];
const PGR_INIT  = ["BS", "SW", "AP", "RM"];

function PhotographerCard({ name, specialty, photos, sales, rating, idx }: {
  name: string; specialty: string; photos: number; sales: string; rating: number; idx: number;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 bg-white cursor-pointer">
      <div className={`relative bg-gradient-to-br ${PGR_GRADS[idx % PGR_GRADS.length]} flex items-center justify-center`} style={{ aspectRatio: "3/2" }}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 30% 20%,white 0%,transparent 50%),radial-gradient(circle at 80% 80%,white 0%,transparent 40%)"
        }} />
        <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-lg font-black">
          {PGR_INIT[idx % PGR_INIT.length]}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-400 text-amber-900 rounded-full px-2 py-0.5 text-xs font-bold shadow">
          <Star className="w-3 h-3 fill-amber-900" /> {rating.toFixed(1)}
        </div>
      </div>
      <div className="p-4">
        <p className="font-bold text-slate-800 text-sm mb-0.5">{name}</p>
        <p className="text-slate-400 text-xs mb-3">{specialty}</p>
        <div className="flex gap-3 text-xs mb-4">
          <span className="text-slate-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" />{photos.toLocaleString()}</span>
          <span className="text-amber-600 font-medium flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{sales}</span>
        </div>
        <button className="w-full py-2 rounded-xl text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
          Lihat Portfolio →
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────── HERO VISUAL (pure CSS) ─────────── */
function HeroVisual() {
  return (
    <div className="relative select-none">
      <div className="relative z-10 rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-blue-100 overflow-hidden p-5">
        {/* Browser bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1">
            <Lock className="w-3 h-3" /> ambilfoto.com
          </div>
        </div>

        {/* AI result banner */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-3 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Scan className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-800">Face AI · Scanning selesai</p>
              <div className="w-full bg-blue-200 rounded-full h-1 mt-1">
                <div className="bg-blue-600 h-1 rounded-full w-full" />
              </div>
            </div>
            <span className="text-xs font-black text-blue-700 shrink-0">1.4s</span>
          </div>
          <p className="text-xs text-blue-700">✨ Ditemukan <span className="font-black text-blue-900">24 foto</span> dari 4,820 foto</p>
        </div>

        {/* Mini photo grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { g: "from-blue-400 to-indigo-500", I: GraduationCap, mark: true },
            { g: "from-violet-400 to-purple-500", I: Music },
            { g: "from-rose-400 to-pink-500", I: Mic2 },
            { g: "from-amber-400 to-orange-500", I: Building2 },
            { g: "from-teal-400 to-cyan-500", I: Mountain },
            { g: "from-emerald-400 to-green-500", I: Camera },
          ].map((item, i) => (
            <div key={i} className={`bg-gradient-to-br ${item.g} rounded-xl flex items-center justify-center relative overflow-hidden`} style={{ aspectRatio: "1" }}>
              <item.I className="w-5 h-5 text-white/40" />
              {item.mark && <>
                <div className="absolute inset-0 border-2 border-white/70 rounded-xl" />
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-white flex items-center justify-center">
                  <Check className="w-1.5 h-1.5 text-white" />
                </div>
              </>}
            </div>
          ))}
        </div>

        <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2">
          <Download className="w-3.5 h-3.5" /> Download 24 Foto · Rp 480.000
        </button>
      </div>

      {/* Float badges */}
      <div className="float-3 absolute -bottom-4 -left-6 bg-white rounded-2xl px-4 py-3 shadow-xl border border-slate-100 z-20 flex items-center gap-3 w-48">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500">Terjual hari ini</p>
          <p className="text-base font-black text-emerald-600">2,847 <span className="text-xs font-medium text-emerald-400">+18%</span></p>
        </div>
      </div>

      <div className="float-1 absolute -top-4 -right-5 bg-white rounded-xl px-3 py-2.5 shadow-lg border border-slate-100 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800">4.9 / 5.0</p>
            <p className="text-xs text-slate-400">50K+ ulasan</p>
          </div>
        </div>
      </div>

      <div className="float-2 absolute top-1/2 -right-8 bg-white rounded-xl px-3 py-2 shadow-lg border border-slate-100 z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
            <GraduationCap className="w-3 h-3 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Wisuda ITB</p>
            <p className="text-xs text-slate-400">2025 · 1,240 foto</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════ MAIN ═════════════════════════════ */
const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(user?.role === "photographer" || user?.role === "admin" ? "/photographer/dashboard" : "/user/dashboard");
  }, [isAuthenticated, user, navigate]);

  /* Particle canvas — 30fps throttle */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let rafId: number, running = true;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const dots = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.4, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, a: Math.random() * 0.12 + 0.04,
    }));
    let frame = 0;
    const draw = () => {
      if (!running) return;
      rafId = requestAnimationFrame(draw);
      if (++frame % 2 !== 0) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${d.a})`; ctx.fill();
      });
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y, d2 = dx * dx + dy * dy;
        if (d2 < 6400) {
          ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(59,130,246,${0.05*(1-Math.sqrt(d2)/80)})`; ctx.lineWidth=1; ctx.stroke();
        }
      }
    };
    draw();
    const onVis = () => { running = !document.hidden; if (running) draw(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { running=false; cancelAnimationFrame(rafId); window.removeEventListener("resize",resize); document.removeEventListener("visibilitychange",onVis); };
  }, []);

  /* GSAP */
  useEffect(() => {
    const t = setTimeout(() => {
      const ctx = gsap.context(() => {
        const scrollReveal = (selector: string, trigger: string, from: gsap.TweenVars) => {
          if (!document.querySelector(selector)) return;
          gsap.set(selector, { autoAlpha: 0, ...from });
          ScrollTrigger.create({
            trigger, start: "top 85%", once: true,
            onEnter: () => gsap.to(selector, { autoAlpha:1, y:0, x:0, scale:1, duration:0.65, stagger:0.12, ease:"power3.out", clearProps:"transform" }),
          });
        };

        // Hero initial state
        gsap.set([".hero-badge",".hero-h1 .line",".hero-sub",".hero-search",".hero-trust > *",".hero-preview"], { autoAlpha:0 });
        gsap.set(".hero-badge",     { y:20 });
        gsap.set(".hero-h1 .line",  { y:60 });
        gsap.set(".hero-sub",       { y:24 });
        gsap.set(".hero-search",    { y:20 });
        gsap.set(".hero-trust > *", { y:10 });
        gsap.set(".hero-preview",   { x:50, scale:0.95 });

        gsap.timeline({ defaults:{ease:"power3.out"}, delay:0.15 })
          .to(".hero-badge",     { autoAlpha:1,y:0,duration:0.6,ease:"back.out(1.5)" })
          .to(".hero-h1 .line",  { autoAlpha:1,y:0,duration:0.85,stagger:0.12 }, "-=0.3")
          .to(".hero-sub",       { autoAlpha:1,y:0,duration:0.6 }, "-=0.4")
          .to(".hero-search",    { autoAlpha:1,y:0,duration:0.5 }, "-=0.35")
          .to(".hero-trust > *", { autoAlpha:1,y:0,duration:0.4,stagger:0.08 }, "-=0.3")
          .to(".hero-preview",   { autoAlpha:1,x:0,scale:1,duration:0.8 }, "-=0.7");

        gsap.to(".float-1", { y:-14, duration:3.5, repeat:-1, yoyo:true, ease:"sine.inOut" });
        gsap.to(".float-2", { y: 10, duration:4.2, repeat:-1, yoyo:true, ease:"sine.inOut", delay:0.7 });
        gsap.to(".float-3", { y:-10, duration:3.8, repeat:-1, yoyo:true, ease:"sine.inOut", delay:1.4 });

        scrollReveal(".stat-card",        ".stats-row",             { y:30, scale:0.94 });
        scrollReveal(".step-item",        ".how-section",           { y:50 });
        scrollReveal(".photo-card-anim",  ".marketplace-section",   { y:40 });
        scrollReveal(".pgr-card",         ".photographers-section", { y:50, scale:0.95 });
        scrollReveal(".ai-item",          ".ai-section",            { x:-40 });
        scrollReveal(".api-el",           ".api-section",           { y:40 });
        scrollReveal(".cta-el",           ".cta-section",           { y:40 });
      });
      return () => ctx.revert();
    }, 120);
    return () => clearTimeout(t);
  }, []);

  /* ══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily:"'Sora',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        .playfair{font-family:'Sora',system-ui,sans-serif;font-weight:800;letter-spacing:-0.02em;}
        .mono{font-family:'DM Mono',monospace;}
        .gradient-text{background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .gradient-text-warm{background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .mesh-bg{background-color:#fff;background-image:radial-gradient(at 0% 0%,rgba(59,130,246,.08) 0px,transparent 60%),radial-gradient(at 100% 0%,rgba(251,191,36,.06) 0px,transparent 50%),radial-gradient(at 50% 100%,rgba(59,130,246,.06) 0px,transparent 60%);}
        .btn-primary{background:linear-gradient(135deg,#1d4ed8,#2563eb);box-shadow:0 8px 32px rgba(29,78,216,.25),0 2px 8px rgba(29,78,216,.15);transition:all .25s cubic-bezier(.4,0,.2,1);}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(29,78,216,.4),0 4px 12px rgba(29,78,216,.25);}
        .btn-outline{border:1.5px solid rgba(29,78,216,.25);transition:all .25s;}
        .btn-outline:hover{background:rgba(29,78,216,.05);border-color:rgba(29,78,216,.5);transform:translateY(-1px);}
        .section-pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:100px;}
        .search-bar{background:white;border:1.5px solid rgba(59,130,246,.2);border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06),0 0 0 4px rgba(59,130,246,.04);transition:all .3s;}
        .search-bar:focus-within{border-color:rgba(59,130,246,.5);box-shadow:0 4px 32px rgba(0,0,0,.08),0 0 0 4px rgba(59,130,246,.08);}
        .tab-active{background:white;color:#1d4ed8;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.08);}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
        .live-dot{animation:pulse-dot 1.8s ease-in-out infinite;}
        @keyframes scanline{0%,100%{transform:translateX(0)}50%{transform:translateX(220%)}}
      `}</style>

      <Header />

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden mesh-bg pt-16 pb-12 md:pt-24 md:pb-24">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-amber-100/30 blur-3xl pointer-events-none" />

        <div className="container max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="hero-badge section-pill bg-blue-50 text-blue-700 border border-blue-200/80 mb-6 w-fit" style={{visibility:"hidden"}}>
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                AI-Powered Photo Marketplace
              </div>

              <h1 className="hero-h1 playfair text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
                <span className="line block text-slate-900" style={{visibility:"hidden"}}>Temukan,</span>
                <span className="line block gradient-text" style={{visibility:"hidden"}}>Beli & Jual</span>
                <span className="line block text-slate-900" style={{visibility:"hidden"}}>Foto Event</span>
              </h1>

              <p className="hero-sub text-lg text-slate-500 leading-relaxed mb-8 max-w-lg" style={{visibility:"hidden"}}>
                Marketplace foto event terbesar. Temukan dirimu di ribuan foto wisuda, konser & konferensi — atau jual karyamu ke ribuan pembeli.
              </p>

              <div className="hero-search search-bar flex items-center gap-3 px-5 py-4 mb-6 max-w-lg" style={{visibility:"hidden"}}>
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input type="text" placeholder="Cari event, nama, atau upload wajahmu..." className="flex-1 bg-transparent text-slate-700 text-sm outline-none placeholder:text-slate-400" />
                <button className="btn-primary shrink-0 text-white text-sm font-bold px-5 py-2.5 rounded-xl">Cari</button>
              </div>

              <div className="hero-trust flex flex-wrap gap-x-5 gap-y-2" style={{visibility:"hidden"}}>
                {["Gratis untuk pencari foto","500K+ foto tersedia","Pembayaran aman","HD Quality"].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                    </div>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-preview hidden lg:block" style={{visibility:"hidden"}}>
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ══════════════════════════════════════════════
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="stats-row container max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { val:500, suf:"K+", label:"Foto tersedia",    icon:ImageIcon, color:"text-blue-600",   bg:"bg-blue-50" },
            { val:10,  suf:"K+", label:"Fotografer aktif", icon:Camera,    color:"text-amber-600",  bg:"bg-amber-50" },
            { val:95,  suf:"%",  label:"Akurasi AI",       icon:Zap,       color:"text-amber-600",  bg:"bg-amber-50" },
            { val:50,  suf:"K+", label:"Pengguna puas",    icon:Heart,     color:"text-orange-600", bg:"bg-orange-50" },
          ].map((s,i) => (
            <div key={i} className="stat-card flex flex-col items-center py-5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className={`text-3xl font-extrabold ${s.color}`}><Counter to={s.val} suffix={s.suf} /></p>
              <p className="text-xs text-slate-500 mt-0.5 text-center">{s.label}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════ */}
     <section className="how-section py-20 bg-white">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="section-pill bg-blue-50 text-blue-700 border border-blue-100 mb-4">⚡ Cara Kerja</div>
            <h2 className="playfair text-4xl md:text-5xl font-black text-slate-900 mb-3">
              Untuk Siapa Saja
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">
              Platform kami melayani dua kebutuhan utama — pencari foto dan fotografer profesional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Path A — User */}
            <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Untuk Kamu yang Mencari Foto</p>
                  <p className="text-xs text-slate-400">Gratis — tanpa biaya langganan</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { step: "01", icon: Camera, title: "Upload Wajahmu", desc: "Selfie cepat atau foto apapun. AI kami pelajari profil wajahmu." },
                  { step: "02", icon: Scan, title: "AI Mencarikan Fotomu", desc: "Kami scan ribuan foto event dalam detik dengan akurasi 95%+." },
                  { step: "03", icon: ShoppingBag, title: "Beli & Download", desc: "Bayar hanya foto yang kamu mau. Harga terjangkau, kualitas HD." },
                ].map(s => (
                  <div key={s.step} className="step-item flex items-start gap-4 p-4 rounded-xl hover:bg-blue-50/50 transition-colors">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                    <span className="ml-auto mono text-xs text-slate-300 font-bold shrink-0">{s.step}</span>
                  </div>
                ))}
              </div>
              <Link to="/register">
                <button className="mt-6 w-full btn-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Temukan Fotomu — Gratis
                </button>
              </Link>
            </div>

            {/* Path B — Photographer */}
            <div className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Untuk Fotografer Profesional</p>
                  <p className="text-xs text-slate-400">Monetize karya — komisi kompetitif</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { step: "01", icon: Download, title: "Upload Koleksi Event", desc: "Upload foto event dalam batch besar. Sistem kami auto-tag dan kategorikan." },
                  { step: "02", icon: ImageIcon, title: "AI Tagging Otomatis", desc: "Face recognition auto-link foto ke profil pembeli yang tepat." },
                  { step: "03", icon: TrendingUp, title: "Terima Pembayaran", desc: "Komisi 70% per penjualan. Cairkan kapan saja ke rekening bankmu." },
                ].map(s => (
                  <div key={s.step} className="step-item flex items-start gap-4 p-4 rounded-xl hover:bg-orange-50/50 transition-colors">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                    <span className="ml-auto mono text-xs text-slate-300 font-bold shrink-0">{s.step}</span>
                  </div>
                ))}
              </div>
              <Link to="/register">
                <button className="mt-6 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors">
                  <Award className="w-4 h-4" /> Daftar sebagai Fotografer
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MARKETPLACE ════════════════════════════════════════ */}
      <section className="marketplace-section py-20 bg-slate-50/70">
        <div className="container max-w-6xl mx-auto px-6">
          {/* Ganti flex row jadi flex col di mobile */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="section-pill bg-amber-50 text-amber-700 border border-amber-100 mb-3">🔥 Trending Sekarang</div>
              <h2 className="playfair text-4xl md:text-5xl font-black text-slate-900 leading-tight">
                Foto Event<br /><span className="gradient-text-warm">Terpopuler</span>
              </h2>
            </div>
            {/* Ganti bagian tab filter */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 text-sm shadow-sm overflow-x-auto scrollbar-none max-w-full shrink-0">
              {["Semua","Wisuda","Konser","Konferensi"].map((t,i) => (
                <button 
                  key={t} 
                  className={`px-4 py-2 rounded-lg transition-all font-medium whitespace-nowrap ${i===0?"tab-active":"text-slate-500 hover:text-slate-700"}`}
                >
                  {t}
                </button>
              ))}
          </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { price:"Rp 25.000", event:"Wisuda UI 2025",  photographer:"Budi S.",  liked:true,  gradIdx:0 },
              { price:"Rp 35.000", event:"Java Jazz 2025",  photographer:"Sari W.",  liked:false, gradIdx:1 },
              { price:"Rp 20.000", event:"Wisuda ITB 2025", photographer:"Andi P.",  liked:true,  gradIdx:2 },
              { price:"Rp 30.000", event:"TEDxJakarta",     photographer:"Rina M.",  liked:false, gradIdx:3 },
            ].map((p,i) => <div key={i} className="photo-card-anim"><PhotoCard {...p} /></div>)}
          </div>

          <div className="mt-10 text-center">
            <Link to="/marketplace">
              <button className="btn-outline inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-blue-600 font-bold text-sm bg-white">
                Lihat Semua Foto <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ PHOTOGRAPHERS ══════════════════════════════════════ */}
      <section className="photographers-section py-20 bg-white">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="section-pill bg-amber-50 text-amber-700 border border-amber-100 mb-4">🏆 Fotografer Terbaik</div>
            <h2 className="playfair text-4xl md:text-5xl font-black text-slate-900 mb-3">Temui Para Kreator</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Fotografer profesional berpengalaman siap mengabadikan momenmu.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { name:"Budi Santoso",   specialty:"Wedding & Wisuda",      photos:1240, sales:"4.2K", rating:4.9, idx:0 },
              { name:"Sari Wulandari", specialty:"Concert & Festival",     photos:890,  sales:"2.8K", rating:4.8, idx:1 },
              { name:"Andi Pratama",   specialty:"Corporate & Conference", photos:2100, sales:"6.1K", rating:4.9, idx:2 },
              { name:"Rina Marlina",   specialty:"Street & Documentary",   photos:560,  sales:"1.5K", rating:4.7, idx:3 },
            ].map((p,i) => <div key={i} className="pgr-card"><PhotographerCard {...p} /></div>)}
          </div>

          <div className="mt-10 text-center">
            <Link to="/photographers">
              <button className="btn-outline inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-blue-600 font-bold text-sm bg-white">
                Lihat Semua Fotografer <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ AI SECTION ═════════════════════════════════════════ */}
      <section className="ai-section py-20 bg-slate-50/70 overflow-hidden">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — AI UI demo */}
            <div className="relative">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">AmbilFoto Face AI v2.4</p>
                    <p className="text-xs text-slate-400">GPU Cluster · Jakarta DC</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <span className="live-dot w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Online
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-4 mb-4 relative overflow-hidden" style={{ minHeight:180 }}>
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage:"linear-gradient(rgba(59,130,246,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.4) 1px,transparent 1px)",
                    backgroundSize:"20px 20px"
                  }} />
                  <div className="relative flex items-center justify-center gap-6 pt-4 pb-2">
                    {[
                      { label:"KAMU", bc:"border-blue-400", tc:"text-blue-400", bg:"bg-blue-500/10", conf:"98%" },
                      { label:"ID:247", bc:"border-emerald-400", tc:"text-emerald-400", bg:"bg-emerald-500/10", conf:"94%" },
                      { label:"ID:891", bc:"border-amber-400", tc:"text-amber-400", bg:"bg-amber-500/10", conf:"91%" },
                    ].map((b,i) => (
                      <div key={i} className={`relative w-16 h-20 border-2 ${b.bc} ${b.bg} rounded-lg flex flex-col items-center justify-center`}>
                        <div className={`w-8 h-8 rounded-full border ${b.bc} flex items-center justify-center mb-1`}>
                          <Users className={`w-4 h-4 ${b.tc}`} />
                        </div>
                        <p className={`text-xs font-black ${b.tc}`}>{b.label}</p>
                        <p className="text-xs text-slate-500">{b.conf}</p>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 h-0.5 bg-blue-500/30 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-blue-400 rounded-full" style={{ animation:"scanline 2s ease-in-out infinite" }} />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-emerald-800">Scan selesai · 1.4 detik</p>
                    <p className="text-xs text-emerald-600">Ditemukan <strong>24 foto</strong> dari 4,820 foto event</p>
                  </div>
                  <button className="text-xs font-bold text-white bg-emerald-500 rounded-lg px-3 py-1.5 shrink-0">Lihat</button>
                </div>
              </div>

              <div className="absolute -bottom-5 -right-4 bg-white rounded-2xl px-4 py-3 shadow-xl border border-slate-100 z-10 flex items-center gap-3 w-40">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Akurasi</p>
                  <p className="text-xl font-black text-blue-700">95.2%</p>
                </div>
              </div>
            </div>

            <div>
              <div className="section-pill bg-blue-50 text-blue-700 border border-blue-100 mb-5">🤖 AI Face Recognition</div>
              <h2 className="playfair text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
                Teknologi AI yang<br /><span className="gradient-text">Mengenali Wajahmu</span>
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Tidak perlu scroll ratusan foto manual. Upload satu foto wajah, dan AI kami akan menemukan semua foto kamu dari event apapun dalam hitungan detik.
              </p>
              <div className="space-y-5">
                {[
                  { icon:Zap,    title:"Kecepatan Kilat",  desc:"Scan 10.000+ foto dalam < 2 detik dengan GPU-accelerated AI.",          color:"bg-amber-50 text-amber-600" },
                  { icon:Shield, title:"Privacy-First",    desc:"Face embeddings dienkripsi AES-256. Kami tidak simpan foto wajahmu.",   color:"bg-emerald-50 text-emerald-600" },
                  { icon:Eye,    title:"95%+ Akurasi",     desc:"Model terlatih pada 10M+ foto event Indonesia.",                        color:"bg-blue-50 text-blue-600" },
                  { icon:Layers, title:"Multi-Event",      desc:"Satu akun untuk semua event. Wisuda, konser, konferensi — terkumpul.",  color:"bg-violet-50 text-violet-600" },
                ].map((b,i) => (
                  <div key={i} className="ai-item flex items-start gap-4">
                    <div className={`shrink-0 w-11 h-11 rounded-xl ${b.color} flex items-center justify-center`}>
                      <b.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 mb-0.5">{b.title}</p>
                      <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/register">
                <button className="btn-primary mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold text-sm">
                  <Scan className="w-4 h-4" /> Coba Face Search — Gratis
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="section-pill bg-emerald-50 text-emerald-700 border border-emerald-100 mb-4">💰 Harga Transparan</div>
            <h2 className="playfair text-4xl md:text-5xl font-black text-slate-900 mb-3">
              Harga yang Adil<br /><span className="gradient-text">untuk Semua Pihak</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title:"Pencari Foto", price:"Gratis", sub:"untuk pencarian & browse", border:"border-blue-200", badge:"bg-blue-50 text-blue-700", btn:"btn-primary text-white", btnText:"Mulai Gratis", link:"/register", perks:["Face recognition AI","Browse 500K+ foto","Notifikasi foto baru","Bayar per foto (Rp 15K–50K)","Download kualitas HD"] },
              { title:"Fotografer", price:"Rp 0", sub:"daftar & upload gratis", border:"border-orange-300", badge:"bg-orange-500 text-white", btn:"bg-orange-500 hover:bg-orange-600 text-white", btnText:"Daftar Fotografer", link:"/register", highlight:true, perks:["Upload unlimited foto","Auto-tagging AI gratis","Komisi 70% per penjualan","Dashboard analitik","Cashout fleksibel"] },
              { title:"Developer API", price:"Dari Rp 249K", sub:"per bulan", border:"border-slate-200", badge:"bg-slate-100 text-slate-700", btn:"border-2 border-slate-200 text-slate-700 hover:bg-slate-50", btnText:"Lihat Paket API", link:"/pricing", perks:["REST API akses penuh","Dev & Prod API keys","Usage analytics","SLA 99.9% uptime","SDK & dokumentasi"] },
            ].map((plan,i) => (
              <div key={i} className={`relative bg-white rounded-3xl border-2 ${plan.border} p-8 shadow-sm ${plan.highlight?"shadow-orange-100 ring-2 ring-orange-200":""} hover:shadow-md transition-shadow flex flex-col`}>
                {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">Paling Populer</div>}
                <div className={`section-pill ${plan.badge} mb-4 text-xs w-fit`}>{plan.title}</div>
                <p className="text-3xl font-black text-slate-900 mb-0.5">{plan.price}</p>
                <p className="text-sm text-slate-400 mb-6">{plan.sub}</p>
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.perks.map(p => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check className="w-2.5 h-2.5 text-emerald-600" /></div>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link to={plan.link}><button className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.btn}`}>{plan.btnText}</button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ API ════════════════════════════════════════════════ */}
      <section className="api-section py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage:"radial-gradient(circle at 20% 50%,rgba(59,130,246,.3) 0%,transparent 50%),radial-gradient(circle at 80% 50%,rgba(251,191,36,.15) 0%,transparent 50%)" }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />

        <div className="container max-w-6xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="api-el section-pill bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-6">
                <Code2 className="w-3.5 h-3.5" /> Developer API Platform
              </div>
              <h2 className="api-el playfair text-4xl md:text-5xl font-black mb-4 leading-tight">
                Build Apps with<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-400">Face Recognition API</span>
              </h2>
              <p className="api-el text-slate-400 text-sm leading-relaxed mb-8 max-w-lg">
                Integrasikan AI face recognition ke dalam aplikasimu. REST API andal, uptime 99.9%, dokumentasi lengkap.
              </p>
              <div className="api-el grid grid-cols-2 gap-3 mb-8">
                {[
                  { icon:Key,       label:"Dev & Prod Keys",  sub:"Dual environment" },
                  { icon:BarChart3, label:"Usage Analytics",  sub:"Real-time dashboard" },
                  { icon:Shield,    label:"SLA 99.9%",        sub:"Uptime guaranteed" },
                  { icon:Globe,     label:"500+ Developer",   sub:"Sudah menggunakan" },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/10 transition-colors">
                    <b.icon className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">{b.label}</p>
                      <p className="text-xs text-slate-500">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="api-el flex gap-3">
                <Link to="/pricing"><button className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm">Lihat Paket API <ArrowRight className="w-4 h-4" /></button></Link>
                <Link to="/docs"><button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold text-sm hover:bg-white/10 transition-colors"><Code2 className="w-4 h-4" /> Dokumentasi</button></Link>
              </div>
            </div>

            <div className="api-el">
              <div className="rounded-2xl overflow-hidden border border-white/10" style={{ background:"rgba(15,23,42,0.8)", backdropFilter:"blur(20px)" }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs text-slate-500 mono">ambilfoto-api.js</span>
                </div>
                <div className="p-5 mono text-xs leading-7">
                  <div><span className="text-blue-400">const</span> <span className="text-blue-300">client</span> <span className="text-white">=</span> <span className="text-emerald-400">AmbilFoto</span><span className="text-white">({"{"}</span></div>
                  <div className="pl-4"><span className="text-amber-300">apiKey</span><span className="text-white">:</span> <span className="text-emerald-300">'af_live_xxxx'</span><span className="text-white">,</span></div>
                  <div className="pl-4"><span className="text-amber-300">version</span><span className="text-white">:</span> <span className="text-emerald-300">'v2'</span></div>
                  <div><span className="text-white">{"});"}</span></div>
                  <div className="mt-4"><span className="text-blue-400">const</span> <span className="text-blue-300">result</span> <span className="text-white">= await client.</span></div>
                  <div className="pl-4"><span className="text-yellow-300">faceSearch</span><span className="text-white">{"({"}</span></div>
                  <div className="pl-8"><span className="text-amber-300">image</span><span className="text-white">: </span><span className="text-blue-300">faceBuffer</span><span className="text-white">,</span></div>
                  <div className="pl-8"><span className="text-amber-300">eventId</span><span className="text-white">: </span><span className="text-emerald-300">'wisuda-ui-2025'</span><span className="text-white">,</span></div>
                  <div className="pl-8"><span className="text-amber-300">limit</span><span className="text-white">: </span><span className="text-amber-300">50</span></div>
                  <div className="pl-4"><span className="text-white">{"});"}</span></div>
                  <div className="mt-3 text-slate-500">{"// ✅ { photos: 24, confidence: 0.97 }"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══════════════════════════════════════ 
      <section className="py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="section-pill bg-amber-50 text-amber-700 border border-amber-100 mb-4">⭐ Testimoni</div>
            <h2 className="playfair text-4xl font-black text-slate-900">Yang Mereka Katakan</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:"Putri Maharani",   role:"Mahasiswi UI 2025",     quote:"Gak nyangka bisa nemu semua foto wisuda gue dalam 2 detik! AI-nya keren banget.", stars:5, init:"PM", g:"from-blue-400 to-indigo-500" },
              { name:"Reza Firmansyah",  role:"Fotografer Profesional", quote:"Revenue naik 3x lipat sejak pakai AmbilFoto. Foto gue otomatis dijual ke orang yang ada di foto!", stars:5, init:"RF", g:"from-violet-400 to-purple-500" },
              { name:"Ahmad Fauzi",      role:"Backend Engineer",       quote:"API-nya clean banget. Integrasi ke app kita cuma butuh 2 jam. Dokumentasinya lengkap, 10/10!", stars:5, init:"AF", g:"from-emerald-400 to-teal-500" },
            ].map((t,i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-4">{Array.from({length:t.stars}).map((_,j)=><Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400"/>)}</div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.g} flex items-center justify-center text-white text-xs font-black shrink-0`}>{t.init}</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>*/}

      {/* ═══ CTA ════════════════════════════════════════════════ */}
      <section className="cta-section py-20 bg-white border-t border-slate-100">
        <div className="container max-w-3xl mx-auto px-6 text-center">
          <div className="relative overflow-hidden rounded-3xl p-12 md:p-16 shadow-2xl shadow-blue-200"
            style={{ background:"linear-gradient(135deg,#1d4ed8 0%,#1e40af 60%,#1d4ed8 100%)" }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage:"radial-gradient(circle,white 1px,transparent 1px)", backgroundSize:"32px 32px" }} />
            <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
             <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative">
              {/* <div className="cta-el inline-flex items-center gap-2 text-xs font-semibold text-blue-100 bg-white/10 rounded-full px-4 py-1.5 mb-6">
                🎉 Bergabung dengan 50.000+ pengguna
              </div>*/}
              <h2 className="cta-el playfair text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                Siap Menemukan<br />Momenmu?
              </h2>
              <p className="cta-el text-blue-100 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Gratis untuk pencari foto. Daftar sekarang dan temukan semua foto eventmu — atau mulai jual karya fotografimu.
              </p>
              <div className="cta-el flex flex-wrap gap-3 justify-center">
                <Link to="/register">
                  <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 shadow-lg transition-all hover:-translate-y-0.5">
                    <Camera className="w-4 h-4" /> Coba Gratis Sekarang
                  </button>
                </Link>
                <Link to="/register">
                  <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all hover:-translate-y-0.5">
                    <Award className="w-4 h-4" /> Jadi Fotografer
                  </button>
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

export default Index;