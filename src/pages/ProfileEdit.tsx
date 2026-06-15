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
