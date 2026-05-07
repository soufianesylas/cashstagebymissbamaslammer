import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import AppMockup from "./pages/AppMockup.tsx";
import LiveApp from "./pages/LiveApp.tsx";
import PitchDeck from "./pages/PitchDeck.tsx";
import Auth from "./pages/Auth.tsx";
import Studio from "./pages/Studio.tsx";
import Privacy from "./pages/Privacy.tsx";
import BeatOfTheDay from "./pages/BeatOfTheDay.tsx";
import Crews from "./pages/Crews.tsx";
import ChatList from "./pages/ChatList.tsx";
import ChatRoom from "./pages/ChatRoom.tsx";
import Pricing from "./pages/Pricing.tsx";
import WeeklyContest from "./pages/WeeklyContest.tsx";
import CrewChatRedirect from "./pages/CrewChatRedirect.tsx";
import JudgingSessions from "./pages/JudgingSessions.tsx";
import NotFound from "./pages/NotFound.tsx";
import Boosts from "./pages/Boosts.tsx";
import Moderation from "./pages/Moderation.tsx";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import { AdGateProvider } from "./components/AdGate";
import { JudgingTimerProvider } from "./components/JudgingTimer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdGateProvider>
          <JudgingTimerProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><LiveApp /></ProtectedRoute>} />
            <Route path="/mockup" element={<AppMockup />} />
            <Route path="/pitch" element={<PitchDeck />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/beat-of-the-day" element={<ProtectedRoute><BeatOfTheDay /></ProtectedRoute>} />
            <Route path="/crews" element={<ProtectedRoute><Crews /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
            <Route path="/chat/:roomId" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/weekly" element={<ProtectedRoute><WeeklyContest /></ProtectedRoute>} />
            <Route path="/crews/:crewId/chat" element={<ProtectedRoute><CrewChatRedirect /></ProtectedRoute>} />
            <Route path="/judging" element={<ProtectedRoute><JudgingSessions /></ProtectedRoute>} />
            <Route path="/boosts" element={<ProtectedRoute><Boosts /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </JudgingTimerProvider>
          </AdGateProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
