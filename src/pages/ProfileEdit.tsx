import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MediaUploader from "@/components/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ProfileEdit = () => {
  const { user } = useAuth();
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setArtistName(data.artist_name ?? "");
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url ?? null);
      setCoverUrl((data as any).cover_url ?? null);
    });
  }, [user?.id]);

  const persist = async (patch: Record<string, any>) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) toast.error(error.message);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await persist({ artist_name: artistName.trim(), bio: bio.trim() });
    setSaving(false);
    toast.success("Profile saved");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg">EDIT PROFILE</h1>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Cover */}
        <div className="rounded-2xl overflow-hidden border border-border bg-card">
          <div className="h-40 bg-secondary relative">
            {coverUrl && <img src={coverUrl} alt="cover" className="absolute inset-0 w-full h-full object-cover" />}
          </div>
          <div className="p-3 flex items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-secondary border-2 border-background -mt-10 overflow-hidden">
              {avatarUrl && <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <MediaUploader
                kind="image"
                folder="avatar"
                label="Avatar"
                onUploaded={async ({ url }) => { setAvatarUrl(url); await persist({ avatar_url: url }); }}
              />
              <MediaUploader
                kind="image"
                folder="cover"
                label="Cover photo"
                onUploaded={async ({ url }) => { setCoverUrl(url); await persist({ cover_url: url }); }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Artist name</label>
            <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} maxLength={64} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Avatar &amp; cover save instantly when uploaded.
        </p>
      </div>
    </div>
  );
};

export default ProfileEdit;
