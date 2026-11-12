import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { photographerService, PhotoSalesData, PhotoSaleRecord } from "@/services/api/photographer.service";
import { aiService } from "@/services/api/ai.service";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Image,
  DollarSign,
  ShoppingCart,
  Search,
  ArrowUpDown,
  ArrowLeft,
  Crown,
  Flame,
  Sparkles,
  Calendar,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PhotoSales = () => {
  const [salesData, setSalesData] = useState<PhotoSalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"sales" | "revenue" | "recent">("sales");
  const [filterEvent, setFilterEvent] = useState<string>("all");

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      setIsLoading(true);
      const response = await photographerService.getPhotoSales();
      
      if (response.success && response.data) {
        setSalesData(response.data);
      } else {
        toast.error(response.error || 'Gagal memuat data penjualan');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get unique events for filter
  const events = salesData?.photos
    ? [...new Set(salesData.photos.map(p => p.event_name))]
    : [];

  // Filter and sort photos
  const filteredPhotos = salesData?.photos
    ?.filter(photo => {
      const matchesSearch = photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           photo.event_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEvent = filterEvent === "all" || photo.event_name === filterEvent;
      return matchesSearch && matchesEvent;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "sales":
          return b.total_sales - a.total_sales;
        case "revenue":
          return b.total_revenue - a.total_revenue;
        case "recent":
          return new Date(b.last_sale_at || 0).getTime() - new Date(a.last_sale_at || 0).getTime();
        default:
          return 0;
      }
    }) || [];

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 gap-1"><Crown className="h-3 w-3" /> #1 Best Seller</Badge>;
    if (index === 1) return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 gap-1"><Sparkles className="h-3 w-3" /> #2</Badge>;
    if (index === 2) return <Badge className="bg-gradient-to-r from-orange-600 to-orange-700 gap-1"><Flame className="h-3 w-3" /> #3</Badge>;
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/photographer/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Statistik Penjualan Foto
            </h1>
            <p className="text-muted-foreground mt-1">
              Lihat performa penjualan setiap foto Anda
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
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
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(salesData?.summary.total_revenue || 0)}</p>
                      <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{salesData?.summary.total_sales || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Penjualan</p>
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
                      <p className="text-2xl font-bold">{salesData?.summary.total_photos || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Foto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(salesData?.summary.avg_revenue_per_photo || 0)}</p>
                      <p className="text-sm text-muted-foreground">Rata-rata/Foto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Top Performers */}
        {!isLoading && salesData && salesData.top_performers.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Top Performers
              </CardTitle>
              <CardDescription>Foto dengan penjualan terbaik</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {salesData.top_performers.slice(0, 3).map((photo, index) => (
                  <div 
                    key={photo.photo_id} 
                    className={`relative rounded-xl overflow-hidden border-2 ${
                      index === 0 ? 'border-yellow-500/50' : 
                      index === 1 ? 'border-gray-400/50' : 'border-orange-600/50'
                    } animate-fade-in`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="aspect-video bg-muted">
                      <AuthenticatedImage
                        src={aiService.getPreviewUrl(photo.ai_photo_id)}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 left-2">
                      {getRankBadge(index)}
                    </div>
                    <div className="p-3 bg-card">
                      <p className="font-medium text-sm truncate">{photo.filename}</p>
                      <p className="text-xs text-muted-foreground truncate">{photo.event_name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-primary">{formatCurrency(photo.total_revenue)}</span>
                        <span className="text-xs text-muted-foreground">{photo.total_sales} sales</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari foto atau event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Event</SelectItem>
              {events.map(event => (
                <SelectItem key={event} value={event}>{event}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full md:w-48">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Penjualan Terbanyak</SelectItem>
              <SelectItem value="revenue">Pendapatan Tertinggi</SelectItem>
              <SelectItem value="recent">Penjualan Terbaru</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Photo Sales List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detail Penjualan Foto
            </CardTitle>
            <CardDescription>
              {filteredPhotos.length} foto ditemukan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Belum ada data penjualan</p>
                <p className="text-sm">Penjualan foto akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPhotos.map((photo, index) => (
                  <div 
                    key={photo.photo_id} 
                    className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                      <AuthenticatedImage
                        src={aiService.getPreviewUrl(photo.ai_photo_id)}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                      />
                      {index < 3 && sortBy === "sales" && (
                        <div className="absolute top-1 left-1">
                          {index === 0 && <Crown className="h-4 w-4 text-yellow-500 drop-shadow-lg" />}
                          {index === 1 && <Sparkles className="h-4 w-4 text-gray-400 drop-shadow-lg" />}
                          {index === 2 && <Flame className="h-4 w-4 text-orange-600 drop-shadow-lg" />}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{photo.filename}</p>
                      <p className="text-sm text-muted-foreground truncate">{photo.event_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {photo.last_sale_at 
                            ? format(new Date(photo.last_sale_at), 'dd MMM yyyy')
                            : 'Belum ada penjualan'
                          }
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {photo.view_count || 0} views
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{photo.total_sales}</p>
                        <p className="text-xs text-muted-foreground">Terjual</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{formatCurrency(photo.total_revenue)}</p>
                        <p className="text-xs text-muted-foreground">Pendapatan</p>
                      </div>
                      <div className="text-center hidden md:block">
                        <p className="text-sm font-medium">{formatCurrency(photo.price)}</p>
                        <p className="text-xs text-muted-foreground">Harga/foto</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PhotoSales;