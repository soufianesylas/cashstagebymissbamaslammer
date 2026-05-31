import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import PhoneTabBar from "@/components/phone/PhoneTabBar";
import HomeScreen from "@/components/phone/HomeScreen";
import BattleScreen from "@/components/phone/BattleScreen";
import SoloDropScreen from "@/components/phone/SoloDropScreen";
import CollabScreen from "@/components/phone/CollabScreen";
import WalletScreen from "@/components/phone/WalletScreen";
import LeaderboardScreen from "@/components/phone/LeaderboardScreen";
import ChatScreen from "@/components/phone/ChatScreen";
import ProfileScreen from "@/components/phone/ProfileScreen";
import NotificationsScreen from "@/components/phone/NotificationsScreen";
import BattleLobbyScreen from "@/components/phone/BattleLobbyScreen";
import BattleResultsScreen from "@/components/phone/BattleResultsScreen";
import OnboardingScreen from "@/components/phone/OnboardingScreen";

type Tab = "home" | "battles" | "studio" | "collab" | "wallet";

const screens: { id: Tab; label: string; sub: string; Comp: () => JSX.Element }[] = [
  { id: "home", label: "Home", sub: "Roll the Dice", Comp: HomeScreen },
  { id: "battles", label: "Battle", sub: "Anonymous · Real money", Comp: BattleScreen },
  { id: "studio", label: "Solo Drop", sub: "Heat meter & tips", Comp: SoloDropScreen },
  { id: "collab", label: "Collab", sub: "Splits & invites", Comp: CollabScreen },
  { id: "wallet", label: "Wallet", sub: "CSB economy", Comp: WalletScreen },
];

const Phone = ({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) => {
  const Comp = screens.find((s) => s.id === tab)!.Comp;
  return (
    <div className="phone-frame w-full max-w-[300px] mx-auto">
      <Comp />
      <PhoneTabBar active={tab} onChange={onTab} />
    </div>
  );
};

const AppMockup = () => {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen pt-24 pb-20 stage-bg">
      <SiteNav />
      <div className="container">
        <div className="text-center max-w-2xl mx-auto animate-fade-in">
          <p className="text-xs tracking-widest text-primary font-bold">APP MOCKUP</p>
          <h1 className="font-display text-5xl md:text-7xl mt-2">
            FIVE SCREENS. <span className="text-gradient-primary">ONE ECONOMY.</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">
            Tap any screen below to load it on the phone. Every interaction pushes one of three things: spend, compete, create.
          </p>
        </div>

        {/* Hero phone */}
        <div className="mt-12 grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          <div className="space-y-3 order-2 lg:order-1">
            {screens.map((s) => (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  tab === s.id ? "bg-primary/10 border-primary glow-primary" : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <p className="font-display text-2xl">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </button>
            ))}
          </div>

          <div className="order-1 lg:order-2 animate-scale-in">
            <Phone tab={tab} onTab={setTab} />
          </div>

          <div className="order-3 space-y-3">
            <div className="p-4 rounded-2xl bg-card border border-border">
              <p className="font-display text-xl text-accent">UX RULE</p>
              <p className="text-xs text-muted-foreground mt-1">
                Every screen pushes one of: <span className="text-primary font-bold">spend</span>, <span className="text-accent font-bold">compete</span>, <span className="text-foreground font-bold">create</span>.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border">
              <p className="font-display text-xl">ANTI-CHEAT</p>
              <p className="text-xs text-muted-foreground mt-1">After voting, the screen locks. Spin team protection. Real, fair payouts.</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border">
              <p className="font-display text-xl text-primary">LIVE STAGE</p>
              <p className="text-xs text-muted-foreground mt-1">Animated spotlights, pulsing votes, glowing heat meters — the stage is always on.</p>
            </div>
          </div>
        </div>

        {/* All five at once */}
        <h2 className="font-display text-3xl md:text-5xl text-center mt-24">ALL FIVE SCREENS</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
          {screens.map((s) => {
            const Comp = s.Comp;
            return (
              <div key={s.id} className="space-y-2">
                <div className="phone-frame">
                  <Comp />
                  <PhoneTabBar active={s.id} onChange={() => {}} />
                </div>
                <p className="text-center text-xs text-muted-foreground tracking-widest font-bold">{s.label.toUpperCase()}</p>
              </div>
            );
          })}
        </div>

        {/* Deep screens — accessible from inside the app */}
        <div className="text-center max-w-2xl mx-auto mt-24">
          <p className="text-xs tracking-widest text-accent font-bold">DEEP SCREENS</p>
          <h2 className="font-display text-3xl md:text-5xl mt-2">
            BEYOND THE TAB BAR. <span className="text-gradient-primary">THE FULL APP.</span>
          </h2>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">
            Leaderboard, DMs, profile, notifications — every surface a creator touches between battles.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { id: "leaderboard", label: "Leaderboard", Comp: LeaderboardScreen },
            { id: "chat", label: "DMs", Comp: ChatScreen },
            { id: "profile", label: "Profile", Comp: ProfileScreen },
            { id: "notifications", label: "Notifications", Comp: NotificationsScreen },
          ].map((s) => {
            const Comp = s.Comp;
            return (
              <div key={s.id} className="space-y-2">
                <div className="phone-frame">
                  <Comp />
                </div>
                <p className="text-center text-xs text-muted-foreground tracking-widest font-bold">{s.label.toUpperCase()}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AppMockup;
