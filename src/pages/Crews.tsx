import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Users, Plus, Crown, Shield, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Crew = {
  id: string; name: string; tag: string; leader_id: string;
  description: string | null; member_count?: number;
};
type Member = { id: string; user_id: string; role: "leader"|"admin"|"member"; profile?: { artist_name: string } };

const Crews = () => {
  const { user } = useAuth();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [myCrew, setMyCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", description: "" });

  const load = async () => {
    setLoading(true);
    const { data: all } = await supabase.from("crews").select("*").order("created_at", { ascending: false });
    const { data: counts } = await supabase.from("crew_members").select("crew_id");
    const countMap = new Map<string, number>();
    (counts ?? []).forEach((c: any) => countMap.set(c.crew_id, (countMap.get(c.crew_id) ?? 0) + 1));
    setCrews((all ?? []).map((c: any) => ({ ...c, member_count: countMap.get(c.id) ?? 0 })));

    if (user) {
      const { data: mine } = await supabase
        .from("crew_members").select("crew_id, crews(*)")
        .eq("user_id", user.id).maybeSingle();
      if (mine?.crews) {
        setMyCrew(mine.crews as Crew);
        const { data: ms } = await supabase
          .from("crew_members")
          .select("id, user_id, role, profiles(artist_name)")
          .eq("crew_id", (mine.crews as any).id).order("joined_at");
        setMembers((ms ?? []) as any);
      } else {
        setMyCrew(null); setMembers([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const createCrew = async () => {
    if (!user) return;
    if (!form.name.trim() || form.tag.length < 2) { toast.error("Name and tag (2-8 chars) required"); return; }
    setCreating(true);
    const { error } = await supabase.from("crews").insert({
      name: form.name.trim(),
      tag: form.tag.trim().toUpperCase(),
      leader_id: user.id,
      description: form.description.trim() || null,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Crew created — chatroom ready");
    setOpen(false); setForm({ name: "", tag: "", description: "" });
    load();
  };

  const joinCrew = async (crewId: string) => {
    if (!user) return;
    const { error } = await supabase.from("crew_members").insert({
      crew_id: crewId, user_id: user.id, role: "member",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Joined the crew");
    load();
  };

  const leaveCrew = async () => {
    if (!user || !myCrew) return;
    const { error } = await supabase.from("crew_members").delete()
      .eq("user_id", user.id).eq("crew_id", myCrew.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Left the crew");
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Crews</p>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* My crew */}
        {myCrew ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-primary tracking-widest">YOUR CREW</p>
                <p className="font-display text-xl">{myCrew.name} <span className="text-muted-foreground text-sm">[{myCrew.tag}]</span></p>
              </div>
              <Link to={`/crews/${myCrew.id}/chat`}>
                <Button size="sm">Open Chat</Button>
              </Link>
            </div>
            {myCrew.description && <p className="text-sm text-muted-foreground mt-2">{myCrew.description}</p>}
            <p className="text-[10px] text-muted-foreground mt-3 tracking-widest">MEMBERS ({members.length}/20)</p>
            <div className="space-y-1 mt-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  {m.role === "leader" ? <Crown className="h-3 w-3 text-accent" />
                    : m.role === "admin" ? <Shield className="h-3 w-3 text-primary" />
                    : <span className="w-3" />}
                  <span className="flex-1 truncate">{m.profile?.artist_name ?? m.user_id.slice(0,8)}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{m.role}</span>
                </div>
              ))}
            </div>
            {myCrew.leader_id !== user?.id && (
              <Button size="sm" variant="ghost" className="mt-3 w-full" onClick={leaveCrew}>
                <LogOut className="h-3 w-3 mr-1" /> Leave Crew
              </Button>
            )}
          </div>
        ) : user ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full"><Plus className="h-4 w-4 mr-1" /> Start a Crew</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create your crew</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Crew name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} maxLength={50} />
                <Input placeholder="Tag (2-8 chars)" value={form.tag} onChange={e => setForm({...form, tag: e.target.value.toUpperCase()})} maxLength={8} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} maxLength={300} />
              </div>
              <DialogFooter>
                <Button onClick={createCrew} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Crew"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}

        {/* Browse crews */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest px-1 mb-2">ALL CREWS</p>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading…</p>
          ) : crews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No crews yet — start one!</p>
          ) : (
            <div className="space-y-2">
              {crews.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="h-10 w-10 rounded-lg grid place-items-center bg-secondary font-display text-sm">{c.tag}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {c.member_count ?? 0}/20
                    </p>
                  </div>
                  {!myCrew && user && (c.member_count ?? 0) < 20 && (
                    <Button size="sm" variant="outline" onClick={() => joinCrew(c.id)}>Join</Button>
                  )}
                  {myCrew?.id === c.id && (
                    <Link to={`/crews/${c.id}/chat`}>
                      <Button size="sm">Open Chat</Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Crews;
