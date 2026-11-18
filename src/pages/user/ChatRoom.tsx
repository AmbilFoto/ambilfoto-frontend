import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MoreVertical, Lock, ShieldAlert, Flag } from "lucide-react";
import { chatService, ChatMessage, Chat, ComplaintType, COMPLAINT_TYPES } from "@/services/api/chat.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const ChatRoom = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ComplaintType>("harassment");
  const [isReporting, setIsReporting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (chatId) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!chatId) return;
    try {
      const [msgResult, chats] = await Promise.all([
        chatService.getMessages(chatId),
        chatService.getMyChats()
      ]);
      setMessages(msgResult.messages);
      const current = chats.find(c => c.id === chatId);
      if (current) setChatInfo(current);
      await chatService.markAsRead(chatId);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (isLoading) {
        toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || isSending) return;
    try {
      setIsSending(true);
      const message = await chatService.sendMessage(chatId, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    try {
      await chatService.blockUser(targetUserId);
      toast({ title: "User blocked", description: "You will no longer receive messages from this user" });
    } catch {
      toast({ title: "Error", description: "Failed to block user", variant: "destructive" });
    }
  };

  const handleReportToTeam = async () => {
    if (!chatId || isReporting) return;
    try {
      setIsReporting(true);
      await chatService.reportChatToTeam(chatId, reportType);
      toast({
        title: "Laporan terkirim",
        description: "Tim Ambilfoto akan meninjau percakapan ini. Terima kasih atas laporanmu.",
      });
      setReportOpen(false);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Gagal mengirim laporan. Coba lagi.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsReporting(false);
    }
  };

  const otherParticipant = chatInfo?.participants.find(p => p.user_id !== user?.id);
  const backPath = user?.role === 'photographer' ? '/photographer/chat' : '/user/chat';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(backPath)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {isLoading ? (
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant?.profile_photo} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {otherParticipant?.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold truncate">{otherParticipant?.full_name || 'Unknown'}</h2>
                    {chatInfo?.type === 'complaint' && (
                      <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                        <ShieldAlert className="h-3 w-3 mr-1" />Complaint
                      </Badge>
                    )}
                    {chatInfo?.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {chatInfo?.event_name || (otherParticipant?.role === 'photographer' ? 'Photographer' : otherParticipant?.role === 'admin' ? 'Admin' : 'User')}
                  </p>
                </div>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Lapor ke Tim Ambilfoto
                </DropdownMenuItem>
                {otherParticipant && (
                  <DropdownMenuItem className="text-destructive" onClick={() => handleBlockUser(otherParticipant.user_id)}>
                    Block User
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                  <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-48" : "w-32")} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Start the conversation</h3>
              <p className="text-sm text-muted-foreground">Say hello to {otherParticipant?.full_name}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                if (msg.is_system || msg.type === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <p className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full max-w-[80%] text-center">
                        {msg.message}
                      </p>
                    </div>
                  );
                }

                const isOwn = msg.sender_id === user?.id;
                const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);

                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
                    {!isOwn && (
                      <div className="w-8">
                        {showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.sender_photo} />
                            <AvatarFallback className={cn("text-xs", msg.sender_role === 'admin' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                              {msg.sender_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div className="max-w-[75%]">
                      {showAvatar && !isOwn && msg.sender_role === 'admin' && (
                        <p className="text-[10px] text-destructive font-medium mb-0.5 ml-1">Admin</p>
                      )}
                      <div className={cn(
                        "px-4 py-2 rounded-2xl",
                        isOwn ? "bg-primary text-primary-foreground rounded-br-md"
                          : msg.sender_role === 'admin' ? "bg-destructive/10 border border-destructive/20 rounded-bl-md"
                          : "bg-muted rounded-bl-md"
                      )}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className={cn("text-[10px] mt-1", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 bg-background border-t border-border">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          {chatInfo?.is_locked ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Lock className="h-4 w-4" />
              <span>This conversation is locked</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full bg-muted border-0 focus-visible:ring-1"
                disabled={isSending}
              />
              <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!newMessage.trim() || isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </footer>

      {/* Report to Ambilfoto team */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-destructive" />
              Lapor ke Tim Ambilfoto
            </DialogTitle>
            <DialogDescription>
              Pilih alasan laporan. Tim Ambilfoto akan meninjau percakapan ini.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={reportType}
            onValueChange={(v) => setReportType(v as ComplaintType)}
            className="gap-2 py-2"
          >
            {COMPLAINT_TYPES.map((t) => (
              <Label
                key={t.value}
                htmlFor={`report-${t.value}`}
                className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem id={`report-${t.value}`} value={t.value} className="mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-none">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={isReporting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleReportToTeam} disabled={isReporting}>
              {isReporting ? "Mengirim..." : "Kirim Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatRoom;
