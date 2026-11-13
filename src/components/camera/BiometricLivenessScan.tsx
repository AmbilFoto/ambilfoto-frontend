import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiService, BiometricCompleteResponse } from "@/services/api/ai.service";

interface BiometricLivenessScanProps {
  onComplete: (result: BiometricCompleteResponse) => void;
  isProcessing?: boolean;
}

const challengeInstructions: Record<string, string> = {
  CENTER: "Lihat lurus ke kamera",
  LEFT: "Tolehkan kepala ke kiri",
  RIGHT: "Tolehkan kepala ke kanan",
  UP: "Angkat dagu dan lihat ke atas",
  DOWN: "Tundukkan kepala ke bawah",
};

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  return error instanceof Error ? error.message : "Gagal menjalankan verifikasi biometrik";
}

export function BiometricLivenessScan({
  onComplete,
  isProcessing = false,
}: BiometricLivenessScanProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef("");
  const challengeRef = useRef("");
  const activeRef = useRef(false);
  const frameBusyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [instruction, setInstruction] = useState("Mulai verifikasi untuk membuka kamera");
  const [error, setError] = useState("");

  const stopCamera = () => {
    activeRef.current = false;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
  };

  useEffect(() => stopCamera, []);

  const captureFrame = async () => {
    if (!activeRef.current || frameBusyRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      timerRef.current = window.setTimeout(captureFrame, 250);
      return;
    }

    frameBusyRef.current = true;
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Kamera tidak dapat diproses");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const result = await aiService.submitBiometricFrame(
        sessionIdRef.current,
        challengeRef.current,
        canvas.toDataURL("image/jpeg", 0.82),
      );
      if (!activeRef.current) return;

      if (result.message) setInstruction(result.message);
      if (result.matched && result.next_challenge) {
        challengeRef.current = result.next_challenge;
        setChallenge(result.next_challenge);
        setInstruction(challengeInstructions[result.next_challenge] || "Ikuti petunjuk di layar");
      }
      if (result.done) {
        activeRef.current = false;
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = null;
        setInstruction("Menyimpan hasil verifikasi dan mencari foto...");
        const complete = await aiService.completeBiometric(sessionIdRef.current);
        stopCamera();
        onComplete(complete);
        return;
      }
      if (result.attempts_remaining === 0) {
        stopCamera();
        setError("Batas percobaan untuk gerakan ini tercapai. Silakan mulai ulang.");
        return;
      }
    } catch (scanError) {
      stopCamera();
      setError(errorMessage(scanError));
      return;
    } finally {
      frameBusyRef.current = false;
    }

    if (activeRef.current) timerRef.current = window.setTimeout(captureFrame, 600);
  };

  const startScan = async () => {
    setError("");
    setInstruction("Meminta akses kamera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Kamera tidak tersedia");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const session = await aiService.startBiometric();
      if (!session.session_id || !session.challenge?.length) {
        throw new Error("AI tidak mengembalikan sesi biometric yang valid");
      }
      sessionIdRef.current = session.session_id;
      challengeRef.current = session.challenge[0];
      setChallenge(session.challenge[0]);
      setInstruction(challengeInstructions[session.challenge[0]] || "Ikuti petunjuk di layar");
      activeRef.current = true;
      setIsScanning(true);
      timerRef.current = window.setTimeout(captureFrame, 250);
    } catch (scanError) {
      stopCamera();
      setError(errorMessage(scanError));
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover [transform:scaleX(-1)]"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`h-64 w-48 max-h-[75%] max-w-[65%] rounded-[50%] border-4 ${
            isScanning ? "border-emerald-400" : "border-white/60"
          }`} />
        </div>
        <div className="absolute bottom-4 left-3 right-3 rounded-full bg-black/65 px-4 py-2 text-center text-sm font-medium text-white">
          {instruction}
        </div>
        {challenge && isScanning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1 text-xs text-white">
            Gerakan: {challenge}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {isScanning ? (
          <Button type="button" variant="outline" className="w-full" onClick={stopCamera}>
            Batalkan scan
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            onClick={startScan}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</>
            ) : error ? (
              <><RotateCcw className="mr-2 h-4 w-4" />Ulangi verifikasi</>
            ) : (
              <><Camera className="mr-2 h-4 w-4" />Mulai scan biometric</>
            )}
          </Button>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Ikuti gerakan wajah yang diminta. Frame kamera dipakai sementara untuk liveness dan tidak disimpan sebagai foto.
      </p>
    </div>
  );
}
