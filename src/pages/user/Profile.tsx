import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/api/auth.service';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import HeaderDash from '@/components/layout/HeaderDash';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Mail, Phone, Calendar, Shield, Camera, 
  Lock, Trash2, Save, Loader2, Image, CheckCircle,
  AlertTriangle, Clock
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FaceCamera } from '@/components/camera/FaceCamera';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State profil
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // State password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // State pembaruan wajah
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const [facePassword, setFacePassword] = useState('');
  const [isUpdatingFace, setIsUpdatingFace] = useState(false);
  
  // State hapus akun
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // Statistik
  const [matchedPhotos, setMatchedPhotos] = useState<any[]>([]);
  
  useEffect(() => {
    // AuthContext bisa aja isinya data lama dari saat login (yang nggak
    // selalu bawa semua field, misal phone). Refresh langsung dari
    // /auth/profile begitu halaman dibuka biar form nggak nampilin data basi.
    authService.getProfile().then((res) => {
      if (res.success && res.data) {
        setFullName(res.data.full_name || '');
        setPhone(res.data.phone || '');
        updateUser(res.data);
      }
    }).catch(() => {
      // Kalau gagal (misal token expired), biarin fallback ke data
      // AuthContext yang sudah ada — interceptor axios yang urus redirect 401.
    });

    // Muat foto yang cocok dari localStorage untuk statistik
    const photos = localStorage.getItem('matched_photos');
    if (photos) {
      setMatchedPhotos(JSON.parse(photos));
    }
  }, []);
  
  // Hitung statistik
  const totalPhotos = matchedPhotos.length;
  const uniqueEvents = new Set(matchedPhotos.map(p => p.metadata?.event_name)).size;
  const avgMatchRate = matchedPhotos.length > 0 
    ? (matchedPhotos.reduce((acc, p) => acc + (1 - (p.distance || 0)), 0) / matchedPhotos.length * 100).toFixed(1)
    : 0;
  
  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Error', description: 'Nama lengkap wajib diisi', variant: 'destructive' });
      return;
    }
    
    setIsUpdatingProfile(true);
    try {
      const response = await authService.updateProfile({ full_name: fullName, phone: phone || undefined });
      if (response.success) {
        // Backend cuma balikin { success, message } — nggak ada data user
        // yang di-update, jadi update local state optimistic pakai nilai
        // yang sudah kita tahu sendiri dari form.
        updateUser({ ...user, full_name: fullName, phone: phone || user?.phone });
        toast({ title: 'Berhasil', description: 'Profil berhasil diperbarui' });
      } else {
        throw new Error(response.error || 'Gagal memperbarui profil');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || error.message || 'Gagal memperbarui profil', 
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: 'Error', description: 'Semua kolom password wajib diisi', variant: 'destructive' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Password baru tidak cocok', variant: 'destructive' });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'Password harus minimal 8 karakter', variant: 'destructive' });
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      if (response.success) {
        toast({ title: 'Berhasil', description: 'Password berhasil diubah. Silakan login kembali.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // FIX: sebelumnya pakai setTimeout(() => logout(), 2000) yang
        // "lepas" dari lifecycle komponen. Kalau user sempat login ulang
        // dengan password baru dalam rentang 2 detik itu, timer lama ini
        // tetap jalan dan menghapus token BARU dari localStorage lewat
        // logout() — itu sebabnya user terlempar balik ke /login padahal
        // baru saja berhasil masuk dashboard.
        //
        // Sekarang: logout + redirect dieksekusi langsung, tidak ada
        // jeda/window waktu untuk login ulang diam-diam.
        logout();
        navigate('/login', { replace: true });
      } else {
        throw new Error(response.error || 'Gagal mengubah password');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || error.message || 'Gagal mengubah password', 
        variant: 'destructive' 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  const handleFaceCapture = async (imageData: string) => {
    if (!facePassword) {
      toast({ title: 'Error', description: 'Silakan masukkan password untuk verifikasi', variant: 'destructive' });
      return;
    }
    
    setIsUpdatingFace(true);
    try {
      const response = await authService.updateFaceBiometric(imageData, facePassword);
      if (response.success) {
        toast({ title: 'Berhasil', description: 'Biometrik wajah berhasil diperbarui' });
        setShowFaceCamera(false);
        setFacePassword('');
      } else {
        throw new Error(response.error || 'Gagal memperbarui wajah');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || error.message || 'Gagal memperbarui biometrik wajah', 
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingFace(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!deletePassword || deleteConfirmation !== 'HAPUS AKUN SAYA') {
      toast({ title: 'Error', description: 'Silakan masukkan password dan teks konfirmasi', variant: 'destructive' });
      return;
    }
    
    setIsDeletingAccount(true);
    try {
      const response = await authService.deleteAccount(deletePassword, deleteConfirmation);
      if (response.success) {
        toast({ title: 'Akun Dihapus', description: 'Akun Anda telah dihapus. Selamat tinggal!' });
        logout();
        navigate('/login', { replace: true });
      } else {
        throw new Error(response.error || 'Gagal menghapus akun');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || error.message || 'Gagal menghapus akun', 
        variant: 'destructive' 
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belum pernah';
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderDash />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Profil */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold">{user?.full_name}</h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                    <Badge variant="secondary" className="capitalize">
                      <Shield className="h-3 w-3 mr-1" />
                      {user?.role || 'pengguna'}
                    </Badge>
                    {user?.is_verified ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Terverifikasi
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Belum Terverifikasi
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Kartu Statistik */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <Image className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{totalPhotos}</p>
                    <p className="text-xs text-muted-foreground">Foto</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{uniqueEvents}</p>
                    <p className="text-xs text-muted-foreground">Acara</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <CheckCircle className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{avgMatchRate}%</p>
                    <p className="text-xs text-muted-foreground">Kecocokan</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tab Pengaturan */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="face">Face ID</TabsTrigger>
             {/*  <TabsTrigger value="danger">Akun</TabsTrigger>*/}
            </TabsList>
            
            {/* Tab Profil */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Edit Profil
                  </CardTitle>
                  <CardDescription>Perbarui informasi pribadi Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        value={user?.email || ''} 
                        disabled 
                        className="pl-10 bg-muted" 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="fullName" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Masukkan nama lengkap Anda"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Masukkan nomor telepon Anda"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="w-full">
                    {isUpdatingProfile ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Simpan Perubahan</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Tab Password */}
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Ubah Password
                  </CardTitle>
                  <CardDescription>Perbarui password Anda untuk menjaga keamanan akun</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Password Saat Ini</Label>
                    <Input 
                      id="currentPassword" 
                      type="password"
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password saat ini"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input 
                      id="newPassword" 
                      type="password"
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru (minimal 8 karakter)"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi password baru"
                    />
                  </div>
                  
                  <Button onClick={handleChangePassword} disabled={isChangingPassword} className="w-full">
                    {isChangingPassword ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengubah...</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" /> Ubah Password</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Tab Face ID */}
            <TabsContent value="face">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Perbarui Face ID
                  </CardTitle>
                  <CardDescription>Daftarkan ulang wajah Anda untuk akurasi pengenalan yang lebih baik</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showFaceCamera ? (
                    <>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Perbarui biometrik wajah Anda untuk meningkatkan akurasi pencocokan foto.
                          Anda perlu memverifikasi dengan password Anda.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="facePassword">Verifikasi Password</Label>
                        <Input 
                          id="facePassword" 
                          type="password"
                          value={facePassword} 
                          onChange={(e) => setFacePassword(e.target.value)}
                          placeholder="Masukkan password Anda"
                        />
                      </div>
                      
                      <Button 
                        onClick={() => setShowFaceCamera(true)} 
                        disabled={!facePassword}
                        className="w-full"
                      >
                        <Camera className="mr-2 h-4 w-4" /> Mulai Tangkap Wajah
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <FaceCamera 
                        onCapture={handleFaceCapture}
                        isProcessing={isUpdatingFace}
                        mode="register"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => setShowFaceCamera(false)}
                        className="w-full"
                      >
                        Batal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Tab Zona Bahaya */}
            <TabsContent value="danger">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Zona Bahaya
                  </CardTitle>
                  <CardDescription>Tindakan yang tidak dapat dibatalkan untuk akun Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <h4 className="font-medium text-destructive mb-2">Hapus Akun</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Setelah Anda menghapus akun, tidak ada jalan kembali. Semua data Anda akan dihapus secara permanen.
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Hapus Akun Saya
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus akun Anda secara permanen dan menghapus semua data Anda.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="deletePassword">Password</Label>
                            <Input 
                              id="deletePassword" 
                              type="password"
                              value={deletePassword} 
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Masukkan password Anda"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="deleteConfirmation">
                              Ketik <span className="font-mono font-bold">HAPUS AKUN SAYA</span> untuk konfirmasi
                            </Label>
                            <Input 
                              id="deleteConfirmation" 
                              value={deleteConfirmation} 
                              onChange={(e) => setDeleteConfirmation(e.target.value)}
                              placeholder="HAPUS AKUN SAYA"
                            />
                          </div>
                        </div>
                        
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount || deleteConfirmation !== 'HAPUS AKUN SAYA'}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeletingAccount ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...</>
                            ) : (
                              'Hapus Akun'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;