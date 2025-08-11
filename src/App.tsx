
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PostLost from "./pages/PostLost";
import PostFound from "./pages/PostFound";
import Browse from "./pages/Browse";
import Matches from "./pages/Matches";
import Claims from "./pages/Claims";
import MyItems from "./pages/MyItems";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import SuccessStories from "./pages/SuccessStories";
import GuestPost from "./pages/GuestPost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Header />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/post-lost" element={<PostLost />} />
              <Route path="/post-found" element={<PostFound />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/my-items" element={<MyItems />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/success-stories" element={<SuccessStories />} />
              <Route path="/guest-post/:type" element={<GuestPost />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
