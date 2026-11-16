import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, Filter, Eye, CheckCircle, XCircle, Clock, 
  User, Building, Phone, FileText, Calendar, TrendingUp,
  AlertCircle, RefreshCw, Download, MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { photographerUpgradeService, PhotographerUpgradeRequest, UpgradeStatistics } from "@/services/api/photographer.upgrade.service";
import { Header } from "@/components/layout/Header";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const AdminPhotographerRequests = () => {
  const [requests, setRequests] = useState<PhotographerUpgradeRequest[]>([]);
  const [statistics, setStatistics] = useState<UpgradeStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PhotographerUpgradeRequest | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [requestDetails, setRequestDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  
  const { toast } = useToast();

  const getPhotoSource = (url?: string | null, base64?: string | null) => {
    if (url) return url;
    if (!base64) return "";
    return base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
  };

  const downloadPhoto = async (source: string, filename: string) => {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error("Gagal mengunduh foto.");
      const objectURL = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectURL;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectURL);
    } catch {
      toast({
        title: "Gagal mengunduh foto",
        description: "Periksa koneksi storage dan coba lagi.",
        variant: "destructive",
      });
    }
  };

  // Safe date formatter
  const formatDate = (dateString: string | null | undefined, formatStr: string = 'dd MMM yyyy'): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, formatStr, { locale: id });
    } catch {
      return 'N/A';
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load requests
      const requestsRes = await photographerUpgradeService.getUpgradeRequests({ 
        status: activeTab, 
        limit: 50 
      });

      if (requestsRes.success && requestsRes.data) {
        setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
      }

      // Try to load statistics, but don't fail if it errors
      try {
        const statsRes = await photographerUpgradeService.getUpgradeStatistics();
        if (statsRes.success && statsRes.data) {
          setStatistics(statsRes.data);
        }
      } catch (statsError) {
        console.warn('Statistics endpoint failed, using fallback counts', statsError);
        // Calculate basic statistics from loaded requests if stats endpoint fails
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        const approvedCount = requests.filter(r => r.status === 'approved').length;
        const rejectedCount = requests.filter(r => r.status === 'rejected').length;
        const total = pendingCount + approvedCount + rejectedCount;
        
        setStatistics({
          total_requests: total,
          pending_count: pendingCount,
          approved_count: approvedCount,
          rejected_count: rejectedCount,
          approval_rate: total > 0 ? (approvedCount / total) * 100 : 0,
          avg_review_time_hours: 0,
          recent_activity: {
            today: 0,
            this_week: 0,
            this_month: 0,
          }
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Gagal memuat data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRequestDetails = async (requestId: string) => {
    setDetailsLoading(true);
    try {
      const response = await photographerUpgradeService.getRequestDetails(requestId);
      if (response.success && response.data) {
        setRequestDetails(response.data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Gagal memuat detail",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = (request: PhotographerUpgradeRequest) => {
    setSelectedRequest(request);
    loadRequestDetails(request.id);
  };

  const handleReview = async () => {
    if (!selectedRequest) return;

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Alasan penolakan wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      let response;
      if (reviewAction === 'approve') {
        response = await photographerUpgradeService.approveRequest(
          selectedRequest.id,
          reviewNotes || undefined
        );
      } else {
        response = await photographerUpgradeService.rejectRequest(
          selectedRequest.id,
          rejectionReason,
          reviewNotes || undefined
        );
      }

      if (response.success) {
        toast({
          title: "Berhasil",
          description: reviewAction === 'approve' 
            ? "Permintaan telah disetujui"
            : "Permintaan telah ditolak",
        });
        setShowReviewDialog(false);
        setSelectedRequest(null);
        setRequestDetails(null);
        setReviewNotes("");
        setRejectionReason("");
        loadData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Gagal memproses",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.ktp_number.includes(searchQuery) ||
    (req.province_name && req.province_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (req.city_name && req.city_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Photographer Upgrade Requests</h1>
            <p className="text-muted-foreground">
              Review dan kelola permintaan upgrade photographer
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{statistics.total_requests}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">{statistics.pending_count}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{statistics.approved_count}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{statistics.rejected_count}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{statistics.approval_rate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Approval Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan email, nama, bisnis, KTP, provinsi, atau kota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({statistics?.pending_count || 0})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({statistics?.approved_count || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({statistics?.rejected_count || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Tidak Ada Data</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Tidak ada hasil yang cocok dengan pencarian" : "Belum ada permintaan"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{request.full_name}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{request.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{request.business_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{request.business_phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>KTP: {request.ktp_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">KTP: {request.ktp_verification_status || 'pending'}</span>
                        </div>
                      </div>
                      
                      {/* 🆕 Location Display */}
                      {(request.province_name || request.city_name) && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium text-primary">
                            {request.city_name && request.province_name
                              ? `${request.city_name}, ${request.province_name}`
                              : request.province_name || request.city_name}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            Location Provided
                          </Badge>
                        </div>
                      )}

                      {request.face_match_score && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Face Match: {Math.round(request.face_match_score * 100)}% 
                          <span className="ml-2 capitalize">({request.face_match_status})</span>
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm text-red-900">
                            <strong>Alasan Ditolak:</strong> {request.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                      className="ml-4"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setRequestDetails(null);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Permintaan Upgrade</DialogTitle>
              <DialogDescription>
                Review dokumen dan informasi sebelum approve/reject
              </DialogDescription>
            </DialogHeader>

            {detailsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : requestDetails && (
              <div className="space-y-6">
                {/* User Info */}
                <div>
                  <h3 className="font-semibold mb-3">Informasi User</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedRequest?.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nama Lengkap</p>
                      <p className="font-medium">{selectedRequest?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telepon User</p>
                      <p className="font-medium">{selectedRequest?.user_phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Terdaftar</p>
                      <p className="font-medium">{formatDate(selectedRequest?.user_registered_at, 'dd MMM yyyy HH:mm')}</p>
                    </div>
                  </div>
                </div>

                {/* Business Info */}
                <div>
                  <h3 className="font-semibold mb-3">Informasi Bisnis</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nama Bisnis</p>
                      <p className="font-medium">{selectedRequest?.business_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telepon</p>
                      <p className="font-medium">{selectedRequest?.business_phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground">Alamat</p>
                      <p className="font-medium">{selectedRequest?.business_address}</p>
                    </div>
                    {selectedRequest?.portfolio_url && (
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground">Portfolio</p>
                        <a href={selectedRequest.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {selectedRequest.portfolio_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🆕 Location Info */}
                {(selectedRequest?.province_name || selectedRequest?.city_name) && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Lokasi Fotografer
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      {selectedRequest.province_name && (
                        <div>
                          <p className="text-muted-foreground">Provinsi</p>
                          <p className="font-medium flex items-center gap-2">
                            {selectedRequest.province_name}
                            <Badge variant="outline" className="text-xs">
                              ID: {selectedRequest.province_id}
                            </Badge>
                          </p>
                        </div>
                      )}
                      {selectedRequest.city_name && (
                        <div>
                          <p className="text-muted-foreground">Kota/Kabupaten</p>
                          <p className="font-medium flex items-center gap-2">
                            {selectedRequest.city_name}
                            <Badge variant="outline" className="text-xs">
                              ID: {selectedRequest.city_id}
                            </Badge>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <strong>Fotografer telah menyertakan data lokasi</strong>
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Data ini akan membantu meningkatkan visibilitas fotografer di pencarian berdasarkan lokasi
                      </p>
                    </div>
                  </div>
                )}

                {/* KTP Info */}
                <div>
                  <h3 className="font-semibold mb-3">Data KTP</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nomor KTP</p>
                      <p className="font-medium">{selectedRequest?.ktp_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nama di KTP</p>
                      <p className="font-medium">{selectedRequest?.ktp_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status Verifikasi</p>
                      <p className="font-medium capitalize">{selectedRequest?.ktp_verification_status || 'pending'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Waktu Verifikasi</p>
                      <p className="font-medium">{formatDate(selectedRequest?.ktp_verified_at, 'dd MMM yyyy HH:mm')}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Scores */}
                {(requestDetails.verification_details?.ktp_validation || requestDetails.verification_details?.face_matching) && (
                  <div>
                    <h3 className="font-semibold mb-3">Skor Verifikasi</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {requestDetails.verification_details.ktp_validation && (
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-sm text-muted-foreground mb-2">KTP Validation</p>
                            <p className="text-2xl font-bold text-primary">
                              {Math.round((requestDetails.verification_details.ktp_validation.score || 0) * 100)}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {requestDetails.verification_details.ktp_validation.is_valid ? '✓ Valid' : '✗ Invalid'}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {requestDetails.verification_details.face_matching && (
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-sm text-muted-foreground mb-2">Face Matching</p>
                            <p className="text-2xl font-bold text-green-600">
                              {Math.round((requestDetails.verification_details.face_matching.similarity || 0) * 100)}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {requestDetails.verification_details.face_matching.is_match ? '✓ Matched' : '✗ Not Matched'}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* Photos */}
                <div>
                  <h3 className="font-semibold mb-3">Dokumen yang Diunggah</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Foto KTP</p>
                      <img 
                        src={getPhotoSource(requestDetails.ktp_photo_url, requestDetails.ktp_photo_base64)}
                        alt="KTP" 
                        className="rounded-lg border w-full"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => downloadPhoto(
                          getPhotoSource(requestDetails.ktp_photo_url, requestDetails.ktp_photo_base64),
                          "ktp.jpg",
                        )}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download KTP
                      </Button>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Selfie dengan KTP</p>
                      <img 
                        src={getPhotoSource(requestDetails.face_photo_url, requestDetails.face_photo_base64)}
                        alt="Selfie" 
                        className="rounded-lg border w-full"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => downloadPhoto(
                          getPhotoSource(requestDetails.face_photo_url, requestDetails.face_photo_base64),
                          "selfie.jpg",
                        )}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Selfie
                      </Button>
                    </div>
                  </div>
                </div>

                {/* History */}
                {requestDetails.history && requestDetails.history.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Riwayat</h3>
                    <div className="space-y-2">
                      {requestDetails.history.map((h: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <Badge variant="outline">{h.action_type}</Badge>
                          <div className="flex-1">
                            {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                            <p className="text-xs text-muted-foreground">
                              {formatDate(h.created_at, 'dd MMM yyyy HH:mm')}
                              {h.performed_by && ` - ${h.performed_by}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedRequest?.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => {
                        setReviewAction('approve');
                        setShowReviewDialog(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setReviewAction('reject');
                        setShowReviewDialog(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === 'approve' ? 'Approve Request' : 'Reject Request'}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === 'approve' 
                  ? 'User akan otomatis menjadi photographer setelah approval'
                  : 'Berikan alasan penolakan yang jelas untuk user'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {reviewAction === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Alasan Penolakan *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Contoh: Foto KTP tidak jelas / Selfie tidak sesuai"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reviewNotes">Catatan Admin (Opsional)</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Catatan tambahan..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReviewDialog(false)} className="flex-1" disabled={processing}>
                  Batal
                </Button>
                <Button 
                  onClick={handleReview} 
                  className="flex-1"
                  disabled={processing || (reviewAction === 'reject' && !rejectionReason.trim())}
                  variant={reviewAction === 'approve' ? 'default' : 'destructive'}
                >
                  {processing ? "Memproses..." : reviewAction === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminPhotographerRequests;