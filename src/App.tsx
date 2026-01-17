import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import InventarDashboard from "./pages/InventarDashboard";
import AccountsManagement from "./pages/inventar/AccountsManagement";
import Prevzemi from "./pages/inventar/Prevzemi";
import QRKode from "./pages/inventar/QRKode";
import OrderManagement from "./pages/inventar/OrderManagement";
import SellerPage from "./pages/inventar/SellerPage";
import ProdajalecDashboard from "./pages/ProdajalecDashboard";
import Contacts from "./pages/Contacts";
import OrderCodes from "./pages/OrderCodes";
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
              <ProtectedRoute allowedRoles={['inventar']}>
                <InventarDashboard />
              </ProtectedRoute>
            } />
            <Route path="/inventar/accounts" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <AccountsManagement />
              </ProtectedRoute>
            } />
            <Route path="/inventar/prevzemi" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <Prevzemi />
              </ProtectedRoute>
            } />
            <Route path="/inventar/qr-kode" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <QRKode />
              </ProtectedRoute>
            } />
            <Route path="/inventar/narocila" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <OrderManagement />
              </ProtectedRoute>
            } />
            <Route path="/inventar/prodajalec/:id" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <SellerPage />
              </ProtectedRoute>
            } />
            <Route path="/prodajalec" element={
              <ProtectedRoute allowedRoles={['prodajalec']}>
                <ProdajalecDashboard />
              </ProtectedRoute>
            } />
            <Route path="/contacts" element={
              <ProtectedRoute allowedRoles={['prodajalec']}>
                <Contacts />
              </ProtectedRoute>
            } />
            <Route path="/order-codes" element={
              <ProtectedRoute allowedRoles={['prodajalec']}>
                <OrderCodes />
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
