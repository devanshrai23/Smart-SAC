import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Send, MoreVertical, MessageCircle, Clock, UserPlus, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast as sonner } from "sonner";

interface ApiConversation {
  otherUser: {
    id: string;
    fullname: string;
    sport: string;
    isAvailable: boolean;
  };
  lastMessage: string;
  lastMessageStatus: string;
  lastMessageSender: string;
  lastMessageCreatedAt: string;
  unreadCount: number;
}

interface ApiMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
}

interface Player {
  id: string;
  fullname: string;
  games: { game: { name: string }; rating: number }[];
}

const Chat = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const { user, wrapApiCall } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isLoadingConversations } = useQuery<ApiConversation[]>({
    queryKey: ["conversations"],
    queryFn: () => wrapApiCall(() => api.get("/users/get-conversations"))
  });

  // Fetch all registered users for starting new conversations
  const { data: allPlayers, isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: ["allPlayers"],
    queryFn: () => wrapApiCall(() => api.get("/users/get-all-players"))
  });

  const fetchMessages = (otherUserId: string) => {
    return wrapApiCall(() => api.get(`/users/get-messages/${otherUserId}`)) as Promise<ApiMessage[]>;
  };

  const { data: messages, isLoading: isLoadingMessages, isSuccess: isMessagesSuccess } = useQuery({
    queryKey: ["messages", selectedChatId],
    queryFn: () => fetchMessages(selectedChatId!),
    enabled: !!selectedChatId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (variables: { receiverId: string; content: string }) => {
      return wrapApiCall(() => api.post("/users/send-message", variables));
    },
    onSuccess: () => {
      setMessage("");
      setShowNewChat(false);
      queryClient.invalidateQueries({ queryKey: ["messages", selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      console.error("Failed to send message", error);
      sonner.error("Failed to send message");
    },
  });

  const handleSend = () => {
    if (message.trim() && selectedChatId) {
      sendMessageMutation.mutate({
        receiverId: selectedChatId,
        content: message,
      });
    }
  };

  useEffect(() => {
    if (isMessagesSuccess) {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  }, [isMessagesSuccess, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedChat = conversations?.find((c) => c.otherUser.id === selectedChatId);

  // Find the selected player from allPlayers if not in conversations (new chat)
  const selectedPlayer = allPlayers?.find((p) => p.id === selectedChatId);

  // Auto-select first conversation only if not in new-chat mode
  if (!selectedChatId && !showNewChat && conversations && conversations.length > 0) {
    setSelectedChatId(conversations[0].otherUser.id);
  }

  // Filter users who don't have existing conversations (for new chat list)
  const existingConversationIds = new Set(conversations?.map((c) => c.otherUser.id) || []);
  const newChatUsers = allPlayers?.filter((p) => !existingConversationIds.has(p.id)) || [];

  // Filter based on search
  const filteredConversations = conversations?.filter((c) =>
    c.otherUser.fullname.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredNewChatUsers = newChatUsers.filter((p) =>
    p.fullname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartNewChat = (playerId: string) => {
    setSelectedChatId(playerId);
    setShowNewChat(false);
  };

  // Determine the name/sport for chat header
  const chatHeaderName = selectedChat?.otherUser.fullname || selectedPlayer?.fullname || "";
  const chatHeaderSport = selectedChat?.otherUser.sport || 
    (selectedPlayer?.games?.map(g => g.game.name).join(", ") || "N/A");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 md:px-6 pt-24 pb-12">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">Chat with other students and coordinate games</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          {/* Conversations List */}
          <Card className="border-2 lg:col-span-1 animate-scale-in">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                {showNewChat && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowNewChat(false)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={showNewChat ? "Search users..." : "Search conversations..."}
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {!showNewChat && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      setShowNewChat(true);
                      setSearchQuery("");
                    }}
                    title="New conversation"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto">
              <div className="divide-y">
                {/* Show "New Chat" user list */}
                {showNewChat && (
                  <>
                    <div className="p-3 bg-muted/50">
                      <p className="text-sm font-medium text-muted-foreground">
                        Select a user to start chatting
                      </p>
                    </div>
                    {isLoadingPlayers && (
                      <p className="p-4 text-center text-muted-foreground">Loading users...</p>
                    )}
                    {filteredNewChatUsers.length === 0 && !isLoadingPlayers && (
                      <p className="p-4 text-center text-muted-foreground">No new users to chat with</p>
                    )}
                    {filteredNewChatUsers.map((player) => (
                      <div
                        key={player.id}
                        onClick={() => handleStartNewChat(player.id)}
                        className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                          selectedChatId === player.id ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-primary/20">
                            <AvatarFallback className="bg-gradient-primary text-white">
                              {player.fullname
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{player.fullname}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {player.games?.map(g => g.game.name).join(", ") || "No games"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Also show existing conversation users in new chat mode */}
                    {conversations && conversations.length > 0 && (
                      <>
                        <div className="p-3 bg-muted/50">
                          <p className="text-sm font-medium text-muted-foreground">
                            Existing conversations
                          </p>
                        </div>
                        {conversations
                          .filter(c => c.otherUser.fullname.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((conv) => (
                          <div
                            key={conv.otherUser.id}
                            onClick={() => handleStartNewChat(conv.otherUser.id)}
                            className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                              selectedChatId === conv.otherUser.id ? "bg-accent" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12 border-2 border-primary/20">
                                <AvatarFallback className="bg-gradient-primary text-white">
                                  {conv.otherUser.fullname
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{conv.otherUser.fullname}</h3>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {conv.otherUser.sport}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* Show existing conversations list (default view) */}
                {!showNewChat && (
                  <>
                    {isLoadingConversations && (
                      <p className="p-4 text-center">Loading chats...</p>
                    )}
                    {!isLoadingConversations && (!filteredConversations || filteredConversations.length === 0) && (
                      <div className="p-6 text-center">
                        <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">No conversations yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNewChat(true)}
                          className="gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Start a new chat
                        </Button>
                      </div>
                    )}
                    {filteredConversations?.map((conv) => (
                      <div
                        key={conv.otherUser.id}
                        onClick={() => setSelectedChatId(conv.otherUser.id)}
                        className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                          selectedChatId === conv.otherUser.id ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12 border-2 border-primary/20">
                              <AvatarFallback className="bg-gradient-primary text-white">
                                {conv.otherUser.fullname
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            {conv.otherUser.isAvailable && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold truncate">
                                {conv.otherUser.fullname}
                              </h3>
                              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                {formatDistanceToNow(
                                  new Date(conv.lastMessageCreatedAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1 capitalize">
                              {conv.otherUser.sport}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessageSender === user?.id ? "You: " : ""}
                                {conv.lastMessage}
                              </p>
                              {conv.unreadCount > 0 && (
                                <Badge className="ml-2 bg-primary text-primary-foreground flex-shrink-0">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="border-2 lg:col-span-2 flex flex-col animate-scale-in">
            {selectedChatId && (selectedChat || selectedPlayer) ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {chatHeaderName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {chatHeaderName}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {chatHeaderSport}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 bg-background">
                  {isLoadingMessages && (
                    <p className="text-center">Loading messages...</p>
                  )}

                  {(!messages || messages.length === 0) && !isLoadingMessages && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mb-3" />
                      <p className="text-sm">No messages yet. Say hello! 👋</p>
                    </div>
                  )}

                  <div className="flex flex-col w-full space-y-3">
                    {messages?.map((msg) => {
                      const isSent = String(msg.sender) === String(user?.id);

                      return (
                        <div
                          key={msg.id}
                          className={`flex w-full ${
                            isSent ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] p-3 rounded-2xl ${
                              isSent
                                ? "bg-primary text-white rounded-br-none"
                                : "bg-muted text-foreground rounded-bl-none"
                            }`}
                          >
                            <p className="text-sm leading-snug break-words">
                              {msg.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isSent
                                  ? "text-white/70 text-right"
                                  : "text-muted-foreground text-left"
                              }`}
                            >
                              {formatDistanceToNow(new Date(msg.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>

                <div className="border-t p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSend()}
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      className="bg-gradient-primary"
                      size="icon"
                      onClick={handleSend}
                      disabled={sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mb-4" />
                <h3 className="text-xl font-semibold">Select a chat</h3>
                <p className="mb-4">Or start a new conversation with a fellow student.</p>
                <Button
                  variant="outline"
                  onClick={() => setShowNewChat(true)}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  New Conversation
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Chat;
