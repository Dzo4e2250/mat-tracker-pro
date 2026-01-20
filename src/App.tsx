import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Eager loaded - small pages needed immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded - larger pages loaded on demand
const InventarDashboard = lazy(() => import("./pages/InventarDashboard"));
const AccountsManagement = lazy(() => import("./pages/inventar/AccountsManagement"));
const Prevzemi = lazy(() => import("./pages/inventar/Prevzemi"));
const QRKode = lazy(() => import("./pages/inventar/QRKode"));
const OrderManagement = lazy(() => import("./pages/inventar/OrderManagement"));
const SellerPage = lazy(() => import("./pages/inventar/SellerPage"));
const MapView = lazy(() => import("./pages/inventar/MapView"));
const DriversManagement = lazy(() => import("./pages/inventar/DriversManagement"));
const Analytics = lazy(() => import("./pages/inventar/Analytics"));
const PriceManagement = lazy(() => import("./pages/inventar/PriceManagement"));
const ProdajalecDashboard = lazy(() => import("./pages/ProdajalecDashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const OrderCodes = lazy(() => import("./pages/OrderCodes"));

// Loading spinner for lazy loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
            <Route path="/inventar/zemljevid" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <MapView />
              </ProtectedRoute>
            } />
            <Route path="/inventar/dostavljalci" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <DriversManagement />
              </ProtectedRoute>
            } />
            <Route path="/inventar/analitika" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/inventar/cenik" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <PriceManagement />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
