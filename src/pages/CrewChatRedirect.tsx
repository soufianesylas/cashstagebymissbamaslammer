import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { Loader2, ChevronLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CrewChatRedirect = () => {
  const { crewId } = useParams<{ crewId: string }>();
  const { user } = useAuth();
  const [state, setState] = useState<"loading" | "denied" | { roomId: string }>("loading");

  useEffect(() => {
    (async () => {
      if (!user || !crewId) return;
      const { data: member } = await supabase
        .from("crew_members")
        .select("id")
        .eq("crew_id", crewId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) { setState("denied"); return; }
      const { data: room } = await supabase
        .from("chatrooms")
        .select("id")
        .eq("crew_id", crewId)
        .maybeSingle();
      if (!room) { setState("denied"); return; }
      setState({ roomId: room.id });
    })();
  }, [crewId, user?.id]);

  if (state === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <Link to="/crews" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to crews
        </Link>
        <div className="max-w-md mx-auto mt-20 text-center">
          <Lock className="h-10 w-10 mx-auto text-primary" />
          <p className="font-display text-2xl mt-3">Members only</p>
          <p className="text-sm text-muted-foreground mt-2">You must be a member of this crew to enter the chatroom.</p>
        </div>
      </div>
    );
  }
  return <Navigate to={`/chat/${state.roomId}`} replace />;
};

export default CrewChatRedirect;
