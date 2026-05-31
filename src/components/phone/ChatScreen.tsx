import { ChevronLeft, Send, Mic, Smile, Plus, ShieldCheck } from "lucide-react";
import rapperRed from "@/assets/rapper-red.jpg";
import rapperBlue from "@/assets/rapper-blue.jpg";

interface Msg {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  voice?: boolean;
  seconds?: number;
}

const defaultMsgs: Msg[] = [
  { id: "m1", from: "them", text: "Yo bro, you up for a collab tonight?", time: "9:18" },
  { id: "m2", from: "me", text: "Already in studio. Send me the beat 🔥", time: "9:19" },
  { id: "m3", from: "them", text: "", time: "9:20", voice: true, seconds: 14 },
  { id: "m4", from: "me", text: "That hook is crazy. Recording now.", time: "9:21" },
  { id: "m5", from: "them", text: "Bet. 50/50 split?", time: "9:22" },
  { id: "m6", from: "me", text: "Let's run it 💯", time: "9:22" },
];

export interface ChatScreenProps {
  msgs?: Msg[];
  onBack?: () => void;
}

const Bubble = ({ m }: { m: Msg }) => {
  const me = m.from === "me";
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"} px-3`}>
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${me ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
        {m.voice ? (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Mic className="h-3.5 w-3.5" />
            <div className="flex items-end gap-0.5 h-4">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className="w-0.5 rounded-full bg-current opacity-70" style={{ height: `${30 + Math.sin(i * 0.7) * 40 + 30}%` }} />
              ))}
            </div>
            <span className="text-[10px] opacity-80">0:{String(m.seconds).padStart(2, "0")}</span>
          </div>
        ) : (
          <p className="text-xs leading-snug">{m.text}</p>
        )}
        <p className={`text-[9px] mt-0.5 ${me ? "text-primary-foreground/70" : "text-muted-foreground"} text-right`}>{m.time}</p>
      </div>
    </div>
  );
};

const ChatScreen = ({ msgs = defaultMsgs, onBack }: ChatScreenProps = {}) => (
  <div className="h-full flex flex-col bg-background">
    <div className="flex items-center gap-3 px-3 pt-4 pb-3 border-b border-border">
      <button onClick={onBack} aria-label="Back" className="h-8 w-8 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="relative">
        <img src={rapperBlue} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">Lil Prophet</p>
        <p className="text-[10px] text-primary">● online</p>
      </div>
      <img src={rapperRed} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-background -ml-3" loading="lazy" />
    </div>

    <div className="flex-1 overflow-y-auto scrollbar-hide py-3 space-y-2">
      <p className="text-center text-[9px] text-muted-foreground tracking-widest">TODAY</p>
      {msgs.map((m) => <Bubble key={m.id} m={m} />)}
      <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground py-1">
        <ShieldCheck className="h-3 w-3 text-primary" />
        End-to-end encrypted
      </div>
    </div>

    <div className="px-3 pt-2 pb-24 flex items-center gap-2 border-t border-border bg-background">
      <button aria-label="Attach" className="h-9 w-9 grid place-items-center rounded-full bg-secondary shrink-0">
        <Plus className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-full bg-secondary">
        <input className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" placeholder="Message…" readOnly />
        <Smile className="h-4 w-4 text-muted-foreground" />
      </div>
      <button aria-label="Send" className="h-9 w-9 grid place-items-center rounded-full bg-primary text-primary-foreground shrink-0">
        <Send className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default ChatScreen;
