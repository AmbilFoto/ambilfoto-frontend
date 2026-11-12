import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { paymentService, UserWallet, WalletHistoryItem, PurchasedPhoto, Transaction } from "@/services/api/payment.service";
import { 
  Wallet, 
  Star, 
  Plus, 
  History, 
  Image, 
  Download, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import HeaderDash from "@/components/layout/HeaderDash";

const UserWalletPage = () => {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<WalletHistoryItem[]>([]);
  const [purchasedPhotos, setPurchasedPhotos] = useState<PurchasedPhoto[]>([]);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const [walletRes, historyRes, purchasedRes] = await Promise.all([
        paymentService.getUserWallet(),
        paymentService.getWalletHistory({ limit: 20 }),
        paymentService.getPurchasedPhotos({ limit: 20 })
      ]);

      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data.wallet);
        setPurchasedCount(walletRes.data.purchased_photos_count);
        setRecentTransactions(walletRes.data.recent_transactions || []);
      }
      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
      if (purchasedRes.success && purchasedRes.data) {
        setPurchasedPhotos(purchasedRes.data);
      }
    } catch (error) {
      toast.error('Gagal memuat data FOTOPOIN');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to safely convert to number
  const toNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = toNumber(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numAmount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'point_topup':
      case 'topup':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'photo_purchase':
      case 'purchase':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'earning':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Dibayar</Badge>;
      case 'pending':
        return <Badge variant="secondary">Menunggu</Badge>;
      case 'expired':
        return <Badge variant="destructive">Kadaluarsa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderDash />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8" />
              FOTOPOIN Saya
            </h1>
            <p className="text-muted-foreground mt-1">
              Kelola FOTOPOIN Anda dan lihat riwayat transaksi
            </p>
          </div>
          <Link to="/user/topup">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Isi FOTOPOIN
            </Button>
          </Link>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-4 w-28" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {toNumber(wallet?.point_balance).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Saldo FOTOPOIN</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {toNumber(wallet?.total_points_earned).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">FOTOPOIN Diperoleh</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <ArrowDownRight className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {toNumber(wallet?.total_points_spent).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">FOTOPOIN Terpakai</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Image className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{purchasedCount}</p>
                      <p className="text-sm text-muted-foreground">Foto Dibeli</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Wallet className="h-4 w-4" />
              Ringkasan
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Riwayat
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <Image className="h-4 w-4" />
              Foto yang Dibeli
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Transaksi Terkini
                  </CardTitle>
                  <CardDescription>Aktivitas pembayaran terbaru Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : recentTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Belum ada transaksi</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentTransactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(tx.transaction_type)}
                            <div>
                              <p className="font-medium capitalize">
                                {tx.transaction_type.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(tx.amount)}</p>
                            {getStatusBadge(tx.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Statistik
                  </CardTitle>
                  <CardDescription>Ringkasan pengeluaran Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Total Pengeluaran (Tunai)</span>
                    <span className="font-bold">{formatCurrency(wallet?.total_spent_cash || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Total Transaksi</span>
                    <span className="font-bold">{wallet?.total_transactions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Nilai FOTOPOIN</span>
                    <span className="font-bold">1 FOTOPOIN = Rp 5.000</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Transaksi</CardTitle>
                <CardDescription>Riwayat lengkap semua transaksi Anda</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Belum ada riwayat transaksi</p>
                    <p className="text-sm">Transaksi Anda akan muncul di sini</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(item.transaction_type)}
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.created_at), 'dd MMM yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${item.transaction_type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.transaction_type === 'topup' ? '+' : '-'}{toNumber(item.amount).toFixed(2)} FOTOPOIN
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Saldo: {toNumber(item.balance_after).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Foto yang Dibeli
                </CardTitle>
                <CardDescription>Foto yang telah Anda beli dan dapat diunduh</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : purchasedPhotos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Belum ada foto yang dibeli</p>
                    <p className="text-sm mb-4">Foto yang Anda beli akan muncul di sini</p>
                    <Link to="/user/photos">
                      <Button variant="outline">Jelajahi Foto</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {purchasedPhotos.map((photo) => (
                      <div key={photo.id} className="flex items-center gap-4 p-4 rounded-lg border">
                        <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"}/photos/${photo.ai_photo_id}`}
                            alt={photo.filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{photo.filename}</p>
                          <p className="text-sm text-muted-foreground">{photo.event_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Oleh {photo.photographer_name} • {format(new Date(photo.purchased_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(photo.purchase_price)}</p>
                          <Badge variant="outline" className="mt-1">
                            {photo.payment_method === 'points' ? 'FOTOPOIN' : 'Tunai'}
                          </Badge>
                          <div className="mt-2">
                            <Button size="sm" variant="outline" className="gap-1">
                              <Download className="h-3 w-3" />
                              Unduh
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default UserWalletPage;