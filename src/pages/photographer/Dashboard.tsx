import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { photographerService, PhotographerStats, Event, PhotographerProfile } from "@/services/api/photographer.service";
import { paymentService, PhotographerWallet } from "@/services/api/payment.service";
import { 
  Camera, 
  Calendar, 
  Image, 
  Users, 
  Download, 
  DollarSign,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Wallet,
  Banknote,
  UserPlus,
  MapPin,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Images,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Import Location Components
import LocationCompletionModal from "@/components/LocationCompletionModal";
import usePhotographerLocationCheck from "@/hooks/usePhotographerLocationCheck";

const PhotographerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PhotographerStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [wallet, setWallet] = useState<PhotographerWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  // Location Check Hook
  const {
    showModal,
    profileComplete,
    loading: checkingProfile,
    locationData,
    handleModalClose,
    handleLocationComplete,
    reopenModal
  } = usePhotographerLocationCheck();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, eventsRes, walletRes, profileRes] = await Promise.all([
          photographerService.getStatistics(),
          photographerService.getMyEvents(),
          paymentService.getPhotographerWallet(),
          photographerService.getProfile()
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
        if (eventsRes.success && eventsRes.data) {
          setEvents(eventsRes.data);
        }
        if (walletRes.success && walletRes.data) {
          setWallet(walletRes.data.wallet);
        }
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const isLocationComplete = Boolean(
    profile?.province_id && 
    profile?.province_name && 
    profile?.city_id && 
    profile?.city_name
  );

  const recentEvents = events.slice(0, 5);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numAmount || 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Location Completion Modal */}
      <LocationCompletionModal
        open={showModal}
        onClose={handleModalClose}
        onComplete={handleLocationComplete}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Selamat datang kembali, {user?.full_name?.split(' ')[0]}! 📸
            </h1>
            <p className="text-muted-foreground mt-1">
              Kelola acara dan foto Anda dari dasbor
            </p>
          </div>
          <Link to="/photographer/events/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Acara
            </Button>
          </Link>
        </div>

        {/* Location Status Alert */}
        {!isLoading && !isLocationComplete && (
          <Alert className="mb-6 border-2 border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-amber-900 text-base">Lengkapi Profil Lokasi Anda</p>
                  <Badge variant="outline" className="border-amber-600 text-amber-700 bg-amber-100">
                    Diperlukan
                  </Badge>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Tambahkan informasi provinsi dan kota untuk meningkatkan visibilitas profil Anda 
                  dan memudahkan klien menemukan fotografer terdekat.
                </p>
              </div>
              <Button 
                size="default" 
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm whitespace-nowrap"
                onClick={reopenModal}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Lengkapi Sekarang
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Location Success Badge */}
        {!isLoading && isLocationComplete && (
          <Alert className="mb-6 border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <AlertDescription>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-emerald-900">
                    Lokasi Anda:
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-600 text-emerald-800 bg-white font-medium">
                      <MapPin className="h-3 w-3 mr-1" />
                      {profile?.city_name}
                    </Badge>
                    <span className="text-emerald-600">•</span>
                    <Badge variant="outline" className="border-emerald-600 text-emerald-800 bg-white font-medium">
                      {profile?.province_name}
                    </Badge>
                    <Badge className="bg-emerald-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Terverifikasi
                    </Badge>
                  </div>
                </div>
                <Link to="/photographer/profile">
                  <Button variant="outline" size="sm" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                    Edit Lokasi
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.events?.total_events ?? events.length}</p>
                      <p className="text-sm text-muted-foreground">Total Acara</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/20">
                      <Image className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.photos?.total_photos || 0}</p>
                      <p className="text-sm text-muted-foreground">Foto Diunggah</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.photos?.total_faces_detected || 0}</p>
                      <p className="text-sm text-muted-foreground">Wajah Terdeteksi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Download className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{wallet?.total_sales || 0}</p>
                      <p className="text-sm text-muted-foreground">Penjualan Foto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Wallet Section */}
        <Card className="mb-8 bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                Dompet Fotografer
              </CardTitle>
              <Link to="/photographer/wallet">
                <Button variant="ghost" size="sm" className="gap-1 hover:bg-emerald-50">
                  Lihat Detail <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white/80 rounded-lg border border-emerald-200">
                <p className="text-sm text-muted-foreground mb-1">Total Saldo</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(wallet?.balance || 0)}
                </p>
              </div>
              <div className="p-4 bg-white/80 rounded-lg border border-gray-200">
                <p className="text-sm text-muted-foreground mb-1">Dapat Ditarik</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(wallet?.available_for_withdrawal || 0)}
                </p>
              </div>
              <div className="p-4 bg-white/80 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Total Pendapatan</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(wallet?.total_earned || 0)}
                </p>
              </div>
              <div className="p-4 bg-white/80 rounded-lg border border-amber-200">
                <p className="text-sm text-muted-foreground mb-1">Tertunda</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatCurrency(wallet?.pending_withdrawal || 0)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Link to="/photographer/wallet">
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                  <Banknote className="h-4 w-4" />
                  Ajukan Penarikan
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Recent Events */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="md:col-span-1 hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Menu Photographer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/photographer/events/new" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 hover:bg-primary/5 hover:border-primary/30">
                  <Plus className="h-4 w-4" />
                  Buat Acara Baru
                </Button>
              </Link>
              <Link to="/photographer/events" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 hover:bg-primary/5 hover:border-primary/30">
                  <Calendar className="h-4 w-4" />
                  Lihat Semua Acara
                </Button>
              </Link>
              <Link to="/photographer/my-photos" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 hover:bg-primary/5 hover:border-primary/30">
                  <Images className="h-4 w-4" />
                  Foto Saya
                </Button>
              </Link>
              <Link to="/photographer/fotomap" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 hover:bg-primary/5 hover:border-primary/30">
                  <MapPin className="h-4 w-4" />
                  Fotomap
                </Button>
              </Link>
              <Link to="/photographer/profile" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 hover:bg-primary/5 hover:border-primary/30">
                  <Camera className="h-4 w-4" />
                  Edit Profil Bisnis
                </Button>
              </Link>
              
              {/* Location Setup Button - Only show if incomplete */}
              {!checkingProfile && !profileComplete && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 border-amber-500/50 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-500"
                  onClick={reopenModal}
                >
                  <MapPin className="h-4 w-4" />
                  <span className="flex-1 text-left">Lengkapi Lokasi</span>
                  <Badge variant="outline" className="ml-auto border-amber-600 text-amber-700 bg-amber-100 text-xs">
                    Diperlukan
                  </Badge>
                </Button>
              )}
              
              <Link to="/photographer/pending-orders" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50">
                  <Download className="h-4 w-4" />
                  Antrian Photo Hi-Res 
                </Button>
              </Link>
              <Link to="/photographer/chat" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 text-rose-600 border-rose-500/30 hover:bg-rose-50">
                  <MessageCircle className="h-4 w-4" />
                  Pesan Keluhan
                </Button>
              </Link>
              
              {/* Show upgrade option only for regular users */}
              {user?.role === 'user' && (
                <Link to="/user/upgrade-to-photographer" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3 text-blue-600 border-blue-500/30 hover:bg-blue-50">
                    <UserPlus className="h-4 w-4" />
                    Upgrade ke Fotografer
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card className="md:col-span-2 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Acara Terbaru
                </CardTitle>
                <CardDescription>Aktivitas acara terbaru Anda</CardDescription>
              </div>
              <Link to="/photographer/events">
                <Button variant="ghost" size="sm" className="gap-1">
                  Lihat Semua <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-2">Belum ada acara</p>
                  <Link to="/photographer/events/new">
                    <Button variant="link" className="mt-2">
                      Buat acara pertama Anda
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <Link
                      key={event.id}
                      to={`/photographer/events/${event.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all"
                    >
                      <div>
                        <p className="font-medium">{event.event_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.event_date), 'dd MMM yyyy', { locale: id })} • {event.photo_count || 0} foto
                        </p>
                      </div>
                      <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                        {event.status === 'active' ? 'Aktif' : event.status === 'completed' ? 'Selesai' : event.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Keterlibatan Pengguna
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats?.users?.unique_users || 0}</p>
                  <p className="text-sm text-muted-foreground">Pengguna unik tercocokkan</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{stats?.events?.active_events ?? events.filter((event) => event.status === 'active').length}</p>
                  <p className="text-sm text-muted-foreground">Acara aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ringkasan Pendapatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(wallet?.total_earned || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total pendapatan</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{stats?.events?.completed_events ?? events.filter((event) => event.status === 'completed').length}</p>
                  <p className="text-sm text-muted-foreground">Acara selesai</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PhotographerDashboard;