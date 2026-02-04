import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, X, MapPin, Tag, RotateCcw, Eye } from "lucide-react";
import aiAssistantLogo from "@/assets/ai-assistant-logo.png";
import { chat, getAutocomplete, ChatMessage, MatchResult, SessionContext, AutoPost } from "@/services/aiAssistant";
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
  messages: 'ai_messages',
};

// Helper to get session memory
const getSessionMemory = () => {
  try {
    const storedContext = sessionStorage.getItem(MEMORY_KEYS.sessionContext);
    const storedMessages = sessionStorage.getItem(MEMORY_KEYS.messages);
    return {
      lastCategory: sessionStorage.getItem(MEMORY_KEYS.lastSearchCategory),
      lastLocation: sessionStorage.getItem(MEMORY_KEYS.lastSearchLocation),
      lastDate: sessionStorage.getItem(MEMORY_KEYS.lastSearchDate),
      history: JSON.parse(sessionStorage.getItem(MEMORY_KEYS.conversationHistory) || '[]'),
      sessionContext: storedContext ? JSON.parse(storedContext) as SessionContext : undefined,
      messages: storedMessages ? JSON.parse(storedMessages) : null,
    };
  } catch {
    return { lastCategory: null, lastLocation: null, lastDate: null, history: [], sessionContext: undefined, messages: null };
  }
};

// Helper to save session memory
const saveSessionMemory = (
  data: {
    category?: string;
    location?: string;
    date?: string;
    history?: ChatMessage[];
    sessionContext?: SessionContext;
    messages?: Message[];
  }
) => {
  try {
    if (data.category) sessionStorage.setItem(MEMORY_KEYS.lastSearchCategory, data.category);
    if (data.location) sessionStorage.setItem(MEMORY_KEYS.lastSearchLocation, data.location);
    if (data.date) sessionStorage.setItem(MEMORY_KEYS.lastSearchDate, data.date);
    if (data.history) sessionStorage.setItem(MEMORY_KEYS.conversationHistory, JSON.stringify(data.history.slice(-10)));
    if (data.sessionContext) sessionStorage.setItem(MEMORY_KEYS.sessionContext, JSON.stringify(data.sessionContext));
    if (data.messages) sessionStorage.setItem(MEMORY_KEYS.messages, JSON.stringify(data.messages.slice(-20)));
  } catch {
    // Silently fail if storage is full
  }
};

// Clear session memory
const clearSessionMemory = () => {
  try {
    sessionStorage.removeItem(MEMORY_KEYS.lastSearchCategory);
    sessionStorage.removeItem(MEMORY_KEYS.lastSearchLocation);
    sessionStorage.removeItem(MEMORY_KEYS.lastSearchDate);
    sessionStorage.removeItem(MEMORY_KEYS.conversationHistory);
    sessionStorage.removeItem(MEMORY_KEYS.sessionContext);
    sessionStorage.removeItem(MEMORY_KEYS.messages);
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
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  
  const { switchTab } = useAITabController();
  const location = useLocation();
  
  const memory = getSessionMemory();
  
  const [sessionContext, setSessionContext] = useState<SessionContext | undefined>(() => memory.sessionContext);
  
  // Generate welcome message
  const getWelcomeMessage = () => {
    const mem = getSessionMemory();
    if (mem.lastCategory && mem.lastLocation) {
      return `Welcome back. Last: ${mem.lastCategory} in ${mem.lastLocation}.\n\nContinue or describe new item.`;
    }
    return "Lost & Found Investigator ready.\n\nDescribe what you lost or found naturally.";
  };
  
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = memory.messages;
    return saved || [{ role: "assistant" as const, content: getWelcomeMessage() }];
  });
  
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>(() => memory.history);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle viewing item details in dialog
  const handleViewItem = (item: any) => {
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

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

  const handleSend = async (message?: string) => {
    const userMessage = message || input;
    if (!userMessage.trim()) return;

    setInput("");
    setAutocomplete([]);
    
    const userMsg: Message = { 
      role: "user", 
      content: userMessage
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Update conversation history
    const newHistory: ChatMessage[] = [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];
    setConversationHistory(newHistory);

    try {
      const { data, error } = await chat(userMessage, newHistory, sessionContext);

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
        
        // Save to session memory
        saveSessionMemory({
          category: context.sessionContext?.category,
          location: context.sessionContext?.location,
          history: updatedHistory,
          sessionContext: context.sessionContext,
          messages: [...messages, userMsg, newMessage],
        });
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error 
            ? error.message 
            : "I'm having trouble processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
        return null;
      default:
        return null;
    }
  };

  // Hide floating button on homepage (lamp replaces it there)
  const isHomePage = location.pathname === '/';

  if (!isOpen) {
    // On homepage, hide the button - lamp acts as the assistant trigger
    if (isHomePage) {
      return null;
    }
    
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
    <Card className="fixed bottom-6 right-6 w-[420px] h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 shadow-[0_2px_10px_rgba(0,191,166,0.3)] ring-1 ring-teal-400/20">
            <img src={aiAssistantLogo} alt="AI Assistant" className="h-full w-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              Lost & Found Investigator
            </CardTitle>
            <p className="text-xs text-muted-foreground font-medium">
              Smart search assistant
            </p>
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you lost or found..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
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
    </Card>
  );
};

export default AIAssistant;
