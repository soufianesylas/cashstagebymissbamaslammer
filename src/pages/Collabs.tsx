import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Users2, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import AudioPlayer from "@/components/AudioPlayer";
import { ChatRulesBanner } from "@/components/ChatRulesBanner";

interface Collab {
  id: string;
  title: string;
  genre: string | null;
  owner_id: string;
  beat_track_id: string | null;
  max_members: number;
  is_open: boolean;
  created_at: string;
}
interface Track { id: string; title: string; audio_url: string | null }

const GENRES = ["Hip-Hop","Trap","R&B","Pop","Drill","Afrobeat","Country","Rock","Latin","Other"];

export default function Collabs() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [members, setMembers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string>("Hip-Hop");
  const [beatId, setBeatId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: t }, { data: m }] = await Promise.all([
      (supabase.from("collabs" as any).select("*").order("created_at", { ascending: false }).limit(50)),
      user ? supabase.from("tracks").select("id,title,audio_url").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] as Track[] }),
      (supabase.from("collab_members" as any).select("collab_id")),
    ]);
    setCollabs((c as any) ?? []);
    setMyTracks((t as any) ?? []);
    const counts: Record<string, number> = {};
    ((m as any) ?? []).forEach((r: any) => { counts[r.collab_id] = (counts[r.collab_id] ?? 0) + 1; });
    setMembers(counts);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const create = async () => {
    if (!user) return toast.error("Sign in first");
    if (!title.trim()) return toast.error("Title required");
    setCreating(true);
    const { data, error } = await (supabase.from("collabs" as any).insert({
      owner_id: user.id,
      title: title.trim(),
      genre,
      beat_track_id: beatId || null,
    }).select("id").single());
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Collab started");
    setOpen(false); setTitle(""); setBeatId("");
    // navigate straight into the collab chat
    const { data: room } = await supabase.from("chatrooms").select("id").eq("collab_id", (data as any).id).maybeSingle();
    if (room?.id) nav(`/chat/${room.id}`);
    else load();
  };

  const join = async (c: Collab) => {
    if (!user) return toast.error("Sign in first");
    const { error } = await (supabase.from("collab_members" as any).insert({ collab_id: c.id, user_id: user.id }));
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    const { data: room } = await supabase.from("chatrooms").select("id").eq("collab_id", c.id).maybeSingle();
    if (room?.id) nav(`/chat/${room.id}`);
  };

  const beatUrl = (id: string | null) => myTracks.find(t => t.id === id)?.audio_url ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEO title="Collabs & Cyphers — Cash Stage" description="Start a collab, share a beat, and chat with your team." path="/collabs" />
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary"><ChevronLeft className="h-5 w-5" /></Link>
          <p className="font-display text-lg">Collabs</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Start a collab</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Collab title" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} />
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger><SelectValue placeholder="Genre" /></SelectTrigger>
                  <SelectContent>{GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Attach a beat (optional)</p>
                  <Select value={beatId} onValueChange={setBeatId}>
                    <SelectTrigger><SelectValue placeholder={myTracks.length ? "Pick from your uploads" : "No uploads yet"} /></SelectTrigger>
                    <SelectContent>
                      {myTracks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={create} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create & open chat
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        <ChatRulesBanner />
        {loading && <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>}
        {!loading && collabs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">No collabs yet — start the first one.</p>
        )}
        {collabs.map(c => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.genre ?? "Any genre"} · <Users2 className="inline h-3 w-3" /> {members[c.id] ?? 0}/{c.max_members}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => join(c)} className="gap-1">
                  <MessageCircle className="h-4 w-4" /> Chat
                </Button>
              </div>
            </div>
            {c.beat_track_id && beatUrl(c.beat_track_id) && (
              <AudioPlayer src={beatUrl(c.beat_track_id)!} compact />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
