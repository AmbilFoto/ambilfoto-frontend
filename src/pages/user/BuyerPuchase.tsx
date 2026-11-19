// src/pages/BuyerPurchases.tsx

import { OrderLifecyclePanel } from "@/components/orders/OrderLifecyclePanel";
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // ✅ tambah useNavigate
import { buyerEscrowService, BuyerPurchase, buyerEscrowHelpers } from '@/services/api/buyer.escrow.service';
import { chatService } from '@/services/api/chat.service'; // ✅ tambah import
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, Clock, CheckCircle, AlertTriangle, RefreshCw,
  ArrowLeft, Package, Eye, RotateCcw, MessageCircle // ✅ tambah MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import PurchaseDetailModal from '@/components/PurchaseDetailModal';
import ConfirmDeliveryModal from '@/components/ConfilmDeliveryModal';

const BuyerPurchases = () => {
  const navigate = useNavigate(); // ✅ tambah
  const [purchases, setPurchases] = useState<BuyerPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPurchase, setSelectedPurchase] = useState<BuyerPurchase | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [chattingId, setChattingId] = useState<string | null>(null); // ✅ loading state chat
  
  useEffect(() => {
    fetchPurchases();
  }, [activeTab]);
  
  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await buyerEscrowService.getMyPurchases({ status });
      
      if (response.success && response.data) {
        setPurchases(response.data);
      } else {
        toast.error(response.error || 'Gagal memuat pembelian');
      }
    } catch (error) {
      toast.error('Gagal memuat pembelian');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = async (purchase: BuyerPurchase) => {
    if (!purchase.escrow.can_download || !purchase.photo.download_url) {
      toast.error('Download belum tersedia');
      return;
    }
    try {
      setDownloadingId(purchase.transaction_id);
      const link = document.createElement('a');
      link.href = purchase.photo.download_url;
      link.download = purchase.photo.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download dimulai!');
    } catch (error) {
      toast.error('Download gagal');
    } finally {
      setDownloadingId(null);
    }
  };

  // ✅ FUNGSI BARU: buat/ambil chat room lalu redirect ke sana
  const handleChatWithPhotographer = async (purchase: BuyerPurchase) => {
    try {
      setChattingId(purchase.transaction_id);

      // createOrGetDirectChat akan return chat yang sudah ada
      // atau membuat chat baru jika belum ada
      const chat = await chatService.createOrGetDirectChat(
        purchase.photographer.id, // photographer profile id
        purchase.photo.id         // photo id sebagai konteks
        // ❌ jangan kirim order_id — FK di tabel chats merujuk ke
        //    payment_transactions.id, bukan order_id string
      );

      // Redirect ke /user/chat/:chatId
      navigate(`/user/chat/${chat.id}`);
    } catch (error) {
      console.error('handleChatWithPhotographer error:', error);
      toast.error('Gagal membuka chat dengan fotografer');
    } finally {
      setChattingId(null);
    }
  };
  
  const handleViewDetails = (purchase: BuyerPurchase) => {
    setSelectedPurchase(purchase);
    setDetailModalOpen(true);
  };
  
  const handleOpenConfirm = (purchase: BuyerPurchase) => {
    setSelectedPurchase(purchase);
    setConfirmModalOpen(true);
  };
  
  const handleConfirmSuccess = () => {
    setConfirmModalOpen(false);
    setSelectedPurchase(null);
    fetchPurchases();
  };
  
  const getStatusBadge = (status: string) => {
    const color = buyerEscrowHelpers.getStatusColor(status);
    const emoji = buyerEscrowHelpers.getStatusEmoji(status);
    
    const colorClasses = {
      blue: 'bg-blue-500',
      yellow: 'bg-yellow-500',
      orange: 'bg-orange-500',
      green: 'bg-green-500',
      gray: 'bg-gray-500',
    };

    const statusLabels: Record<string, string> = {
      'HELD': 'Menunggu Upload',
      'WAITING_CONFIRMATION': 'Siap Dikonfirmasi',
      'REVISION_REQUESTED': 'Revisi Diminta',
      'RELEASED': 'Selesai',
      'REFUNDED': 'Dikembalikan',
      'NOT_APPLICABLE': 'Diproses',
    };
    
    return (
      <Badge className={`${colorClasses[color as keyof typeof colorClasses]} text-white`}>
        {emoji} {statusLabels[status] || status}
      </Badge>
    );
  };
  
  const getUrgencyAlert = (purchase: BuyerPurchase) => {
    if (purchase.escrow.status !== 'WAITING_CONFIRMATION') return null;
    
    const urgency = buyerEscrowHelpers.getUrgency(
      purchase.escrow.hours_remaining,
      purchase.escrow.status
    );
    
    if (urgency === 'overdue') {
      return (
        <Alert className="mt-3 border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Auto-approved!</strong> Anda dapat download sekarang.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (urgency === 'urgent') {
      return (
        <Alert className="mt-3 border-orange-500 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Urgent!</strong> {buyerEscrowHelpers.formatTimeRemaining(purchase.escrow.hours_remaining)} 
            tersisa untuk konfirmasi atau akan auto-approve.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };
  
  const filteredPurchases = purchases.filter(p => {
    switch (activeTab) {
      case 'HELD': return p.escrow.status === 'HELD';
      case 'WAITING_CONFIRMATION': return p.escrow.status === 'WAITING_CONFIRMATION';
      case 'RELEASED': return p.escrow.status === 'RELEASED';
      default: return true;
    }
  });
  
  const countByStatus = {
    total: purchases.length,
    held: purchases.filter(p => p.escrow.status === 'HELD').length,
    waiting: purchases.filter(p => p.escrow.status === 'WAITING_CONFIRMATION').length,
    released: purchases.filter(p => p.escrow.status === 'RELEASED').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <OrderLifecyclePanel role="buyer" />
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/user/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Download className="h-8 w-8 text-primary" />
                Download Hi-Res
              </h1>
              <p className="text-muted-foreground mt-1">
                Kelola pembelian foto dan download hi-res Anda
              </p>
            </div>
          </div>
          
          <Button onClick={fetchPurchases} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countByStatus.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={countByStatus.held > 0 ? 'border-blue-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countByStatus.held}</p>
                  <p className="text-sm text-muted-foreground">Menunggu Upload</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={countByStatus.waiting > 0 ? 'border-yellow-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countByStatus.waiting}</p>
                  <p className="text-sm text-muted-foreground">Siap Konfirmasi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={countByStatus.released > 0 ? 'border-green-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countByStatus.released}</p>
                  <p className="text-sm text-muted-foreground">Selesai</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all" className="gap-2">
              <Package className="h-4 w-4" />
              Semua ({countByStatus.total})
            </TabsTrigger>
            <TabsTrigger value="HELD" className="gap-2">
              <Clock className="h-4 w-4" />
              Menunggu Upload ({countByStatus.held})
            </TabsTrigger>
            <TabsTrigger value="WAITING_CONFIRMATION" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Siap Konfirmasi ({countByStatus.waiting})
            </TabsTrigger>
            <TabsTrigger value="RELEASED" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Selesai ({countByStatus.released})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredPurchases.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Tidak ada pembelian</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all' 
                      ? 'Anda belum membeli foto apapun'
                      : `Tidak ada pembelian dengan status ${activeTab}`
                    }
                  </p>
                  <Link to="/user/photos">
                    <Button className="mt-4" variant="outline">
                      Jelajahi Foto
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPurchases.map((purchase) => (
                  <Card key={purchase.transaction_id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Preview */}
                        <div className="w-full md:w-32 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {purchase.photo.preview_url ? (
                            <img 
                              src={purchase.photo.preview_url}
                              alt={purchase.photo.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold truncate">{purchase.photo.filename}</h3>
                              <p className="text-sm text-muted-foreground">{purchase.photo.event_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Fotografer: {purchase.photographer.name}
                              </p>
                            </div>
                            <div className="text-right space-y-2">
                              {getStatusBadge(purchase.escrow.status)}
                              <p className="text-lg font-bold">{purchase.payment.amount_formatted}</p>
                            </div>
                          </div>

                          {/* Status Message */}
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm">{purchase.escrow.status_message}</p>
                            
                            {purchase.escrow.deadline && purchase.escrow.hours_remaining !== null && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Batas waktu: {format(new Date(purchase.escrow.deadline), 'dd MMM yyyy HH:mm', { locale: id })}
                                </span>
                                <span className="font-medium">
                                  ({buyerEscrowHelpers.formatTimeRemaining(purchase.escrow.hours_remaining)} tersisa)
                                </span>
                              </div>
                            )}

                            {purchase.escrow.revision_count > 0 && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                                <RotateCcw className="h-3 w-3" />
                                <span>
                                  Revisi #{purchase.escrow.revision_count} dari {purchase.escrow.max_revisions}
                                </span>
                              </div>
                            )}

                            {purchase.delivery && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                📦 Versi {purchase.delivery.version} diupload pada{' '}
                                {format(new Date(purchase.delivery.uploaded_at), 'dd MMM HH:mm', { locale: id })}
                                {purchase.delivery.resolution && ` • ${purchase.delivery.resolution}`}
                                {purchase.delivery.file_size_mb && ` • ${purchase.delivery.file_size_mb} MB`}
                              </div>
                            )}
                          </div>

                          {getUrgencyAlert(purchase)}

                          {/* Actions */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {/* View Details */}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(purchase)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Detail
                            </Button>

                            {/* ✅ TOMBOL CHAT FOTOGRAFER */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleChatWithPhotographer(purchase)}
                              disabled={chattingId === purchase.transaction_id}
                              className="border-blue-500/50 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              {chattingId === purchase.transaction_id ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Membuka Chat...
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Chat Fotografer
                                </>
                              )}
                            </Button>

                            {/* Confirm Quality */}
                            {purchase.escrow.can_confirm && (
                              <Button 
                                size="sm"
                                onClick={() => handleOpenConfirm(purchase)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Konfirmasi Kualitas
                              </Button>
                            )}

                            {/* Download */}
                            {purchase.escrow.can_download && (
                              <Button
                                size="sm"
                                onClick={() => handleDownload(purchase)}
                                disabled={downloadingId === purchase.transaction_id}
                              >
                                {downloadingId === purchase.transaction_id ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Mendownload...
                                  </>
                                ) : (
                                  <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Hi-Res
                                  </>
                                )}
                              </Button>
                            )}
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

      <Footer />

      {/* Modals */}
      {selectedPurchase && (
        <>
          <PurchaseDetailModal
            open={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            transactionId={selectedPurchase.transaction_id}
          />
          
          <ConfirmDeliveryModal
            open={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            purchase={selectedPurchase}
            onSuccess={handleConfirmSuccess}
          />
        </>
      )}
    </div>
  );
};

export default BuyerPurchases;