import { useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notificationService, type UserNotification } from "@/services/api/notification.service";

export function NotificationBell() {
  const [items,setItems]=useState<UserNotification[]>([]);
  const [loading,setLoading]=useState(false);
  const load=async()=>{setLoading(true);try{setItems(await notificationService.list())}catch{setItems([])}finally{setLoading(false)}};
  useEffect(()=>{void load()},[]);
  return <DropdownMenu onOpenChange={(open)=>{if(open)void load()}}>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Notifikasi" className="relative">
        <Bell className="h-4 w-4" />
        {items.length>0&&<Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]">{items.length>99?"99+":items.length}</Badge>}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
      <div className="flex items-center justify-between px-2 py-1">
        <DropdownMenuLabel className="p-0">Notifikasi</DropdownMenuLabel>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(event)=>{event.preventDefault();void load()}} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading?"animate-spin":""}`} />
        </Button>
      </div>
      <DropdownMenuSeparator />
      <div className="max-h-80 overflow-y-auto">
        {loading&&<p className="p-3 text-sm text-muted-foreground">Memuat...</p>}
        {!loading&&items.length===0&&<p className="p-3 text-sm text-muted-foreground">Belum ada notifikasi.</p>}
        {items.map((item)=><div key={item.id} className="border-b px-3 py-3 last:border-0">
          <p className="text-sm font-medium">{item.subject}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("id-ID")}</p>
        </div>)}
      </div>
    </DropdownMenuContent>
  </DropdownMenu>;
}
