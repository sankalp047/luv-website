import {
  useState, useEffect, useRef, useCallback,
  createContext, useContext,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ParticlesBg from "./ParticlesBg.jsx";
import { initAnalytics, trackUserLogin, trackShowClick, trackStreamListen } from "./analytics.js"; // ← ANALYTICS

gsap.registerPlugin(ScrollTrigger);


/* ============================================================
   FIREBASE — loads gracefully, won't break if not configured
   ============================================================ */
let firebaseAuth = null, googleProv = null;
let signInWithPopupFn = null, signOutFn = null, onAuthChangedFn = null;

try {
  const fb = await import("./firebase.js");
  const am = await import("firebase/auth");
  firebaseAuth      = fb.auth;
  googleProv        = fb.googleProvider;
  signInWithPopupFn = am.signInWithPopup;
  signOutFn         = am.signOut;
  onAuthChangedFn   = am.onAuthStateChanged;
} catch (e) {
  console.log("Firebase not configured — running in placeholder mode");
}


/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const C = {
  red:      "#E31837",
  darkRed:  "#B81230",
  deep:     "#1a0a0a",
  brown:    "#2A1510",
  cream:    "#F5F0EB",
  gold:     "#D4A847",
  warmGray: "#8A8279",
  burgundy: "#8B1A2B",
};

const STREAM_URL = "https://funasia.streamguys1.com/live2?_ic2=1773251995892";


/* ============================================================
   DATA — Shows & Socials
   ============================================================ */
const SOCIALS = [
  { name: "Instagram",   url: "https://instagram.com/Luvradiouae" },
  { name: "Facebook",    url: "https://facebook.com/Luvradiouae" },
  { name: "Twitter / X", url: "https://twitter.com/Luvradiouae" },
  { name: "TikTok",      url: "https://tiktok.com/Luvradiouae" },
  { name: "Snapchat",    url: "https://snapchat.com/add/Luvradiouae" },
  { name: "YouTube",     url: "https://youtube.com/channel/UCHAqu1ypdJTeXbN6nTie9zA" },
  { name: "WhatsApp",    url: "https://wa.me/9710555661071" },
];

/*
  TO ADD PRESENTER IMAGES:
  1. Create a folder:  public/presenters/
  2. Drop images in:   public/presenters/kitch.jpg
                        public/presenters/reine.jpg
                        public/presenters/edi-sheron.jpg
  3. The cards will automatically show real images instead of placeholders
*/
const SHOWS = [
  {
    id: 3,
    title: "The Morning Show",
    presenter: "Keegan Basil",
    withLine: "with Keegan",
    time: "6AM – 10AM",
    days: "Weekdays",
    tagline: "Energy. Humour. Great music.",
    desc: "Keegan Basil is back on the airwaves, bringing his energy, humour and love for great music back to LUV 107.1. A South African broadcaster based in Dubai, Keegan has spent years behind the microphone connecting with listeners through music, stories, conversations and a little bit of chaos along the way. With a strong focus on CHR music, Keegan's mornings are all about starting your day with the right soundtrack, a good laugh and stories that make you feel part of the show.",
    image: "/presenters/keegan.jpg",
  },
  {
    id: 4,
    title: "LUV The Drive",
    presenter: "Rich",
    withLine: "with Rich",
    time: "4PM – 7PM",
    days: "Monday to Friday",
    tagline: "Great music. Good conversation. Even better company.",
    desc: "Rich brings a warm welcome, a cheeky sense of humour and years of UAE radio experience to LUV 107.1. An Irish presenter and chef who has called Dubai home for more than two decades, he's equally at home behind the microphone and in the kitchen.\n\nJoin him on LUV The Drive with Rich for today's hits, familiar favourites and warm, entertaining conversations that could go anywhere — from everyday life in the UAE and entertainment news to food, films and weekend plans. Expect a little mischief, plenty of music, useful traffic and travel updates, and his daily Deep Thought.\n\nWhether you're heading home, wrapping up work or getting your evening started, Rich is here to make the journey more enjoyable with great music, good conversation and even better company.",
    image: "/presenters/rich.jpg",
  },
];


/* ============================================================
   HOOKS
   ============================================================ */
function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [breakpoint]);
  return mobile;
}

function useGsapReveal(ref, vars = {}) {
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    gsap.fromTo(el,
      { opacity: 0, y: vars.y ?? 80, rotation: vars.rotation ?? 0, scale: vars.scale ?? 1 },
      { opacity: 1, y: 0, rotation: 0, scale: 1, duration: vars.duration ?? 1.2, ease: "power3.out",
        scrollTrigger: { trigger: el, start: vars.start ?? "top 85%", toggleActions: "play none none none" }
      }
    );
    return () => ScrollTrigger.getAll().forEach(t => { if (t.trigger === el) t.kill(); });
  }, []);
}


/* ============================================================
   CONTEXTS — Audio & Auth
   ============================================================ */
const AudioCtx = createContext(null);

function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    if (!audioRef.current) audioRef.current = new Audio(STREAM_URL);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setPlaying(true);
        trackStreamListen(); // ← ANALYTICS: track stream play
      }).catch(() => setPlaying(false));
    }
  }, [playing]);

  return <AudioCtx.Provider value={{ playing, toggle }}>{children}</AudioCtx.Provider>;
}
function useAudio() { return useContext(AudioCtx); }

const AuthCtx = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (onAuthChangedFn && firebaseAuth) {
      return onAuthChangedFn(firebaseAuth, (u) => {
        setUser(u);
        if (u) trackUserLogin(u); // ← ANALYTICS: track user login
      });
    }
  }, []);

  const signInGoogle = async () => {
    if (signInWithPopupFn && firebaseAuth && googleProv) {
      try { await signInWithPopupFn(firebaseAuth, googleProv); }
      catch (e) { alert("Sign-in failed: " + e.message); }
    } else {
      alert("Firebase not configured — add your config to src/firebase.js");
    }
  };

  const logOut = async () => {
    if (signOutFn && firebaseAuth) { await signOutFn(firebaseAuth); setUser(null); }
  };

  return <AuthCtx.Provider value={{ user, signInGoogle, logOut }}>{children}</AuthCtx.Provider>;
}
function useAuth() { return useContext(AuthCtx); }


/* ============================================================
   REUSABLE UI COMPONENTS
   ============================================================ */

/* --- Tilted banner headline --- */
function BannerText({ children, variant = "gold", style = {}, size = "48px", angle = "-2deg" }) {
  const bgs    = { gold: C.gold, red: C.red, burgundy: C.burgundy };
  const colors = { gold: C.deep, red: C.cream, burgundy: C.cream };
  return (
    <span style={{
      display: "inline-block", background: bgs[variant], color: colors[variant],
      fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontStyle: "italic",
      textTransform: "uppercase", padding: "8px 28px", lineHeight: 1,
      letterSpacing: "0.02em", fontSize: size, transform: `rotate(${angle})`,
      boxShadow: "4px 4px 0 rgba(0,0,0,0.2)", ...style,
    }}>
      {children}
    </span>
  );
}

/* --- Stamp-style button --- */
function StampBtn({ children, red, onClick, href, style = {} }) {
  const [hov, setHov] = useState(false);
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px",
    border: `2px solid ${red ? C.burgundy : C.cream}`, color: C.cream,
    background: red ? C.burgundy : "transparent",
    fontFamily: "'Caveat', cursive", fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 700,
    transform: "rotate(-2deg)", cursor: "pointer", transition: "all .35s", textDecoration: "none", ...style,
  };
  const hover = { transform: "rotate(0) scale(1.05)", background: C.red, borderColor: C.red, color: "#fff" };
  const s = hov ? { ...base, ...hover } : base;
  const p = { style: s, onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false) };
  if (href) return <a href={href} {...p}>{children}</a>;
  return <button onClick={onClick} {...p}>{children}</button>;
}

/* --- Marquee --- */
function Marquee({ text, bg, color, fontSize, direction = "left", angle = "0deg", speed = "20s" }) {
  const anim = direction === "left" ? "marqueeL" : "marqueeR";
  return (
    <div style={{ overflow: "hidden", whiteSpace: "nowrap", background: bg, padding: "clamp(10px,2vw,18px) 0", transform: `rotate(${angle})`, margin: "0 -20px" }}>
      <div style={{ display: "inline-block", whiteSpace: "nowrap", fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", letterSpacing: "0.04em", color, fontSize, animation: `${anim} ${speed} linear infinite` }}>
        {text.repeat(20)}
      </div>
    </div>
  );
}

/* --- Animated equalizer bars --- */
function WaveBars({ size = "small", color = "#fff" }) {
  const h = size === "small" ? [10,18,14,22,10,16] : [14,22,16,28,12,24,18,26];
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: size === "small" ? 24 : 32 }}>
      {h.map((v, i) => (
        <div key={i} style={{ width: size === "small" ? 3 : 4, height: v, background: color, borderRadius: 2, animation: `waveform .8s ease-in-out ${i*.1}s infinite alternate` }} />
      ))}
    </div>
  );
}


/* ============================================================
   FLOATING STREAM PLAYER (bottom-right corner)
   ============================================================ */
function FloatingPlayer() {
  const { playing, toggle } = useAudio();
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={toggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 900,
        width: 64, height: 64, borderRadius: "50%",
        background: playing ? C.red : C.burgundy,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all .4s",
        boxShadow: playing ? `0 0 0 4px ${C.red}40, 0 8px 32px rgba(227,24,55,.4)` : "0 8px 24px rgba(0,0,0,.4)",
        transform: hov ? "scale(1.12)" : "scale(1)",
      }}
    >
      {playing ? <WaveBars /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>}
      <div style={{
        position: "absolute", right: "calc(100% + 12px)", top: "50%", transform: "translateY(-50%)",
        background: C.deep, color: C.cream, padding: "6px 14px", borderRadius: 4,
        fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
        letterSpacing: ".08em", textTransform: "uppercase", whiteSpace: "nowrap",
        opacity: hov ? 1 : 0, transition: "opacity .3s", pointerEvents: "none",
      }}>
        {playing ? "Now Playing" : "Listen Live"}
      </div>
    </div>
  );
}


/* ============================================================
   AUTH MODAL — Google Sign-In only
   ============================================================ */
function AuthModal({ open, onClose }) {
  const { user, signInGoogle, logOut } = useAuth();
  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,5,5,.92)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.deep, border: `1px solid ${C.red}30`, padding: "clamp(32px,5vw,52px)", width: "min(400px,90vw)", position: "relative", textAlign: "center" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: C.warmGray, fontSize: 20, cursor: "pointer" }}>✕</button>

        {user ? (
          <>
            {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 12px", border: `2px solid ${C.red}` }} />}
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 28, fontWeight: 700, color: C.cream, marginBottom: 6 }}>Welcome, {user.displayName || "Listener"}!</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.warmGray, marginBottom: 20 }}>{user.email}</div>
            <button onClick={logOut} style={{ padding: "12px 32px", background: "transparent", border: `2px solid ${C.cream}30`, color: C.cream, fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}><BannerText variant="red" size="clamp(24px,4vw,36px)" angle="-1.5deg">Join LUV</BannerText></div>
            <p style={{ fontFamily: "'Special Elite', monospace", fontSize: 14, color: C.warmGray, lineHeight: 1.7, marginBottom: 28 }}>Sign in to save your favourite shows and be part of the LUV community.</p>
            <button onClick={signInGoogle} style={{ width: "100%", padding: "14px 24px", background: "#fff", color: "#333", border: "none", fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 2 }}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.43l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   NAV OVERLAY
   ============================================================ */
function NavOverlay({ open, onClose, onAuthOpen }) {
  const { user } = useAuth();
  const links = [
    { label: "Home", href: "#hero" }, { label: "Shows", href: "#shows" },
    { label: "Get The App", href: "#app" }, { label: "Advertise", href: "#advertise" },
    { label: "Connect", href: "#footer" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(26,10,10,.97)", backdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "center", opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity .5s" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 18, right: 24, background: "none", border: `2px solid ${C.cream}`, color: C.cream, padding: "8px 18px", fontFamily: "'Caveat', cursive", fontSize: 18, fontWeight: 700, cursor: "pointer", transform: "rotate(1deg)" }}>Close ✕</button>
      <nav style={{ textAlign: "center" }}>
        {links.map((l, i) => (
          <a key={l.label} href={l.href} onClick={onClose}
            style={{ display: "block", fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: "clamp(38px,8vw,72px)", textTransform: "uppercase", padding: "6px 0", color: C.cream, transition: `all .4s ease ${i*.05}s`, transform: open ? "translateY(0)" : "translateY(30px)", opacity: open ? 1 : 0, textDecoration: "none" }}
            onMouseEnter={e => { e.target.style.color = C.red; e.target.style.transform = "translateX(16px) rotate(-1deg)"; }}
            onMouseLeave={e => { e.target.style.color = C.cream; e.target.style.transform = "translateY(0)"; }}
          >{l.label}</a>
        ))}
        <button onClick={() => { onClose(); setTimeout(onAuthOpen, 300); }}
          style={{ marginTop: 24, background: C.gold, color: C.deep, border: "none", padding: "12px 32px", fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700, cursor: "pointer", transform: "rotate(-1deg)" }}
        >{user ? user.displayName || "Account" : "Sign In with Google"}</button>
      </nav>
    </div>
  );
}


/* ============================================================
   HEADER
   ============================================================ */
function Header({ onMenuOpen, onAuthOpen }) {
  const { user } = useAuth();
  const mobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: mobile ? "10px 16px" : "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .5s", background: scrolled ? "rgba(26,10,10,.95)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none" }}>
      <a href="#hero" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", zIndex: 2 }}>
        <div style={{ background: C.red, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", color: "#fff", fontSize: 12 }}>LUV</div>
        {!mobile && <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: ".08em", color: C.cream }}>107.1 FM</span>}
      </a>
      <div style={{ display: "flex", gap: mobile ? 6 : 10, alignItems: "center", zIndex: 2 }}>
        <button onClick={onAuthOpen} style={{ background: "none", border: `1px solid ${C.gold}60`, color: C.gold, padding: mobile ? "6px 12px" : "7px 16px", fontFamily: "'Caveat', cursive", fontSize: mobile ? 14 : 16, fontWeight: 700, cursor: "pointer", transform: "rotate(1deg)", display: "flex", alignItems: "center", gap: 6 }}>
          {user?.photoURL && <img src={user.photoURL} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />}
          {user ? (user.displayName?.split(" ")[0] || "•••") : "Sign In"}
        </button>
        <button onClick={onMenuOpen} style={{ background: "none", border: `2px solid ${C.cream}`, color: C.cream, padding: mobile ? "6px 14px" : "8px 20px", fontFamily: "'Caveat', cursive", fontSize: mobile ? 14 : 18, fontWeight: 700, cursor: "pointer", transform: "rotate(1deg)" }}>Navigate</button>
      </div>
    </header>
  );
}


/* ============================================================
   HERO SECTION
   ============================================================ */
function HeroSection() {
  const { playing, toggle } = useAudio();
  const mobile = useIsMobile();
  const b1 = useRef(null), b2 = useRef(null), desc = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (b1.current)   tl.fromTo(b1.current,   { opacity: 0, x: -100, rotation: -8 }, { opacity: 1, x: 0, rotation: -3, duration: 1 }, 0.3);
    if (b2.current)   tl.fromTo(b2.current,   { opacity: 0, x: 100, rotation: 5 },   { opacity: 1, x: 0, rotation: -1.5, duration: 1 }, 0.5);
    if (desc.current)  tl.fromTo(desc.current,  { opacity: 0, y: 60 },                 { opacity: 1, y: 0, duration: 1 }, 0.7);
  }, []);

  return (
    <section id="hero" style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", background: C.deep }}>
      {/* Background video */}
      <video autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "linear-gradient(to bottom, rgba(26,10,10,.85) 0%, rgba(26,10,10,.7) 50%, rgba(26,10,10,.95) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse at 30% 40%, ${C.red}12 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, ${C.gold}08 0%, transparent 50%)` }} />

      {/* Particles (desktop only) */}
      {!mobile && <ParticlesBg color={C.red} count={60} opacity={0.35} />}

      {/* Content */}
      <div style={{ width: "100%", maxWidth: 1300, margin: "0 auto", padding: mobile ? "100px 20px 60px" : "120px clamp(24px,5vw,80px) 80px", position: "relative", zIndex: 5 }}>

        {/* Tilted banners */}
        <div style={{ marginBottom: mobile ? 20 : 32 }}>
          <div ref={b1} style={{ opacity: 0 }}>
            <BannerText size={mobile ? "clamp(36px,12vw,56px)" : "clamp(48px,10vw,120px)"} angle="-3deg" style={{ marginLeft: mobile ? -4 : -10, padding: mobile ? "6px 18px" : "8px 28px" }}>LUV 107.1</BannerText>
          </div>
          <div ref={b2} style={{ marginTop: mobile ? -4 : -8, opacity: 0 }}>
            <BannerText variant="red" size={mobile ? "clamp(24px,9vw,42px)" : "clamp(36px,8vw,100px)"} angle="-1.5deg" style={{ marginLeft: mobile ? "clamp(20px,6vw,60px)" : "clamp(40px,10vw,200px)", padding: mobile ? "6px 16px" : "8px 28px" }}>Feel the Frequency</BannerText>
          </div>
        </div>

        {/* Description grid (stacks on mobile) */}
        <div ref={desc} style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? "24px" : "clamp(24px,4vw,60px)", marginTop: mobile ? 28 : 40, alignItems: "start", opacity: 0 }}>
          <div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: mobile ? "clamp(24px,7vw,34px)" : "clamp(28px,4vw,44px)", fontWeight: 700, color: C.cream, lineHeight: 1.2 }}>LUV 107.1 FM — Dubai's Frequency</div>
            <p style={{ fontFamily: "'Special Elite', monospace", fontSize: mobile ? "13px" : "clamp(13px,1.4vw,15px)", color: C.warmGray, lineHeight: 1.9, letterSpacing: ".03em", marginTop: 12 }}>
              <strong style={{ color: C.cream }}>LUV 107.1 FM</strong> is Dubai's home for <strong style={{ color: C.cream }}>adult contemporary hits</strong>, feel-good throwbacks, and the conversations that move the city.
            </p>
          </div>
          <div>
            <p style={{ fontFamily: "'Special Elite', monospace", fontSize: mobile ? "13px" : "clamp(13px,1.4vw,15px)", color: C.warmGray, lineHeight: 1.9, letterSpacing: ".03em" }}>
              Whether you're starting your day, powering through lunch, or heading home — our presenters bring the energy, the laughs, and the perfect soundtrack.
              <strong style={{ color: C.cream, display: mobile ? "block" : "inline", marginTop: mobile ? 8 : 0 }}> Your city. Your music. Your frequency.</strong>
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: mobile ? 24 : 36, flexWrap: "wrap", alignItems: "center" }}>
              <StampBtn red onClick={toggle}>{playing ? <><WaveBars size="small" /> Now Playing</> : <>▶ Listen Live</>}</StampBtn>
              <StampBtn href="https://bigfantv.com/app.html">Download App</StampBtn>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", animation: "float 2.8s ease infinite", textAlign: "center", zIndex: 5 }}>
        <div style={{ width: 1, height: mobile ? 28 : 40, margin: "0 auto", background: `linear-gradient(to bottom, ${C.red}, transparent)` }} />
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: ".3em", color: C.warmGray, textTransform: "uppercase", marginTop: 6 }}>Scroll</div>
      </div>
    </section>
  );
}


/* ============================================================
   SHOW CARD
   ─ Desktop: alternates image left/right (even=right, odd=left)
   ─ Mobile:  text on top, image below
   ─ Image tilts with 3D perspective on hover
   ============================================================ */
function ShowCard({ show, index }) {
  const cardRef = useRef(null);
  const imgRef  = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hov, setHov]   = useState(false);
  const mobile = useIsMobile();

  useGsapReveal(cardRef, { y: 100, duration: 1.2, start: "top 88%" });

  const handleMouseMove = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -14, y: x * 14 });
  };

  const cardBg  = index === 0 ? C.gold : index === 1 ? C.burgundy : C.red;
  const textCol = index === 0 ? C.deep : C.cream;
  const subCol  = index === 0 ? "rgba(26,10,10,.6)" : "rgba(245,240,235,.7)";
  const tagCol  = index === 0 ? "rgba(26,10,10,.8)" : "rgba(245,240,235,.9)";
  const imageOnRight = index % 2 === 0;

  /* ── Image side ── */
  const ImageSide = ({ isMobile = false }) => (
    <div
      ref={!isMobile ? imgRef : null}
      onMouseMove={!isMobile ? handleMouseMove : undefined}
      style={{
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "default",
        background: index === 0 ? "rgba(0,0,0,.06)" : "rgba(0,0,0,.15)",
        minHeight: isMobile ? "280px" : "auto",
      }}
    >
      <div style={{
        width: isMobile ? "90%" : "85%",
        height: isMobile ? "90%" : "80%",
        minHeight: isMobile ? "250px" : "auto",
        transition: "transform .3s cubic-bezier(.16,1,.3,1)",
        transform: isMobile ? "none" : `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hov ? 1.02 : 1})`,
      }}>
        {show.image ? (
          <img
            src={show.image}
            alt={show.presenter}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div style={{
          width: "100%", height: "100%",
          background: `linear-gradient(135deg, ${cardBg}90 0%, rgba(0,0,0,.3) 100%)`,
          display: show.image ? "none" : "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          border: `2px dashed ${index === 0 ? "rgba(26,10,10,.2)" : "rgba(245,240,235,.2)"}`,
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? "64px" : "clamp(56px,10vw,120px)", color: index === 0 ? "rgba(26,10,10,.1)" : "rgba(245,240,235,.1)", lineHeight: 1 }}>0{show.id}</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: index === 0 ? "rgba(26,10,10,.25)" : "rgba(245,240,235,.25)", marginTop: 8 }}>Presenter Photo</div>
          {!isMobile && <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: index === 0 ? "rgba(26,10,10,.35)" : "rgba(245,240,235,.35)", marginTop: 4 }}>/ hover to tilt \</div>}
        </div>
      </div>
    </div>
  );

  /* ── Text side ── */
  const TextSide = () => (
    <div style={{
      padding: mobile ? "clamp(24px,6vw,40px)" : "clamp(32px,5vw,64px)",
      display: "flex", flexDirection: "column", justifyContent: "center",
    }}>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", color: subCol, marginBottom: mobile ? 12 : 16 }}>
        {show.days} · {show.time}
      </div>
      <div style={{ marginBottom: 8 }}>
        <span style={{
          display: "inline-block",
          background: index === 0 ? C.deep : "#fff",
          color: index === 0 ? C.gold : cardBg,
          fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontStyle: "italic",
          textTransform: "uppercase",
          padding: mobile ? "8px 16px" : "10px 24px", lineHeight: 1,
          fontSize: mobile ? "clamp(22px,7vw,34px)" : "clamp(28px,5vw,52px)",
          transform: hov ? "rotate(0) translateX(8px)" : "rotate(-1.5deg)",
          boxShadow: "3px 3px 0 rgba(0,0,0,0.15)",
          transition: "transform .5s cubic-bezier(.16,1,.3,1)",
        }}>{show.title}</span>
      </div>
      <div style={{ fontFamily: "'Caveat', cursive", fontSize: mobile ? "20px" : "clamp(24px,3.5vw,34px)", fontWeight: 700, color: textCol, marginBottom: mobile ? 14 : 20, marginTop: 4 }}>
        {show.withLine}
      </div>
      <p style={{ fontFamily: "'Special Elite', monospace", fontSize: mobile ? "13px" : "clamp(13px,1.3vw,15px)", color: subCol, lineHeight: 1.9, maxWidth: 520, letterSpacing: ".03em", whiteSpace: "pre-line" }}>
        {show.desc}
      </p>
      <div style={{
        fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
        letterSpacing: ".18em", textTransform: "uppercase", color: tagCol,
        marginTop: mobile ? 16 : 24, paddingTop: mobile ? 14 : 18,
        borderTop: `1px solid ${index === 0 ? "rgba(26,10,10,.12)" : "rgba(245,240,235,.15)"}`,
      }}>{show.tagline}</div>
    </div>
  );

  /* ── MOBILE LAYOUT ── */
  if (mobile) {
    return (
      <div ref={cardRef} style={{ opacity: 0 }}>
        <div
          onClick={() => trackShowClick(show.title)} // ← ANALYTICS
          style={{ background: cardBg, width: "100%", marginBottom: 4 }}
        >
          <TextSide />
          <ImageSide isMobile />
        </div>
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ── */
  return (
    <div ref={cardRef} style={{ opacity: 0 }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
        onClick={() => trackShowClick(show.title)} // ← ANALYTICS
        style={{
          background: cardBg, width: "100%",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          minHeight: "clamp(420px,52vw,620px)", overflow: "hidden",
          transition: "transform .5s cubic-bezier(.16,1,.3,1)",
          transform: hov ? "scale(1.005)" : "scale(1)",
          marginBottom: 4,
        }}
      >
        {imageOnRight ? (
          <><TextSide /><ImageSide /></>
        ) : (
          <><ImageSide /><TextSide /></>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   SHOWS SECTION
   ============================================================ */
function ShowsSection() {
  const r = useRef(null);
  useGsapReveal(r, { y: 60, rotation: -3, duration: 1 });

  return (
    <section id="shows" style={{ padding: "clamp(60px,10vw,120px) 0 0", background: C.deep }}>
      <div ref={r} style={{ padding: "0 clamp(24px,5vw,80px)", marginBottom: "clamp(40px,6vw,70px)", opacity: 0 }}>
        <div><BannerText size="clamp(28px,5vw,56px)" angle="-2deg">Our Shows</BannerText></div>
        <div style={{ marginTop: 6, marginLeft: "clamp(20px,5vw,80px)" }}>
          <BannerText variant="burgundy" size="clamp(22px,4vw,44px)" angle="-1deg">On Air Daily</BannerText>
        </div>
      </div>
      <div style={{ padding: "0 clamp(8px,2vw,24px)" }}>
        {SHOWS.map((s, i) => <ShowCard key={s.id} show={s} index={i} />)}
      </div>
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, letterSpacing: ".2em", color: C.warmGray, textTransform: "uppercase", marginBottom: 10 }}>More shows coming soon</div>
        <div style={{ width: 40, height: 1, margin: "0 auto", background: C.red }} />
      </div>
    </section>
  );
}


/* ============================================================
   APP SECTION
   ============================================================ */
function AppSection() {
  const r = useRef(null);
  const [ph, setPh] = useState(false);
  const mobile = useIsMobile();
  useGsapReveal(r, { y: 80, duration: 1.2 });

  return (
    <section id="app" style={{ padding: mobile ? "clamp(48px,10vw,80px) 20px" : "clamp(60px,10vw,120px) clamp(24px,5vw,80px)", background: C.brown, overflow: "hidden" }}>
      <div ref={r} style={{ display: mobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: "1fr 1fr", gap: mobile ? "36px" : "clamp(40px,7vw,100px)", alignItems: "center", maxWidth: 1100, margin: "0 auto", opacity: 0 }}>

        {/* Text */}
        <div style={{ textAlign: mobile ? "center" : "left" }}>
          <div style={{ marginBottom: 20 }}>
            <BannerText size={mobile ? "clamp(24px,8vw,38px)" : "clamp(26px,5vw,52px)"} angle="-2deg" style={{ padding: mobile ? "6px 18px" : "8px 28px" }}>Take LUV</BannerText><br />
            <div style={{ marginTop: 6, marginLeft: mobile ? 0 : 30 }}>
              <BannerText variant="red" size={mobile ? "clamp(20px,7vw,32px)" : "clamp(22px,4vw,44px)"} angle="-1deg" style={{ padding: mobile ? "6px 16px" : "8px 28px" }}>Everywhere</BannerText>
            </div>
          </div>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "clamp(22px,3vw,30px)", color: C.gold, marginBottom: 14 }}>Your pocket radio, reimagined</p>
          <p style={{ fontFamily: "'Special Elite', monospace", fontSize: "clamp(13px,1.4vw,15px)", color: C.warmGray, lineHeight: 1.9, maxWidth: mobile ? "100%" : "420px", margin: mobile ? "0 auto" : "0" }}>
            Stream live, explore shows, set reminders. Download the <strong style={{ color: C.cream }}>BigFan</strong> App.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap", justifyContent: mobile ? "center" : "flex-start" }}>
            <a href="https://apps.apple.com/us/app/bigfan-tv/id620324506" style={{ background: C.cream, color: C.deep, padding: "14px 28px", fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>App Store</a>
            <a href="https://play.google.com/store/apps/details?id=mobapp.at.FunAsia&hl=en_US" style={{ background: C.cream, color: C.deep, padding: "14px 28px", fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Google Play</a>
          </div>
        </div>

        {/* Phone mockup */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            onMouseEnter={() => setPh(true)}
            onMouseLeave={() => setPh(false)}
            style={{
              width: mobile ? "200px" : "clamp(200px, 28vw, 270px)",
              height: mobile ? "420px" : "clamp(420px, 56vw, 560px)",
              borderRadius: 36, overflow: "hidden", position: "relative",
              boxShadow: "0 40px 100px rgba(0,0,0,.5)",
              transition: "transform .7s cubic-bezier(.16,1,.3,1)",
              transform: ph ? "translateY(-10px) rotate(-2deg)" : "none",
              background: "#000", border: "4px solid #222",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 100, height: 28, borderRadius: "0 0 16px 16px", background: "#000", zIndex: 2 }} />
            <img src="/app-screenshot.png" alt="BigFan App" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", borderRadius: 32 }} />
            <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,.3)", zIndex: 2 }} />
          </div>
        </div>
      </div>
    </section>
  );
}


/* ============================================================
   ADVERTISE SECTION
   ============================================================ */
function AdvertiseSection() {
  const r = useRef(null);
  const mobile = useIsMobile();
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");
  useGsapReveal(r, { y: 60 });

const handleSubmit = async () => {
  if (!form.name || !form.email || !form.message) {
    setErrMsg("Please fill required fields");
    setStatus("error");
    return;
  }
  setStatus("sending");
  try {
    const res = await fetch(
      "https://sendcontactemail-nrpgaqflcq-el.a.run.app",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    if (!res.ok) throw new Error("Failed to send");
    setStatus("sent");
  } catch (e) {
    setErrMsg("Something went wrong. Please try again.");
    setStatus("error");
  }
};

  const inp = { background: "rgba(245,240,235,.04)", border: "1px solid rgba(245,240,235,.08)", color: C.cream, padding: mobile ? "13px 14px" : "15px 18px", fontFamily: "'Special Elite', monospace", fontSize: 14, outline: "none", transition: "all .4s", width: "100%" };

  return (
    <section id="advertise" style={{ padding: mobile ? "clamp(48px,10vw,80px) 20px" : "clamp(60px,10vw,120px) clamp(24px,5vw,80px)", background: C.deep }}>
      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${C.red}25, transparent)`, marginBottom: mobile ? "36px" : "clamp(40px,8vw,80px)" }} />
      <div ref={r} style={{ maxWidth: 720, margin: "0 auto", opacity: 0 }}>
        <div style={{ textAlign: "center", marginBottom: mobile ? 24 : 36 }}>
          <BannerText size={mobile ? "clamp(24px,8vw,40px)" : "clamp(28px,6vw,60px)"} angle="-2deg">Advertise</BannerText><br />
          <div style={{ marginTop: 6, marginLeft: mobile ? 16 : 40 }}>
            <BannerText variant="burgundy" size={mobile ? "clamp(20px,7vw,34px)" : "clamp(22px,4.5vw,48px)"} angle="-1deg">on LUV</BannerText>
          </div>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "clamp(22px,3vw,30px)", color: C.gold, marginTop: 14 }}>Reach Dubai, one listener at a time</p>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: mobile ? 36 : 56, background: "rgba(245,240,235,.04)", border: `1px solid ${C.red}30` }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: mobile ? 28 : 36, fontWeight: 700, color: C.cream }}>THANK YOU!</div>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: mobile ? 18 : 22, color: C.gold, marginTop: 8 }}>We'll be in touch soon.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 10 : 14 }}>
            <input placeholder="Your Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inp} onFocus={e => e.target.style.borderColor = C.red} onBlur={e => e.target.style.borderColor = "rgba(245,240,235,.08)"} />
            <input placeholder="Email *" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inp} onFocus={e => e.target.style.borderColor = C.red} onBlur={e => e.target.style.borderColor = "rgba(245,240,235,.08)"} />
            <input placeholder="Company" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={{ ...inp, gridColumn: mobile ? "1" : "1 / -1" }} onFocus={e => e.target.style.borderColor = C.red} onBlur={e => e.target.style.borderColor = "rgba(245,240,235,.08)"} />
            <textarea placeholder="Tell us about your brand..." rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} style={{ ...inp, gridColumn: mobile ? "1" : "1 / -1", resize: "vertical" }} onFocus={e => e.target.style.borderColor = C.red} onBlur={e => e.target.style.borderColor = "rgba(245,240,235,.08)"} />
            <button onClick={handleSubmit} disabled={status === "sending"} style={{ gridColumn: mobile ? "1" : "1 / -1", background: C.red, color: "#fff", border: "none", padding: mobile ? 14 : 16, fontFamily: "'Caveat', cursive", fontSize: mobile ? 20 : 24, fontWeight: 700, cursor: "pointer", transform: "rotate(-0.5deg)", opacity: status === "sending" ? 0.6 : 1 }}>
              {status === "sending" ? "Sending..." : "Get In Touch →"}
            </button>
            {status === "error" && <p style={{ gridColumn: mobile ? "1" : "1 / -1", textAlign: "center", color: C.red, fontSize: 14 }}>{errMsg}</p>}
          </div>
        )}
      </div>
    </section>
  );
}


/* ============================================================
   FOOTER
   ============================================================ */
function Footer() {
  const r = useRef(null);
  const mobile = useIsMobile();
  useGsapReveal(r, { y: 40 });

  return (
    <footer id="footer" style={{ background: C.gold, color: C.deep, paddingTop: mobile ? 36 : 50 }}>
      <div ref={r} style={{ opacity: 0 }}>
        <div style={{ textAlign: "center", marginBottom: mobile ? 28 : 40 }}>
          <BannerText variant="red" size={mobile ? "clamp(28px,9vw,48px)" : "clamp(32px,7vw,72px)"} angle="-2deg">Feel the Frequency</BannerText>
        </div>

        <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", padding: `0 clamp(24px,5vw,80px)`, gap: mobile ? 28 : 40, flexWrap: "wrap", alignItems: mobile ? "center" : "flex-start" }}>
          <div style={{ display: "flex", flexDirection: mobile ? "row" : "column", flexWrap: mobile ? "wrap" : "nowrap", gap: 10, justifyContent: mobile ? "center" : "flex-start" }}>
            {SOCIALS.map((s, i) => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", padding: mobile ? "6px 14px" : "8px 20px", background: C.burgundy, color: C.cream, fontFamily: "'Caveat', cursive", fontSize: mobile ? 16 : 20, fontWeight: 700, transform: `rotate(${-3+(i%3)}deg)`, transition: "all .3s", textDecoration: "none" }}
                onMouseEnter={e => { e.target.style.transform = "rotate(0) scale(1.08)"; e.target.style.background = C.red; }}
                onMouseLeave={e => { e.target.style.transform = `rotate(${-3+(i%3)}deg)`; e.target.style.background = C.burgundy; }}
              >{s.name}</a>
            ))}
          </div>

          <div style={{ textAlign: "center", flex: mobile ? "none" : 1, minWidth: mobile ? "auto" : 260, fontFamily: "'Special Elite', monospace", fontSize: mobile ? 13 : 14, lineHeight: 1.9 }}>
            <strong style={{ display: "block", marginTop: 12, fontSize: 13, letterSpacing: ".15em", textTransform: "uppercase" }}>Location:</strong>Dubai, UAE
            <strong style={{ display: "block", marginTop: 12, fontSize: 13, letterSpacing: ".15em", textTransform: "uppercase" }}>WhatsApp:</strong>
            <a href="https://wa.me/9710555661071" style={{ color: C.deep }}>+971 055 566 1071</a>
            <strong style={{ display: "block", marginTop: 12, fontSize: 13, letterSpacing: ".15em", textTransform: "uppercase" }}>On Air:</strong>24/7
          </div>

          <div style={{ display: "flex", flexDirection: mobile ? "row" : "column", flexWrap: mobile ? "wrap" : "nowrap", gap: 10, alignItems: mobile ? "center" : "flex-end", justifyContent: mobile ? "center" : "flex-start" }}>
            {[{ label: "Listen Live", href: "#hero" }, { label: "Our Shows", href: "#shows" }, { label: "Download App", href: "https://bigfantv.com/app.html" }, { label: "Advertise", href: "#advertise" }].map((l, i) => (
              <a key={l.label} href={l.href}
                style={{ display: "inline-block", padding: mobile ? "6px 14px" : "8px 20px", background: C.burgundy, color: C.cream, fontFamily: "'Caveat', cursive", fontSize: mobile ? 16 : 20, fontWeight: 700, transform: `rotate(${2+(i%2)}deg)`, transition: "all .3s", textDecoration: "none" }}
                onMouseEnter={e => { e.target.style.transform = "rotate(0) scale(1.08)"; e.target.style.background = C.red; }}
                onMouseLeave={e => { e.target.style.transform = `rotate(${2+(i%2)}deg)`; e.target.style.background = C.burgundy; }}
              >{l.label}</a>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: mobile ? "20px 16px 16px" : "30px 24px 20px", fontFamily: "'Outfit', sans-serif", fontSize: 11, color: "rgba(26,10,10,.5)", marginTop: mobile ? 28 : 40, borderTop: "1px solid rgba(26,10,10,.1)" }}>
          © 2026 LUV 107.1 FM. All rights reserved.
        </div>
      </div>
    </footer>
  );
}


/* ============================================================
   MAIN APP
   ============================================================ */
export default function LuvRadio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // ← ANALYTICS: initialize tracking on app load
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <AuthProvider>
      <AudioProvider>
        <div style={{ background: C.deep, color: C.cream, minHeight: "100vh", overflowX: "hidden" }}>

          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&family=Special+Elite&family=Oswald:wght@400;500;600;700&display=swap');
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            html { scroll-behavior: smooth; overflow-x: hidden; }
            body { background: ${C.deep}; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
            body::after { content: ''; position: fixed; inset: 0; z-index: 9998; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 256px; }
            ::selection { background: ${C.red}; color: #fff; }
            ::-webkit-scrollbar { width: 5px; }
            ::-webkit-scrollbar-track { background: ${C.deep}; }
            ::-webkit-scrollbar-thumb { background: ${C.red}50; border-radius: 4px; }
            input::placeholder, textarea::placeholder { color: rgba(138,130,121,.4) !important; }
            @keyframes marqueeL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            @keyframes marqueeR { from { transform: translateX(-50%); } to { transform: translateX(0); } }
            @keyframes waveform  { 0% { transform: scaleY(.3); } 100% { transform: scaleY(1); } }
            @keyframes float     { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(10px); } }
            @keyframes pulse     { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
          `}</style>

          <NavOverlay open={menuOpen} onClose={() => setMenuOpen(false)} onAuthOpen={() => setAuthOpen(true)} />
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
          <Header onMenuOpen={() => setMenuOpen(true)} onAuthOpen={() => setAuthOpen(true)} />

          <HeroSection />

          <div style={{ background: C.deep, padding: "20px 0" }}>
            <Marquee text="MUSIC · "      bg={C.burgundy} color={C.cream} fontSize="clamp(28px,5.5vw,64px)" direction="right" angle="-2deg"  speed="24s" />
            <Marquee text="VIBES · "      bg={C.gold}     color={C.deep}  fontSize="clamp(32px,6vw,72px)"   direction="left"  angle="1.5deg" speed="22s" />
            <Marquee text="LUV 107.1 · "  bg={C.red}      color="#fff"    fontSize="clamp(36px,7vw,80px)"   direction="left"  angle="-2deg"  speed="20s" />
          </div>

          <ShowsSection />

          <div style={{ background: C.deep, padding: "10px 0" }}>
            <Marquee text="KEEGAN · RICH · " bg={C.gold} color={C.deep} fontSize="clamp(24px,4vw,56px)" direction="right" angle="1deg"    speed="30s" />
            <Marquee text="FEEL THE FREQUENCY · "            bg={C.red}  color="#fff"   fontSize="clamp(28px,5vw,64px)" direction="left"  angle="-1.5deg" speed="25s" />
          </div>

          <AppSection />
          <AdvertiseSection />
          <Footer />
          <FloatingPlayer />
        </div>
      </AudioProvider>
    </AuthProvider>
  );
}