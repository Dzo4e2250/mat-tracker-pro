import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import InventarDashboard from "./pages/InventarDashboard";
import AccountsManagement from "./pages/inventar/AccountsManagement";
import QRGenerator from "./pages/inventar/QRGenerator";
import TesterRequests from "./pages/inventar/TesterRequests";
import DeletionHistory from "./pages/inventar/DeletionHistory";
import ProdajalecDashboard from "./pages/ProdajalecDashboard";
import Contacts from "./pages/Contacts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/inventar" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'INVENTAR']}>
                <InventarDashboard />
              </ProtectedRoute>
            } />
            <Route path="/inventar/accounts" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AccountsManagement />
              </ProtectedRoute>
            } />
            <Route path="/inventar/qr-generator" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'INVENTAR']}>
                <QRGenerator />
              </ProtectedRoute>
            } />
            <Route path="/inventar/tester-requests" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'INVENTAR']}>
                <TesterRequests />
              </ProtectedRoute>
            } />
            <Route path="/inventar/history" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'INVENTAR']}>
                <DeletionHistory />
              </ProtectedRoute>
            } />
            <Route path="/prodajalec" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'PRODAJALEC']}>
                <ProdajalecDashboard />
              </ProtectedRoute>
            } />
            <Route path="/contacts" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'PRODAJALEC']}>
                <Contacts />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
