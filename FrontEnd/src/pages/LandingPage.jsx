import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Bot,
  Brain,
  Building2,
  Camera,
  Check,
  Cloud,
  FlaskConical,
  Globe,
  LayoutDashboard,
  Leaf,
  Mail,
  PlayCircle,
  Share2,
  Sparkles,
  Trash2,
  User,
  Verified,
  X,
} from 'lucide-react';
import fallbackHero from '../assets/smartbin-ai.png';
import SmartbinLogo from '../components/SmartbinLogo.jsx';
import { useNavigate } from 'react-router-dom';

const parallaxFrameModules = import.meta.glob('../assets/parallax/*.png', {
  eager: true,
  import: 'default',
});

const extractFrameNumber = (path) => {
  const match = path.match(/frame_(\d+)/);
  return match ? Number(match[1]) : 0;
};

const parallaxFrames = Object.entries(parallaxFrameModules)
  .sort((a, b) => extractFrameNumber(a[0]) - extractFrameNumber(b[0]))
  .map(([, src]) => src);

const overlayAlignments = {
  left: {
    container: 'items-center justify-start text-left',
    inner: 'items-start',
  },
  center: {
    container: 'items-center justify-center text-center',
    inner: 'items-center',
  },
  bottom: {
    container: 'items-end justify-center text-center',
    inner: 'items-center',
  },
};

const ParallaxLayer = ({ className = '', style, children }) => (
  <div className={className} style={style}>
    {children}
  </div>
);

const HeroOverlay = ({
  align = 'center',
  headlineStyle,
  subheadlineStyle,
  ctaStyle,
  onDashboardClick,
}) => {
  const alignment = overlayAlignments[align] || overlayAlignments.center;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex ${alignment.container} px-6 py-16 md:px-14 lg:px-20`}
    >
      <div className={`flex h-full max-w-3xl mt-86 flex-col gap-6 ${alignment.inner} justify-center`}>
        <h1
          className="text-balance text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl font-display"
          style={headlineStyle}
        >
          Smart Waste Sorting, Powered by AI.
        </h1>

        <p
          className="text-balance text-base font-medium text-white/75 sm:text-lg lg:text-xl"
          style={subheadlineStyle}
        >
          An intelligent system that classifies waste, reduces emissions, and drives sustainability.
        </p>

        <div className="pointer-events-auto flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <button
            className="h-12 rounded-full bg-emerald-400/90 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.45)] transition hover:bg-emerald-300 hover:shadow-[0_0_45px_rgba(52,211,153,0.6)]"
            style={ctaStyle}
          >
            Book a Demo
          </button>
          <button
            type="button"
            onClick={onDashboardClick}
            className="h-12 rounded-full border border-white/30 bg-white/5 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur transition hover:border-white/60 hover:bg-white/15"
          >
            <span className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-emerald-200" />
              See the Dashboard
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ParallaxHero = ({ overlayAlign = 'left', onDashboardClick }) => {
  const [heroScroll, setHeroScroll] = useState(0);
  const [heroMaxScroll, setHeroMaxScroll] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduceMotion(mediaQuery.matches);

    handleChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let rafId = null;

    const handleScroll = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY || 0;
        let nextHeroScroll = 0;
        let nextHeroMaxScroll = 1;

        if (sectionRef.current) {
          const rect = sectionRef.current.getBoundingClientRect();
          const sectionTop = currentScrollY + rect.top;
          const sectionHeight = rect.height;
          const viewportHeight = window.innerHeight || 0;
          nextHeroMaxScroll = Math.max(1, sectionHeight - viewportHeight);
          nextHeroScroll = Math.min(Math.max(currentScrollY - sectionTop, 0), nextHeroMaxScroll);
        }

        setHeroScroll(nextHeroScroll);
        setHeroMaxScroll(nextHeroMaxScroll);
        rafId = null;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const heroProgress = reduceMotion ? 1 : Math.min(heroScroll / heroMaxScroll, 1);
  const tunedProgress = reduceMotion ? 1 : Math.min(1, Math.pow(heroProgress, 0.85));
  const parallaxOffset = reduceMotion ? 0 : tunedProgress * 900;
  const heroScale = reduceMotion ? 1 : 1.05 - tunedProgress * 0.05;
  const revealProgress = reduceMotion ? 1 : tunedProgress;
  const frameIndex = useMemo(() => {
    if (!parallaxFrames.length || reduceMotion) {
      return 0;
    }

    return Math.round(tunedProgress * (parallaxFrames.length - 1));
  }, [reduceMotion, tunedProgress]);
  const heroImage = parallaxFrames.length ? parallaxFrames[frameIndex] : fallbackHero;
  const headlineStyle = useMemo(
    () => ({
      opacity: revealProgress,
      transform: `translate3d(0, ${18 - revealProgress * 18}px, 0)`,
    }),
    [revealProgress]
  );
  const subheadlineStyle = useMemo(() => {
    const delayed = Math.max(0, revealProgress - 0.18) / 0.82;
    return {
      opacity: delayed,
      transform: `translate3d(0, ${22 - delayed * 22}px, 0)`,
    };
  }, [revealProgress]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[130vh] w-full overflow-hidden bg-slate-950 text-white"
    >
      <div className="absolute inset-0">
        <ParallaxLayer
          className="absolute inset-0"
          style={{
            transform: `translate3d(0, ${parallaxOffset * 0.05}px, 0)`,
            background:
              'radial-gradient(circle at top, rgba(34,197,94,0.25), transparent 55%), radial-gradient(circle at 30% 80%, rgba(56,189,248,0.2), transparent 55%), linear-gradient(160deg, rgba(2,6,23,0.98) 10%, rgba(15,23,42,0.92) 55%, rgba(2,6,23,1) 100%)',
          }}
        />
        <ParallaxLayer
          className="absolute inset-0"
          style={{
            transform: `translate3d(0, ${parallaxOffset * 0.1}px, 0)`,
          }}
        >
          <div className="absolute -top-32 right-[-12%] h-96 w-96 rounded-full bg-emerald-400/15 blur-[120px]" />
          <div className="absolute bottom-[-18%] left-[-12%] h-112 w-md  rounded-full bg-sky-400/10 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(148,163,184,0.25) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </ParallaxLayer>
        <ParallaxLayer
          className="absolute inset-0"
          style={{
            transform: `translate3d(0, ${parallaxOffset * 0.18}px, 0)`,
          }}
        >
          <div className="absolute left-[8%] top-[25%] h-24 w-24 rounded-full border border-emerald-300/30 bg-emerald-300/10 blur-[2px]" />
          <div className="absolute right-[12%] top-[15%] h-16 w-16 rounded-full border border-sky-300/30 bg-sky-300/10 blur-[2px]" />
          <div className="absolute right-[20%] bottom-[18%] h-32 w-32 rounded-full border border-emerald-200/20 bg-emerald-200/10 blur-xs" />
        </ParallaxLayer>
      </div>

      <div className="absolute inset-0 z-10">
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(0, ${parallaxOffset * 0.08}px, 0) scale(${heroScale})`,
          }}
        >
          <img
            src={heroImage}
            alt="SmartBin AI sorting system"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/85 via-slate-950/45 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-b from-slate-950/20 via-transparent to-slate-950/65" />
      </div>

      <div className="sticky top-0 z-20 h-screen">
        <div className="relative h-full">
          <HeroOverlay
            align={overlayAlign}
            headlineStyle={headlineStyle}
            subheadlineStyle={subheadlineStyle}
            onDashboardClick={onDashboardClick}
          />
        </div>
      </div>
    </section>
  );
};
const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const authMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!authMenuRef.current) {
        return;
      }
      if (!authMenuRef.current.contains(event.target)) {
        setIsAuthMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsAuthMenuOpen(false);
      }
    };

    if (isAuthMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAuthMenuOpen]);

  return (
    <div
      className={`fixed top-0 w-full z-50 px-4 transition-all duration-300 ${isScrolled ? 'pt-2' : 'pt-4'} flex justify-center`}
    >
      <nav
        className={`glass-panel w-full max-w-300 rounded-full px-6 py-3 flex items-center justify-between border border-white/60 backdrop-blur-xl transition-all duration-300 ${
          isScrolled
            ? 'bg-white/85 shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
            : 'bg-white/70 shadow-[0_12px_30px_rgba(15,23,42,0.12)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-full bg-white/80 p-1 shadow-md">
            <SmartbinLogo className="h-9 w-9" />
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-slate-900 text-lg font-display font-bold tracking-tight">
              SmartBin AI
            </h2>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How it Works', 'Impact', 'Pricing'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="relative text-slate-600 text-sm font-medium transition-colors font-display hover:text-slate-900 after:content-[''] after:absolute after:-bottom-2 after:left-1/2 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={authMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isAuthMenuOpen}
              onClick={() => setIsAuthMenuOpen((prev) => !prev)}
              className="flex items-center justify-center size-10 rounded-full border border-white/40 bg-white/80 text-slate-700 shadow-soft backdrop-blur-sm transition-all hover:bg-white hover:text-slate-900 hover:shadow-lg"
            >
              <User size={18} />
            </button>

            {isAuthMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-44 rounded-2xl border border-white/60 bg-white/95 p-2 text-sm shadow-xl backdrop-blur-md"
              >
                <a
                  href="/signup"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  Create account
                </a>
                <a
                  href="/login"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  Log in
                </a>
              </div>
            )}
          </div>

          <button className="flex items-center gap-2 justify-center overflow-hidden rounded-full h-10 px-6 gradient-bg hover:shadow-lg hover:shadow-secondary/30 transition-all text-white text-sm font-display font-bold">
            <Sparkles size={16} />
            Book a Demo
          </button>
        </div>
      </nav>
    </div>
  );
};

const TrustedBy = () => {
  return (
    <section className="relative w-full border-y border-slate-200/70 bg-white/80 py-12 backdrop-blur">
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/5 to-transparent opacity-80"></div>
      <div className="max-w-300 mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        <span className="text-sm font-display text-slate-500 uppercase tracking-widest whitespace-nowrap">
          Trusted by innovative campuses
        </span>
        <div className="flex flex-wrap justify-center md:justify-end gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Verified className="text-slate-400" size={24} /> TechU
          </div>
          <div className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Leaf className="text-slate-400" size={24} /> GreenCorp
          </div>
          <div className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-slate-400" size={24} /> CityLabs
          </div>
          <div className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <FlaskConical className="text-slate-400" size={24} /> BioFuture
          </div>
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    {
      icon: <Bot size={24} />,
      title: 'Automated Sorting',
      desc: 'Eliminate human error. Achieve 99% stream purity for higher recycling rebates.',
      colorClass: 'bg-primary/10 text-primary group-hover:bg-primary',
      hoverClass: 'group-hover:text-white',
    },
    {
      icon: <Leaf size={24} />,
      title: 'Carbon Dashboard',
      desc: 'Track Scope 3 emissions reductions in real-time with exportable ESG reports.',
      colorClass: 'bg-secondary/10 text-secondary group-hover:bg-secondary',
      hoverClass: 'group-hover:text-white',
    },
    {
      icon: <Bell size={24} />,
      title: 'Anomaly Alert',
      desc: 'Instant notifications for bin fullness, jams, or hazardous materials detection.',
      colorClass: 'bg-orange-100 text-orange-500 group-hover:bg-orange-500',
      hoverClass: 'group-hover:text-white',
    },
    {
      icon: <Cloud size={24} />,
      title: 'Crowd Learning',
      desc: 'Our neural network gets smarter with every item tossed across our global fleet.',
      colorClass: 'bg-accent/10 text-accent group-hover:bg-accent',
      hoverClass: 'group-hover:text-white',
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0">
        <div className="absolute -top-32 left-[10%] h-72 w-72 rounded-full bg-emerald-400/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[8%] h-96 w-96 rounded-full bg-sky-400/10 blur-[140px]"></div>
      </div>
      <div className="max-w-300 mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12 mb-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-slate-500 shadow-sm">
              Core Capabilities
            </span>
            <h2 className="mt-5 text-3xl md:text-4xl font-display font-bold text-slate-900">
              Intelligent sorting meets real-time sustainability insights.
            </h2>
            <p className="mt-4 text-slate-500">
              SmartBin AI blends computer vision, edge AI, and operational analytics so every
              facility can hit zero-waste targets faster.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Accuracy</div>
              <div className="text-2xl font-display font-bold text-slate-900">99%</div>
              <div className="text-xs text-slate-500">Model precision</div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Response</div>
              <div className="text-2xl font-display font-bold text-slate-900">0.8s</div>
              <div className="text-xs text-slate-500">Avg. decision time</div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Fleet</div>
              <div className="text-2xl font-display font-bold text-slate-900">120+</div>
              <div className="text-xs text-slate-500">Sites connected</div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Impact</div>
              <div className="text-2xl font-display font-bold text-slate-900">-38%</div>
              <div className="text-xs text-slate-500">Waste to landfill</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="feature-card group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(circle at top, rgba(16,185,129,0.08), transparent 60%)',
                }}
              ></div>
              <div
                className={`relative size-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${feature.colorClass} ${feature.hoverClass}`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-24 right-[12%] h-64 w-64 rounded-full bg-emerald-400/10 blur-[120px]"></div>
        <div className="absolute bottom-[-18%] left-[8%] h-72 w-72 rounded-full bg-sky-400/10 blur-[140px]"></div>
      </div>
      <div className="max-w-300 mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white">
            How It Works
          </span>
          <h2 className="mt-6 text-3xl md:text-4xl font-display font-bold text-slate-900">
            Intelligence at the Edge
          </h2>
          <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
            Each SmartBin combines vision sensors, AI inference, and automated routing to keep
            waste streams clean without slowing people down.
          </p>
        </div>

        <div className="relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 hidden md:block"></div>
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-primary to-transparent -translate-y-1/2 hidden md:block opacity-30 blur-[1px]"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <div className="flex flex-col items-center text-center gap-6 group">
              <div className="size-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg shadow-slate-200/50 relative transition-transform duration-300 group-hover:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white shadow-md">
                  Step 1
                </div>
                <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Camera className="text-primary w-10 h-10 relative z-10" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Detection</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-70">
                  High-resolution internal cameras capture items as they are deposited.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-6 group">
              <div className="size-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg shadow-slate-200/50 relative transition-transform duration-300 group-hover:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white shadow-md">
                  Step 2
                </div>
                <div className="absolute inset-0 bg-slate-900/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Brain className="text-slate-900 w-10 h-10 relative z-10" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900 mb-2">AI Analysis</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-70">
                  On-device inference classifies materials in under a second.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-6 group">
              <div className="size-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg shadow-slate-200/50 relative transition-transform duration-300 group-hover:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white shadow-md">
                  Step 3
                </div>
                <div className="absolute inset-0 bg-sky-400/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Trash2 className="text-sky-500 w-10 h-10 relative z-10" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900 mb-2">
                  Smart Routing
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-70">
                  Robotic panels sort the item into the correct internal bin instantly.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Latency', value: '< 800ms', detail: 'From detection to action' },
            { label: 'Uptime', value: '99.5%', detail: 'Edge redundancy built in' },
            { label: 'Data Sync', value: 'Live', detail: 'Cloud sync every 30s' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center"
            >
              <div className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-2">
                {item.label}
              </div>
              <div className="text-2xl font-display font-bold text-slate-900">{item.value}</div>
              <div className="text-xs text-slate-500 mt-1">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ComparisonSection = () => {
  const comparisonStats = [
    { label: 'Contamination', value: '-62%', detail: 'Cleaner waste streams' },
    { label: 'Recycling Revenue', value: '+28%', detail: 'Higher rebates' },
    { label: 'Reporting Time', value: '-45%', detail: 'Automated compliance' },
  ];

  return (
    <section id="impact" className="py-24 relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-[8%] h-64 w-64 rounded-full bg-emerald-400/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[10%] h-96 w-96 rounded-full bg-sky-400/10 blur-[140px]"></div>
      </div>
      <div className="max-w-300 mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            From Chaos to <span className="text-primary">Clarity</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Stop guessing with contaminated bins. SmartBin AI transforms your waste streams into
            clean, actionable data streams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {comparisonStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/70 bg-white/80 px-6 py-5 shadow-sm"
            >
              <div className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-display font-bold text-slate-900">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 mt-1">{stat.detail}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
          <div className="group relative rounded-2xl overflow-hidden border border-red-100 bg-red-50 hover:bg-red-100/50 transition-colors flex flex-col border-glow-red">
            <div className="p-8 pb-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-100 text-red-500">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-800">
                  Traditional Waste
                </h3>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-500">
                  <X className="text-red-400 w-4 h-4" /> High contamination rates
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <X className="text-red-400 w-4 h-4" /> Manual sorting required
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <X className="text-red-400 w-4 h-4" /> Zero data visibility
                </li>
              </ul>
              <div className="flex flex-wrap gap-3 text-xs text-red-500">
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1">
                  Data silos
                </span>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1">
                  Compliance risk
                </span>
              </div>
            </div>
            <div
              className="h-64 w-full bg-cover bg-center mt-auto opacity-40 mix-blend-multiply group-hover:mix-blend-normal transition-all duration-500"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBGmWA0ujHA2WgYRAjDFyTBnHH6DbtAWmYs4P_zxe6eDWJjPxVto4b5o2aYeNNEq9LdM18zScaFQ6ySNf7Mj-Mk-8X8ja04aTTBbw7S3SWT3IX8G5CcuX97mxR-sQwgV9Jnz0p11INPVtaoTKJ0mfr9fTMsUibZd4SKpltdrEB5yfnzeyAVph_3fN9mi5EsH7cvAgJ36DWwO7-S2M1sil-I67DNYX2xBZpeghwcE9-VWbtZQI17eg-wggsjFwaLyaKUdDyzJuN3E4Yk")',
              }}
            ></div>
          </div>

          <div className="group gradient-border-glow relative rounded-2xl overflow-hidden shadow-soft flex flex-col">
            <div className="p-8 pb-0 relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <LayoutDashboard size={24} />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900">
                  SmartBin Dashboard
                </h3>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-600">
                  <Check className="text-secondary w-4 h-4" /> Real-time categorization
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <Check className="text-secondary w-4 h-4" /> 99% Automated sorting
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <Check className="text-secondary w-4 h-4" /> Granular carbon tracking
                </li>
              </ul>
              <div className="flex flex-wrap gap-3 text-xs text-primary">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                  Live telemetry
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                  Export-ready
                </span>
              </div>
            </div>

            <div className="h-64 w-full mt-auto relative z-10 p-6 pt-0 flex flex-col justify-end">
              <div className="w-full bg-white/90 backdrop-blur border border-slate-200 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-slate-500">Live Carbon Savings</div>
                  <div className="text-xs text-secondary font-bold">+24% vs Last Week</div>
                </div>
                <div className="flex gap-1 h-24 items-end">
                  <div className="flex-1 bg-slate-100 rounded-sm h-[40%] relative group/bar">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      40kg
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-sm h-[60%]"></div>
                  <div className="flex-1 bg-slate-100 rounded-sm h-[45%]"></div>
                  <div className="flex-1 gradient-bg rounded-sm h-[85%] relative shadow-lg shadow-secondary/20"></div>
                  <div className="flex-1 bg-slate-100 rounded-sm h-[55%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
const ImpactCalculator = () => {
  const [footfall, setFootfall] = useState(2500);
  const [recyclingRate, setRecyclingRate] = useState(30);

  const stats = useMemo(() => {
    const baseWasteKg = footfall * 0.5 * 365;
    const improvementFactor = 0.95 - recyclingRate / 100;
    const divertedTons = (baseWasteKg * improvementFactor * 1.5) / 1000;

    const finalTons = Math.max(0, divertedTons).toFixed(1);
    const costSavings = Math.round(divertedTons * 1200).toLocaleString();
    const trees = Math.round(divertedTons * 50);

    return { tons: finalTons, cost: costSavings, trees };
  }, [footfall, recyclingRate]);

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}
      ></div>
      <div className="absolute -top-24 left-[10%] h-64 w-64 rounded-full bg-emerald-400/10 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[8%] h-72 w-72 rounded-full bg-sky-400/10 blur-[140px]"></div>

      <div className="max-w-250 mx-auto px-4 relative z-10">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-2xl shadow-slate-200">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="flex-1 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white w-fit">
                Impact Calculator
              </span>
              <h2 className="mt-6 text-3xl font-display font-bold text-slate-900 mb-4">
                Calculate Your Impact
              </h2>
              <p className="text-slate-500 mb-8">
                See how much CO2 and waste diversion cost you could save by switching to SmartBin AI.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                  Live sustainability score
                </div>
                <div className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700">
                  Export-ready ESG data
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Daily Footfall</label>
                  <span className="text-sm font-bold text-primary">
                    {footfall.toLocaleString()} people
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  value={footfall}
                  onChange={(event) => setFootfall(parseInt(event.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Current Recycling Rate
                  </label>
                  <span className="text-sm font-bold text-primary">{recyclingRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={recyclingRate}
                  onChange={(event) => setRecyclingRate(parseInt(event.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            <div className="flex-1 bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-center items-center text-center">
              <div className="mb-6">
                <div className="text-sm text-slate-500 uppercase tracking-wider mb-1">
                  Est. CO2 Diverted / Year
                </div>
                <div className="text-5xl font-display font-bold gradient-text">
                  {stats.tons} Tons
                </div>
              </div>
              <div className="w-full h-px bg-slate-200 mb-6"></div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Cost Savings</div>
                  <div className="text-xl font-bold text-slate-800">${stats.cost}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Trees Equivalent</div>
                  <div className="text-xl font-bold text-slate-800">{stats.trees}</div>
                </div>
              </div>
              <button className="mt-8 w-full py-3 rounded-lg gradient-bg text-white font-bold text-sm hover:shadow-lg transition-all">
                Get Full Report
              </button>
              <div className="mt-4 text-xs text-slate-400">
                Includes custom waste audit and ROI analysis.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const [period, setPeriod] = useState('monthly');

  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-300 mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-slate-500 shadow-sm">
            Pricing
          </span>
          <h2 className="mt-6 text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-6">
            Start with a small pilot or roll out across the entire campus. Scale as you grow.
          </p>
          <div className="inline-flex bg-white rounded-full p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                period === 'monthly'
                  ? 'gradient-bg text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                period === 'yearly'
                  ? 'gradient-bg text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Yearly (-15%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl flex flex-col border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Starter</h3>
            <p className="text-slate-500 text-sm mb-6 h-10">Essential sorting for small offices.</p>
            <div className="text-3xl font-bold text-slate-900 mb-6">
              ${period === 'monthly' ? '199' : '169'}
              <span className="text-base font-normal text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {['2 SmartBins', 'Basic Dashboard', 'Email Support'].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                  <Check className="text-primary w-4 h-4" /> {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
              Choose Starter
            </button>
          </div>

          <div className="bg-white p-8 rounded-2xl flex flex-col gradient-border-glow shadow-xl relative transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 gradient-bg px-4 py-1 rounded-full text-xs font-bold text-white tracking-wide uppercase shadow-md">
              Most Popular
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Pro</h3>
            <p className="text-slate-500 text-sm mb-6 h-10">Complete AI suite for campuses.</p>
            <div className="text-3xl font-bold text-slate-900 mb-6">
              ${period === 'monthly' ? '499' : '425'}
              <span className="text-base font-normal text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {['10 SmartBins', 'Advanced Analytics', 'Carbon Reports', 'Priority Support'].map(
                (item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="text-secondary w-4 h-4" /> {item}
                  </li>
                )
              )}
            </ul>
            <button className="w-full py-3 rounded-lg gradient-bg text-white font-bold text-sm hover:shadow-lg transition-all shadow-md shadow-primary/20">
              Choose Pro
            </button>
          </div>

          <div className="bg-white p-8 rounded-2xl flex flex-col border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Enterprise</h3>
            <p className="text-slate-500 text-sm mb-6 h-10">Custom fleet management.</p>
            <div className="text-3xl font-bold text-slate-900 mb-6">Custom</div>
            <ul className="space-y-4 mb-8 flex-1">
              {[
                'Unlimited Units',
                'API Access',
                'Dedicated Success Manager',
                'On-site Maintenance',
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                  <Check className="text-primary w-4 h-4" /> {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-white/70 bg-white/80 p-6 text-center shadow-sm">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-2">All Plans</div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <Check className="text-secondary w-4 h-4" /> Installation & onboarding
            </span>
            <span className="flex items-center gap-2">
              <Check className="text-secondary w-4 h-4" /> Live dashboard access
            </span>
            <span className="flex items-center gap-2">
              <Check className="text-secondary w-4 h-4" /> Quarterly optimization review
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white pt-16 pb-8">
      <div className="max-w-300 mx-auto px-4">
        <div className="mb-16 rounded-3xl bg-slate-900 px-8 py-10 text-white shadow-2xl shadow-slate-900/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-emerald-200 mb-3">
                Ready to deploy
              </div>
              <h3 className="text-3xl font-display font-bold">Bring SmartBin AI to your campus.</h3>
              <p className="mt-3 text-white/70 max-w-xl">
                Schedule a guided walkthrough and get a tailored impact projection for your facility.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="h-12 rounded-full bg-emerald-400 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-slate-950">
                Book a Demo
              </button>
              <button className="h-12 rounded-full border border-white/30 bg-white/10 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-white">
                Talk to Sales
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
          <div className="md:w-1/3">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center rounded-full bg-white/80 p-1 shadow-sm">
                <SmartbinLogo className="h-8 w-8" />
              </div>
              <h2 className="text-slate-900 text-xl font-display font-bold">SmartBin AI</h2>
            </div>
            <p className="text-slate-500 text-sm mb-6">
              Revolutionizing waste management through computer vision and artificial intelligence.
              Making zero-waste a reality for everyone.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-primary transition-colors">
                <Globe size={20} />
              </a>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors">
                <Share2 size={20} />
              </a>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-slate-900 font-bold mb-4 font-display">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <a href="#features" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Hardware
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-900 font-bold mb-4 font-display">Company</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="text-slate-900 font-bold mb-4 font-display">Stay Updated</h4>
              <form className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400"
                />
                <button className="bg-slate-900 text-white font-bold text-sm py-2 rounded-lg hover:bg-slate-800 transition-colors">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>(c) 2026 SmartBin AI Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-600">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-600">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const handleDashboardClick = () => navigate('/dashboard');

  return (
    <div className="bg-white">
      <NavBar />
      <main>
        <ParallaxHero overlayAlign="left" onDashboardClick={handleDashboardClick} />
        <TrustedBy />
        <Features />
        <HowItWorks />
        <ComparisonSection />
        <ImpactCalculator />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
