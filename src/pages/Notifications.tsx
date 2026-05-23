import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Music, MessageCircle, Loader2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Item = { id: string; icon: "score" | "play" | "chat"; title: string; sub: string; time: string };

const lastSeenKey = (uid: string) => `cs.notifLastSeen.${uid}`;

const rel = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // 1) Scores received on the user's tracks
      const { data: myTracks } = await supabase.from("tracks").select("id, title").eq("user_id", user.id);
      const trackMap = new Map((myTracks ?? []).map((t) => [t.id as string, t.title as string]));
      const trackIds = Array.from(trackMap.keys());
      const list: Item[] = [];

      if (trackIds.length) {
        // track_scores RLS only lets judges see own; owners cannot read scores directly.
        // Use aggregate tallies (RPC) for "X new votes" notifications instead.
        const { data: tallies } = await supabase.rpc("anonymous_track_score_tallies" as any);
        (tallies ?? []).forEach((row: any) => {
          if (!trackMap.has(row.track_id)) return;
          const title = trackMap.get(row.track_id);
          list.push({
            id: `score-${row.track_id}`,
            icon: "score",
            title: `${row.score_count} anonymous vote${row.score_count === 1 ? "" : "s"} on "${title}"`,
            sub: `Avg ${Number(row.average_score).toFixed(1)}/10 · ${row.feature_worthy_count} marked feature-worthy`,
            time: "",
          });
        });
      }

      // 2) Recent chat activity in public rooms
      const { data: recentChats } = await supabase
        .from("chat_messages")
        .select("id, room_id, body, created_at, chatrooms!inner(title, kind)")
        .order("created_at", { ascending: false })
        .limit(5);
      (recentChats ?? []).forEach((m: any) => {
        list.push({
          id: `chat-${m.id}`,
          icon: "chat",
          title: `New message in ${m.chatrooms.title}`,
          sub: String(m.body).slice(0, 80),
          time: rel(m.created_at),
        });
      });

      // 3) Newly featured tracks
      const { data: feats } = await supabase
        .from("tracks")
        .select("id, title, updated_at")
        .eq("is_featured", true)
        .eq("is_hidden", false)
        .order("updated_at", { ascending: false })
        .limit(5);
      (feats ?? []).forEach((t) => {
        list.push({
          id: `feat-${t.id}`,
          icon: "play",
          title: `⭐ "${t.title}" was featured`,
          sub: "Check it out on the trending feed",
          time: rel(t.updated_at as string),
        });
      });

      setItems(list);
      localStorage.setItem(lastSeenKey(user.id), new Date().toISOString());
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 px-3 py-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="font-display text-lg flex-1">Notifications</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
        {loading && <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        {!loading && items.length === 0 && (
          <div className="text-center pt-16 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">You're all caught up.</p>
          </div>
        )}
        {items.map((n) => {
          const Icon = n.icon === "score" ? Star : n.icon === "chat" ? MessageCircle : Music;
          const onClick = n.icon === "chat" ? () => navigate("/chat") : undefined;
          return (
            <button key={n.id} onClick={onClick} className="w-full text-left flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:bg-secondary/40 transition-colors">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0"><Icon className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.sub}</p>
              </div>
              {n.time && <p className="text-[10px] text-muted-foreground shrink-0">{n.time}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
