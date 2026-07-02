import { ShieldCheck } from "lucide-react";

/**
 * Persistent house-rules banner shown on chat + battle surfaces.
 * Cash Stage is a drama-free zone — drama only belongs in battles.
 */
const ChatRulesBanner = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={`rounded-xl border border-primary/40 bg-primary/5 ${
      compact ? "px-3 py-2" : "px-4 py-3"
    } flex items-start gap-2`}
  >
    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
    <div className="text-[11px] leading-snug">
      <p className="font-bold text-primary">Drama-free zone · 18+ to battle</p>
      <p className="text-muted-foreground">
        No racism · No diss tracks · No personal threats · Music is art. Have fun.
      </p>
    </div>
  </div>
);

export default ChatRulesBanner;
