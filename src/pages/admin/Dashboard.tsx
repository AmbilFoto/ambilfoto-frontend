import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Camera, Image, Download, DollarSign, Activity, 
  Server, Database, AlertCircle, CheckCircle, RefreshCw,
  TrendingUp, Calendar, Eye, Wallet, Banknote, Settings, CreditCard, ArrowRight,
  Coins, ShoppingCart, Percent, Briefcase, UserCheck, BarChart3, FileText, 
  Clock, MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { adminService, DashboardStats } from '@/services/api/admin.service';
import { paymentService, WalletStatistics, WithdrawalAnalytics } from '@/services/api/payment.service';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';

// Revenue data interface matching the API response
interface RevenueData {
  period: string;
  summary?: {
    total_platform_revenue: string;
    total_transactions: number;
    avg_transaction: number;
    point_topup_revenue: string;
    photo_platform_fee: number;
    api_token_revenue: number;
    photo_gross_sales: number;
    photographer_earnings_total: number;
    unique_buyers: number;
  };
  revenue_sources?: {
    point_topup?: { amount: string; percentage: string };
    photo_platform_fee?: { amount: number; percentage: string };
    api_token?: { amount: number; percentage: string };
  };
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [walletStats, setWalletStats] = useState<WalletStatistics | null>(null);
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [dashboardRes, walletRes, withdrawalRes, revenueRes] = await Promise.all([
        adminService.getDashboardStats(),
        paymentService.getWalletStatistics(),
        paymentService.getWithdrawalAnalytics(),
        adminService.getRevenueAnalytics({ period: '30d' })
      ]);
      
      if (dashboardRes.success) {
        setStats(dashboardRes.data);
      }
      if (walletRes.success && walletRes.data) {
        setWalletStats(walletRes.data);
      }
      if (withdrawalRes.success && withdrawalRes.data) {
        setWithdrawalStats(withdrawalRes.data);
      }
      if (revenueRes.success && revenueRes.data) {
        setRevenueData(revenueRes.data);
      }
    } catch (error) {
      toast.error('Gagal memuat statistik dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num || 0);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dasbor Admin</h1>
            <p className="text-muted-foreground">
              Kelola dan monitor sistem AmbilFoto
            </p>
          </div>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Perbarui
          </Button>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Basis Data</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={stats?.system_health?.database === 'OK' ? 'default' : 'destructive'}>
                {stats?.system_health?.database === 'OK' ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Terhubung</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> Error</>
                )}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Server AI</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={stats?.system_health?.ai_server === 'OK' ? 'default' : 'destructive'}>
                {stats?.system_health?.ai_server === 'OK' ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Terhubung</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> {stats?.system_health?.ai_server || 'Tidak tersedia'}</>
                )}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats?.users?.total_users || 0)}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.users?.today_registrations || 0} hari ini
              </p>
              <div className="mt-2 flex gap-2 text-xs">
                <Badge variant="outline">{stats?.users?.regular_users || 0} Pengguna</Badge>
                <Badge variant="outline">{stats?.users?.photographers || 0} Fotografer</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Acara</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats?.events?.total_events || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.events?.active_events || 0} aktif
              </p>
              <div className="mt-2 flex gap-2 text-xs">
                <Badge variant="outline">{stats?.events?.public_events || 0} Publik</Badge>
                <Badge variant="outline">{stats?.events?.private_events || 0} Privat</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Foto</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats?.photos?.total_photos || 0)}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.photos?.today_uploads || 0} hari ini
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                {formatNumber(stats?.photos?.total_faces_detected || 0)} wajah terdeteksi
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan (30 hari)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(parseFloat(revenueData?.summary?.total_platform_revenue || '0'))}
              </div>
              <p className="text-xs text-muted-foreground">
                {revenueData?.summary?.total_transactions || 0} transaksi
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                {revenueData?.summary?.unique_buyers || 0} pembeli unik
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <Card className="mb-8 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Rincian Pendapatan (30 Hari)
              </CardTitle>
              <Link to="/admin/revenue">
                <Button variant="outline" size="sm" className="gap-1">
                  <DollarSign className="h-4 w-4" />
                  Detail Pendapatan
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* HIDDEN: FotoPoin Top-Up Revenue Card
              <div className="p-4 bg-background/80 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-muted-foreground">Isi Ulang Poin</p>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(parseFloat(revenueData?.summary?.point_topup_revenue || '0'))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {revenueData?.revenue_sources?.point_topup?.percentage || '0'}% dari total
                </p>
              </div>
              */}
              <div className="p-4 bg-background/80 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  <p className="text-sm text-muted-foreground">Penjualan Foto</p>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(revenueData?.summary?.photo_gross_sales || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Biaya platform: {formatCurrency(revenueData?.summary?.photo_platform_fee || 0)}
                </p>
              </div>
              <div className="p-4 bg-background/80 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Token API</p>
                </div>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(revenueData?.summary?.api_token_revenue || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {revenueData?.revenue_sources?.api_token?.percentage || '0'}% dari total
                </p>
              </div>
              <div className="p-4 bg-background/80 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Rata-rata Transaksi</p>
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(revenueData?.summary?.avg_transaction || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fotografer: {formatCurrency(revenueData?.summary?.photographer_earnings_total || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pencocokan Wajah</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats?.matches?.total_matches || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.matches?.unique_users_matched || 0} pengguna unik
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rata-rata akurasi: {((stats?.matches?.avg_confidence || 0) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kunci API</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats?.api_keys?.total_api_keys || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.api_keys?.active_keys || 0} aktif
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                {formatNumber(stats?.api_keys?.total_tokens_used || 0)} token terpakai
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendapatan Token</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.tokens?.total_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.tokens?.total_transactions || 0} transaksi
              </p>
              <div className="mt-2 flex gap-2 text-xs">
                <Badge variant="outline">{stats?.tokens?.purchases || 0} Pembelian</Badge>
                <Badge variant="outline">{stats?.tokens?.renewals || 0} Perpanjangan</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet & Withdrawal Stats */}
        <Card className="mb-8 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Statistik Dompet & Penarikan
              </CardTitle>
              <div className="flex gap-2">
                <Link to="/admin/withdrawals">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Banknote className="h-4 w-4" />
                    Kelola Penarikan
                  </Button>
                </Link>
                <Link to="/admin/settings">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Settings className="h-4 w-4" />
                    Pengaturan
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* HIDDEN: User FotoPoin balance card
              <div className="p-4 bg-background/80 rounded-lg">
                <p className="text-sm text-muted-foreground">Poin Pengguna di Sistem</p>
                <p className="text-xl font-bold text-primary">
                  {walletStats?.user_wallets?.total_points_in_system?.toLocaleString('id-ID') || '0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {walletStats?.user_wallets?.total_wallets || 0} dompet
                </p>
              </div>
              */}
              <div className="p-4 bg-background/80 rounded-lg">
                <p className="text-sm text-muted-foreground">Saldo Fotografer</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(walletStats?.photographer_wallets?.total_balance || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {walletStats?.photographer_wallets?.total_wallets || 0} fotografer
                </p>
              </div>
              <div className="p-4 bg-background/80 rounded-lg">
                <p className="text-sm text-muted-foreground">Penarikan Tertunda</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(withdrawalStats?.summary?.pending_amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {withdrawalStats?.summary?.pending_count || 0} permintaan
                </p>
              </div>
              <div className="p-4 bg-background/80 rounded-lg">
                <p className="text-sm text-muted-foreground">Disetujui (Belum Dibayar)</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(withdrawalStats?.summary?.approved_amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {withdrawalStats?.summary?.approved_count || 0} disetujui
                </p>
              </div>
              <div className="p-4 bg-background/80 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Ditarik</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(withdrawalStats?.summary?.paid_amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {withdrawalStats?.summary?.paid_count || 0} penarikan dibayar
                </p>
              </div>
            </div>
            {(withdrawalStats?.summary?.pending_count || 0) > 0 && (
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium">
                    {withdrawalStats?.summary?.pending_count} permintaan penarikan menunggu persetujuan
                  </span>
                </div>
                <Link to="/admin/withdrawals">
                  <Button size="sm" variant="outline" className="gap-1">
                    Tinjau Sekarang <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* B2B & Advanced Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/admin/dropbox-import">
            <Card className="hover:shadow-lg cursor-pointer transition-all bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5 text-blue-600" />
                    Import Dropbox B2B
                  </CardTitle>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Enterprise
                  </Badge>
                </div>
                <CardDescription>
                  Import foto dari Dropbox untuk klien korporat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Manajemen foto massal</span>
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/hires-analytics">
            <Card className="hover:shadow-lg cursor-pointer transition-all bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Analitik HiRes
                  </CardTitle>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Premium
                  </Badge>
                </div>
                <CardDescription>
                  Monitor dan analisis penjualan foto HiRes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pelacakan performa penjualan</span>
                  <ArrowRight className="h-4 w-4 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-7">
          <Link to="/admin/users">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Users className="h-8 w-8 mb-2 text-primary" />
                <span className="text-sm font-medium">Pengguna</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/photographer-requests">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Briefcase className="h-8 w-8 mb-2 text-primary" />
                <span className="text-sm font-medium">Request</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/photographer-statistics">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <BarChart3 className="h-8 w-8 mb-2 text-primary" />
                <span className="text-sm font-medium">Statistik</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/events">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Camera className="h-8 w-8 mb-2 text-primary" />
                <span className="text-sm font-medium">Acara</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/downloads">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Download className="h-8 w-8 mb-2 text-primary" />
                <span className="text-sm font-medium">Unduhan</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/settings">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Settings className="h-8 w-8 mb-2 text-primary" />
                <span className="text-sm font-medium">Pengaturan</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/chat-management">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <MessageCircle className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Pesan Keluhan</span>
            </CardContent>
          </Card>
        </Link>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru (24 Jam)</CardTitle>
            <CardDescription>Aktivitas teratas dalam 24 jam terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.recent_activity?.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{activity.action}</span>
                  <Badge variant="secondary">{activity.count}x</Badge>
                </div>
              ))}
              {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada aktivitas terbaru
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;