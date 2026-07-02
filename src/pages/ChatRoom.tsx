import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Send, Hash, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ChatRulesBanner from "@/components/ChatRulesBanner";

type Room = { id: string; kind: "public"|"crew"|"artist_public"|"artist_private"; title: string; crew_id: string | null; owner_id?: string | null };
type Msg = {
  id: string; room_id: string; author_id: string; body: string; created_at: string;
  profile?: { artist_name: string };
};

const ChatRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadRoom = async () => {
    if (!roomId) return;
    const { data: r } = await supabase.from("chatrooms").select("*").eq("id", roomId).maybeSingle();
    setRoom(r as Room);
    const { data: m } = await supabase
      .from("chat_messages")
      .select("id, room_id, author_id, body, created_at, profiles(artist_name)")
      .eq("room_id", roomId).order("created_at", { ascending: true }).limit(200);
    setMessages((m ?? []) as any);
  };

  useEffect(() => {
    loadRoom();
    if (!roomId) return;
    const ch = supabase.channel(`room-${roomId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const m = payload.new as any;
          const { data: p } = await supabase.from("profiles").select("artist_name").eq("id", m.author_id).maybeSingle();
          setMessages(prev => [...prev, { ...m, profile: p ?? undefined }]);
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => setMessages(prev => prev.filter(x => x.id !== (payload.old as any).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    if (!user || !roomId || !input.trim()) return;
    setSending(true);
    const body = input.trim().slice(0, 1000);
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId, author_id: user.id, body,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setInput("");
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/chat" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            {room?.kind === "crew" ? <Lock className="h-4 w-4 text-primary" /> : <Hash className="h-4 w-4" />}
            <p className="font-display text-lg">{room?.title ?? "…"}</p>
          </div>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 max-w-2xl mx-auto w-full space-y-2">
        <ChatRulesBanner compact />
        {messages.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Be the first to say something.</p>}
        {messages.map(m => {
          const mine = m.author_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {!mine && <p className="text-[10px] font-bold opacity-70 mb-0.5">{m.profile?.artist_name ?? "anon"}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-[9px] opacity-50 mt-0.5">{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</p>
              </div>
              {mine && (
                <button onClick={() => del(m.id)} className="opacity-0 group-hover:opacity-100 px-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder={user ? "Say something…" : "Sign in to chat"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            disabled={!user || sending}
            maxLength={1000}
          />
          <Button onClick={send} disabled={!user || sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
