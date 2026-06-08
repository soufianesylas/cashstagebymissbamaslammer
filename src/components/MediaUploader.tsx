import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type MediaKind = "audio" | "video" | "image";

const ACCEPT: Record<MediaKind, string> = {
  audio: "audio/*",
  video: "video/*",
  image: "image/*",
};

const MAX_BYTES: Record<MediaKind, number> = {
  audio: 50 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  image: 15 * 1024 * 1024,
};

interface Props {
  kind: MediaKind;
  /** Folder under the user's id, e.g. "drops", "avatar", "cover", "studio". */
  folder: string;
  /** Called with `{ path, url }` after successful upload. */
  onUploaded: (result: { path: string; url: string }) => void | Promise<void>;
  label?: string;
  className?: string;
}

const MediaUploader = ({ kind, folder, onUploaded, label, className }: Props) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progressName, setProgressName] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("Sign in to upload");
      return;
    }
    if (file.size > MAX_BYTES[kind]) {
      toast.error(`File too large (max ${Math.round(MAX_BYTES[kind] / 1024 / 1024)}MB)`);
      return;
    }
    setBusy(true);
    setProgressName(file.name);
    try {
      const ext = file.name.split(".").pop() || (kind === "image" ? "jpg" : kind === "video" ? "mp4" : "m4a");
      const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 7);
      await onUploaded({ path, url: signed?.signedUrl ?? "" });
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      setProgressName(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button type="button" variant="secondary" onClick={pick} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {label ?? `Upload ${kind}`}
      </Button>
      {progressName && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <span className="truncate max-w-[200px]">{progressName}</span>
          {busy && <X className="h-3 w-3 opacity-50" />}
        </p>
      )}
    </div>
  );
};

export default MediaUploader;
