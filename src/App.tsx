import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
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
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        <div className="min-h-screen bg-background">
          <Header />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
