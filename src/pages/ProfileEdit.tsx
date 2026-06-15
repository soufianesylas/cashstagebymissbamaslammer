import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, AlertTriangle, Music, Image as ImageIcon, Video, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MediaUploader, { MediaKind } from "@/components/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  kind: MediaKind;
  storage_path: string;
  title: string | null;
  created_at: string;
  url?: string;
}

const ProfileEdit = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Account section
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [deletePwd, setDeletePwd] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [media, setMedia] = useState<MediaItem[]>([]);

  const loadMedia = async (uid: string) => {
    const { data } = await supabase
      .from("user_media")
      .select("id, kind, storage_path, title, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as MediaItem[];
    const signed = await Promise.all(
      rows.map(async (r) => {
        const { data: s } = await supabase.storage.from("media").createSignedUrl(r.storage_path, 60 * 60 * 24 * 7);
        return { ...r, url: s?.signedUrl ?? "" };
      })
    );
    setMedia(signed);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setArtistName(data.artist_name ?? "");
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url ?? null);
      setCoverUrl((data as any).cover_url ?? null);
    });
    loadMedia(user.id);
  }, [user?.id]);

  const addMedia = async (kind: MediaKind, path: string) => {
    if (!user) return;
    const { error } = await supabase.from("user_media").insert({ user_id: user.id, kind, storage_path: path });
    if (error) { toast.error(error.message); return; }
    await loadMedia(user.id);
  };

  const removeMedia = async (item: MediaItem) => {
    if (!user) return;
    await supabase.storage.from("media").remove([item.storage_path]);
    const { error } = await supabase.from("user_media").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    setMedia((m) => m.filter((x) => x.id !== item.id));
    toast.success("Removed");
  };

  const persist = async (patch: Partial<{ artist_name: string; bio: string; avatar_url: string; cover_url: string }>) => {
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

  const changeEmail = async () => {
    const trimmed = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { toast.error("Enter a valid email"); return; }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Check both your old and new email to confirm the change.");
    setNewEmail("");
  };

  const changePassword = async () => {
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setPwdBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setNewPwd("");
  };

  const deleteAccount = async () => {
    if (!deletePwd) { toast.error("Enter your password to confirm"); return; }
    setDeleteBusy(true);
    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: { password: deletePwd },
    });
    setDeleteBusy(false);
    if (error || !data?.deleted) {
      toast.error(error?.message ?? data?.error ?? "Could not delete account");
      return;
    }
    toast.success("Account deleted");
    await signOut();
    navigate("/", { replace: true });
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
              <MediaUploader kind="image" folder="avatar" label="Avatar"
                onUploaded={async ({ url }) => { setAvatarUrl(url); await persist({ avatar_url: url }); }} />
              <MediaUploader kind="image" folder="cover" label="Cover photo"
                onUploaded={async ({ url }) => { setCoverUrl(url); await persist({ cover_url: url }); }} />
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

        {/* Media uploads */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base">My media</h2>
            <span className="text-[10px] text-muted-foreground">{media.length} item{media.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <MediaUploader kind="audio" folder="audio" label="Upload audio"
              onUploaded={async ({ path }) => { await addMedia("audio", path); }} />
            <MediaUploader kind="image" folder="photos" label="Upload photo"
              onUploaded={async ({ path }) => { await addMedia("image", path); }} />
            <MediaUploader kind="video" folder="videos" label="Upload video"
              onUploaded={async ({ path }) => { await addMedia("video", path); }} />
          </div>

          {media.length === 0 ? (
            <p className="text-xs text-muted-foreground">No uploads yet. Drop your first audio, photo, or video.</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {media.map((m) => (
                <li key={m.id} className="relative rounded-xl overflow-hidden border border-border bg-secondary group">
                  {m.kind === "image" && m.url && (
                    <img src={m.url} alt={m.title ?? "photo"} className="w-full h-32 object-cover" />
                  )}
                  {m.kind === "video" && m.url && (
                    <video src={m.url} controls className="w-full h-32 object-cover bg-black" />
                  )}
                  {m.kind === "audio" && (
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Music className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{m.storage_path.split("/").pop()}</span>
                      </div>
                      {m.url && <audio src={m.url} controls className="w-full h-8" />}
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(m)}
                    aria-label="Delete"
                    className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-background/80 text-[9px] font-bold tracking-widest flex items-center gap-1">
                    {m.kind === "image" ? <ImageIcon className="h-3 w-3" /> : m.kind === "video" ? <Video className="h-3 w-3" /> : <Music className="h-3 w-3" />}
                    {m.kind.toUpperCase()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Account */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <h2 className="font-display text-base">Account</h2>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Current email</label>
            <p className="text-sm">{user?.email}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Change email</label>
            <div className="flex gap-2">
              <Input type="email" placeholder="new@email.com" value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)} maxLength={255} />
              <Button onClick={changeEmail} disabled={emailBusy || !newEmail}>
                {emailBusy ? "…" : "Update"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">You'll receive a confirmation link at both addresses.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Change password</label>
            <div className="flex gap-2">
              <Input type="password" placeholder="New password (8+ chars)" value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)} maxLength={72} />
              <Button onClick={changePassword} disabled={pwdBusy || newPwd.length < 8}>
                {pwdBusy ? "…" : "Update"}
              </Button>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="font-display text-base text-destructive">Danger zone</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Deleting your account permanently removes your profile, drops, tracks, scores, crews, and subscription.
            Active Stripe subscriptions should be canceled in <Link to="/pricing" className="underline">Pricing → Manage</Link> first.
            This cannot be undone.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter your current password to confirm. This is immediate and permanent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input type="password" placeholder="Current password" value={deletePwd}
                onChange={(e) => setDeletePwd(e.target.value)} maxLength={72} autoFocus />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletePwd("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); deleteAccount(); }}
                  disabled={deleteBusy || !deletePwd}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteBusy ? "Deleting…" : "Delete forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Avatar &amp; cover save instantly when uploaded.
        </p>
      </div>
    </div>
  );
};

export default ProfileEdit;
