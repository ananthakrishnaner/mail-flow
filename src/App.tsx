import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Campaigns from "./pages/Campaigns";
import Recipients from "./pages/Recipients";
import Compose from "./pages/Compose";
import Templates from "./pages/Templates";
import Scheduler from "./pages/Scheduler";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

import { Navigate, Outlet } from "react-router-dom";
import Login from "./pages/Login";

const ProtectedRoute = () => {
  const isAuthenticated = !!localStorage.getItem("access_token");
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Index />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/recipients" element={<Recipients />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
