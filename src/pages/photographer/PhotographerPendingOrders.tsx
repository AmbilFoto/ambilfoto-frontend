// src/pages/PhotographerPendingOrders.tsx

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { photographerEscrowService, PendingOrder } from '@/services/api/photographer.escrow.service';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Upload, Clock, AlertTriangle, RefreshCw, ArrowLeft, 
  Image, User, Calendar, DollarSign, Package, CheckCircle,
  FileImage, AlertCircle, RotateCcw, Camera, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface OrderStats {
  total_pending: number;
  total_overdue: number;
  total_urgent: number;
  total_revisions: number;
  total_earning_pending: number;
}

const PhotographerPendingOrders = () => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  
  // State modal unggah
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [photographerNotes, setPhotographerNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchOrders();
  }, [activeTab, showOverdueOnly]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      
      const params: any = {};
      if (activeTab === 'new') params.status = 'new';
      if (activeTab === 'revision') params.status = 'revision';
      
      const response = await photographerEscrowService.getPendingOrders(params);
      
      if (response.success && response.data) {
        let fetchedOrders = response.data;
        
        if (showOverdueOnly) {
          fetchedOrders = fetchedOrders.filter(o => o.deadline.is_overdue);
        }
        
        setOrders(fetchedOrders);
        
        if (response.summary) {
          setStats(response.summary);
        }
      } else {
        toast.error(response.error || 'Gagal memuat pesanan');
      }
    } catch (error) {
      toast.error('Gagal memuat pesanan yang tertunda');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format file tidak valid. Gunakan JPG, PNG, atau TIFF.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar. Maksimum 50MB.');
      return;
    }

    setUploadFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedOrder || !uploadFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', uploadFile);
      if (photographerNotes) {
        formData.append('photographer_notes', photographerNotes);
      }

      setUploadProgress(50);

      const response = await photographerEscrowService.uploadHiRes(
        selectedOrder.transaction_id,
        formData
      );

      setUploadProgress(90);

      if (response.success) {
        toast.success('Hi-Res berhasil diunggah! Pembeli telah diberitahu.');
        closeUploadModal();
        fetchOrders();
      } else {
        toast.error(response.error || 'Gagal mengunggah Hi-Res');
        if (response.hint) {
          toast.info(response.hint);
        }
      }

      setUploadProgress(100);
    } catch (error) {
      toast.error('Gagal mengunggah Hi-Res');
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadModal = (order: PendingOrder) => {
    setSelectedOrder(order);
    setUploadModalOpen(true);
    setUploadFile(null);
    setUploadPreview(null);
    setPhotographerNotes('');
    setUploadProgress(0);
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setSelectedOrder(null);
    setUploadFile(null);
    setUploadPreview(null);
    setPhotographerNotes('');
    setUploadProgress(0);
  };

  const getUrgencyBadge = (urgency: string) => {
    const config = {
      overdue: { color: 'bg-red-500', icon: AlertTriangle, label: 'TERLAMBAT' },
      urgent: { color: 'bg-orange-500', icon: Clock, label: 'MENDESAK' },
      warning: { color: 'bg-yellow-500', icon: Clock, label: 'PERINGATAN' },
      normal: { color: 'bg-blue-500', icon: Clock, label: 'NORMAL' },
      waiting: { color: 'bg-gray-500', icon: Clock, label: 'MENUNGGU' },
    };

    const { color, icon: Icon, label } = config[urgency as keyof typeof config] || config.normal;

    return (
      <Badge className={`${color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredOrders = orders.filter(order => {
    if (showOverdueOnly && !order.deadline.is_overdue) return false;
    
    switch (activeTab) {
      case 'new':
        return order.status.escrow === 'HELD';
      case 'revision':
        return order.status.escrow === 'REVISION_REQUESTED';
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <OrderLifecyclePanel role="photographer" />
        {/* Judul Halaman */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/photographer/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                Unggah Hires
              </h1>
              <p className="text-muted-foreground mt-1">
                Unggah foto hi-res untuk pesanan yang sudah dibeli. Pastikan untuk mengunggah sebelum batas waktu.
              </p>
            </div>
          </div>
          
          <Button onClick={fetchOrders} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Perbarui
          </Button>
        </div>

        {/* Kartu Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className={stats?.total_pending ? 'border-primary/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total_pending || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Tertunda</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats?.total_overdue ? 'border-red-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats?.total_overdue || 0}</p>
                  <p className="text-sm text-muted-foreground">Terlambat</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats?.total_urgent ? 'border-orange-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{stats?.total_urgent || 0}</p>
                  <p className="text-sm text-muted-foreground">Mendesak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats?.total_revisions ? 'border-yellow-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <RotateCcw className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.total_revisions || 0}</p>
                  <p className="text-sm text-muted-foreground">Revisi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(stats?.total_earning_pending || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Penghasilan Tertunda</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Peringatan Terlambat */}
        {(stats?.total_overdue || 0) > 0 && (
          <Alert className="mb-6 border-red-500/50 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{stats?.total_overdue} foto melewati batas waktu 48 jam!</strong>
              {' '}Unggah segera untuk menghindari persetujuan otomatis dan penilaian buruk.
            </AlertDescription>
          </Alert>
        )}

        {/* Tab */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <Package className="h-4 w-4" />
                Semua ({stats?.total_pending || 0})
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2">
                <Upload className="h-4 w-4" />
                Pesanan Baru
              </TabsTrigger>
              <TabsTrigger value="revision" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Revisi ({stats?.total_revisions || 0})
              </TabsTrigger>
            </TabsList>

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Hanya yang terlambat</span>
            </label>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">Tidak ada pesanan tertunda</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all' 
                      ? 'Semua pesanan telah diproses'
                      : `Tidak ada pesanan ${activeTab === 'new' ? 'baru' : 'revisi'} saat ini`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card 
                    key={order.transaction_id} 
                    className={order.deadline.is_overdue ? 'border-red-500/50 bg-red-50/50' : ''}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Pratinjau Foto */}
                        <div className="w-full md:w-32 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {order.photo.preview_url ? (
                            <img 
                              src={order.photo.preview_url}
                              alt={order.photo.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileImage className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Informasi Pesanan */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold truncate">{order.photo.filename}</h3>
                              <p className="text-sm text-muted-foreground">{order.photo.event_name}</p>
                            </div>
                            <div className="text-right space-y-2">
                              {getUrgencyBadge(order.status.urgency)}
                              <p className="text-lg font-bold text-green-600">
                                {order.payment.your_earning_formatted}
                              </p>
                            </div>
                          </div>

                          {/* Grid Detail */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{order.buyer.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(new Date(order.purchased_at), 'dd MMM yyyy', { locale: id })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>{formatCurrency(order.payment.total_amount)}</span>
                            </div>
                          </div>

                          {/* Progress Deadline */}
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className={order.deadline.is_overdue ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                                {order.deadline.is_overdue ? '🔴 TERLAMBAT!' : order.deadline.upload_deadline}
                              </span>
                              <span className={order.deadline.is_overdue ? 'text-red-600 font-bold' : ''}>
                                {order.deadline.is_overdue 
                                  ? `${Math.abs(order.deadline.hours_remaining).toFixed(1)}j terlambat`
                                  : `${order.deadline.hours_remaining.toFixed(1)}j tersisa`
                                }
                              </span>
                            </div>
                            <Progress 
                              value={Math.min((48 - Math.max(order.deadline.hours_remaining, 0)) / 48 * 100, 100)}
                              className={order.deadline.is_overdue ? '[&>div]:bg-red-500' : order.deadline.is_urgent ? '[&>div]:bg-orange-500' : ''}
                            />
                          </div>

                          {/* Info Revisi */}
                          {order.revision && (
                            <Alert className="mb-3 border-orange-500/50 bg-orange-50">
                              <RotateCcw className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-orange-900">
                                <p className="font-semibold">
                                  Revisi #{order.revision.number} dari {order.revision.max} Diminta
                                </p>
                                <p className="text-sm mt-1">
                                  <strong>Alasan:</strong> {order.revision.reason}
                                </p>
                                {order.revision.previous_notes && (
                                  <p className="text-xs mt-1 text-orange-700">
                                    Catatan sebelumnya: {order.revision.previous_notes}
                                  </p>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Tombol Unggah */}
                          <div className="mt-4">
                            <Button 
                              onClick={() => openUploadModal(order)} 
                              className="w-full gap-2"
                              variant={order.deadline.is_overdue ? 'destructive' : 'default'}
                            >
                              <Upload className="h-4 w-4" />
                              {order.revision ? 'Unggah Revisi' : 'Unggah Foto Hi-Res'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Unggah — scrollable */}
      <Dialog open={uploadModalOpen} onOpenChange={closeUploadModal}>
        {/*
          Kunci scroll modal:
          - DialogContent menggunakan flex flex-col dengan max-h-[90vh]
          - Header & Footer di-set shrink-0 agar tidak ikut scroll
          - Bagian tengah (konten) diberi flex-1 overflow-y-auto
        */}
        <DialogContent className="max-w-md w-full flex flex-col max-h-[90vh] p-0 gap-0 overflow-hidden">

          {/* Header — tetap di atas */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Unggah Foto Hi-Res
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.revision 
                ? `Unggah revisi #${selectedOrder.revision.number} untuk "${selectedOrder.photo.filename}"`
                : `Unggah foto resolusi tinggi untuk "${selectedOrder?.photo.filename}"`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Konten — dapat di-scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* Info Pembeli */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pembeli:</span>
                  <span className="font-medium">{selectedOrder?.buyer.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Penghasilan Anda:</span>
                  <span className="font-bold text-green-600">
                    {selectedOrder?.payment.your_earning_formatted}
                  </span>
                </div>
                {selectedOrder?.revision && (
                  <div className="pt-2 border-t">
                    <p className="font-semibold text-orange-600">Alasan Revisi:</p>
                    <p className="text-xs mt-1">{selectedOrder.revision.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Persyaratan File */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 text-sm space-y-1">
                <p className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Persyaratan:
                </p>
                <ul className="text-muted-foreground list-disc list-inside space-y-0.5">
                  <li>Resolusi minimal: 2000 × 2000 piksel</li>
                  <li>Format: JPG, PNG, atau TIFF</li>
                  <li>Ukuran maksimal: 50MB</li>
                  <li>Tanpa watermark</li>
                </ul>
              </CardContent>
            </Card>

            {/* Area Unggah */}
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${uploadFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary'}
              `}
            >
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/tiff"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              
              {uploadPreview ? (
                <div className="space-y-2">
                  <img 
                    src={uploadPreview} 
                    alt="Pratinjau" 
                    className="max-h-40 mx-auto rounded"
                  />
                  <p className="text-sm font-medium">{uploadFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {uploadFile && (
                      uploadFile.size / (1024 * 1024) > 1 
                        ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : `${(uploadFile.size / 1024).toFixed(0)} KB`
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Klik untuk memilih file hi-res
                  </p>
                </div>
              )}
            </div>

            {/* Catatan Fotografer */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Catatan untuk pembeli (opsional)
              </label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tambahkan catatan mengenai foto, proses pengeditan, dll..."
                value={photographerNotes}
                onChange={(e) => setPhotographerNotes(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* Progress Unggah */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Mengunggah... {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          {/* Footer — tetap di bawah */}
          <DialogFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
            <Button 
              variant="outline" 
              onClick={closeUploadModal}
              disabled={isUploading}
              className="flex-1"
            >
              Batal
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!uploadFile || isUploading}
              className="flex-1 gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Mengunggah...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Unggah Hi-Res
                </>
              )}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PhotographerPendingOrders;