import { ChevronLeft, Heart, Trophy, Coins, MessageCircle, Swords, UserPlus, Zap } from "lucide-react";

interface Notif {
  id: string;
  Icon: typeof Heart;
  color: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
}

const groups: { label: string; items: Notif[] }[] = [
  {
    label: "TODAY",
    items: [
      { id: "n1", Icon: Trophy, color: "text-accent bg-accent/15", title: "You won the Daily Battle", body: "+500 CSB sent to your wallet", time: "2m", unread: true },
      { id: "n2", Icon: Coins, color: "text-accent bg-accent/15", title: "Tip received", body: "Nova tipped you 50 CSB", time: "18m", unread: true },
      { id: "n3", Icon: Heart, color: "text-destructive bg-destructive/15", title: "1.2K loves on Keep Pushin", body: "Your drop is heating up 🔥", time: "1h" },
      { id: "n4", Icon: MessageCircle, color: "text-primary bg-primary/15", title: "Lil Prophet replied", body: "\"Let's run it 💯\"", time: "1h" },
    ],
  },
  {
    label: "YESTERDAY",
    items: [
      { id: "n5", Icon: Swords, color: "text-primary bg-primary/15", title: "Mic Killa challenged you", body: "Anonymous battle · 1,000 CSB pool", time: "1d" },
      { id: "n6", Icon: UserPlus, color: "text-battle-blue bg-battle-blue/15", title: "BeatKing followed you", body: "Tap to follow back", time: "1d" },
      { id: "n7", Icon: Zap, color: "text-primary bg-primary/15", title: "Boost ended", body: "Night Bars reached 8.4K plays", time: "2d" },
    ],
  },
];

export interface NotificationsScreenProps {
  onBack?: () => void;
  onClearAll?: () => void;
}

const NotificationsScreen = ({ onBack, onClearAll }: NotificationsScreenProps = {}) => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <button onClick={onBack} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <p className="font-display tracking-widest text-sm">NOTIFICATIONS</p>
      <button onClick={onClearAll} className="text-[10px] text-primary font-bold">Clear</button>
    </div>

    <div className="flex gap-2 px-3 mt-1 overflow-x-auto scrollbar-hide">
      {["All", "Battles", "Tips", "Social", "System"].map((t, i) => (
        <button
          key={t}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold ${
            i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {t}
        </button>
      ))}
    </div>

    <div className="mt-3 space-y-4">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-4 text-[10px] text-muted-foreground tracking-widest mb-1.5">{g.label}</p>
          <div className="mx-3 space-y-1.5">
            {g.items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-2.5 rounded-xl ${n.unread ? "bg-card border border-primary/20" : "bg-secondary"}`}
              >
                <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${n.color}`}>
                  <n.Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-tight">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] text-muted-foreground">{n.time}</span>
                  {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default NotificationsScreen;
