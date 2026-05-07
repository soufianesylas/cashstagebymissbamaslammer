import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, EyeOff, Eye, Loader2 } from "lucide-react";

interface Report {
  id: string;
  track_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
}

const Moderation = () => {
  const { user } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [tracks, setTracks] = useState<Record<string, { title: string; is_hidden: boolean; user_id: string }>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const staff = (roles ?? []).some((r) => r.role === "admin" || r.role === "moderator");
    setIsStaff(staff);
    if (!staff) { setLoading(false); return; }
    const { data: rep } = await (supabase as any)
      .from("track_reports").select("*").eq("status", "open").order("created_at", { ascending: false });
    setReports(rep ?? []);
    const ids = Array.from(new Set((rep ?? []).map((r: Report) => r.track_id))) as string[];
    if (ids.length) {
      const { data: tr } = await supabase.from("tracks").select("id, title, is_hidden, user_id").in("id", ids);
      const map: typeof tracks = {};
      (tr ?? []).forEach((t: any) => { map[t.id] = t; });
      setTracks(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const act = async (report: Report, action: "hide" | "unhide" | "dismiss") => {
    if (action !== "dismiss") {
      const isHidden = action === "hide";
      const { error: e1 } = await supabase.from("tracks").update({ is_hidden: isHidden }).eq("id", report.track_id);
      if (e1) return toast.error(e1.message);
      await (supabase as any).from("moderation_actions").insert({
        track_id: report.track_id, moderator_id: user!.id, action,
      });
    }
    const newStatus = action === "dismiss" ? "dismissed" : "actioned";
    const { error } = await (supabase as any).from("track_reports").update({ status: newStatus }).eq("id", report.id);
    if (error) toast.error(error.message);
    else { toast.success("Done"); load(); }
  };

  if (loading) return <div className="min-h-screen pt-24 stage-bg"><SiteNav /><div className="container"><Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" /></div></div>;
  if (!isStaff) return <div className="min-h-screen pt-24 stage-bg"><SiteNav /><div className="container text-center mt-12"><p>Staff only.</p></div></div>;

  return (
    <div className="min-h-screen pt-24 pb-20 stage-bg">
      <SiteNav />
      <div className="container max-w-3xl">
        <h1 className="font-display text-4xl flex items-center gap-2"><Shield className="h-8 w-8 text-primary" /> Moderation Queue</h1>
        <p className="text-muted-foreground text-sm mt-1">{reports.length} open report{reports.length === 1 ? "" : "s"}</p>
        <div className="mt-6 space-y-3">
          {reports.length === 0 && <p className="text-center text-muted-foreground py-12">All clear 🎉</p>}
          {reports.map((r) => {
            const tr = tracks[r.track_id];
            return (
              <div key={r.id} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{tr?.title ?? "Unknown track"}</p>
                    <p className="text-[10px] text-muted-foreground tracking-widest mt-0.5">
                      REASON: {r.reason.toUpperCase()} · {new Date(r.created_at).toLocaleDateString()}
                      {tr?.is_hidden && " · HIDDEN"}
                    </p>
                    {r.detail && <p className="text-xs mt-2 text-muted-foreground italic">"{r.detail}"</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {!tr?.is_hidden ? (
                    <Button size="sm" variant="destructive" onClick={() => act(r, "hide")}>
                      <EyeOff className="h-3 w-3 mr-1" /> Hide track
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => act(r, "unhide")}>
                      <Eye className="h-3 w-3 mr-1" /> Restore
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => act(r, "dismiss")}>Dismiss</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Moderation;
