import {
  Mail, MapPin, Phone, Send, MessageSquare, Clock,
  Instagram, Twitter, Linkedin, Facebook, Sparkles,
  Check, Zap, Heart, ArrowRight, CheckCircle2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

gsap.registerPlugin(ScrollTrigger);

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  .sora { font-family: 'Sora', system-ui, sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  .heading { font-family: 'Sora', system-ui, sans-serif; font-weight: 800; letter-spacing: -0.03em; }
  .gradient-text {
    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .btn-primary {
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    box-shadow: 0 8px 32px rgba(29,78,216,0.25), 0 2px 8px rgba(29,78,216,0.15);
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    color: white; font-weight: 700; border: none; cursor: pointer;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(29,78,216,0.4); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.65; transform: none; cursor: not-allowed; }
  .btn-ghost {
    background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.25);
    color: white; font-weight: 700; cursor: pointer; transition: all 0.25s;
  }
  .btn-ghost:hover { background: rgba(255,255,255,0.2); transform: translateY(-1px); }
  .section-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 5px 12px; border-radius: 100px;
  }
  .contact-card {
    background: white; border: 1.5px solid #f1f5f9; border-radius: 20px; padding: 22px 16px;
    text-align: center; cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden; position: relative;
  }
  @media (min-width: 768px) {
    .contact-card { padding: 28px; }
  }
  .contact-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
    transform: scaleX(0); transition: transform 0.4s ease; transform-origin: left;
  }
  .contact-card.blue::after { background: linear-gradient(90deg, #1d4ed8, #2563eb); }
  .contact-card.amber::after { background: linear-gradient(90deg, #f59e0b, #ea580c); }
  .contact-card.emerald::after { background: linear-gradient(90deg, #059669, #10b981); }
  .contact-card:hover { border-color: rgba(59,130,246,0.25); box-shadow: 0 12px 40px rgba(59,130,246,0.1); transform: translateY(-5px); }
  .contact-card:hover::after { transform: scaleX(1); }
  .contact-card:active { transform: translateY(-2px); }
  .input-field {
    width: 100%; padding: 13px 16px; border-radius: 12px;
    border: 1.5px solid #e2e8f0; background: white; outline: none;
    font-family: 'Sora', system-ui, sans-serif; font-size: 14px; color: #1e293b;
    transition: all 0.2s;
    /* prevent iOS zoom on focus */
    font-size: 16px;
  }
  @media (min-width: 768px) {
    .input-field { font-size: 14px; }
  }
  .input-field::placeholder { color: #94a3b8; }
  .input-field:focus { border-color: rgba(29,78,216,0.5); box-shadow: 0 0 0 3px rgba(29,78,216,0.08); }
  .sidebar-card {
    background: white; border: 1.5px solid #f1f5f9; border-radius: 20px; padding: 20px;
    overflow: hidden;
  }
  @media (min-width: 768px) {
    .sidebar-card { padding: 24px; }
  }
  .sidebar-card-top { height: 3px; margin: -20px -20px 16px; }
  @media (min-width: 768px) {
    .sidebar-card-top { margin: -24px -24px 20px; }
  }
  .social-btn {
    display: flex; align-items: center; gap: 10px; padding: 10px;
    border: 1.5px solid #f1f5f9; border-radius: 14px; text-decoration: none;
    transition: all 0.25s; cursor: pointer;
  }
  .social-btn:hover { border-color: rgba(59,130,246,0.2); box-shadow: 0 4px 16px rgba(59,130,246,0.08); transform: translateY(-2px); }
  .social-btn:active { transform: translateY(0); }
  .schedule-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px; border-radius: 10px; transition: background 0.2s;
    gap: 8px;
  }
  .schedule-row:hover { background: #f8fafc; }
  .faq-item {
    padding: 12px 14px; border-radius: 12px; background: #f8fafc;
    transition: all 0.2s; cursor: default;
  }
  .faq-item:hover { background: #f0f4ff; }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
  .live-dot { animation: pulse-dot 1.8s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }

  /* Mobile-specific overrides */
  @media (max-width: 639px) {
    .hero-title { font-size: 2.75rem !important; line-height: 1.06 !important; }
    .contact-info-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
    .form-sidebar-grid { grid-template-columns: 1fr !important; }
    .cta-buttons { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
    .cta-buttons button { width: 100% !important; justify-content: center !important; }
    .social-grid { grid-template-columns: 1fr 1fr !important; }
    .map-footer { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
    .map-footer button { width: 100% !important; justify-content: center !important; }
    .schedule-row span { font-size: 12px !important; }
  }

  @media (max-width: 767px) {
    .form-grid { grid-template-columns: 1fr !important; }
  }

  /* Safe area support for notched phones */
  @supports (padding: max(0px)) {
    .bottom-safe { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
  }
`;

const ContactUs = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({ name:"", email:"", subject:"", message:"" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* canvas */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let id: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    const dots = Array.from({ length: 45 }, () => ({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      r:Math.random()*1.5+0.5, vx:(Math.random()-.5)*.28, vy:(Math.random()-.5)*.28,
      a:Math.random()*.14+.04,
    }));
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      dots.forEach(d => {
        d.x+=d.vx; d.y+=d.vy;
        if(d.x<0||d.x>canvas.width)d.vx*=-1; if(d.y<0||d.y>canvas.height)d.vy*=-1;
        ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(59,130,246,${d.a})`; ctx.fill();
      });
      id=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize",resize); };
  }, []);

  /* GSAP */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults:{ ease:"power3.out" } })
        .from(".h-badge",  { y:20,opacity:0,scale:.9,duration:.6,ease:"back.out(1.5)" })
        .from(".h-line",   { y:50,opacity:0,duration:.85,stagger:.1 }, "-=.3")
        .from(".h-sub",    { y:20,opacity:0,duration:.6 }, "-=.4");

      // animate each card individually so short mobile viewports don't leave
      // card 3 stuck at opacity:0 waiting for the row trigger to cross 85%
      document.querySelectorAll<HTMLElement>(".cinfo-card").forEach((el, i) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 95%",
            once: true,
            invalidateOnRefresh: true,
          },
          y: 30, opacity: 0, scale: 0.94,
          duration: 0.5, delay: i * 0.1,
          ease: "back.out(1.3)",
        });
      });

      gsap.from(".form-wrap",  { scrollTrigger:{trigger:".form-section",start:"top 92%",once:true,invalidateOnRefresh:true}, x:-50,opacity:0,duration:.8,ease:"power3.out" });
      gsap.from(".sidebar",    { scrollTrigger:{trigger:".form-section",start:"top 92%",once:true,invalidateOnRefresh:true}, x:50,opacity:0,duration:.8,ease:"power3.out",delay:.1 });
      gsap.from(".map-wrap",   { scrollTrigger:{trigger:".map-section",start:"top 95%",once:true,invalidateOnRefresh:true}, scale:.96,opacity:0,duration:.7,ease:"power3.out" });
      gsap.from(".cta-el",     { scrollTrigger:{trigger:".cta-wrap",start:"top 95%",once:true,invalidateOnRefresh:true}, y:40,opacity:0,duration:.65,stagger:.15 });
    });
    return () => ctx.revert();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert("Mohon isi semua field terlebih dahulu!"); return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const mailto = `mailto:hello@ambilfoto.id?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Nama: ${formData.name}\nEmail: ${formData.email}\n\nPesan:\n${formData.message}`)}`;
      window.location.href = mailto;
      setSubmitted(true); setSubmitting(false);
      setFormData({ name:"", email:"", subject:"", message:"" });
      setTimeout(() => setSubmitted(false), 5000);
    }, 900);
  };

  const contactInfos = [
    { icon:Mail,   title:"Email Kami",    desc:"hello@ambilfoto.id",    sub:"Balas dalam 24 jam",    action:"mailto:hello@ambilfoto.id",  accent:"blue",   iconBg:"bg-blue-50 text-blue-600"   },
    { icon:Phone,  title:"WhatsApp",      desc:"+62 812-3456-7890",      sub:"Chat langsung tim kami", action:"https://wa.me/6281234567890", accent:"amber",  iconBg:"bg-amber-50 text-amber-600" },
    { icon:MapPin, title:"Lokasi Kantor", desc:"Jakarta Selatan",        sub:"Indonesia 🇮🇩",           action:"https://maps.google.com",     accent:"emerald",iconBg:"bg-emerald-50 text-emerald-600"},
  ];

  const socials = [
    { icon:Instagram, name:"Instagram", handle:"@ambilfoto.id",  bg:"bg-orange-50 text-orange-500",  link:"https://instagram.com/ambilfoto.id" },
    { icon:Twitter,   name:"Twitter",   handle:"@ambilfoto",      bg:"bg-blue-50 text-blue-500",      link:"https://twitter.com/ambilfoto"      },
    { icon:Facebook,  name:"Facebook",  handle:"AmbilFoto.id",    bg:"bg-blue-50 text-blue-700",      link:"https://facebook.com/ambilfoto.id"  },
    { icon:Linkedin,  name:"LinkedIn",  handle:"AmbilFoto",       bg:"bg-blue-50 text-blue-600",      link:"https://linkedin.com/company/ambilfoto"},
  ];

  const hours = [
    { day:"Senin – Jumat", time:"09:00 – 18:00 WIB" },
    { day:"Sabtu",         time:"10:00 – 15:00 WIB" },
    { day:"Minggu",        time:"Tutup"              },
  ];

  const faqs = [
    { q:"Berapa lama respon email?", a:"Kami berusaha membalas dalam 24 jam kerja." },
    { q:"Bisa video call?",           a:"Tentu! Hubungi kami untuk jadwal meeting."   },
    { q:"Support 24/7?",              a:"Chat support tersedia di jam kerja, email 24/7." },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white sora">
      <style>{STYLES}</style>
      <Header />

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100 pt-16 pb-12 md:pt-28 md:pb-20">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-50/50 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-amber-50/40 blur-3xl pointer-events-none" />

        <div className="container max-w-2xl mx-auto px-4 sm:px-6 text-center relative">
          <div className="h-badge section-pill bg-blue-50 text-blue-700 border border-blue-200/80 mb-5 w-fit mx-auto">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Hubungi Kami
          </div>
          <h1 className="hero-title heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-slate-900 leading-[1.06] mb-4 md:mb-6">
            <span className="h-line block">Ada Pertanyaan?</span>
            <span className="h-line block gradient-text">Yuk, Ngobrol!</span>
          </h1>
          <p className="h-sub text-base sm:text-lg text-slate-500 max-w-lg mx-auto leading-relaxed px-2">
            Tim kami siap bantu kamu. Drop message atau langsung chat aja — kami friendly dan fast response! 😊
          </p>
        </div>
      </section>

      {/* ══ CONTACT INFO CARDS ════════════════════════════════ */}
      <section className="py-8 md:py-12 bg-white border-b border-slate-100">
        <div className="cinfo-row container max-w-4xl mx-auto px-4 sm:px-6">
          {/* Mobile: horizontal scrollable row; tablet+: 3-col grid */}
          <div className="contact-info-grid grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            {contactInfos.map((c,i) => {
              const Icon = c.icon;
              return (
                <div key={i} className={`cinfo-card contact-card ${c.accent}`} onClick={() => window.open(c.action,"_blank")}>
                  {/* Mobile: horizontal layout */}
                  <div className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-0 text-left sm:text-center">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl ${c.iconBg} flex items-center justify-center sm:mx-auto sm:mb-4`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="heading text-sm sm:text-base text-slate-900 mb-0.5 sm:mb-1">{c.title}</h3>
                      <p className="font-semibold text-slate-700 text-sm mb-0 sm:mb-0.5 break-all sm:break-normal">{c.desc}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ FORM + SIDEBAR ════════════════════════════════════ */}
      <section className="form-section py-10 md:py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <div className="form-sidebar-grid grid lg:grid-cols-[1fr_340px] gap-6 md:gap-8 items-start">

            {/* Form */}
            <div className="form-wrap bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm">
              <div className="mb-6 sm:mb-8">
                <div className="section-pill bg-blue-50 text-blue-700 border border-blue-100 mb-3">✉️ Kirim Pesan</div>
                <h2 className="heading text-xl sm:text-2xl text-slate-900 mb-1">Isi Form Berikut</h2>
                <p className="text-sm text-slate-500">Kami akan segera menghubungi kamu!</p>
              </div>

              {submitted && (
                <div className="mb-5 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 font-medium">Pesan terkirim! Email client kamu akan terbuka.</p>
                </div>
              )}

              <div className="space-y-4 sm:space-y-5">
                {/* Name + Email: stacked on mobile, side-by-side on sm+ */}
                <div className="form-grid grid sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap <span className="text-blue-600">*</span></label>
                    <input name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="Nama kamu siapa?" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email <span className="text-blue-600">*</span></label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="email@contoh.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subjek <span className="text-blue-600">*</span></label>
                  <input name="subject" value={formData.subject} onChange={handleChange} className="input-field" placeholder="Mau ngobrolin apa?" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pesan <span className="text-blue-600">*</span></label>
                  <textarea name="message" value={formData.message} onChange={handleChange} rows={5} className="input-field resize-none" placeholder="Ceritain dong... jangan malu-malu 😊" />
                </div>
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm">
                  {submitting ? (
                    <><Zap className="w-4 h-4 spin" /> Mengirim...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Kirim Pesan</>
                  )}
                </button>
              </div>
            </div>

            {/* Sidebar — on mobile rendered BELOW form */}
            <div className="sidebar space-y-4 sm:space-y-5">

              {/* Jam Operasional */}
              <div className="sidebar-card">
                <div className="sidebar-card-top" style={{ background:"linear-gradient(90deg, #1d4ed8, #f59e0b)" }} />
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="heading text-base text-slate-900">Jam Operasional</h3>
                </div>
                <div className="space-y-0.5">
                  {hours.map((h,i) => (
                    <div key={i} className="schedule-row">
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">{h.day}</span>
                      <span className={`text-xs sm:text-sm font-medium shrink-0 ${h.time === "Tutup" ? "text-red-400" : "text-slate-500"}`}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Media */}
              <div className="sidebar-card">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-orange-500" />
                  </div>
                  <h3 className="heading text-base text-slate-900">Follow Kami</h3>
                </div>
                <div className="social-grid grid grid-cols-2 gap-2 sm:gap-3">
                  {socials.map((s,i) => {
                    const Icon = s.icon;
                    return (
                      <a key={i} href={s.link} target="_blank" rel="noopener noreferrer" className="social-btn">
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400 leading-none">{s.name}</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{s.handle}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Quick FAQs */}
              <div className="sidebar-card">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="heading text-base text-slate-900">Quick FAQs</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {faqs.map((f,i) => (
                    <div key={i} className="faq-item">
                      <p className="text-xs font-bold text-slate-800 mb-1">{f.q}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ══ MAP ═══════════════════════════════════════════════ */}
      <section className="map-section py-10 md:py-20 bg-slate-50/60 border-y border-slate-100">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6 sm:mb-10">
            <div className="section-pill bg-blue-50 text-blue-700 border border-blue-100 mb-3 sm:mb-4">📍 Lokasi Kami</div>
            <h2 className="heading text-2xl sm:text-3xl text-slate-900 mb-2">Kantor Pusat</h2>
            <p className="text-slate-500 text-sm">Mampir langsung? Kabarin dulu biar kita siapin kopi! ☕</p>
          </div>
          <div className="map-wrap bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-100">
            {/* Taller aspect on mobile for better usability */}
            <div className="relative" style={{ paddingBottom: "min(56.25%, 280px)" }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126920.23949154248!2d106.68942984335937!3d-6.229386799999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e945e34b9d%3A0x5371bf0fdad786a2!2sJakarta%2C%20Indonesia!5e0!3m2!1sen!2sid"
                width="100%" height="100%"
                style={{ border:0, position:"absolute", top:0, left:0 }}
                allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="map-footer p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="heading text-sm sm:text-base text-slate-900 mb-0.5 sm:mb-1">AmbilFoto.id Headquarters</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Jl. Sudirman No. 123, Jakarta Selatan 12190, Indonesia</p>
              </div>
              <button
                onClick={() => window.open("https://maps.google.com","_blank")}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors"
              >
                Buka di Maps <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════ */}
      <section className="cta-wrap py-10 md:py-20 bg-white">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-2xl shadow-blue-100"
            style={{ background:"linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)" }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)", backgroundSize:"32px 32px" }} />
            <div className="absolute -top-14 -left-14 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-14 -right-14 w-56 h-56 rounded-full bg-amber-300/10 blur-2xl" />
            <div className="relative text-center">
              <MessageSquare className="cta-el w-10 h-10 sm:w-12 sm:h-12 text-amber-300 mx-auto mb-3 sm:mb-4" />
              <h2 className="cta-el heading text-3xl sm:text-4xl text-white mb-2 sm:mb-3">
                Masih Bingung?<br />Gas Chat Aja!
              </h2>
              <p className="cta-el text-blue-100 text-sm mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
                Tim support kami fast response dan super helpful. Jangan sungkan-sungkan ya! 🚀
              </p>
              <div className="cta-buttons cta-el flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.open("https://wa.me/6281234567890","_blank")}
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 active:bg-blue-100 shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <MessageSquare className="w-4 h-4" /> Chat Sekarang
                </button>
                <button
                  onClick={() => window.location.href = "mailto:hello@ambilfoto.id"}
                  className="btn-ghost inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl text-sm"
                >
                  Kirim Email <ArrowRight className="w-4 h-4" />
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

export default ContactUs;