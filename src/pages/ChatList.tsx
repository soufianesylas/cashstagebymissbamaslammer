import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Hash, Lock, MessageCircle, Plus, Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ChatRulesBanner from "@/components/ChatRulesBanner";

type RoomKind = "public" | "crew" | "artist_public" | "artist_private";
type Room = {
  id: string;
  kind: RoomKind;
  title: string;
  crew_id: string | null;
  owner_id: string | null;
};

const ChatList = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [crewRoomId, setCrewRoomId] = useState<string | null>(null);
  const [memberRoomIds, setMemberRoomIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"artist_public" | "artist_private">("artist_public");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("chatrooms")
      .select("id, kind, title, crew_id, owner_id")
      .order("kind")
      .order("title");
    setRooms((data ?? []) as Room[]);
    if (user) {
      const { data: cm } = await supabase.from("crew_members").select("crew_id").eq("user_id", user.id).maybeSingle();
      if (cm?.crew_id) {
        const { data: cr } = await supabase.from("chatrooms").select("id").eq("crew_id", cm.crew_id).maybeSingle();
        setCrewRoomId(cr?.id ?? null);
      }
      const { data: mm } = await supabase.from("room_members").select("room_id").eq("user_id", user.id);
      setMemberRoomIds(new Set((mm ?? []).map((m: any) => m.room_id)));
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const myPublicCount = rooms.filter(r => r.kind === "artist_public" && r.owner_id === user?.id).length;
  const myPrivateCount = rooms.filter(r => r.kind === "artist_private" && r.owner_id === user?.id).length;

  const create = async () => {
    if (!user) return;
    const clean = title.trim().slice(0, 60);
    if (!clean) return toast.error("Give the room a name");
    setSaving(true);
    const { error } = await supabase.from("chatrooms").insert({
      kind, title: clean, owner_id: user.id, crew_id: null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Room created");
    setTitle("");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this room? It counts against your permanent cap either way.")) return;
    const { error } = await supabase.from("chatrooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const publics = rooms.filter(r => r.kind === "public");
  const artistPublic = rooms.filter(r => r.kind === "artist_public");
  const artistPrivateVisible = rooms.filter(
    r => r.kind === "artist_private" && (r.owner_id === user?.id || memberRoomIds.has(r.id))
  );
  const myCrewRoom = rooms.find(r => r.id === crewRoomId);

  const RoomRow = ({ r, icon, sub }: { r: Room; icon: JSX.Element; sub: string }) => (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Link to={`/chat/${r.id}`} className="flex-1 flex items-center gap-3 min-w-0">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{r.title}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
      </Link>
      {r.owner_id === user?.id && (
        <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete room">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Chat</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="h-9 w-9 grid place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Create room">
                <Plus className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="room-title">Room name</Label>
                  <Input id="room-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} placeholder="e.g. Late Night Studio" />
                </div>
                <RadioGroup value={kind} onValueChange={v => setKind(v as any)}>
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="artist_public" id="k-pub" className="mt-1" />
                    <label htmlFor="k-pub" className="flex-1 cursor-pointer">
                      <p className="font-bold text-sm">Public room</p>
                      <p className="text-[11px] text-muted-foreground">Anyone signed in can join. You have {myPublicCount}/3 used.</p>
                    </label>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="artist_private" id="k-prv" className="mt-1" />
                    <label htmlFor="k-prv" className="flex-1 cursor-pointer">
                      <p className="font-bold text-sm">Private room</p>
                      <p className="text-[11px] text-muted-foreground">Invite-only. You have {myPrivateCount}/2 used.</p>
                    </label>
                  </div>
                </RadioGroup>
                <p className="text-[10px] text-accent">⚠ These caps are permanent. Deleting a room does not free the slot.</p>
                <Button
                  className="w-full"
                  onClick={create}
                  disabled={
                    saving ||
                    (kind === "artist_public" && myPublicCount >= 3) ||
                    (kind === "artist_private" && myPrivateCount >= 2)
                  }
                >
                  Create room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <ChatRulesBanner />

        {myCrewRoom && (
          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest mb-2">YOUR CREW</p>
            <RoomRow r={myCrewRoom} icon={<Lock className="h-5 w-5 text-primary" />} sub="Private · crew members only" />
          </div>
        )}

        {artistPrivateVisible.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest mb-2">PRIVATE ROOMS</p>
            <div className="space-y-2">
              {artistPrivateVisible.map(r => (
                <RoomRow key={r.id} r={r} icon={<Lock className="h-5 w-5 text-accent" />} sub={r.owner_id === user?.id ? "Yours · invite-only" : "Invited"} />
              ))}
            </div>
          </div>
        )}

        {artistPublic.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest mb-2">ARTIST ROOMS</p>
            <div className="space-y-2">
              {artistPublic.map(r => (
                <RoomRow key={r.id} r={r} icon={<Users className="h-5 w-5 text-primary" />} sub={r.owner_id === user?.id ? "Yours · public" : "Open to everyone"} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest mb-2">HOUSE ROOMS</p>
          <div className="space-y-2">
            {publics.map(r => (
              <RoomRow key={r.id} r={r} icon={<Hash className="h-5 w-5 text-muted-foreground" />} sub="Open to everyone" />
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground pt-2">
          Drama belongs in battles 🥊 — keep chat creative.
        </p>
      </div>
    </div>
  );
};

export default ChatList;
