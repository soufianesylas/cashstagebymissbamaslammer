import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Hash, Lock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Room = { id: string; kind: "public"|"crew"; title: string; crew_id: string | null };

const ChatList = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [crewRoomId, setCrewRoomId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("chatrooms").select("*").order("kind").order("title");
      setRooms((data ?? []) as Room[]);
      if (user) {
        const { data: cm } = await supabase.from("crew_members").select("crew_id").eq("user_id", user.id).maybeSingle();
        if (cm?.crew_id) {
          const { data: cr } = await supabase.from("chatrooms").select("id").eq("crew_id", cm.crew_id).maybeSingle();
          setCrewRoomId(cr?.id ?? null);
        }
      }
    })();
  }, [user?.id]);

  const publics = rooms.filter(r => r.kind === "public");
  const myCrewRoom = rooms.find(r => r.id === crewRoomId);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Chat</p>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {myCrewRoom && (
          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest mb-2">YOUR CREW</p>
            <Link to={`/chat/${myCrewRoom.id}`} className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <Lock className="h-5 w-5 text-primary" />
              <div className="flex-1"><p className="font-bold">{myCrewRoom.title}</p>
                <p className="text-[10px] text-muted-foreground">Private · members only</p></div>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest mb-2">PUBLIC ROOMS</p>
          <div className="space-y-2">
            {publics.map(r => (
              <Link key={r.id} to={`/chat/${r.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1"><p className="font-bold">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">Open to everyone</p></div>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground pt-2">
          Drama belongs in battles 🥊 — keep public rooms creative.
        </p>
      </div>
    </div>
  );
};

export default ChatList;
