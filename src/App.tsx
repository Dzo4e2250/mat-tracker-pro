import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";
import { useNetworkStatus } from "./hooks/useNetworkStatus";

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
const ActivityTracking = lazy(() => import("./pages/inventar/ActivityTracking"));
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

// Offline banner component
const OfflineBanner = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="bg-red-500 text-white text-center py-2 fixed top-0 left-0 right-0 z-50 text-sm">
      Ni internetne povezave - nekatere funkcije morda ne bodo delovale
    </div>
  );
};

// App content with hooks
const AppContent = () => {
  return (
    <>
      <OfflineBanner />
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
            <Route path="/inventar/aktivnost" element={
              <ProtectedRoute allowedRoles={['inventar']}>
                <ActivityTracking />
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
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
