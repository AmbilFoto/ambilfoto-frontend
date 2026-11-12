import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, Scan, Image, Calendar, Wallet, CreditCard, 
  ArrowRight, ShoppingCart, Download, TrendingUp, Award, 
  Sparkles, Eye, Star, MapPin, Clock, ChevronRight, Grid3x3,
  Zap, Heart, Map as MapIcon, Briefcase, CheckCircle, XCircle,
  AlertCircle, MessageCircle, Bell, Package, RefreshCw,
  ShoppingBag, Users, Newspaper, ChevronDown, Activity,
  CameraIcon, UserCheck, Layers, Loader2
} from "lucide-react";
import { userService, UserPhoto } from "@/services/api/user.service";
import { paymentService, UserWallet } from "@/services/api/payment.service";
import { photographerUpgradeService, UpgradeStatus } from "@/services/api/photographer.upgrade.service";
import { aiService } from "@/services/api/ai.service";
import { buyerEscrowService, BuyerPurchase, buyerEscrowHelpers } from "@/services/api/buyer.escrow.service";
import { chatService } from "@/services/api/chat.service";
import HeaderDash from "@/components/layout/HeaderDash";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/utils/currency";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ BARU: status AI matching background
  const [isMatchingBackground, setIsMatchingBackground] = useState(false);

  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'recent' | 'events' | 'purchases'>('overview');
  const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus | null>(null);

  const [recentPurchases, setRecentPurchases] = useState<BuyerPurchase[]>([]);
  const [isPurchasesLoading, setIsPurchasesLoading] = useState(false);
  const [chattingId, setChattingId] = useState<string | null>(null);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadPhotosCached(),        // ✅ Ganti: ambil cache dulu, instant
      loadUpgradeStatus(),
      loadRecentPurchases(),
      loadUnreadChats(),
    ]);
    setIsLoading(false);
  };

  // ✅ DIGANTI: load dari cache DB dulu (tidak trigger AI matching)
  const loadPhotosCached = async () => {
    try {
      const [eventRes, standaloneRes] = await Promise.all([
        userService.getMyPhotos({ limit: 100 }),
        userService.getMyStandalonePhotos({ limit: 100 }).catch(() => ({ success: false, data: [] })),
      ]);

      const eventPhotos: UserPhoto[] = eventRes.success && eventRes.data ? eventRes.data : [];
      const standalonePhotos: UserPhoto[] = standaloneRes.success && standaloneRes.data ? standaloneRes.data : [];

      setPhotos([...eventPhotos, ...standalonePhotos]);
    } catch {
      setPhotos([]);
    }
  };

  const loadUpgradeStatus = async () => {
    try {
      const response = await photographerUpgradeService.getUpgradeStatus();
      if (response.success && response.data) setUpgradeStatus(response.data);
    } catch {}
  };

  const loadRecentPurchases = async () => {
    try {
      setIsPurchasesLoading(true);
      const response = await buyerEscrowService.getMyPurchases({ limit: 3 });
      if (response.success && response.data) setRecentPurchases(response.data);
    } catch {}
    finally { setIsPurchasesLoading(false); }
  };

  const loadUnreadChats = async () => {
    try {
      const chats = await chatService.getMyChats();
      const unread = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadChats(unread);
    } catch {}
  };

  const handleChatWithPhotographer = async (purchase: BuyerPurchase) => {
    try {
      setChattingId(purchase.transaction_id);
      const chat = await chatService.createOrGetDirectChat(
        purchase.photographer.id,
        purchase.photo.id
      );
      navigate(`/user/chat/${chat.id}`);
    } catch {
      toast.error("Gagal membuka chat");
    } finally {
      setChattingId(null);
    }
  };

  const eventStats = useMemo(() => {
    const events: Map<string, { 
      name: string; photos: UserPhoto[];
      location: string; date: string;
      purchased: number; totalValue: number;
      event_id: string;
    }> = new Map();
    photos.forEach(photo => {
      const key = photo.event_id || photo.event_name || "unknown";
      const existing = events.get(key);
      if (existing) {
        existing.photos.push(photo);
        if (photo.is_purchased) existing.purchased += 1;
        existing.totalValue += photo.price_cash || 0;
      } else {
        events.set(key, {
          name: photo.event_name || 'Event Tidak Diketahui',
          photos: [photo],
          location: photo.event_location || 'Lokasi Tidak Diketahui',
          date: photo.event_date || '',
          purchased: photo.is_purchased ? 1 : 0,
          totalValue: photo.price_cash || 0,
          event_id: photo.event_id || key,
        });
      }
    });
    return Array.from(events.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [photos]);

  const topEvents = useMemo(() => eventStats.slice(0, 3), [eventStats]);

  const stats = useMemo(() => {
    const totalPhotos = photos.length;
    const purchased = photos.filter(p => p.is_purchased).length;
    const totalValue = photos.reduce((sum, p) => sum + (p.price_cash || 0), 0);
    const avgMatch = photos.length > 0 
      ? Math.round(photos.reduce((sum, p) => sum + (p.similarity || 0), 0) / photos.length * 100)
      : 0;
    return {
      totalPhotos, purchased,
      notPurchased: totalPhotos - purchased,
      totalValue, savedValue: purchased > 0 ? purchased * 30000 : 0,
      avgMatch, events: eventStats.length
    };
  }, [photos, eventStats]);

  const recentPhotos = useMemo(() => {
    return photos
      .sort((a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime())
      .slice(0, 8);
  }, [photos]);

  const favoritePhotos = useMemo(() => {
    return [...photos].sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, 6);
  }, [photos]);

  const getPurchaseStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      'HELD':                { label: 'Menunggu Upload',  className: 'bg-blue-100 text-blue-700' },
      'WAITING_CONFIRMATION':{ label: 'Perlu Konfirmasi', className: 'bg-yellow-100 text-yellow-700' },
      'REVISION_REQUESTED':  { label: 'Revisi',           className: 'bg-orange-100 text-orange-700' },
      'RELEASED':            { label: 'Selesai',          className: 'bg-green-100 text-green-700' },
      'REFUNDED':            { label: 'Dikembalikan',     className: 'bg-gray-100 text-gray-700' },
      'NOT_APPLICABLE':      { label: 'Diproses',         className: 'bg-gray-100 text-gray-600' },
    };
    const s = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>;
  };

  const needsConfirmCount = recentPurchases.filter(p => p.escrow.status === 'WAITING_CONFIRMATION').length;

  const quickActions = [
    {
      icon: Camera,
      label: "Hi Res Foto",
      description: "Unduh versi Hi-Res",
      href: "/user/purchases",
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200",
      badge: needsConfirmCount > 0 ? needsConfirmCount : null,
    },
    {
      icon: MapIcon,
      label: "FotoMap",
      description: "Jelajahi event di peta",
      href: "/user/fotomap",
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200",
      badge: null,
    },
    {
      icon: Grid3x3,
      label: "Ambil Foto",
      description: `${stats.totalPhotos} foto`,
      href: "/user/photos",
      color: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200",
      badge: null,
    },
    {
      icon: Calendar,
      label: "Event Saya",
      description: `${stats.events} event`,
      href: "/user/events",
      color: "bg-green-50 text-green-600 hover:bg-green-100 border-green-200",
      badge: null,
    },
    {
      icon: MessageCircle,
      label: "Pesan",
      description: "Chat dengan fotografer",
      href: "/user/chat",
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200",
      badge: unreadChats > 0 ? unreadChats : null,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HeaderDash />
      
      <main className="flex-1 py-8">
        <div className="container max-w-7xl">

          {/* ── Hero ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent">
                  Selamat Datang {user?.full_name || 'Pengguna'}! 👋
                </h1>
                <p className="text-gray-600 text-lg flex items-center gap-2">
                  {photos.length > 0 
                    ? `Anda memiliki ${stats.totalPhotos} foto dari ${stats.events} event`
                    : 'Mulai dengan pindai wajah untuk menemukan foto Anda'
                  }
                  {/* ✅ BARU: indikator AI matching berjalan di background */}
                  {isMatchingBackground && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-500 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Mencarikan foto baru...
                    </span>
                  )}
                </p>
              </div>
              <div className="hidden md:flex gap-2 items-center">
                {unreadChats > 0 && (
                  <Link to="/user/chat">
                    <Button variant="outline" size="sm" className="gap-2 border-green-200 text-green-600 hover:bg-green-50 relative">
                      <MessageCircle className="h-4 w-4" />
                      {unreadChats} pesan baru
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    </Button>
                  </Link>
                )}
                {needsConfirmCount > 0 && (
                  <Link to="/user/purchases">
                    <Button variant="outline" size="sm" className="gap-2 border-yellow-200 text-yellow-700 hover:bg-yellow-50">
                      <Bell className="h-4 w-4" />
                      {needsConfirmCount} perlu konfirmasi
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {stats.totalPhotos > 0 && (
              <Card className="border-2 border-blue-100 shadow-sm bg-gradient-to-r from-blue-50 to-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-gray-800">Progress Koleksi</span>
                    </div>
                    <span className="text-sm text-gray-600">{stats.purchased}/{stats.totalPhotos} dibeli</span>
                  </div>
                  <Progress value={(stats.purchased / stats.totalPhotos) * 100} className="h-2 bg-gray-200" />
                  <p className="text-xs text-gray-600 mt-2">
                    {stats.notPurchased > 0 && `${stats.notPurchased} foto menunggu untuk dibeli`}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Upgrade Status Alert ── */}
          {upgradeStatus?.has_request && upgradeStatus.current_request && (
            <Alert className={`mb-8 ${
              upgradeStatus.current_request.status === 'pending' ? 'border-yellow-500 bg-yellow-50' :
              upgradeStatus.current_request.status === 'approved' ? 'border-green-500 bg-green-50' :
              'border-red-500 bg-red-50'
            }`}>
              {upgradeStatus.current_request.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
              {upgradeStatus.current_request.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {upgradeStatus.current_request.status === 'rejected' && <XCircle className="h-4 w-4 text-red-600" />}
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>
                      {upgradeStatus.current_request.status === 'pending' && 'Permintaan Upgrade Sedang Diproses'}
                      {upgradeStatus.current_request.status === 'approved' && 'Upgrade Berhasil! 🎉'}
                      {upgradeStatus.current_request.status === 'rejected' && 'Permintaan Ditolak'}
                    </strong>
                    <p className="text-sm mt-1">
                      {upgradeStatus.current_request.status === 'pending' && 'Tim kami sedang meninjau dokumen Anda. Proses ini biasanya memakan waktu 1-3 hari kerja.'}
                      {upgradeStatus.current_request.status === 'approved' && 'Akun Anda sekarang adalah Photographer. Anda dapat mulai membuat event dan upload foto!'}
                      {upgradeStatus.current_request.status === 'rejected' && upgradeStatus.current_request.rejection_reason}
                    </p>
                  </div>
                  <Link to="/user/upgrade-status">
                    <Button variant="outline" size="sm" className="gap-1">Lihat Detail<ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* ── FotoMap CTA ── */}
          <div className="mb-8">
            <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-br from-blue-500 to-yellow-500 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <CardContent className="pt-8 pb-8 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <MapIcon className="h-10 w-10" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-2">Jelajahi Event di Sekitar Anda</h2>
                    <p className="text-white/90">Temukan event-event menarik di peta interaktif</p>
                  </div>
                  <Link to="/user/fotomap">
                    <Button size="lg" className="bg-white text-yellow-600 hover:bg-gray-100 shadow-lg">
                      <MapPin className="mr-2 h-5 w-5" />Buka FotoMap
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.href}>
                <Card className={`border-2 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative ${action.color}`}>
                  {action.badge !== null && (
                    <span className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {action.badge}
                    </span>
                  )}
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                      <action.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-1 text-gray-800">{action.label}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid gap-3 md:grid-cols-3 mb-8">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-2 border-gray-100 shadow-sm">
                  <CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow bg-blue-50/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-blue-100"><Image className="h-5 w-5 text-blue-600" /></div>
                      <div className="flex-1">
                        <p className="text-3xl font-bold text-gray-800">{stats.totalPhotos}</p>
                        <p className="text-sm text-gray-600">Total Foto</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>{stats.avgMatch}% rata-rata kecocokan</span>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="border-2 border-yellow-100 shadow-sm hover:shadow-md transition-shadow bg-yellow-50/30 cursor-pointer"
                  onClick={() => navigate("/user/events")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-yellow-100"><Calendar className="h-5 w-5 text-yellow-700" /></div>
                      <div className="flex-1">
                        <p className="text-3xl font-bold text-gray-800">{stats.events}</p>
                        <p className="text-sm text-gray-600">Event</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-yellow-600" />
                    </div>
                    <p className="text-xs text-gray-600">
                      {topEvents.length > 0 && `Terbaru: ${topEvents[0].name.substring(0, 20)}...`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow bg-blue-50/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-blue-100"><Download className="h-5 w-5 text-blue-600" /></div>
                      <div className="flex-1">
                        <p className="text-3xl font-bold text-gray-800">{stats.purchased}</p>
                        <p className="text-sm text-gray-600">Dibeli</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{stats.notPurchased} menunggu</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ── Upgrade CTA ── */}
          {!upgradeStatus?.has_request && (
            <div className="mb-8">
              <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors bg-gray-50 hover:bg-blue-50/30 group">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <CameraIcon className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-bold text-gray-800 text-lg">Jadilah Fotografer di AmbilFoto</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Upload foto event Anda, jual ke peserta, dan dapatkan penghasilan tambahan.
                      </p>
                    </div>
                    <Link to="/user/upgrade-to-photographer">
                      <Button className="bg-blue-600 hover:bg-blue-700 gap-2 shadow">
                        <UserCheck className="h-4 w-4" />
                        Daftar Jadi Fotografer
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex gap-2 mb-6 border-b-2 border-gray-200 overflow-x-auto">
            {[
              { id: 'overview',   label: 'Ringkasan',       icon: Sparkles },
              { id: 'purchases',  label: 'Pembelian Saya',  icon: ShoppingBag,
                badge: needsConfirmCount > 0 ? needsConfirmCount : null },
              { id: 'recent',     label: 'Foto Terbaru',    icon: Clock },
              { id: 'events',     label: 'Event',           icon: Calendar,
                badge: stats.events > 0 ? stats.events : null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {(tab as any).badge && (
                  <span className="ml-1 h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {(tab as any).badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-br from-blue-500 to-yellow-500 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="pt-8 pb-8 relative z-10">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <Scan className="h-10 w-10" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-bold mb-2">Temukan Lebih Banyak Foto Anda</h2>
                      <p className="text-white/90">Gunakan teknologi pengenalan wajah AI</p>
                    </div>
                    <Link to="/user/scan-face">
                      <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg">
                        <Camera className="mr-2 h-5 w-5" />Pindai Wajah
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {favoritePhotos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      <h2 className="text-2xl font-semibold text-gray-800">Kecocokan Terbaik</h2>
                    </div>
                    <Link to="/user/photos">
                      <Button variant="ghost" size="sm" className="gap-1 text-blue-600 hover:bg-blue-50">
                        Lihat Semua<ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {favoritePhotos.map((photo) => (
                      <Link key={photo.photo_id} to="/user/photos">
                        <Card className="overflow-hidden border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
                          <div className="aspect-square bg-gray-100 relative">
                            <AuthenticatedImage
                              src={photo.preview_url || aiService.getPreviewUrl(photo.photo_id)}
                              alt={photo.filename}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              {Math.round((photo.similarity || 0) * 100)}%
                            </div>
                            {photo.is_purchased && (
                              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">Dimiliki</div>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Purchases Preview */}
              {recentPurchases.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-blue-600" />
                      <h2 className="text-2xl font-semibold text-gray-800">Pembelian Terbaru</h2>
                    </div>
                    <Link to="/user/purchases">
                      <Button variant="ghost" size="sm" className="gap-1 text-blue-600 hover:bg-blue-50">
                        Lihat Semua<ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentPurchases.map((purchase) => (
                      <Card key={purchase.transaction_id} className="border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {purchase.photo.preview_url ? (
                                <AuthenticatedImage src={purchase.photo.preview_url} alt={purchase.photo.filename} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{purchase.photo.filename}</p>
                              <p className="text-xs text-gray-500 truncate">{purchase.photo.event_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getPurchaseStatusBadge(purchase.escrow.status)}
                                <span className="text-xs text-gray-500">• {purchase.photographer.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-bold text-sm text-gray-800">{purchase.payment.amount_formatted}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                                onClick={() => handleChatWithPhotographer(purchase)}
                                disabled={chattingId === purchase.transaction_id}
                              >
                                {chattingId === purchase.transaction_id
                                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                                  : <MessageCircle className="h-4 w-4" />
                                }
                              </Button>
                              {purchase.escrow.can_download && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-500 hover:bg-green-50"
                                  onClick={() => {
                                    if (purchase.photo.download_url) {
                                      const a = document.createElement('a');
                                      a.href = purchase.photo.download_url;
                                      a.download = purchase.photo.filename;
                                      a.click();
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {purchase.escrow.status === 'WAITING_CONFIRMATION' && (
                            <div className="mt-3 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 text-yellow-700 text-xs">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                  Konfirmasi dalam{' '}
                                  <strong>{buyerEscrowHelpers.formatTimeRemaining(purchase.escrow.hours_remaining)}</strong>
                                </span>
                              </div>
                              <Link to="/user/purchases">
                                <Button size="sm" className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-white">
                                  Konfirmasi
                                </Button>
                              </Link>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {topEvents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-yellow-600" />
                      <h2 className="text-2xl font-semibold text-gray-800">Event Terbaru</h2>
                    </div>
                    <Link to="/user/events">
                      <Button variant="ghost" size="sm" className="gap-1 text-blue-600 hover:bg-blue-50">
                        Lihat Semua<ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topEvents.map((event, i) => (
                      <Card
                        key={i}
                        className="border-2 border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigate(`/user/events/${event.name.toLowerCase().replace(/\s+/g, "-")}`)}
                      >
                        <div className="relative h-28 overflow-hidden rounded-t-xl bg-gradient-to-br from-yellow-50 to-blue-50">
                          {event.photos[0] && (
                            <AuthenticatedImage
                              src={event.photos[0].preview_url || aiService.getPreviewUrl(event.photos[0].photo_id)}
                              alt={event.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-70"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3">
                            <p className="text-white font-semibold text-sm truncate">{event.name}</p>
                          </div>
                        </div>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>{event.photos.length} foto</span>
                            <span className="text-green-600">{event.purchased} dimiliki</span>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Pembelian Saya ── */}
          {activeTab === 'purchases' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Pembelian Saya</h2>
                <Link to="/user/purchases">
                  <Button variant="outline" className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50">
                    Kelola Semua<ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {isPurchasesLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : recentPurchases.length === 0 ? (
                <Card className="border-2 border-gray-200 p-12 text-center bg-gray-50">
                  <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Belum Ada Pembelian</h3>
                  <p className="text-gray-600 mb-6">Beli foto hi-res dari event Anda</p>
                  <Link to="/user/photos">
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <Image className="h-5 w-5" />Lihat Foto Saya
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="space-y-4">
                  {recentPurchases.map((purchase) => (
                    <Card key={purchase.transaction_id} className="border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="w-full md:w-24 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {purchase.photo.preview_url ? (
                              <AuthenticatedImage src={purchase.photo.preview_url} alt={purchase.photo.filename} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold truncate">{purchase.photo.filename}</p>
                                <p className="text-sm text-gray-500">{purchase.photo.event_name}</p>
                                <p className="text-xs text-gray-400">Fotografer: {purchase.photographer.name}</p>
                              </div>
                              <div className="text-right">
                                {getPurchaseStatusBadge(purchase.escrow.status)}
                                <p className="font-bold text-gray-800 mt-1">{purchase.payment.amount_formatted}</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{purchase.escrow.status_message}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleChatWithPhotographer(purchase)}
                                disabled={chattingId === purchase.transaction_id}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50 gap-1.5"
                              >
                                {chattingId === purchase.transaction_id
                                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Membuka...</>
                                  : <><MessageCircle className="h-3.5 w-3.5" />Chat Fotografer</>
                                }
                              </Button>
                              {purchase.escrow.can_confirm && (
                                <Link to="/user/purchases">
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5">
                                    <CheckCircle className="h-3.5 w-3.5" />Konfirmasi
                                  </Button>
                                </Link>
                              )}
                              {purchase.escrow.can_download && purchase.photo.download_url && (
                                <Button
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = purchase.photo.download_url!;
                                    a.download = purchase.photo.filename;
                                    a.click();
                                    toast.success('Download dimulai!');
                                  }}
                                >
                                  <Download className="h-3.5 w-3.5" />Download Hi-Res
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="text-center pt-2">
                    <Link to="/user/purchases">
                      <Button variant="outline" className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                        Lihat Semua Pembelian<ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Foto Terbaru ── */}
          {activeTab === 'recent' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Foto Terbaru ({recentPhotos.length})</h2>
                {photos.length > 8 && (
                  <Link to="/user/photos">
                    <Button variant="outline" className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50">
                      Lihat Semua {stats.totalPhotos} Foto<ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden border-2 border-gray-200">
                      <Skeleton className="aspect-square w-full" />
                    </Card>
                  ))}
                </div>
              ) : recentPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recentPhotos.map((photo) => (
                    <Link key={photo.photo_id} to="/user/photos">
                      <Card className="overflow-hidden border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
                        <div className="aspect-square bg-gray-100 relative">
                          <AuthenticatedImage
                            src={photo.preview_url || aiService.getPreviewUrl(photo.photo_id)}
                            alt={photo.filename}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          {photo.is_purchased ? (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <Download className="h-3 w-3" />Dimiliki
                            </div>
                          ) : (
                            <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              {formatRupiah(photo.price_cash || 30000)}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                            <p className="text-xs text-white font-semibold truncate">{photo.event_name || 'Event'}</p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-gray-200 shadow-sm p-12 text-center bg-gray-50">
                  <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Belum Ada Foto</h3>
                  <p className="text-gray-600 mb-6">Mulai dengan pindai wajah</p>
                  <Link to="/user/scan-face">
                    <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <Camera className="h-5 w-5" />Pindai Wajah Sekarang
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          )}

          {/* ── Tab: Events ── */}
          {activeTab === 'events' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Event Saya ({eventStats.length})</h2>
                <Link to="/user/events">
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Calendar className="h-4 w-4" />Lihat Semua Event
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-2 border-gray-200 shadow-sm">
                      <Skeleton className="h-28 w-full" />
                      <CardContent className="pt-4"><Skeleton className="h-16 w-full" /></CardContent>
                    </Card>
                  ))}
                </div>
              ) : eventStats.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    {eventStats.slice(0, 6).map((event, index) => (
                      <Card
                        key={index}
                        className="border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group overflow-hidden cursor-pointer"
                        onClick={() => navigate(`/user/events/${event.name.toLowerCase().replace(/\s+/g, "-")}`)}
                      >
                        <div className="h-32 bg-gradient-to-br from-blue-100 to-yellow-100 relative overflow-hidden">
                          {event.photos[0] && (
                            <AuthenticatedImage
                              src={event.photos[0].preview_url || aiService.getPreviewUrl(event.photos[0].photo_id)}
                              alt={event.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-300"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="font-bold text-white text-lg truncate mb-1">{event.name}</h3>
                            <div className="flex items-center gap-2 text-white/90 text-xs">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          </div>
                        </div>
                        <CardContent className="pt-4 bg-white">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-2xl font-bold text-blue-600">{event.photos.length}</p>
                              <p className="text-xs text-gray-600">Total Foto</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">{event.purchased}</p>
                              <p className="text-xs text-gray-600">Dibeli</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Calendar className="h-3 w-3" />
                              {event.date 
                                ? new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '-'}
                            </div>
                            <span className="text-blue-600 font-medium flex items-center gap-1">
                              Lihat Foto<ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {eventStats.length > 6 && (
                    <div className="text-center">
                      <Link to="/user/events">
                        <Button variant="outline" className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                          Lihat {eventStats.length - 6} Event Lainnya<ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <Card className="border-2 border-gray-200 shadow-sm p-12 text-center bg-gray-50">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Belum Ada Event</h3>
                  <p className="text-gray-600">Event akan muncul setelah Anda menemukan foto</p>
                </Card>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserDashboard;