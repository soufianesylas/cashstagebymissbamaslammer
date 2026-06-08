import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Music, Film, Image as ImageIcon, Trash2, Lock, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MediaUploader, { type MediaKind } from "@/components/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Drop {
  id: string;
  user_id: string;
  media_type: MediaKind;
  media_path: string;
  caption: string | null;
  visibility: "public" | "private";
  created_at: string;
  signed_url?: string;
}

const KindIcon = ({ kind }: { kind: MediaKind }) => {
  if (kind === "audio") return <Music className="h-4 w-4" />;
  if (kind === "video") return <Film className="h-4 w-4" />;
  return <ImageIcon className="h-4 w-4" />;
};

const Drops = () => {
  const { user } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("drops")
      .select("id,user_id,media_type,media_path,caption,visibility,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as Drop[];
    // Sign URLs in parallel
    const signed = await Promise.all(
      rows.map(async (d) => {
        const { data: u } = await supabase.storage.from("media").createSignedUrl(d.media_path, 60 * 60 * 24);
        return { ...d, signed_url: u?.signedUrl };
      })
    );
    setDrops(signed);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUploaded = async (kind: MediaKind, { path }: { path: string; url: string }) => {
    if (!user) return;
    const { error } = await supabase.from("drops").insert({
      user_id: user.id,
      media_type: kind,
      media_path: path,
      caption: caption.trim() || null,
      visibility: "public",
    });
    if (error) { toast.error(error.message); return; }
    setCaption("");
    load();
  };

  const remove = async (d: Drop) => {
    if (!user || d.user_id !== user.id) return;
    await supabase.storage.from("media").remove([d.media_path]);
    await supabase.from("drops").delete().eq("id", d.id);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg">DROPS</h1>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground tracking-widest">NEW DROP</p>
          <Input
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={280}
          />
          <div className="flex flex-wrap gap-2">
            <MediaUploader kind="audio" folder="drops" label="Audio" onUploaded={(r) => handleUploaded("audio", r)} />
            <MediaUploader kind="video" folder="drops" label="Video" onUploaded={(r) => handleUploaded("video", r)} />
            <MediaUploader kind="image" folder="drops" label="Photo" onUploaded={(r) => handleUploaded("image", r)} />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : drops.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No drops yet. Be the first.</p>
        ) : (
          <div className="space-y-3">
            {drops.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {d.media_type === "image" && d.signed_url && (
                  <img src={d.signed_url} alt={d.caption ?? "drop"} className="w-full max-h-96 object-cover" loading="lazy" />
                )}
                {d.media_type === "video" && d.signed_url && (
                  <video src={d.signed_url} controls className="w-full max-h-96 bg-black" />
                )}
                {d.media_type === "audio" && d.signed_url && (
                  <audio src={d.signed_url} controls className="w-full" />
                )}
                <div className="p-3 flex items-start gap-2">
                  <div className="h-6 w-6 grid place-items-center rounded-full bg-secondary"><KindIcon kind={d.media_type} /></div>
                  <div className="flex-1 min-w-0">
                    {d.caption && <p className="text-sm">{d.caption}</p>}
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      {d.visibility === "public" ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  {user?.id === d.user_id && (
                    <Button variant="ghost" size="sm" onClick={() => remove(d)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Drops;
