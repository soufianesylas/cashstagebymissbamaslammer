import { Menu, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const txs = [
  { label: "Won Battle", time: "Today", amt: "+500 CSB", up: true },
  { label: "Solo Drop Play", time: "Today", amt: "+75 CSB", up: true },
  { label: "Collab Earnings", time: "Yesterday", amt: "+320 CSB", up: true },
  { label: "Entry Fee", time: "Yesterday", amt: "-50 CSB", up: false },
  { label: "Boost Track", time: "2 days ago", amt: "-20 CSB", up: false },
];

const WalletScreen = () => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <button className="h-9 w-9 grid place-items-center rounded-full bg-secondary"><Menu className="h-5 w-5" /></button>
      <p className="font-display tracking-widest text-sm">WALLET</p>
      <div className="h-9 w-9" />
    </div>

    <div className="mx-3 mt-2 p-5 rounded-2xl text-center relative overflow-hidden border border-border" style={{ background: "radial-gradient(ellipse at top, hsl(45 100% 25% / 0.4), hsl(0 0% 6%) 70%)" }}>
      <p className="text-[10px] text-muted-foreground tracking-widest">BALANCE</p>
      <p className="font-display text-5xl text-accent text-glow-gold mt-1 animate-[count-up_0.6s_ease-out]">2,450 <span className="text-2xl text-muted-foreground">CSB</span></p>
      <p className="text-[10px] text-primary mt-1 font-semibold">+875 today</p>
    </div>

    <div className="grid grid-cols-2 gap-3 mx-3 mt-3">
      <button className="py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
        <ArrowDownToLine className="h-4 w-4" /> Deposit
      </button>
      <button className="py-3 rounded-xl bg-secondary border border-border font-bold text-sm flex items-center justify-center gap-2">
        <ArrowUpFromLine className="h-4 w-4" /> Withdraw
      </button>
    </div>

    <div className="grid grid-cols-2 gap-2 mx-3 mt-4 border-b border-border">
      <button className="py-2 text-xs font-bold border-b-2 border-primary text-foreground">Transactions</button>
      <button className="py-2 text-xs font-bold text-muted-foreground">Earnings</button>
    </div>

    <div className="mx-3 mt-2 divide-y divide-border">
      {txs.map((t, i) => (
        <div key={i} className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full grid place-items-center ${t.up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
              {t.up ? "↑" : "↓"}
            </div>
            <div>
              <p className="text-xs font-semibold">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.time}</p>
            </div>
          </div>
          <p className={`text-sm font-bold ${t.up ? "text-primary" : "text-destructive"}`}>{t.amt}</p>
        </div>
      ))}
    </div>
  </div>
);

export default WalletScreen;
