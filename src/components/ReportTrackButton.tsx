import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const REASONS: { id: string; label: string }[] = [
  { id: "copyright", label: "Stolen / copyright violation" },
  { id: "ai_generated", label: "AI-generated (banned)" },
  { id: "hate", label: "Hate speech or harassment" },
  { id: "sexual", label: "Sexual content involving minors" },
  { id: "violence", label: "Threats or graphic violence" },
  { id: "other", label: "Other" },
];

export const ReportTrackButton = ({ trackId }: { trackId: string }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("copyright");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Sign in to report"); return; }
    setBusy(true);
    const { error } = await (supabase as any)
      .from("track_reports")
      .insert({ track_id: trackId, reporter_id: user.id, reason, detail: detail.slice(0, 1000) });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Report submitted. Our team will review.");
      setOpen(false);
      setDetail("");
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
        aria-label="Report track"
      >
        <Flag className="h-3 w-3" /> REPORT
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report this track</DialogTitle>
            <DialogDescription>
              Reports stay anonymous to the artist. Our team reviews every flag within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                {r.label}
              </label>
            ))}
          </div>
          <Textarea
            placeholder="Optional detail (max 1000 chars)"
            value={detail}
            onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
            rows={3}
          />
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
