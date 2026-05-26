import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import csLogo from "@/assets/cs-logo.png";

type Slide = { num: string; title: string; subtitle?: string; body: JSX.Element };

const slides: Slide[] = [
  {
    num: "01",
    title: "CASH STAGE",
    subtitle: "Where Bars Turn Into Bankrolls",
    body: (
      <div className="flex flex-col items-center gap-6">
        <img src={csLogo} alt="" className="h-40 w-40 animate-float-slow" />
        <p className="text-muted-foreground max-w-xl text-center">
          The first competitive music platform where artists battle, drop, collab — and earn real money.
        </p>
      </div>
    ),
  },
  {
    num: "02",
    title: "THE PROBLEM",
    body: (
      <ul className="space-y-4 max-w-2xl mx-auto text-lg">
        {[
          "Independent artists don't get paid fairly",
          "Streaming platforms reward popularity, not talent",
          "Battle apps lack real monetization",
          "There is no fair, gamified ladder for new MCs",
        ].map((p) => (
          <li key={p} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
            <span className="text-destructive font-display text-2xl leading-none">✕</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: "03",
    title: "THE SOLUTION",
    subtitle: "Battles + Music + Collabs + Real Earnings",
    body: (
      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {[
          { e: "🎤", t: "Anonymous Battles", d: "No bias. Pure bars." },
          { e: "🎧", t: "Solo Drops", d: "Get paid per play." },
          { e: "🤝", t: "Collabs", d: "Smooth revenue splits." },
          { e: "💰", t: "Real Money", d: "Cash Stage Bucks → cash out." },
        ].map((s) => (
          <div key={s.t} className="p-6 rounded-2xl bg-card border border-border hover:border-primary transition-colors">
            <div className="text-4xl">{s.e}</div>
            <p className="font-display text-2xl mt-2">{s.t}</p>
            <p className="text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "04",
    title: "THE PRODUCT",
    body: (
      <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {["Anonymous battles", "Solo drops (paid plays)", "Collab revenue splits", "AI battle arena", "Live chat rooms", "Weekly contest categories"].map((f) => (
          <div key={f} className="p-5 rounded-xl bg-secondary border border-border">
            <p className="font-display text-lg text-primary">{f}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "05",
    title: "WHY IT'S DIFFERENT",
    body: (
      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {[
          { t: "No Bias", d: "Anonymous voting protects pure talent." },
          { t: "Real Money", d: "A full economy, not vanity points." },
          { t: "Gamified", d: "Dice matching, ranks, weekly contests." },
          { t: "AI Integration", d: "Rookie to God Mode. Train against bots." },
        ].map((s) => (
          <div key={s.t} className="p-5 rounded-2xl border border-primary/30 bg-primary/5">
            <p className="font-display text-2xl text-glow">{s.t}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "06",
    title: "MARKET",
    body: (
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
        {[
          { v: "50M+", l: "Independent artists worldwide" },
          { v: "$26B", l: "Global streaming economy" },
          { v: "Gen Z", l: "Battle rap & TikTok culture exploding" },
        ].map((s) => (
          <div key={s.l} className="p-6 rounded-2xl bg-card border border-border">
            <p className="font-display text-5xl text-gradient-primary">{s.v}</p>
            <p className="text-sm text-muted-foreground mt-2">{s.l}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "07",
    title: "MONETIZATION",
    body: (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {[
          { t: "Entry Fees", d: "Every battle has skin in the game" },
          { t: "#1 Seats", d: "Premium viewing & exclusive chat" },
          { t: "Cash Stage Bucks", d: "Native token economy" },
          { t: "Promotions & Boosts", d: "Pay to amplify drops" },
          { t: "Beat Marketplace", d: "Producers cash in too" },
          { t: "AI Arena", d: "Tournaments & training plans" },
        ].map((m) => (
          <div key={m.t} className="p-5 rounded-xl bg-card border border-border">
            <p className="font-display text-xl text-accent">{m.t}</p>
            <p className="text-sm text-muted-foreground">{m.d}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "08",
    title: "TRACTION ROADMAP",
    body: (
      <div className="space-y-4 max-w-2xl mx-auto">
        {[
          { p: "Phase 1", t: "Underground Launch", d: "Invite-only. Battle rappers + TikTok artists." },
          { p: "Phase 2", t: "Viral Push", d: "Daily clips on TikTok & Instagram. Influencer battles." },
          { p: "Phase 3", t: "Monetization", d: "Paid battles, premium seats, boost system." },
        ].map((p) => (
          <div key={p.p} className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border">
            <p className="font-display text-3xl text-primary w-24 shrink-0">{p.p}</p>
            <div>
              <p className="font-display text-xl">{p.t}</p>
              <p className="text-sm text-muted-foreground">{p.d}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "09",
    title: "PROJECTION",
    body: (
      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div className="p-8 rounded-2xl bg-card border border-border text-center">
          <p className="text-xs text-muted-foreground tracking-widest">10K USERS</p>
          <p className="font-display text-6xl text-gradient-primary mt-2">$100K</p>
          <p className="text-sm text-muted-foreground">monthly revenue</p>
        </div>
        <div className="p-8 rounded-2xl border-2 border-accent text-center" style={{ background: "radial-gradient(ellipse at top, hsl(45 100% 25% / 0.4), transparent)" }}>
          <p className="text-xs text-accent tracking-widest font-bold">100K USERS</p>
          <p className="font-display text-6xl text-gradient-gold mt-2">$1M+</p>
          <p className="text-sm text-muted-foreground">monthly revenue</p>
        </div>
      </div>
    ),
  },
  {
    num: "10",
    title: "VISION",
    subtitle: "Become the #1 competitive music platform in the world",
    body: (
      <div className="text-center max-w-2xl mx-auto">
        <p className="font-display text-3xl md:text-5xl text-glow leading-tight">
          REAL ARTISTS. <br />
          <span className="text-gradient-gold">REAL BARS.</span> <br />
          REAL MONEY.
        </p>
        <p className="text-muted-foreground mt-6">SoundCloud × Twitch × battle rap — with a money twist.</p>
      </div>
    ),
  },
];

const PitchDeck = () => {
  const [i, setI] = useState(0);
  const next = () => setI((v) => Math.min(slides.length - 1, v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const s = slides[i];

  return (
    <div className="min-h-screen pt-24 pb-12 stage-bg">
      <SEO
        title="Pitch Deck — Cash Stage"
        description="The Cash Stage pitch: the problem, product, market, business model, and roadmap for the music platform that pays artists."
        path="/pitch"
      />
      <SiteNav />
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs tracking-widest text-muted-foreground">SLIDE {s.num} / {String(slides.length).padStart(2, "0")}</p>
          <div className="flex gap-2">
            <button onClick={prev} disabled={i === 0} className="h-10 w-10 grid place-items-center rounded-full bg-secondary disabled:opacity-30 hover:bg-primary hover:text-primary-foreground transition-colors">
              <ChevronLeft />
            </button>
            <button onClick={next} disabled={i === slides.length - 1} className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-30">
              <ChevronRight />
            </button>
          </div>
        </div>

        <div key={i} className="rounded-3xl border border-border bg-card/80 backdrop-blur p-8 md:p-16 min-h-[70vh] flex flex-col justify-center animate-fade-in">
          <p className="text-xs tracking-widest text-primary font-bold">SLIDE {s.num}</p>
          <h1 className="font-display text-5xl md:text-7xl mt-2 text-glow">{s.title}</h1>
          {s.subtitle && <p className="text-xl text-accent mt-2 italic">"{s.subtitle}"</p>}
          <div className="mt-12">{s.body}</div>
        </div>

        {/* Slide nav */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {slides.map((sl, idx) => (
            <button
              key={sl.num}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-2 bg-secondary hover:bg-muted-foreground"}`}
              aria-label={`Slide ${sl.num}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PitchDeck;
