import { Link } from "react-router-dom";
import { Dice5, Swords, Music, Coins, Zap, Shield, Users2, Sparkles, ArrowRight } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import stageHero from "@/assets/stage-hero.jpg";
import csLogo from "@/assets/cs-logo.png";
import HomeScreen from "@/components/phone/HomeScreen";
import BattleScreen from "@/components/phone/BattleScreen";
import WalletScreen from "@/components/phone/WalletScreen";
import PhoneTabBar from "@/components/phone/PhoneTabBar";

const features = [
  { Icon: Dice5, title: "Roll The Dice", body: "Anonymous random matchups. Pure bars decide who walks away with the bag." },
  { Icon: Swords, title: "Battle Mode", body: "Diagonal split-screen, animated waveforms, locked voting after submit." },
  { Icon: Music, title: "Solo Drops", body: "Heat meter shows momentum. Tip artists. Boost tracks. Get paid per play." },
  { Icon: Users2, title: "Collabs", body: "Smooth split sliders, open invites, random matching with other artists." },
  { Icon: Coins, title: "Wallet", body: "Cash Stage Bucks economy. Deposit, win, withdraw — real money in, real money out." },
  { Icon: Shield, title: "Anti-Cheat", body: "Locked votes, spin-team protection, AI bot detection. Fair play, zero drama." },
];

const categories = ["Hip Hop", "Rap", "Alternative", "Country", "Gospel", "Holiday"];

const PhoneMini = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="space-y-2">
    <div className="phone-frame mx-auto max-w-[220px]">
      {children}
      <PhoneTabBar active="home" onChange={() => {}} />
    </div>
    <p className="text-center text-[10px] text-muted-foreground tracking-widest font-bold">{label}</p>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen text-foreground">
      <SEO
        title="Cash Stage — Where Bars Turn Into Bankrolls"
        description="Compete in music battles, drop solo tracks, collab with artists, and earn real money on Cash Stage. Anonymous voting, real payouts."
        path="/"
      />
      <SiteNav />



      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <img src={stageHero} alt="Stage with neon lights" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="absolute inset-0 grid-noise opacity-30" />

        <div className="container relative z-10 grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
              <Sparkles className="h-3 w-3" /> NOW LIVE — INVITE ONLY
            </span>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.9] mt-6">
              WHERE BARS <br />
              TURN INTO <br />
              <span className="text-gradient-primary text-glow">BANKROLLS.</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl">
              Cash Stage is the first competitive music platform that pays artists for what they actually do —
              battle, drop, collab, and bring the heat.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/app" className="px-7 py-4 rounded-full bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform glow-primary">
                <Dice5 className="h-5 w-5" /> Roll The Dice
              </Link>
              <Link to="/pitch" className="px-7 py-4 rounded-full bg-secondary border border-border font-bold inline-flex items-center gap-2 hover:border-primary transition-colors">
                See The Pitch <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-10 max-w-md">
              <div><p className="font-display text-3xl text-accent">$1M+</p><p className="text-[10px] text-muted-foreground tracking-widest">PROJECTED MRR</p></div>
              <div><p className="font-display text-3xl text-primary">100K</p><p className="text-[10px] text-muted-foreground tracking-widest">USER TARGET</p></div>
              <div><p className="font-display text-3xl">5</p><p className="text-[10px] text-muted-foreground tracking-widest">CORE SCREENS</p></div>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-10 bg-primary/20 blur-3xl rounded-full" />
            <img src={csLogo} alt="Cash Stage logo" className="relative mx-auto h-80 w-80 animate-float-slow" />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-border py-4 overflow-hidden bg-background">
        <div className="flex gap-12 animate-marquee whitespace-nowrap font-display text-2xl text-muted-foreground">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex gap-12 shrink-0">
              {["REAL ARTISTS.", "REAL BARS.", "REAL MONEY.", "NO BIAS.", "NO LIMITS.", "ROLL THE DICE."].map((t) => (
                <span key={t} className={t.includes("MONEY") || t.includes("DICE") ? "text-primary text-glow" : ""}>{t} ✦</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs tracking-widest text-primary font-bold">THE PLATFORM</p>
          <h2 className="font-display text-5xl md:text-7xl mt-2">BUILT FOR <span className="text-gradient-primary">SPENDING</span>, COMPETING & CREATING</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {features.map(({ Icon, title, body }, i) => (
            <div key={title} className="group p-6 rounded-2xl bg-card border border-border hover:border-primary transition-all hover:-translate-y-1" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-12 w-12 grid place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl mt-4">{title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SCREENS PREVIEW */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs tracking-widest text-accent font-bold">APP VISUALS</p>
          <h2 className="font-display text-5xl md:text-7xl mt-2">SEE THE <span className="text-gradient-gold">STAGE</span></h2>
          <p className="text-muted-foreground mt-3">Five purpose-built screens. Every interaction earns, escalates, or amplifies.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <PhoneMini label="HOME"><HomeScreen /></PhoneMini>
          <PhoneMini label="BATTLE"><BattleScreen /></PhoneMini>
          <PhoneMini label="WALLET"><WalletScreen /></PhoneMini>
        </div>
        <div className="text-center mt-10">
          <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:scale-105 transition-transform">
            Open all 5 screens <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container py-24">
        <div className="rounded-3xl border border-border bg-card p-8 md:p-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs tracking-widest text-primary font-bold">6 WEEKLY CONTEST CATEGORIES</p>
              <h3 className="font-display text-4xl mt-2">PICK YOUR LANE. <span className="text-gradient-primary">RUN IT UP.</span></h3>
            </div>
            <Zap className="h-12 w-12 text-accent" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
            {categories.map((c) => (
              <div key={c} className="aspect-square rounded-2xl border border-border bg-secondary grid place-items-center text-center hover:border-primary hover:bg-primary/5 transition-all">
                <p className="font-display text-xl">{c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="container py-24">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { Icon: Coins, title: "#1 SEATS", body: "Premium viewing, early voting, exclusive chat, more rewards." },
            { Icon: Shield, title: "SPIN TEAM PROTECTION", body: "Fair play. Zero drama. Our bots have your back." },
            { Icon: Sparkles, title: "AI ARENA", body: "Rookie to God Mode. Train against AI rappers anytime." },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="p-8 rounded-2xl border border-border bg-card relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/10 blur-3xl rounded-full" />
              <Icon className="h-10 w-10 text-primary" />
              <h4 className="font-display text-3xl mt-4">{title}</h4>
              <p className="text-sm text-muted-foreground mt-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <div className="rounded-3xl border border-primary/40 p-12 md:p-20 text-center relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, hsl(150 100% 20% / 0.5), hsl(0 0% 5%))" }}>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-60 w-60 bg-primary/30 blur-3xl rounded-full animate-pulse" />
          <h2 className="font-display text-5xl md:text-8xl text-glow relative">
            REAL ARTISTS. <br />
            <span className="text-gradient-gold">REAL BARS.</span> <br />
            REAL MONEY.
          </h2>
          <div className="flex flex-wrap gap-3 justify-center mt-10 relative">
            <Link to="/app" className="px-7 py-4 rounded-full bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform glow-primary">
              Try the App
            </Link>
            <Link to="/pitch" className="px-7 py-4 rounded-full bg-accent text-accent-foreground font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform glow-gold">
              Read the Pitch
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 mt-12">
        <div className="container flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Cash Stage · By Miss Bama Slammer</p>
          <p className="font-display tracking-widest">WHERE BARS TURN INTO BANKROLLS</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
