import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaceCamera } from "@/components/camera/FaceCamera";
import HeaderDash from "@/components/layout/HeaderDash";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiService } from "@/services/api/ai.service";
import { userService } from "@/services/api/user.service";

const ScanFace = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCapture = async (imageData: string) => {
    setIsProcessing(true);
    
    try {
      console.log('📸 Langkah 1: Mengekstrak embedding wajah...');
      
      // Langkah 1: Ekstrak embedding wajah dari gambar
      const faceResult = await aiService.registerFace(imageData);
      
      if (!faceResult.success || !faceResult.embedding) {
        toast({
          title: "Wajah tidak terdeteksi",
          description: "Silakan coba lagi dengan foto wajah yang jelas",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log('✅ Wajah terdeteksi, panjang embedding:', faceResult.embedding.length);
      console.log('📤 Langkah 2: Mencocokkan foto melalui layanan User dan AI...');
      
      // Kirim embedding untuk pencocokan
      const matchResult = await userService.matchPhotos({
        embedding: faceResult.embedding
      });
      
      console.log('📥 Hasil pencocokan:', matchResult);
      
      if (matchResult.success && matchResult.data) {
        const photoCount = matchResult.data.length;
        
        toast({
          title: photoCount > 0 ? "Foto ditemukan! 🎉" : "Foto tidak ditemukan",
          description: photoCount > 0 
            ? `Kami menemukan ${photoCount} foto Anda`
            : "Kami tidak dapat menemukan foto yang cocok dengan wajah Anda",
          variant: photoCount > 0 ? "default" : "destructive",
        });
        
        console.log('✅ Navigasi ke galeri foto...');
        // Redirect ke halaman photos tanpa peduli jumlah foto
        navigate('/user/photos');
      } else {
        throw new Error(matchResult.error || 'Pencocokan wajah gagal');
      }
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'Gagal memproses gambar';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderDash />
      
      <main className="flex-1 py-8">
        <div className="container max-w-2xl">
          <Link 
            to="/user/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>
          
          <Card className="shadow-strong border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">Pindai Wajah Anda</CardTitle>
              <CardDescription>
                Posisikan wajah Anda dengan jelas di kamera untuk menemukan semua foto Anda secara otomatis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <div className="text-center space-y-2">
                    <p className="font-medium">Memproses foto Anda...</p>
                    <p className="text-sm text-muted-foreground">
                      Menganalisis wajah dan mencari foto
                    </p>
                  </div>
                  <div className="w-64 h-1 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse" style={{ width: '70%' }} />
                  </div>
                </div>
              ) : (
                <FaceCamera onCapture={handleCapture} mode="scan" isProcessing={isProcessing} />
              )}
              
              <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2">
                <h3 className="font-medium text-sm">Tips untuk hasil terbaik:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Pastikan pencahayaan yang baik pada wajah Anda</li>
                  <li>Lihat langsung ke kamera</li>
                  <li>Lepaskan kacamata hitam atau penutup wajah</li>
                  <li>Pastikan wajah Anda berada di tengah lingkaran</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ScanFace;