// src/components/PurchaseDetailModal.tsx

import { useState, useEffect } from 'react';
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import { buyerEscrowService, PurchaseDetail } from '@/services/api/buyer.escrow.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, User, Calendar, MapPin, DollarSign, 
  Clock, CheckCircle, XCircle, AlertCircle, Download,
  Eye, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import ConfirmDeliveryModal from './ConfilmDeliveryModal';

interface PurchaseDetailModalProps {
  open: boolean;
  onClose: () => void;
  transactionId: string;
  onUpdate?: () => void;
}

const PurchaseDetailModal = ({ open, onClose, transactionId, onUpdate }: PurchaseDetailModalProps) => {
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (open && transactionId) {
      fetchDetails();
    }
  }, [open, transactionId]);

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      const response = await buyerEscrowService.getPurchaseDetails(transactionId);
      
      if (response.success && response.data) {
        setDetail(response.data);
      }
    } catch (error) {
      console.error('Gagal memuat detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEscrowStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      PENDING_PAYMENT: { color: 'bg-gray-500', label: 'Menunggu Pembayaran' },
      HELD: { color: 'bg-blue-500', label: 'Dana Ditahan' },
      WAITING_CONFIRMATION: { color: 'bg-orange-500', label: 'Menunggu Konfirmasi' },
      REVISION_REQUESTED: { color: 'bg-purple-500', label: 'Revisi Diminta' },
      RELEASED: { color: 'bg-green-500', label: 'Selesai' },
      REFUNDED: { color: 'bg-red-500', label: 'Dikembalikan' },
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', label: status };
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const getDeliveryStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-500',
      UPLOADED: 'bg-blue-500',
      CONFIRMED: 'bg-green-500',
      REJECTED: 'bg-red-500',
    };
    
    const labels: Record<string, string> = {
      PENDING: 'Menunggu',
      UPLOADED: 'Terupload',
      CONFIRMED: 'Dikonfirmasi',
      REJECTED: 'Ditolak',
    };
    
    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getUrgencyAlert = (urgency: string) => {
    if (urgency === 'urgent') {
      return (
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Segera konfirmasi!</strong> Foto akan otomatis disetujui jika tidak ada respon.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (urgency === 'warning') {
      return (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Waktu konfirmasi akan segera habis. Silakan review kualitas foto.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  const handleConfirmSuccess = () => {
    setShowConfirmModal(false);
    fetchDetails();
    onUpdate?.();
  };

  const handleDownload = () => {
    if (detail?.photo.download_url) {
      window.open(detail.photo.download_url, '_blank');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pembelian</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang pembelian foto Anda
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : !detail ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Gagal memuat detail pembelian</p>
              <Button 
                variant="outline" 
                onClick={fetchDetails}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Status Alert */}
              {detail.escrow.urgency && getUrgencyAlert(detail.escrow.urgency)}

              {/* Action Buttons */}
              {detail.escrow.status === 'WAITING_CONFIRMATION' && detail.escrow.can_request_revision && (
                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Foto sudah diunggah!</p>
                    <p className="text-sm text-blue-700">
                      Silakan review kualitas foto dan konfirmasi apakah sudah sesuai.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowConfirmModal(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review & Konfirmasi
                  </Button>
                </div>
              )}

              {detail.escrow.status === 'RELEASED' && detail.photo.download_url && (
                <div className="flex gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Foto Siap Diunduh!
                    </p>
                    <p className="text-sm text-green-700">
                      Pembayaran telah dikirim ke fotografer. Silakan unduh foto resolusi tinggi Anda.
                    </p>
                  </div>
                  <Button 
                    onClick={handleDownload}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Unduh Foto
                  </Button>
                </div>
              )}

              {/* Photo & Event Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ImageIcon className="h-5 w-5" />
                    Informasi Foto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview */}
                  {detail.photo.preview_url && (
                    <div className="w-full bg-muted rounded-lg overflow-hidden border">
                      <AuthenticatedImage
                        src={detail.photo.preview_url}
                        alt={detail.photo.filename}
                        className="w-full h-auto object-contain max-h-96"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nama File</p>
                      <p className="font-medium">{detail.photo.filename}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jumlah Wajah</p>
                      <p className="font-medium">{detail.photo.faces_count} wajah terdeteksi</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Event</p>
                      <p className="font-medium text-lg">{detail.event.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tanggal Event</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(detail.event.date), 'dd MMMM yyyy', { locale: id })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jenis Event</p>
                      <p className="font-medium capitalize">{detail.event.type}</p>
                    </div>
                    {detail.event.location && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Lokasi</p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {detail.event.location}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Photographer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Informasi Fotografer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nama Bisnis</p>
                      <p className="font-medium">{detail.photographer.business_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nama Lengkap</p>
                      <p className="font-medium">{detail.photographer.full_name}</p>
                    </div>
                    {detail.photographer.bio && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Bio</p>
                        <p className="font-medium">{detail.photographer.bio}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium text-xs">{detail.photographer.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telepon</p>
                      <p className="font-medium">{detail.photographer.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment & Escrow Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    Pembayaran & Escrow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Pembayaran</p>
                      <p className="text-2xl font-bold text-primary">{detail.payment.amount_formatted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Metode Pembayaran</p>
                      <p className="font-medium uppercase">{detail.payment.method}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Status Escrow</p>
                      <div className="mt-1">
                        {getEscrowStatusBadge(detail.escrow.status)}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status Pesan</p>
                      <p className="font-medium text-sm">{detail.escrow.status_message}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Dibeli Pada</p>
                      <p className="font-medium">
                        {format(new Date(detail.payment.paid_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                      </p>
                    </div>
                    
                    {detail.escrow.confirmation_deadline && detail.escrow.status === 'WAITING_CONFIRMATION' && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Deadline Konfirmasi</p>
                          <p className="font-medium">
                            {format(new Date(detail.escrow.confirmation_deadline), 'dd MMM yyyy, HH:mm', { locale: id })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Waktu Tersisa</p>
                          <p className="font-medium flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {detail.escrow.hours_remaining > 0 
                              ? `${Math.floor(detail.escrow.hours_remaining)} jam ${Math.round((detail.escrow.hours_remaining % 1) * 60)} menit`
                              : 'Expired'
                            }
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <p className="text-muted-foreground">Revisi</p>
                      <p className="font-medium">
                        {detail.escrow.revision_count} dari {detail.escrow.max_revisions} revisi digunakan
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Biaya Platform</p>
                      <p className="font-medium">Rp {detail.payment.platform_fee.toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  {detail.escrow.released_at && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 inline mr-2" />
                        <strong>Dana dirilis pada:</strong> {format(new Date(detail.escrow.released_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Fotografer menerima: Rp {detail.payment.photographer_share.toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Delivery Info */}
              {detail.delivery && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Pengiriman Saat Ini
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Versi {detail.delivery.version}</span>
                      {getDeliveryStatusBadge(detail.delivery.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Diunggah</p>
                        <p className="font-medium">
                          {format(new Date(detail.delivery.uploaded_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </p>
                      </div>
                      {detail.delivery.file.resolution && (
                        <div>
                          <p className="text-muted-foreground">Resolusi</p>
                          <p className="font-medium">{detail.delivery.file.resolution}</p>
                        </div>
                      )}
                      {detail.delivery.file.size_mb && (
                        <div>
                          <p className="text-muted-foreground">Ukuran File</p>
                          <p className="font-medium">{detail.delivery.file.size_mb} MB</p>
                        </div>
                      )}
                      {detail.delivery.file.format && (
                        <div>
                          <p className="text-muted-foreground">Format</p>
                          <p className="font-medium uppercase">{detail.delivery.file.format}</p>
                        </div>
                      )}
                    </div>

                    {detail.delivery.photographer_notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="font-medium text-blue-900 mb-1">Catatan Fotografer:</p>
                        <p className="text-sm text-blue-800">{detail.delivery.photographer_notes}</p>
                      </div>
                    )}

                    {detail.delivery.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="font-medium text-red-900 mb-1">Alasan Penolakan:</p>
                        <p className="text-sm text-red-800">{detail.delivery.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Delivery History */}
              {detail.delivery_history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Riwayat Pengiriman
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detail.delivery_history.map((delivery, index) => (
                        <div 
                          key={delivery.version} 
                          className={`border rounded-lg p-4 ${index === 0 ? 'border-primary' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold">
                                Versi {delivery.version}
                                {index === 0 && <span className="text-xs text-primary ml-2">(Terbaru)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(delivery.uploaded_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                              </p>
                            </div>
                            {getDeliveryStatusBadge(delivery.status)}
                          </div>

                          {delivery.resolution && (
                            <div className="text-sm text-muted-foreground mb-2">
                              📐 {delivery.resolution}
                              {delivery.file_size_mb && ` • ${delivery.file_size_mb} MB`}
                            </div>
                          )}

                          {delivery.photographer_notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                              <p className="font-medium text-blue-900">Catatan Fotografer:</p>
                              <p className="text-blue-800">{delivery.photographer_notes}</p>
                            </div>
                          )}

                          {delivery.status === 'CONFIRMED' && delivery.confirmed_at && (
                            <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Dikonfirmasi pada {format(new Date(delivery.confirmed_at), 'dd MMM HH:mm', { locale: id })}
                            </div>
                          )}

                          {delivery.status === 'REJECTED' && (
                            <>
                              {delivery.rejected_at && (
                                <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Ditolak pada {format(new Date(delivery.rejected_at), 'dd MMM HH:mm', { locale: id })}
                                </div>
                              )}
                              {delivery.rejection_reason && (
                                <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                                  <p className="font-medium text-red-900">Alasan Penolakan:</p>
                                  <p className="text-red-800">{delivery.rejection_reason}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transaction History */}
              {detail.history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5" />
                      Riwayat Transaksi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {detail.history.map((event, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="relative">
                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                            {index < detail.history.length - 1 && (
                              <div className="absolute top-4 left-1 w-px h-full bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {event.event && (
                                  <p className="font-medium text-sm">{event.event}</p>
                                )}
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  {event.from_status && event.to_status && (
                                    <>
                                      <span>{event.from_status} → {event.to_status}</span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span className="capitalize">{event.actor}</span>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(event.timestamp), 'dd MMM HH:mm', { locale: id })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Modal */}
      {detail && (
        <ConfirmDeliveryModal
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          purchase={detail}
          onSuccess={handleConfirmSuccess}
        />
      )}
    </>
  );
};

export default PurchaseDetailModal;