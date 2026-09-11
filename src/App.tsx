import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DeveloperProtectedRoute from "@/components/DeveloperProtectedRoute"; // ✅ NEW
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PublicPhotosPage from "./pages/PublicPhoto";
import RegisterFace from "./pages/RegisterFace";
import FaceLogin from "./pages/FaceLogin";
import UserDashboard from "./pages/user/Dashboard";
import ScanFace from "./pages/user/ScanFace";
import About from "./pages/About";
import PrivacyPolicy from "./pages/Privacy";
import TermsOfService from "./pages/Terms";
import Features from "./pages/Feature";
import Pricing from "./pages/Pricing";
import ContactUs from "./pages/Contact";
import PhotoGallery from "./pages/user/PhotoGallery";
import UserProfile from "./pages/user/Profile";
import PhotographerDashboard from "./pages/photographer/Dashboard";
import PhotographerEvents from "./pages/photographer/Events";
import PhotographerEventDetail from "./pages/photographer/EventDetail";
import PhotographerCreateEvent from "./pages/photographer/CreateEvent";
import EditEvent from "./pages/photographer/EditEvent";
import PhotographerMyPhotos from "./pages/photographer/Foto";
import PhotographerProfile from "./pages/photographer/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminEvents from "./pages/admin/Events";
import AdminDownloads from "./pages/admin/Downloads";
import AdminRevenue from "./pages/admin/Revenue";
import AdminLogs from "./pages/admin/Logs";
import AdminStorage from "./pages/admin/Storage";
import AdminRoute from "./components/AdminRoute";
import AdminWithdrawals from "./pages/admin/Withdrawals";
import AdminSettings from "./pages/admin/Settings";
import UserWallet from "./pages/user/Walllet";
import UserTopUp from "./pages/user/TopUp";
import PhotographerWallet from "./pages/photographer/Wallet";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentPending from "./pages/payment/PaymentPending";
import PaymentFailed from "./pages/payment/PaymentFailed";
import NotFound from "./pages/NotFound";
import PhotoSales from "./pages/photographer/PhotoSales";
import AdminHiResAnalytics from "./pages/admin/HiResAnalytics";
import DeveloperBilling from "./pages/developer/Billing";
import DeveloperDashboard from "./pages/developer/Dashboard";
import DeveloperDocs from "./pages/developer/Docs";
import DeveloperKeys from "./pages/developer/Keys";
import DeveloperPricing from "./pages/developer/Pricing";
import DeveloperSettings from "./pages/developer/Settings";
import DeveloperUsage from "./pages/developer/Usage";
import DeveloperCheckout from "./pages/developer/Checkout";
import DeveloperPlayground from "./pages/developer/Playground";
import DeveloperLogin from "./pages/DeveloperLogin"; // ✅ already imported
import ChatList from "./pages/user/ChatList";
import ChatRoom from "./pages/user/ChatRoom";
import PhotographerChatList from "./pages/photographer/ChatList";
import PhotographerChatRoom from "./pages/photographer/ChatRoom";
import PhotographerSearch from "./pages/user/PhotographerSearch";
import UserComplaints from "./pages/user/Complaints";
import AdminChatManagement from "./pages/admin/ChatManagement";
// ❌ DEPRECATED ROUTES - Replaced by Escrow System
// import HiResQueue from "./pages/photographer/HiResQueue";
// import UserHiResPhotos from "./pages/user/HiResPhotos";
import StandaloneUpload from "@/pages/photographer/UploadFoto";
import UserEventsListPage from "./pages/user/Event";
import UserEventPage from "./pages/user/EventDetail";
// ✅ NEW ESCROW ROUTES
import BuyerPurchases from "./pages/user/BuyerPuchase";
import PhotographerPendingOrders from "./pages/photographer/PhotographerPendingOrders";
import PublicEventDetail from "./pages/photographer/PublicEventDetail";
import UserFotoMap from "./pages/user/FotoMap";
import GlobalEventsMap from "./pages/user/GlobalEventMap";
import AdminDropboxImport from "./pages/admin/DropboxImport";
import PhotographerGlobalEventsMap from "./pages/photographer/GlobalEventsMap";
import PhotographerEventPublicView from "./pages/photographer/PhotographerEventPublicView";
import DiscoverEvents from "./pages/photographer/DiscoverEvents";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminPhotographerStatistics from "./pages/admin/AdminPhotographerStatistics";
import PhotographerUpgradeRequest from "./pages/user/PhotographerUpgradeRequest";
import PhotographerUpgradeStatus from "./pages/user/PhotographerUpgradeStatus";
import AdminPhotographerRequests from "./pages/admin/AdminPhotographerRequest";
import PaymentResult from "./pages/developer/Result";
import AdminChatRoom from "./pages/admin/ChatRoom";
import { BayanOpenAuthProvider } from '@/contexts/BayanOpenAuthContext';
import { BayanOpenProtectedRoute } from '@/components/clientarea/BayanOpenProtectedRoute';
import { BayanOpenLayout } from '@/components/clientarea/BayanOpenLayout';
import BayanOpenLogin from '@/pages/clientarea/bayan-open/Login';
import BayanOpenOverview from '@/pages/clientarea/bayan-open/Overview';
import BayanOpenStatistics from '@/pages/clientarea/bayan-open/Statistics';
import BayanOpenGalleryPage from '@/pages/clientarea/bayan-open/GalleryPage';
import EventPublicBayanOpenCraft from "./pages/EventCraftOpen";
import WhatsAppWidget from "./components/layout/Whatsapp-button";

const queryClient = new QueryClient();   // 👈 tambahkan ini

// Protected route for photographers only
const PhotographerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role !== 'photographer' && user?.role !== 'admin') {
    return <Navigate to="/user/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Protected route for users only (cannot access if already photographer)
const UserOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If already photographer or admin, redirect to their dashboard
  if (user?.role === 'photographer') {
    return <Navigate to="/photographer/dashboard" replace />;
  }
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Navigate to="/login" replace />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/photos" element={<PublicPhotosPage />} />
            <Route path="/pricing" element={<DeveloperPricing />} />
            <Route path="/docs" element={<DeveloperDocs/>}/>
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/register/face" element={<RegisterFace />} />
            <Route path="/login/face" element={<FaceLogin />} />
            <Route path="/event-public/bayan-open-craft" element={<EventPublicBayanOpenCraft />} />
            
            {/* PUBLIC EVENT VIEW - Must be BEFORE other routes to avoid conflicts */}
            <Route path="/event/:eventSlug" element={<PhotographerEventPublicView />} />

            {/* ========================================
                BAYAN OPEN ROUTES 
            ======================================== */}
            <Route
              path="/clientarea/bayan-open/login"
              element={
                <BayanOpenAuthProvider>
                  <BayanOpenLogin />
                </BayanOpenAuthProvider>
              }
            />
            <Route
              path="/clientarea/bayan-open"
              element={
                <BayanOpenAuthProvider>
                  <BayanOpenProtectedRoute>
                    <BayanOpenLayout />
                  </BayanOpenProtectedRoute>
                </BayanOpenAuthProvider>
              }
            >
              <Route index element={<BayanOpenOverview />} />
              <Route path="statistics" element={<BayanOpenStatistics />} />
              <Route path="gallery" element={<BayanOpenGalleryPage />} />
            </Route>
            
            {/* ========================================
                USER ROUTES 
            ======================================== */}
            <Route 
              path="/user/dashboard" 
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/scan-face" 
              element={
                <ProtectedRoute>
                  <ScanFace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/photos" 
              element={
                <ProtectedRoute>
                  <PhotoGallery />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/profile" 
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/wallet" 
              element={
                <ProtectedRoute>
                  <UserWallet />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/topup" 
              element={
                <ProtectedRoute>
                  <UserTopUp />
                </ProtectedRoute>
              } 
            />
            
            {/* ✅ NEW ESCROW ROUTE */}
            <Route 
              path="/user/purchases" 
              element={
                <ProtectedRoute>
                  <BuyerPurchases />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/user/events"
              element={
                <ProtectedRoute>
                  <UserEventsListPage />
                </ProtectedRoute>
              }
            />  
            <Route
              path="/user/events/:eventName"
              element={
                <ProtectedRoute>
                  <UserEventPage />
                </ProtectedRoute>
              }
            />

            {/* User FotoMap Routes */}
            <Route 
              path="/user/fotomap" 
              element={
                <ProtectedRoute>
                  <GlobalEventsMap />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/fotomap/:eventId" 
              element={
                <ProtectedRoute>
                  <UserFotoMap />
                </ProtectedRoute>
              } 
            />

             <Route 
              path="/user/chat" 
              element={
                <ProtectedRoute>
                  <ChatList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/chat/:chatId" 
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/photographers" 
              element={
                <ProtectedRoute>
                  <PhotographerSearch />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/user/complaints"
              element={
                <ProtectedRoute>
                  <UserComplaints />
                </ProtectedRoute>
              }
            />  
            {/* Photographer Upgrade Feature */}
            <Route 
              path="/user/upgrade-to-photographer" 
              element={
                <UserOnlyRoute>
                  <PhotographerUpgradeRequest />
                </UserOnlyRoute>
              } 
            />
            <Route 
              path="/user/upgrade-status" 
              element={
                <ProtectedRoute>
                  <PhotographerUpgradeStatus />
                </ProtectedRoute>
              } 
            />
            
            {/* ========================================
                PHOTOGRAPHER ROUTES 
            ======================================== */}
            <Route 
              path="/photographer/dashboard" 
              element={
                <PhotographerRoute>
                  <PhotographerDashboard />
                </PhotographerRoute>
              } 
            />
            <Route 
              path="/photographer/photosales" 
              element={
                <PhotographerRoute>
                  <PhotoSales />
                </PhotographerRoute>
              } 
            />
            <Route
              path="/photographer/upload"
              element={
                <PhotographerRoute>
                  <StandaloneUpload />
                </PhotographerRoute>
              }
            />
            <Route
              path="/photographer/events/discover"
              element={
                <PhotographerRoute>
                  <DiscoverEvents />
                </PhotographerRoute>
              }
            />
            <Route
              path="/photographer/events/public/:eventId"
              element={
                <PhotographerRoute>
                  <PublicEventDetail />
                </PhotographerRoute>
              }
            />
            <Route 
              path="/photographer/events" 
              element={
                <PhotographerRoute>
                  <PhotographerEvents />
                </PhotographerRoute>
              } 
            />
            <Route 
              path="/photographer/events/new" 
              element={
                <PhotographerRoute>
                  <PhotographerCreateEvent />
                </PhotographerRoute>
              } 
            />
            <Route 
              path="/photographer/events/:eventId" 
              element={
                <PhotographerRoute>
                  <PhotographerEventDetail />
                </PhotographerRoute>
              } 
            />
            <Route
              path="/photographer/events/:eventId/edit"
              element={
                <PhotographerRoute>
                  <EditEvent />
                </PhotographerRoute>
              }
            />
            <Route 
              path="/photographer/profile" 
              element={
                <PhotographerRoute>
                  <PhotographerProfile />
                </PhotographerRoute>
              } 
            />
            <Route
              path="/photographer/my-photos"
              element={
                <PhotographerRoute>
                  <PhotographerMyPhotos />
                </PhotographerRoute>
              }
            />
            <Route 
              path="/photographer/wallet" 
              element={
                <PhotographerRoute>
                  <PhotographerWallet />
                </PhotographerRoute>
              } 
            />
            <Route 
              path="/photographer/chat" 
              element={
                <PhotographerRoute>
                  <PhotographerChatList />
                </PhotographerRoute>
              } 
            />
            <Route 
              path="/photographer/chat/:chatId" 
              element={
                <PhotographerRoute>
                  <PhotographerChatRoom />
                </PhotographerRoute>
              } 
            />
            {/* ✅ NEW ESCROW ROUTE */}
            <Route 
              path="/photographer/pending-orders" 
              element={
                <PhotographerRoute>
                  <PhotographerPendingOrders />
                </PhotographerRoute>
              } 
            />

            {/* Photographer FotoMap Routes */}
            <Route 
              path="/photographer/fotomap" 
              element={
                <PhotographerRoute>
                  <PhotographerGlobalEventsMap />
                </PhotographerRoute>
              } 
            />
            <Route 
              path="/photographer/fotomap/:eventId" 
              element={
                <ProtectedRoute>
                  <UserFotoMap />
                </ProtectedRoute>
              } 
            />
            
            {/* ========================================
                ADMIN ROUTES 
            ======================================== */}
            <Route 
              path="/admin/dashboard" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/events" 
              element={
                <AdminRoute>
                  <AdminEvents />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/downloads" 
              element={
                <AdminRoute>
                  <AdminDownloads />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/revenue" 
              element={
                <AdminRoute>
                  <AdminRevenue />
                </AdminRoute>
              } 
            />
             <Route 
              path="/admin/chat-management" 
              element={
                <AdminRoute>
                  <AdminChatManagement />
                </AdminRoute>
              } 
            />
           <Route 
              path="/admin/chat/:chatId" 
              element={
                <AdminRoute>
                  <AdminChatRoom />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/logs" 
              element={
                <AdminRoute>
                  <AdminLogs />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/storage" 
              element={
                <AdminRoute>
                  <AdminStorage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/withdrawals" 
              element={
                <AdminRoute>
                  <AdminWithdrawals />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/hires-analytics" 
              element={
                <AdminRoute>
                  <AdminHiResAnalytics />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/dropbox-import" 
              element={
                <AdminRoute>
                  <AdminDropboxImport />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/photographer-requests" 
              element={
                <AdminRoute>
                  <AdminPhotographerRequests />
                </AdminRoute>
              } 
            />
            <Route
              path="/admin/photographer-statistics"
              element={
                <AdminRoute>
                  <AdminPhotographerStatistics />
                </AdminRoute>
              }
            />

            {/* ========================================
                DEVELOPER PLATFORM ROUTES
            ======================================== */}

            {/* ── Public (no auth needed) ── */}
            <Route path="/developer/login"   element={<DeveloperLogin />} />  {/* ✅ NEW */}
            <Route path="/developer/pricing" element={<DeveloperPricing />} />
            <Route path="/developer/docs"    element={<DeveloperDocs />} />
            <Route path="/developer/checkout" element={<DeveloperCheckout />} />

            {/* Payment callback pages — public, Midtrans redirects here */}
            <Route path="/developer/payment/finish"  element={<PaymentResult status="success" />} />
            <Route path="/developer/payment/pending" element={<PaymentResult status="pending" />} />
            <Route path="/developer/payment/error"   element={<PaymentResult status="error" />} />

            {/* ── Protected — requires valid JWT, redirects to /developer/login ── */}
            <Route
              path="/developer/:id"
              element={
                <DeveloperProtectedRoute>
                  <DeveloperDashboard />
                </DeveloperProtectedRoute>
              }
            />
            <Route
              path="/developer/:id/keys"
              element={
                <DeveloperProtectedRoute>
                  <DeveloperKeys />
                </DeveloperProtectedRoute>
              }
            />
            <Route
              path="/developer/:id/usage"
              element={
                <DeveloperProtectedRoute>
                  <DeveloperUsage />
                </DeveloperProtectedRoute>
              }
            />
            <Route
              path="/developer/:id/billing"
              element={
                <DeveloperProtectedRoute>
                  <DeveloperBilling />
                </DeveloperProtectedRoute>
              }
            />
            <Route
              path="/developer/:id/settings"
              element={
                <DeveloperProtectedRoute>
                  <DeveloperSettings />
                </DeveloperProtectedRoute>
              }
            />
            <Route
              path="/developer/:id/playground"
              element={
                <DeveloperProtectedRoute>
                  <DeveloperPlayground />
                </DeveloperProtectedRoute>
              }
            />

            {/* ========================================
                PAYMENT CALLBACK ROUTES (non-developer)
            ======================================== */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/pending" element={<PaymentPending />} />
            <Route path="/payment/failed"  element={<PaymentFailed />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WhatsAppWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;