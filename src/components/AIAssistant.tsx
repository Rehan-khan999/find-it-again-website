import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, X, MapPin, Calendar, Tag, RotateCcw, Eye, Camera } from "lucide-react";
import aiAssistantLogo from "@/assets/ai-assistant-logo.png";
import { chat, getAutocomplete, ChatMessage, MatchResult, SessionContext, AutoPost, fileToBase64 } from "@/services/aiAssistant";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ItemDetailsDialog } from "./ItemDetailsDialog";
import { useAITabController, setLastIntent } from "@/hooks/useAITabControl";

// Session memory keys
const MEMORY_KEYS = {
  lastSearchCategory: 'ai_last_search_category',
  lastSearchLocation: 'ai_last_search_location',
  lastSearchDate: 'ai_last_search_date',
  conversationHistory: 'ai_conversation_history',
  sessionContext: 'ai_session_context',
};

// Helper to get session memory
const getSessionMemory = () => {
  try {
    const storedContext = sessionStorage.getItem(MEMORY_KEYS.sessionContext);
    return {
      lastCategory: sessionStorage.getItem(MEMORY_KEYS.lastSearchCategory),
      lastLocation: sessionStorage.getItem(MEMORY_KEYS.lastSearchLocation),
      lastDate: sessionStorage.getItem(MEMORY_KEYS.lastSearchDate),
      history: JSON.parse(sessionStorage.getItem(MEMORY_KEYS.conversationHistory) || '[]'),
      sessionContext: storedContext ? JSON.parse(storedContext) as SessionContext : undefined,
    };
  } catch {
    return { lastCategory: null, lastLocation: null, lastDate: null, history: [], sessionContext: undefined };
  }
};

// Helper to save session memory
const saveSessionMemory = (
  category?: string, 
  location?: string, 
  date?: string, 
  history?: ChatMessage[],
  sessionContext?: SessionContext
) => {
  try {
    if (category) sessionStorage.setItem(MEMORY_KEYS.lastSearchCategory, category);
    if (location) sessionStorage.setItem(MEMORY_KEYS.lastSearchLocation, location);
    if (date) sessionStorage.setItem(MEMORY_KEYS.lastSearchDate, date);
    if (history) sessionStorage.setItem(MEMORY_KEYS.conversationHistory, JSON.stringify(history.slice(-10)));
    if (sessionContext) sessionStorage.setItem(MEMORY_KEYS.sessionContext, JSON.stringify(sessionContext));
  } catch {
    // Silently fail if storage is full
  }
};

// Clear session memory
const clearSessionMemory = () => {
  try {
    Object.values(MEMORY_KEYS).forEach(key => sessionStorage.removeItem(key));
  } catch {}
};

interface Message {
  role: "user" | "assistant";
  content: string;
  matches?: MatchResult[];
  recommendedAction?: string;
  intent?: string;
  autoPost?: AutoPost;
  aiUsed?: boolean;
  needsLocation?: boolean;
  imageUrl?: string; // For displaying uploaded images
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const sessionMemory = getSessionMemory();
  const { switchTab } = useAITabController();
  const location = useLocation();
  const [sessionContext, setSessionContext] = useState<SessionContext | undefined>(sessionMemory.sessionContext);
  
  // Generate welcome message - investigator style
  const getWelcomeMessage = () => {
    const { lastCategory, lastLocation } = sessionMemory;
    if (lastCategory && lastLocation) {
      return `Welcome back. Last: ${lastCategory} in ${lastLocation}.\n\nContinue or describe new item.`;
    }
    return "Lost & Found Investigator ready.\n\nDescribe what you lost or found naturally.";
  };
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: getWelcomeMessage(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>(sessionMemory.history);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle viewing item details in dialog
  const handleViewItem = (item: any) => {
    // Transform the item to match ItemDetailsDialog expected format
    const formattedItem = {
      id: item.id,
      title: item.title,
      description: item.description || '',
      category: item.category || '',
      item_type: item.item_type || 'lost',
      date_lost_found: item.date_lost_found || new Date().toISOString(),
      location: item.location || '',
      contact_name: item.contact_name || 'Unknown',
      contact_phone: item.contact_phone || '',
      contact_email: item.contact_email || '',
      reward: item.reward,
      status: item.status || 'active',
      created_at: item.created_at || new Date().toISOString(),
      photos: item.photos || [],
      latitude: item.latitude,
      longitude: item.longitude,
      verification_questions: item.verification_questions || [],
      user_id: item.user_id || '',
    };
    setSelectedItem(formattedItem);
    setIsItemDialogOpen(true);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchAutocomplete = async () => {
      if (input.length < 2) {
        setAutocomplete([]);
        return;
      }

      const { data } = await getAutocomplete(input);
      if (data) {
        setAutocomplete(data);
      }
    };

    const debounce = setTimeout(fetchAutocomplete, 300);
    return () => clearTimeout(debounce);
  }, [input]);

  const handleSend = async (message?: string, imageBase64?: string, imagePreview?: string) => {
    const userMessage = message || input;
    if (!userMessage.trim() && !imageBase64) return;

    setInput("");
    setAutocomplete([]);
    
    // Add user message with optional image preview
    const userMsg: Message = { 
      role: "user", 
      content: userMessage || "Analyze this image",
      imageUrl: imagePreview
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Clear pending image
    setPendingImage(null);

    // Update conversation history
    const newHistory: ChatMessage[] = [
      ...conversationHistory,
      { role: "user", content: userMessage || "Image uploaded for analysis" },
    ];
    setConversationHistory(newHistory);

    try {
      // Use the chat function with optional image
      const { data, error } = await chat(userMessage || "Analyze this image", newHistory, sessionContext, imageBase64);

      if (error) {
        throw new Error(error);
      }

      if (data) {
        const { response, context } = data;

        // Update session context from backend
        if (context.sessionContext) {
          setSessionContext(context.sessionContext);
        }

        // Save intent for reference
        if (context.intent) {
          setLastIntent(context.intent);
        }

        // Switch tabs based on detected intent (only on Browse page)
        if (location.pathname === '/browse' && context.intent) {
          if (context.intent === 'search' || context.intent === 'post_lost') {
            switchTab(context.intent);
          } else if (context.intent === 'post_found') {
            switchTab(context.intent);
          }
        }

        // Update conversation history with assistant response
        const updatedHistory: ChatMessage[] = [
          ...newHistory,
          { role: "assistant", content: response },
        ];
        setConversationHistory(updatedHistory);
        
        // Save to session memory including session context
        saveSessionMemory(
          context.sessionContext?.category,
          context.sessionContext?.location,
          undefined,
          updatedHistory,
          context.sessionContext
        );

        // Create message with matches, context, and auto post
        const newMessage: Message = {
          role: "assistant",
          content: response,
          matches: context.matches,
          recommendedAction: context.recommendedAction,
          intent: context.intent,
          autoPost: context.autoPost,
          aiUsed: context.aiUsed,
          needsLocation: context.needsLocation,
        };

        setMessages((prev) => [...prev, newMessage]);
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble processing your request. Please try again or use the navigation menu to explore the site.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPendingImage({ file, preview });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Send image with optional message
  const handleSendWithImage = async () => {
    if (!pendingImage) return;

    try {
      const base64 = await fileToBase64(pendingImage.file);
      await handleSend(input || "", base64, pendingImage.preview);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
      setPendingImage(null);
    }
  };

  // Cancel pending image
  const handleCancelImage = () => {
    if (pendingImage?.preview) {
      URL.revokeObjectURL(pendingImage.preview);
    }
    setPendingImage(null);
  };
  
  // Handle clearing conversation and memory
  const handleClearConversation = () => {
    clearSessionMemory();
    setSessionContext(undefined);
    setMessages([{
      role: "assistant",
      content: "Lost & Found Investigator ready.\n\nDescribe what you lost or found.",
    }]);
    setConversationHistory([]);
    toast.success("Conversation cleared");
  };


  const handleActionClick = (action: string, intent?: string) => {
    switch (action) {
      case "post_item":
        if (intent === 'post_found') {
          navigate("/post-found");
          toast.success("Taking you to report a found item");
        } else {
          navigate("/post-lost");
          toast.success("Taking you to report a lost item");
        }
        setIsOpen(false);
        break;
      case "review_matches":
        navigate("/matches");
        setIsOpen(false);
        break;
      case "browse_items":
        navigate("/browse");
        setIsOpen(false);
        break;
      case "provide_location":
        // Location input via chat text
        toast.info("Please type the location in chat");
        inputRef.current?.focus();
        break;
      case "provide_more_info":
      case "refine_search":
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        toast.info("Provide more details about your item");
        break;
      case "expand_search":
        handleSend("Expand search to nearby areas");
        break;
      case "get_notified":
        toast.success("You'll be notified when matching items are posted");
        break;
      default:
        break;
    }
  };

  const handleItemClick = (itemId: string) => {
    navigate(`/browse?item=${itemId}`);
    setIsOpen(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "bg-green-500/10 text-green-600 border-green-500/30";
    if (confidence >= 50) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    return "bg-red-500/10 text-red-600 border-red-500/30";
  };

  const getActionLabel = (action: string, intent?: string) => {
    switch (action) {
      case "post_item":
        return intent === 'post_found' ? "Report Found Item" : "Report Lost Item";
      case "review_matches":
        return "Review Matches";
      case "provide_more_info":
        return "Tell Me More";
      case "provide_location":
        return "Add Location";
      case "continue_search":
        return "Continue Searching";
      case "browse_items":
        return "Browse All Items";
      case "expand_search":
        return "Expand Search Area";
      case "get_notified":
        return "Notify Me Later";
      case "refine_search":
        return "Refine Details";
      case "navigate_to_post":
        return intent === 'post_found' ? "Go to Post Found" : "Go to Post Lost";
      case "continue_conversation":
      case "continue":
      case "await_input":
        return null; // Don't show button
      default:
        return null;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 cursor-pointer flex flex-col items-center gap-1.5
          hover:-translate-y-1 
          transition-all duration-200 ease-out
          group"
        aria-label="Open AI Lost & Found Assistant"
      >
        <div className="h-14 w-14 rounded-full overflow-hidden
          shadow-[0_4px_20px_rgba(0,191,166,0.3)] 
          group-hover:shadow-[0_8px_30px_rgba(0,191,166,0.45)] 
          ring-2 ring-teal-400/20 group-hover:ring-teal-400/40
          transition-all duration-200">
          <img 
            src={aiAssistantLogo} 
            alt="AI Lost & Found Assistant" 
            className="h-full w-full object-cover group-hover:brightness-110 transition-all duration-200" 
          />
        </div>
        <span className="text-[11px] font-medium tracking-tight text-primary dark:text-teal-400">
          FindIt AI
        </span>
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[420px] h-[550px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 shadow-[0_2px_10px_rgba(0,191,166,0.3)] ring-1 ring-teal-400/20">
            <img src={aiAssistantLogo} alt="AI Assistant" className="h-full w-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">Lost & Found Investigator</CardTitle>
            <p className="text-xs text-muted-foreground font-medium">Smart search assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleClearConversation} title="Clear conversation">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {/* Display uploaded image */}
                {message.imageUrl && (
                  <div className="mb-2">
                    <img 
                      src={message.imageUrl} 
                      alt="Uploaded" 
                      className="max-w-full h-auto rounded-md max-h-32 object-cover"
                    />
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Match Results with Confidence Scores */}
                {message.matches && message.matches.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      📊 Ranked Matches:
                    </p>
                    {message.matches.map((match: MatchResult, i: number) => (
                      <div
                        key={match.item.id}
                        className="bg-background rounded-lg p-3 border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            #{match.rank}
                          </div>
                          {match.item.photos && match.item.photos[0] && (
                            <img
                              src={match.item.photos[0]}
                              alt={match.item.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{match.item.title}</p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getConfidenceColor(match.confidence)}`}
                              >
                                {match.confidence}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {match.item.category}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {match.item.location?.substring(0, 20)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {match.reasoning?.split('\n')[0]}
                            </p>
                            {/* View Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full h-7 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewItem(match.item);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All action buttons removed - chat text only */}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Investigating...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardContent className="p-3 border-t">
        {/* Pending image preview */}
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            <img 
              src={pendingImage.preview} 
              alt="Upload preview" 
              className="h-20 w-20 object-cover rounded-lg border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
              onClick={handleCancelImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Autocomplete suggestions */}
        {autocomplete.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {autocomplete.map((suggestion, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 text-xs"
                onClick={() => {
                  setInput(suggestion);
                  setAutocomplete([]);
                }}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        )}

        {/* Quick action buttons removed - chat text + image upload only */}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pendingImage) {
              handleSendWithImage();
            } else {
              handleSend();
            }
          }}
          className="flex gap-2"
        >
          {/* Image upload button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload image for analysis"
          >
            <Camera className="h-4 w-4" />
          </Button>
          
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingImage ? "Add description (optional)..." : "Describe what you're looking for..."}
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || (!input.trim() && !pendingImage)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>

      {/* Item Details Dialog */}
      <ItemDetailsDialog
        item={selectedItem}
        isOpen={isItemDialogOpen}
        onClose={() => {
          setIsItemDialogOpen(false);
          setSelectedItem(null);
        }}
      />

      {/* Location dialog removed - text-based location input only */}
    </Card>
  );
};

export default AIAssistant;