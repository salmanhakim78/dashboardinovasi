import { useState, useEffect, useRef } from 'react';
import {
  Eye, Calendar, Users,
  Check,
  BarChart3, TrendingUp, Map, Brain, Database,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import { Footer } from './Footer';

function BridaLogo({ className = '' }: { className?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }} className={className}>
      <img
        src="/images/logo-brida-jatim.png"
        alt="BRIDA Jatim"
        style={{ height: 'clamp(32px, 4vw, 40px)', width: 'auto', objectFit: 'contain' }}
      />
    </div>
  );
}

interface LandingPageProps {
  onEnter: () => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const MOCKUP_SLIDES = [
  { label: 'Dashboard',      icon: BarChart3,  gif: 'https://i.imgur.com/Qlb4MGX.gif', duration: 9500  },
  { label: 'Analitik',       icon: TrendingUp, gif: 'https://i.imgur.com/cl1WKOs.gif', duration: 12000 },
  { label: 'AI Rekomendasi', icon: Brain,      gif: 'https://i.imgur.com/agiMrGh.gif', duration: 14400 },
  { label: 'Data Management', icon: Database,   gif: 'https://i.imgur.com/DJNvuxf.gif', duration: 16800 },
  { label: 'Peta',            icon: Map,        gif: null,                               duration: 4000  },
];

const HERO_IMAGES = [
  '/images/hero1.jpg',
  '/images/hero2.jpeg',
  '/images/hero3.png',
];

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Dashboard',
    desc: 'Visualisasi data inovasi daerah secara real-time dengan grafik interaktif dan KPI metrics',
    bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    iconBg: 'rgba(255,255,255,0.18)',
    subColor: '#bfdbfe',
  },
  {
    icon: TrendingUp,
    title: 'Analitik',
    desc: 'Analisis mendalam dengan AI untuk mendapatkan insights dan prediksi trend inovasi',
    bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    iconBg: 'rgba(255,255,255,0.18)',
    subColor: '#cffafe',
  },
  {
    icon: Map,
    title: 'Peta Inovasi',
    desc: 'Pemetaan geografis sebaran inovasi di kabupaten/kota Jawa Timur secara interaktif',
    bg: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
    iconBg: 'rgba(255,255,255,0.15)',
    subColor: '#ddd6fe',
  },
  {
    icon: Brain,
    title: 'AI Rekomendasi',
    desc: 'Rekomendasi kolaborasi inovasi berbasis AI dengan match score dan clustering otomatis',
    bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    iconBg: 'rgba(255,255,255,0.15)',
    subColor: '#ede9fe',
  },
];

export function LandingPage({ onEnter, darkMode, setDarkMode }: LandingPageProps) {
  const [mobileOpen, setMobileOpen]           = useState(false);
  const [heroSlide, setHeroSlide]             = useState(0);
  const [mockupSlide, setMockupSlide]   = useState(0);
  const [mockupPaused, setMockupPaused] = useState(false);
  const gifBlobs = useRef<Record<number, Blob>>({});
  const [gifSrcs, setGifSrcs]           = useState<Record<number, string>>({});
  const mockupSlideRef                  = useRef(0); // ref untuk hindari stale closure
  const [typeText, setTypeText]               = useState('');
  const [showCursor, setShowCursor]           = useState(true);

  // visitor counters
  const [today, setToday]   = useState(0);
  const [month, setMonth]   = useState(0);
  const [total, setTotal]   = useState(0);
  const statsRef            = useRef<HTMLElement>(null);
  const statsRan            = useRef(false);
  const statsTarget         = useRef({ today: 0, month: 0, total: 0 });
  const statsReady          = useRef(false);

  const FULL_TEXT = 'Sistem Informasi Aplikasi Inovasi Daerah';

  /* typewriter */
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTypeText(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) {
        clearInterval(iv);
        setTimeout(() => setShowCursor(false), 2000);
      }
    }, 60);
    return () => clearInterval(iv);
  }, []);

  /* hero carousel */
  useEffect(() => {
    const t = setInterval(() => setHeroSlide(p => (p + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  /* fetch semua GIF sebagai blob sekali — simpan di ref */
  useEffect(() => {
    MOCKUP_SLIDES.forEach((slide, i) => {
      if (!slide.gif) return;
      fetch(slide.gif)
        .then(r => r.blob())
        .then(blob => {
          gifBlobs.current[i] = blob;
          const url = URL.createObjectURL(blob);
          setGifSrcs(prev => ({ ...prev, [i]: url }));
        })
        .catch(() => {
          setGifSrcs(prev => ({ ...prev, [i]: slide.gif! }));
        });
    });
  }, []);

  /* restart GIF dengan buat objectURL baru dari blob */
  const restartGif = (index: number) => {
    const blob = gifBlobs.current[index];
    if (!blob) return;
    setGifSrcs(prev => {
      if (prev[index]?.startsWith('blob:')) URL.revokeObjectURL(prev[index]);
      return { ...prev, [index]: URL.createObjectURL(blob) };
    });
  };

  /* auto-play — pakai ref agar tidak stale closure */
  useEffect(() => {
    mockupSlideRef.current = mockupSlide;
  }, [mockupSlide]);

  useEffect(() => {
    if (mockupPaused) return;
    const tick = () => {
      const cur = mockupSlideRef.current;
      const next = (cur + 1) % MOCKUP_SLIDES.length;
      setMockupSlide(next);
      restartGif(next);
      timer = setTimeout(tick, MOCKUP_SLIDES[next].duration);
    };
    let timer = setTimeout(tick, MOCKUP_SLIDES[mockupSlideRef.current].duration);
    return () => clearTimeout(timer);
  }, [mockupPaused]);

  /* klik manual */
  const goToSlide = (i: number) => {
    setMockupSlide(i);
    mockupSlideRef.current = i;
    restartGif(i);
  };

  /* fetch stats */
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL.replace(/\/$/, '');
    const fetchStats = async () => {
      try {
        fetch(`${API}/api/visitor-count/increment`, { method: 'POST' }).catch(() => {});
        const res  = await fetch(`${API}/api/visitor-count/stats`);
        const data = await res.json();
        statsTarget.current = {
          today: Number(data?.today      ?? 0),
          month: Number(data?.this_month ?? 0),
          total: Number(data?.all_time   ?? 0),
        };
      } catch {
        statsTarget.current = { today: 0, month: 0, total: 0 };
      } finally {
        statsReady.current = true;
      }
    };
    fetchStats();
  }, []);

  /* stats counter on scroll */
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || statsRan.current) return;
      const run = () => {
        statsRan.current = true;
        const STEPS = 60, MS = 2000 / STEPS;
        const T = statsTarget.current;
        let s = 0;
        const iv = setInterval(() => {
          s++;
          const p = s / STEPS;
          setToday(Math.floor(T.today * p));
          setMonth(Math.floor(T.month * p));
          setTotal(Math.floor(T.total * p));
          if (s >= STEPS) {
            clearInterval(iv);
            setToday(T.today); setMonth(T.month); setTotal(T.total);
          }
        }, MS);
      };
      if (statsReady.current) {
        run();
      } else {
        let waited = 0;
        const poll = setInterval(() => {
          waited += 100;
          if (statsReady.current || waited >= 3000) { clearInterval(poll); run(); }
        }, 100);
      }
    }, { threshold: 0.25 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* NAVBAR */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{
            maxWidth: '1440px', margin: '0 auto',
            padding: '12px clamp(16px, 4vw, 40px)', minHeight: '64px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '16px'
          }}>
            <BridaLogo />
            <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 40px)', flexWrap: 'wrap' }}>
              {[['Beranda','#hero'],['Tentang','#tentang'],['Fitur','#fitur'],['Kontak','#footer']].map(([label, href]) => (
                <a key={label} href={href} style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 500, textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}>
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="hero" style={{ position: 'relative', height: 'calc(100vh - 64px)', minHeight: '520px', maxHeight: '900px', overflow: 'hidden' }}>
        {HERO_IMAGES.map((img, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url('${img}')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: heroSlide === i ? 1 : 0, transition: 'opacity 1s ease',
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,.88) 0%, rgba(30,58,95,.80) 50%, rgba(15,23,42,.88) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.12)' }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: .35, mixBlendMode: 'screen', pointerEvents: 'none',
          background: `radial-gradient(ellipse at 15% 55%, #1d6ff2 0%, transparent 52%), radial-gradient(ellipse at 82% 28%, #06b6d4 0%, transparent 52%)`,
        }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 clamp(16px, 4vw, 32px)' }}>
          <div style={{ marginBottom: '16px' }}>
            <img
              src="/images/logo-siapin.png"
              alt="SIAPIN"
              style={{ height: 'clamp(180px, 26vw, 280px)', width: 'auto', display: 'block', margin: '0 auto' }}
            />
          </div>
          <p style={{ fontSize: 'clamp(16px, 3vw, 26px)', fontWeight: 600, color: 'white', marginBottom: '4px', minHeight: '38px' }}>
            {typeText}{showCursor && <span style={{ color: '#38bdf8', animation: 'blink 1s step-end infinite' }}>|</span>}
          </p>
          <p style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#94a3b8', marginBottom: '20px', fontWeight: 400 }}>Dashboard Inovasi BRIDA Jawa Timur</p>
          <button onClick={onEnter} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)', color: 'white', border: 'none', cursor: 'pointer', padding: 'clamp(12px, 3vw, 14px) clamp(32px, 6vw, 48px)', borderRadius: '999px', fontSize: '16px', fontWeight: 600, boxShadow: '0 0 40px rgba(37,99,235,.55)', transition: 'transform .2s, box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(37,99,235,.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.boxShadow = '0 0 40px rgba(37,99,235,.55)'; }}>
            Lihat Dashboard
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px', zIndex: 20 }}>
          {HERO_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setHeroSlide(i)} style={{ border: 'none', cursor: 'pointer', borderRadius: '999px', height: '12px', width: heroSlide === i ? '44px' : '12px', background: heroSlide === i ? 'white' : 'rgba(255,255,255,.40)', transition: 'all .3s', padding: 0 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15 }}>
          <svg viewBox="0 0 1440 80" style={{ display: 'block', width: '100%' }} preserveAspectRatio="none">
            <path fill="#0f172a" d="M0,40 C360,80 720,0 1080,40 C1260,60 1350,70 1440,80 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* STATS */}
      <section ref={statsRef} id="stats" style={{ position: 'relative', background: '#0f172a', padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 32px) clamp(50px, 10vw, 100px)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .07, backgroundImage: 'radial-gradient(circle, #60a5fa 1.5px, transparent 1.5px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '24px' }}>
            {[{ icon: Eye, count: today, sub: 'Hari Ini' }, { icon: Calendar, count: month, sub: 'Bulan Ini' }, { icon: Users, count: total, sub: 'Total' }].map(({ icon: Icon, count, sub }, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.045)', border: '1px solid rgba(37,99,235,.22)', borderRadius: '24px', padding: 'clamp(24px, 4vw, 40px) clamp(16px, 3vw, 32px)', textAlign: 'center', backdropFilter: 'blur(8px)', transition: 'transform .3s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-8px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)', borderRadius: '18px', padding: '18px', display: 'inline-flex' }}>
                    <Icon size={38} color="white" />
                  </div>
                </div>
                <div style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1, marginBottom: '8px', fontVariantNumeric: 'tabular-nums' }}>
                  {count.toLocaleString('id-ID')}
                </div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Pengunjung</div>
                <div style={{ color: '#64748b', fontSize: '13px' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15 }}>
          <svg viewBox="0 0 1440 72" style={{ display: 'block', width: '100%' }} preserveAspectRatio="none">
            <path fill="#f0f9ff" d="M0,72 L1440,0 L1440,72 Z" />
          </svg>
        </div>
      </section>

      {/* TENTANG */}
      <section id="tentang" style={{ position: 'relative', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #ffffff 100%)', padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 32px) clamp(24px, 4vw, 48px)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 'clamp(32px, 5vw, 56px)', alignItems: 'flex-start' }} className="grid-cols-1-on-mobile">
            <div>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#0f172a', marginBottom: '24px', lineHeight: 1.1 }}>Tentang SIAPIN</h2>
              <p style={{ fontSize: '17px', color: '#475569', lineHeight: 1.75, marginBottom: '40px' }}>
                Platform digital terintegrasi untuk mengelola, memonitor, dan menganalisis inovasi daerah di seluruh Jawa Timur dengan teknologi AI dan visualisasi data yang canggih.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {['Visualisasi data real-time', 'AI-powered analytics & insights', 'Pemetaan geografis inovasi'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #2563eb, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={18} color="white" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── MOCKUP BROWSER ── */}
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setMockupPaused(true)}
              onMouseLeave={() => setMockupPaused(false)}>
              <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,.3)', border: '3px solid #1e293b' }}>
                {/* browser chrome */}
                <div style={{ background: '#334155', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e' }} />
                  </div>
                  <div style={{ flex: 1, background: '#1e293b', borderRadius: '6px', padding: '4px 12px', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    siapin.bridajatim.go.id
                  </div>
                </div>
                {/* slides */}
                <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0f172a', overflow: 'hidden' }}>
                  {MOCKUP_SLIDES.map((slide, i) => {
                    const Icon = slide.icon;
                    const isActive = mockupSlide === i;
                    return (
                      <div key={i} style={{ position: 'absolute', inset: 0, opacity: isActive ? 1 : 0, transition: 'opacity .5s', pointerEvents: isActive ? 'auto' : 'none' }}>
                        {slide.gif
                          ? <img
                              src={gifSrcs[i] ?? slide.gif}
                              alt={slide.label}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1e293b' }}>
                              <Icon size={56} color="#475569" style={{ marginBottom: '12px' }} />
                              <span style={{ color: '#64748b', fontSize: '18px', fontWeight: 700 }}>Segera Hadir</span>
                            </div>
                          )
                        }
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* controls */}
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => goToSlide((mockupSlide - 1 + MOCKUP_SLIDES.length) % MOCKUP_SLIDES.length)}
                  style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
                  <ChevronLeft size={18} color="#475569" />
                </button>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {MOCKUP_SLIDES.map((slide, i) => (
                    <button key={i} onClick={() => goToSlide(i)}
                      style={{ border: 'none', cursor: 'pointer', borderRadius: '999px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, background: mockupSlide === i ? 'linear-gradient(135deg, #2563eb, #06b6d4)' : '#e2e8f0', color: mockupSlide === i ? 'white' : '#475569', transition: 'all .2s' }}>
                      {slide.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => goToSlide((mockupSlide + 1) % MOCKUP_SLIDES.length)}
                  style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
                  <ChevronRight size={18} color="#475569" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15 }}>
          <svg viewBox="0 0 1440 72" style={{ display: 'block', width: '100%' }} preserveAspectRatio="none">
            <path fill="#f8fafc" d="M0,36 C480,0 960,72 1440,36 L1440,72 L0,72 Z" />
          </svg>
        </div>
      </section>

      {/* FITUR UNGGULAN */}
      <section id="fitur" style={{ position: 'relative', background: '#f8fafc', padding: 'clamp(32px, 6vw, 64px) clamp(16px, 4vw, 32px) clamp(48px, 8vw, 96px)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .05, backgroundImage: 'repeating-linear-gradient(45deg, #2563eb, #2563eb 1px, transparent 1px, transparent 18px)' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 6vw, 56px)' }}>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Fitur Unggulan</h2>
            <p style={{ fontSize: '17px', color: '#64748b', maxWidth: '560px', margin: '0 auto' }}>Solusi lengkap untuk mengelola inovasi daerah dengan teknologi terkini</p>
          </div>
          <div className="grid-cols-1-on-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {FEATURES.map(({ icon: Icon, title, desc, bg, iconBg, subColor }, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                <div style={{ position: 'absolute', inset: 0, background: bg, borderRadius: '20px', filter: 'blur(24px)', opacity: .45, transform: 'scale(.95)', transition: 'opacity .3s' }} />
                <div style={{ position: 'relative', background: bg, borderRadius: '20px', padding: 'clamp(24px, 4vw, 40px) clamp(20px, 3vw, 36px)', transition: 'transform .3s', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                    <div style={{ background: iconBg, backdropFilter: 'blur(4px)', borderRadius: '16px', padding: '16px', display: 'inline-flex' }}>
                      <Icon size={44} color="white" />
                    </div>
                  </div>
                  <h3 style={{ color: 'white', fontWeight: 800, fontSize: 'clamp(20px, 2.5vw, 28px)', marginBottom: '12px' }}>{title}</h3>
                  <p style={{ color: subColor, fontSize: '15px', lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer darkMode={darkMode} sidebarOpen={false} />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (max-width: 768px) {
          .grid-cols-1-on-mobile { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
