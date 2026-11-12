import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  TrendingUp, 
  Users, 
  Download,
  BarChart3,
  Globe,
  RefreshCw,
  Activity,
  Target
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import axios from "axios";
import { API_BASE_URL } from "@/services/api/api.config";

const API_URL = API_BASE_URL;

// Buat instance axios terautentikasi
const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Summary {
  total_photographers: number;
  photographers_with_location: number;
  location_completion_rate: number;
  top_province: string | null;
  top_province_count: number;
  top_city: string | null;
  top_city_count: number;
}

interface ProvinceData {
  province: string;
  province_id: string;
  total: number;
  percentage: number | string;
}

interface CityData {
  city: string;
  city_id: string;
  province: string;
  province_id: string;
  total: number;
}

interface CoverageData {
  total_provinces: number;
  total_cities: number;
  provinces: Array<{
    province_name: string;
    province_id: string;
    photographers: number;
  }>;
}

// Palet warna untuk grafik (ganti purple dengan biru dan kuning)
const GRADIENT_COLORS = [
  '#6366f1', '#3b82f6', '#0ea5e9', '#f59e0b', '#10b981',
  '#06b6d4', '#84cc16', '#eab308', '#ef4444', '#f97316'
];

const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#3b82f6', // Ganti purple dengan biru
  accent: '#eab308', // Ganti pink dengan kuning
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const safePercentage = (value: number | string | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? 0 : num;
};

// Komponen Tooltip Kustom
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-primary font-bold">
          {payload[0].value} fotografer
        </p>
        {payload[0].payload.percentage && (
          <p className="text-xs text-muted-foreground">
            {safePercentage(payload[0].payload.percentage).toFixed(1)}% dari total
          </p>
        )}
      </div>
    );
  }
  return null;
};

const AdminPhotographerStatistics = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, provincesRes, citiesRes, coverageRes] = await Promise.all([
        adminApi.get('/admin/statistics/photographers/summary'),
        adminApi.get('/admin/statistics/photographers/province'),
        adminApi.get('/admin/statistics/photographers/city'),
        adminApi.get('/admin/statistics/photographers/coverage'),
      ]);

      if (summaryRes.data.success) setSummary(summaryRes.data.data);
      if (provincesRes.data.success) setProvinces(provincesRes.data.data);
      if (citiesRes.data.success) setCities(citiesRes.data.data);
      if (coverageRes.data.success) setCoverage(coverageRes.data.data);
    } catch (error: any) {
      toast({
        title: "Kesalahan",
        description: error.response?.data?.error || "Gagal memuat statistik",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminApi.get('/admin/statistics/photographers/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fotografer_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Berhasil",
        description: "Data berhasil diexport",
      });
    } catch (error: any) {
      toast({
        title: "Kesalahan",
        description: "Gagal export data",
        variant: "destructive",
      });
    }
  };

  const filteredCities = selectedProvince
    ? cities.filter(c => c.province_id === selectedProvince)
    : cities;

  // Siapkan data grafik
  const topProvincesChart = provinces.slice(0, 10).map(p => ({
    name: p.province.length > 15 ? p.province.substring(0, 15) + '...' : p.province,
    value: p.total,
    percentage: safePercentage(p.percentage),
    fullName: p.province
  }));

  const topCitiesChart = filteredCities.slice(0, 10).map((c, index) => ({
    name: c.city.length > 12 ? c.city.substring(0, 12) + '...' : c.city,
    value: c.total,
    province: c.province,
    fullName: c.city,
    fill: GRADIENT_COLORS[index % GRADIENT_COLORS.length]
  }));

  // Data grafik pie untuk kelengkapan lokasi
  const locationCompletionData = summary ? [
    { 
      name: 'Dengan Lokasi', 
      value: summary.photographers_with_location,
      color: CHART_COLORS.success
    },
    { 
      name: 'Tanpa Lokasi', 
      value: summary.total_photographers - summary.photographers_with_location,
      color: '#94a3b8'
    }
  ] : [];

  // Data radial bar untuk cakupan
  const coverageRadialData = coverage ? [
    {
      name: 'Cakupan',
      value: (coverage.total_provinces / 34) * 100,
      fill: CHART_COLORS.primary
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Bagian Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-blue-500 to-yellow-500 bg-clip-text text-transparent">
              Analitik Fotografer
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Wawasan distribusi dan lokasi secara real-time
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              className="hover:bg-blue-500 transition-all"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              className="hover:bg-primary/10 transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Kartu Ringkasan dengan Efek Cahaya */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-primary/20">
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
              <CardContent className="pt-6 relative">
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all" />
                    <Users className="h-10 w-10 mx-auto text-primary relative" />
                  </div>
                  <p className="text-4xl font-bold bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent">
                    {summary.total_photographers}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">Total Fotografer</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-green-500/20 hover:border-green-500/40 transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent" />
              <CardContent className="pt-6 relative">
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full group-hover:bg-green-500/30 transition-all" />
                    <MapPin className="h-10 w-10 mx-auto text-green-600 relative" />
                  </div>
                  <p className="text-4xl font-bold text-green-600">
                    {summary.photographers_with_location}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">Dengan Lokasi</p>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                    {safePercentage(summary.location_completion_rate).toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-blue-500/20 hover:border-blue-500/40 transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
              <CardContent className="pt-6 relative">
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-500/30 transition-all" />
                    <TrendingUp className="h-10 w-10 mx-auto text-blue-600 relative" />
                  </div>
                  <p className="text-xl font-bold text-blue-600 truncate px-2">
                    {summary.top_province || 'T/A'}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">Provinsi Teratas</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.top_province_count} fotografer
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-yellow-500/20 hover:border-yellow-500/40 transition-all group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent" />
              <CardContent className="pt-6 relative">
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full group-hover:bg-yellow-500/30 transition-all" />
                    <BarChart3 className="h-10 w-10 mx-auto text-yellow-600 relative" />
                  </div>
                  <p className="text-xl font-bold text-yellow-600 truncate px-2">
                    {summary.top_city || 'T/A'}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">Kota Teratas</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.top_city_count} fotografer
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ikhtisar Cakupan dengan Grafik */}
        {!loading && coverage && summary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Statistik Cakupan */}
            <Card className="lg:col-span-1 border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Cakupan Indonesia
                </CardTitle>
                <CardDescription>Statistik jangkauan nasional</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-6">
                  <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      {coverage.total_provinces}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground mt-2">Provinsi Tercakup</p>
                    <p className="text-xs text-muted-foreground">dari 34 provinsi</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                    <p className="text-5xl font-bold text-green-600">{coverage.total_cities}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-2">Kota Terjangkau</p>
                    <p className="text-xs text-muted-foreground">di seluruh Indonesia</p>
                  </div>

                  {/* Progress Radial */}
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" 
                        cy="50%" 
                        innerRadius="60%" 
                        outerRadius="90%" 
                        barSize={15}
                        data={coverageRadialData}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          background
                          dataKey="value"
                          cornerRadius={10}
                          fill={CHART_COLORS.primary}
                        />
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-3xl font-bold fill-primary"
                        >
                          {coverageRadialData[0]?.value.toFixed(1)}%
                        </text>
                        <text
                          x="50%"
                          y="60%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs fill-muted-foreground"
                        >
                          Akumulasi
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grafik Pie Kelengkapan Lokasi - DIPERBESAR */}
            <Card className="lg:col-span-2 border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Ikhtisar Kelengkapan Lokasi
                </CardTitle>
                <CardDescription>Distribusi fotografer dengan data lokasi</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={locationCompletionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={160}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {locationCompletionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bagian Grafik */}
        <Tabs defaultValue="provinces" className="space-y-6">
          <TabsList className="bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="provinces" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              Analitik Provinsi
            </TabsTrigger>
            <TabsTrigger value="cities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analitik Kota
            </TabsTrigger>
          </TabsList>

          {/* Tab Provinsi */}
          <TabsContent value="provinces" className="space-y-6">
            {/* Grafik Bar */}
            <Card className="border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle>Distribusi 10 Provinsi Teratas</CardTitle>
                <CardDescription>Representasi visual kepadatan fotografer berdasarkan provinsi</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {loading ? (
                  <Skeleton className="h-80 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topProvincesChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="value" 
                        fill="url(#colorBar)" 
                        radius={[8, 8, 0, 0]}
                        animationBegin={0}
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Tampilan Daftar */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Peringkat Provinsi Terperinci</CardTitle>
                <CardDescription>Rincian lengkap fotografer per provinsi</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : provinces.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Tidak ada data tersedia</p>
                ) : (
                  <div className="space-y-3">
                    {provinces.map((prov, idx) => (
                      <div
                        key={prov.province_id}
                        className="group relative overflow-hidden flex items-center justify-between p-5 rounded-xl border border-primary/10 hover:border-primary/30 bg-gradient-to-r from-background via-background to-primary/5 hover:to-primary/10 transition-all cursor-pointer"
                        onClick={() => setSelectedProvince(prov.province_id)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-4 relative">
                          <Badge 
                            variant="outline" 
                            className={`text-lg font-bold w-12 h-12 flex items-center justify-center ${
                              idx === 0 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                              idx === 1 ? 'bg-gray-400/10 text-gray-600 border-gray-400/30' :
                              idx === 2 ? 'bg-orange-500/10 text-orange-600 border-orange-500/30' :
                              'bg-primary/10 text-primary border-primary/30'
                            }`}
                          >
                            {idx + 1}
                          </Badge>
                          <div>
                            <p className="font-bold text-lg">{prov.province}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-blue-600 transition-all duration-500"
                                  style={{ width: `${Math.min(safePercentage(prov.percentage), 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground font-medium">
                                {safePercentage(prov.percentage).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right relative">
                          <p className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            {prov.total}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">fotografer</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Kota - DIGANTI JADI DONUT CHART */}
          <TabsContent value="cities" className="space-y-6">
            {/* Grafik Donut Chart */}
            <Card className="border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Distribusi 10 Kota Teratas</CardTitle>
                    <CardDescription>Konsentrasi fotografer di kota-kota besar</CardDescription>
                  </div>
                  {selectedProvince && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProvince("")}
                      className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      Hapus Filter
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative">
                {loading ? (
                  <Skeleton className="h-96 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={500}>
                    <PieChart>
                      <Pie
                        data={topCitiesChart}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={180}
                        innerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {topCitiesChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Tampilan Daftar */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Peringkat Kota Terperinci</CardTitle>
                <CardDescription>
                  {selectedProvince 
                    ? `Menampilkan kota di ${provinces.find(p => p.province_id === selectedProvince)?.province}`
                    : '20 kota teratas nasional'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredCities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Tidak ada data tersedia</p>
                ) : (
                  <div className="space-y-3">
                    {filteredCities.slice(0, 20).map((city, idx) => (
                      <div
                        key={city.city_id}
                        className="group relative overflow-hidden flex items-center justify-between p-5 rounded-xl border border-blue-500/10 hover:border-blue-500/30 bg-gradient-to-r from-background via-background to-blue-500/5 hover:to-blue-500/10 transition-all"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-4 relative">
                          <Badge 
                            variant="outline" 
                            className="font-bold w-12 h-12 flex items-center justify-center bg-blue-500/10 text-blue-600 border-blue-500/30"
                          >
                            {idx + 1}
                          </Badge>
                          <div>
                            <p className="font-bold text-lg">{city.city}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {city.province}
                            </p>
                          </div>
                        </div>
                        <div className="text-right relative">
                          <p className="text-3xl font-bold text-blue-600">{city.total}</p>
                          <p className="text-xs text-muted-foreground font-medium">fotografer</p>
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
    </div>
  );
};

export default AdminPhotographerStatistics;