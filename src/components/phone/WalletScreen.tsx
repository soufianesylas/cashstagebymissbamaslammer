import { Menu, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export interface WalletTx {
  id: string;
  label: string;
  time: string;
  amt: string;
  up: boolean;
}

export interface WalletScreenProps {
  csbBalance?: number;
  todayDelta?: number;
  payPalConnected?: boolean;
  stripeConnected?: boolean;
  activeTab?: "tx" | "earnings";
  txs?: WalletTx[];
  onMenu?: () => void;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onConnectPayPal?: () => void;
  onConnectStripe?: () => void;
  onTabChange?: (t: "tx" | "earnings") => void;
}

const defaultTxs: WalletTx[] = [
  { id: "1", label: "Won Battle", time: "Today", amt: "+500 CSB", up: true },
  { id: "2", label: "Solo Drop Play", time: "Today", amt: "+75 CSB", up: true },
  { id: "3", label: "Collab Earnings", time: "Yesterday", amt: "+320 CSB", up: true },
  { id: "4", label: "Entry Fee", time: "Yesterday", amt: "-50 CSB", up: false },
  { id: "5", label: "Boost Track", time: "2 days ago", amt: "-20 CSB", up: false },
];

const WalletScreen = ({
  csbBalance = 2450,
  todayDelta = 875,
  payPalConnected = true,
  stripeConnected = false,
  activeTab = "tx",
  txs = defaultTxs,
  onMenu,
  onDeposit,
  onWithdraw,
  onConnectPayPal,
  onConnectStripe,
  onTabChange,
}: WalletScreenProps = {}) => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <button onClick={onMenu} aria-label="Menu" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
        <Menu className="h-5 w-5" />
      </button>
      <p className="font-display tracking-widest text-sm">WALLET</p>
      <div className="h-9 w-9" />
    </div>

    <div className="mx-3 mt-2 p-5 rounded-2xl text-center relative overflow-hidden border border-border" style={{ background: "radial-gradient(ellipse at top, hsl(45 100% 25% / 0.4), hsl(0 0% 6%) 70%)" }}>
      <p className="text-[10px] text-muted-foreground tracking-widest">BALANCE</p>
      <p className="font-display text-5xl text-accent text-glow-gold mt-1 animate-[count-up_0.6s_ease-out]">
        {csbBalance.toLocaleString()} <span className="text-2xl text-muted-foreground">CSB</span>
      </p>
      {todayDelta !== 0 && (
        <p className={`text-[10px] mt-1 font-semibold ${todayDelta > 0 ? "text-primary" : "text-destructive"}`}>
          {todayDelta > 0 ? "+" : ""}{todayDelta.toLocaleString()} today
        </p>
      )}
    </div>

    <div className="grid grid-cols-2 gap-3 mx-3 mt-3">
      <button
        onClick={onDeposit}
        className="py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <ArrowDownToLine className="h-4 w-4" /> Deposit
      </button>
      <button
        onClick={onWithdraw}
        className="py-3 rounded-xl bg-secondary border border-border font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <ArrowUpFromLine className="h-4 w-4" /> Withdraw
      </button>
    </div>

    {/* Payment methods */}
    <p className="px-4 mt-4 text-[10px] text-muted-foreground tracking-widest">PAYMENT METHODS</p>
    <div className="grid grid-cols-2 gap-3 mx-3 mt-2">
      <button
        onClick={onConnectPayPal}
        className="py-3 rounded-xl bg-card border border-border font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <span className="text-[#003087]">Pay</span><span className="text-[#009cde]">Pal</span>
        <span className={`ml-auto text-[10px] ${payPalConnected ? "text-primary" : "text-muted-foreground"}`}>
          {payPalConnected ? "●" : "○"}
        </span>
      </button>
      <button
        onClick={onConnectStripe}
        className="py-3 rounded-xl bg-card border border-border font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <span className="text-[#635bff]">stripe</span>
        <span className={`ml-auto text-[10px] ${stripeConnected ? "text-primary" : "text-muted-foreground"}`}>
          {stripeConnected ? "●" : "○"}
        </span>
      </button>
    </div>

    <div className="grid grid-cols-2 gap-2 mx-3 mt-4 border-b border-border">
      <button
        onClick={() => onTabChange?.("tx")}
        className={`py-2 text-xs font-bold border-b-2 transition-colors ${
          activeTab === "tx" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
        }`}
      >
        Transactions
      </button>
      <button
        onClick={() => onTabChange?.("earnings")}
        className={`py-2 text-xs font-bold border-b-2 transition-colors ${
          activeTab === "earnings" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
        }`}
      >
        Earnings
      </button>
    </div>

    <div className="mx-3 mt-2 divide-y divide-border">
      {txs.length === 0 ? (
        <p className="text-center text-[11px] text-muted-foreground py-6">No activity yet.</p>
      ) : (
        txs.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2.5">
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
        ))
      )}
    </div>
  </div>
);

export default WalletScreen;
