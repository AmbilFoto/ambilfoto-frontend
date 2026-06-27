import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Search, UserPlus, Camera, AlertTriangle, Lock } from "lucide-react";
import { chatService, Chat } from "@/services/api/chat.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const ChatList = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    let filtered = chats;
    if (activeTab === 'direct') filtered = chats.filter(c => c.type === 'direct');
    else if (activeTab === 'complaint') filtered = chats.filter(c => c.type === 'complaint');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.participants.some(p => p.full_name?.toLowerCase().includes(q)) ||
        c.event_name?.toLowerCase().includes(q)
      );
    }
    setFilteredChats(filtered);
  }, [searchQuery, chats, activeTab]);

  const loadChats = async () => {
    try {
      setIsLoading(true);
      const data = await chatService.getMyChats();
      setChats(data);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find(p => p.user_id !== user?.id) || chat.participants[0];
  };

  const handleChatClick = (chat: Chat) => {
    navigate(`/user/chat/${chat.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground text-sm">Chat with photographers</p>
          </div>
          <Button onClick={() => navigate('/user/photographers')} variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Find Photographer
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="direct">Direct</TabsTrigger>
            <TabsTrigger value="complaint">Complaints</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredChats.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start chatting with photographers</p>
                <Button onClick={() => navigate('/user/photographers')}>
                  <Camera className="h-4 w-4 mr-2" />
                  Browse Photographers
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredChats.map((chat) => {
              const other = getOtherParticipant(chat);
              return (
                <Card
                  key={chat.id}
                  className="border-border/50 hover:border-primary/30 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handleChatClick(chat)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar + unread badge */}
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={other?.profile_photo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {other?.full_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {chat.unread_count > 0 && (
                          <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                            variant="destructive"
                          >
                            {chat.unread_count}
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: nama + badges + timestamp */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {/* Nama — truncate kalau kepanjangan */}
                          <h3 className="font-semibold truncate min-w-0 flex-1">
                            {other?.full_name || 'Unknown'}
                          </h3>

                          {/* Badge complaint — shrink-0 biar tidak kempes */}
                          {chat.type === 'complaint' && (
                            <Badge
                              variant="outline"
                              className="text-xs text-destructive border-destructive/30 shrink-0 whitespace-nowrap"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Complaint
                            </Badge>
                          )}

                          {/* Lock icon */}
                          {!!chat.is_locked && (
                            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}

                          {/* Timestamp — paling kanan, tidak wrap */}
                          {chat.last_message_at && (
                            <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap ml-auto pl-1">
                              {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>

                        {/* Row 2: event name */}
                        {chat.event_name && (
                          <p className="text-xs text-muted-foreground truncate mb-0.5">
                            {chat.event_name}
                          </p>
                        )}

                        {/* Row 3: last message */}
                        <p className={`text-sm truncate ${chat.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {chat.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatList;
