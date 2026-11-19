import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, PackageCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { orderService, type PlatformOrder, type OrderStatus } from "@/services/api/order.service";

const labels: Record<OrderStatus, string> = {
  pending_payment: "Menunggu pembayaran",
  paid: "Menunggu fotografer",
  processing: "Sedang diproses",
  delivered: "Menunggu konfirmasi",
  revision_requested: "Revisi diminta",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};
const colors: Record<OrderStatus, string> = {
  pending_payment: "secondary",
  paid: "outline",
  processing: "outline",
  delivered: "default",
  revision_requested: "destructive",
  completed: "default",
  cancelled: "destructive",
};

export function OrderLifecyclePanel({ role }: { role: "buyer" | "photographer" }) {
  const [orders, setOrders] = useState<PlatformOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = role === "buyer" ? await orderService.listBuyerOrders() : await orderService.listPhotographerOrders();
      if (result.success) setOrders(result.data || []);
      else toast.error(result.error || "Gagal memuat order");
    } catch {
      toast.error("Order Service belum dapat dihubungi");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [role]);

  const confirm = async (order: PlatformOrder) => {
    setBusyId(order.id);
    try {
      const result = await orderService.confirmDelivery(order.id);
      if (!result.success) throw new Error(result.error || "Konfirmasi gagal");
      toast.success("Pesanan selesai dikonfirmasi");
      await load();
    } catch (error: any) { toast.error(error.message || "Konfirmasi gagal"); }
    finally { setBusyId(null); }
  };

  const revise = async (order: PlatformOrder) => {
    const reason = window.prompt("Jelaskan revisi yang dibutuhkan:");
    if (!reason?.trim()) return;
    setBusyId(order.id);
    try {
      const result = await orderService.requestRevision(order.id, reason.trim());
      if (!result.success) throw new Error(result.error || "Permintaan revisi gagal");
      toast.success("Permintaan revisi dikirim");
      await load();
    } catch (error: any) { toast.error(error.message || "Permintaan revisi gagal"); }
    finally { setBusyId(null); }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Order lifecycle</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat ulang
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Memuat order...</p> :
          orders.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada order pada sistem lifecycle baru.</p> :
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">Event {order.event_id} · Photographer {order.photographer_id}</p>
                  <p className="text-sm font-semibold mt-1">{new Intl.NumberFormat("id-ID", { style: "currency", currency: order.currency || "IDR", maximumFractionDigits: 0 }).format(order.total_amount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={colors[order.status] as any}>{labels[order.status] || order.status}</Badge>
                  {role === "buyer" && order.status === "delivered" && <>
                    <Button size="sm" disabled={busyId === order.id} onClick={() => confirm(order)}>
                      <PackageCheck className="mr-1 h-4 w-4" /> Terima
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === order.id || order.revision_count >= order.max_revisions} onClick={() => revise(order)}>
                      <RotateCcw className="mr-1 h-4 w-4" /> Revisi
                    </Button>
                  </>}
                </div>
              </div>
            ))}
          </div>}
      </CardContent>
    </Card>
  );
}
