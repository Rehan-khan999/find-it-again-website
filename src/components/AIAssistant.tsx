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
import { cn } from "@/lib/utils";

// Session memory keys - separate for each mode
const MEMORY_KEYS = {
  // Normal mode
  normal_lastSearchCategory: 'ai_normal_last_search_category',
  normal_lastSearchLocation: 'ai_normal_last_search_location',
  normal_lastSearchDate: 'ai_normal_last_search_date',
  normal_conversationHistory: 'ai_normal_conversation_history',
  normal_sessionContext: 'ai_normal_session_context',
  normal_messages: 'ai_normal_messages',
  // General mode
  general_conversationHistory: 'ai_general_conversation_history',
  general_messages: 'ai_general_messages',
  // Current mode
  currentMode: 'ai_current_mode',
};

// Helper to get session memory for specific mode
const getSessionMemory = (mode: 'normal' | 'general') => {
  try {
    if (mode === 'normal') {
      const storedContext = sessionStorage.getItem(MEMORY_KEYS.normal_sessionContext);
      const storedMessages = sessionStorage.getItem(MEMORY_KEYS.normal_messages);
      return {
        lastCategory: sessionStorage.getItem(MEMORY_KEYS.normal_lastSearchCategory),
        lastLocation: sessionStorage.getItem(MEMORY_KEYS.normal_lastSearchLocation),
        lastDate: sessionStorage.getItem(MEMORY_KEYS.normal_lastSearchDate),
        history: JSON.parse(sessionStorage.getItem(MEMORY_KEYS.normal_conversationHistory) || '[]'),
        sessionContext: storedContext ? JSON.parse(storedContext) as SessionContext : undefined,
        messages: storedMessages ? JSON.parse(storedMessages) : null,
      };
    } else {
      const storedMessages = sessionStorage.getItem(MEMORY_KEYS.general_messages);
      return {
        lastCategory: null,
        lastLocation: null,
        lastDate: null,
        history: JSON.parse(sessionStorage.getItem(MEMORY_KEYS.general_conversationHistory) || '[]'),
        sessionContext: undefined,
        messages: storedMessages ? JSON.parse(storedMessages) : null,
      };
    }
  } catch {
    return { lastCategory: null, lastLocation: null, lastDate: null, history: [], sessionContext: undefined, messages: null };
  }
};

// Helper to save session memory for specific mode
const saveSessionMemory = (
  mode: 'normal' | 'general',
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
    if (mode === 'normal') {
      if (data.category) sessionStorage.setItem(MEMORY_KEYS.normal_lastSearchCategory, data.category);
      if (data.location) sessionStorage.setItem(MEMORY_KEYS.normal_lastSearchLocation, data.location);
      if (data.date) sessionStorage.setItem(MEMORY_KEYS.normal_lastSearchDate, data.date);
      if (data.history) sessionStorage.setItem(MEMORY_KEYS.normal_conversationHistory, JSON.stringify(data.history.slice(-10)));
      if (data.sessionContext) sessionStorage.setItem(MEMORY_KEYS.normal_sessionContext, JSON.stringify(data.sessionContext));
      if (data.messages) sessionStorage.setItem(MEMORY_KEYS.normal_messages, JSON.stringify(data.messages.slice(-20)));
    } else {
      if (data.history) sessionStorage.setItem(MEMORY_KEYS.general_conversationHistory, JSON.stringify(data.history.slice(-10)));
      if (data.messages) sessionStorage.setItem(MEMORY_KEYS.general_messages, JSON.stringify(data.messages.slice(-20)));
    }
  } catch {
    // Silently fail if storage is full
  }
};

// Clear session memory for specific mode
const clearModeMemory = (mode: 'normal' | 'general') => {
  try {
    if (mode === 'normal') {
      sessionStorage.removeItem(MEMORY_KEYS.normal_lastSearchCategory);
      sessionStorage.removeItem(MEMORY_KEYS.normal_lastSearchLocation);
      sessionStorage.removeItem(MEMORY_KEYS.normal_lastSearchDate);
      sessionStorage.removeItem(MEMORY_KEYS.normal_conversationHistory);
      sessionStorage.removeItem(MEMORY_KEYS.normal_sessionContext);
      sessionStorage.removeItem(MEMORY_KEYS.normal_messages);
    } else {
      sessionStorage.removeItem(MEMORY_KEYS.general_conversationHistory);
      sessionStorage.removeItem(MEMORY_KEYS.general_messages);
    }
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
  
  // Mode state - 'normal' | 'general'
  const [assistantMode, setAssistantMode] = useState<'normal' | 'general'>(() => {
    const saved = sessionStorage.getItem(MEMORY_KEYS.currentMode);
    return (saved === 'general') ? 'general' : 'normal';
  });
  
  const { switchTab } = useAITabController();
  const location = useLocation();
  
  // Get memory for current mode
  const getNormalMemory = () => getSessionMemory('normal');
  const getGeneralMemory = () => getSessionMemory('general');
  
  const [normalSessionContext, setNormalSessionContext] = useState<SessionContext | undefined>(() => getNormalMemory().sessionContext);
  
  // Generate welcome message based on mode
  const getWelcomeMessage = (mode: 'normal' | 'general') => {
    if (mode === 'general') {
      return "General Mode AI ready.\n\nAsk me anything – general knowledge, explanations, casual questions. No restrictions on topic!";
    }
    const normalMem = getNormalMemory();
    if (normalMem.lastCategory && normalMem.lastLocation) {
      return `Welcome back. Last: ${normalMem.lastCategory} in ${normalMem.lastLocation}.\n\nContinue or describe new item.`;
    }
    return "Lost & Found Investigator ready.\n\nDescribe what you lost or found naturally.";
  };
  
  // Separate message states for each mode
  const [normalMessages, setNormalMessages] = useState<Message[]>(() => {
    const saved = getNormalMemory().messages;
    return saved || [{ role: "assistant" as const, content: getWelcomeMessage('normal') }];
  });
  
  const [generalMessages, setGeneralMessages] = useState<Message[]>(() => {
    const saved = getGeneralMemory().messages;
    return saved || [{ role: "assistant" as const, content: getWelcomeMessage('general') }];
  });
  
  // Separate conversation histories
  const [normalHistory, setNormalHistory] = useState<ChatMessage[]>(() => getNormalMemory().history);
  const [generalHistory, setGeneralHistory] = useState<ChatMessage[]>(() => getGeneralMemory().history);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  // Get current messages/history based on mode
  const currentMessages = assistantMode === 'normal' ? normalMessages : generalMessages;
  const setCurrentMessages = assistantMode === 'normal' ? setNormalMessages : setGeneralMessages;
  const currentHistory = assistantMode === 'normal' ? normalHistory : generalHistory;
  const setCurrentHistory = assistantMode === 'normal' ? setNormalHistory : setGeneralHistory;

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
  }, [currentMessages]);

  useEffect(() => {
    const fetchAutocomplete = async () => {
      // Only show autocomplete in normal mode
      if (assistantMode === 'general' || input.length < 2) {
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
  }, [input, assistantMode]);

  // Handle mode switch
  const handleModeSwitch = (newMode: 'normal' | 'general') => {
    if (newMode === assistantMode) return;
    
    // Save current mode to session storage
    sessionStorage.setItem(MEMORY_KEYS.currentMode, newMode);
    setAssistantMode(newMode);
    
    // Clear input
    setInput("");
    setAutocomplete([]);
    
    toast.success(newMode === 'normal' 
      ? "Switched to Normal Mode - Lost & Found focus" 
      : "Switched to General Mode - Open questions welcome"
    );
  };

  const handleSend = async (message?: string) => {
    const userMessage = message || input;
    if (!userMessage.trim()) return;

    setInput("");
    setAutocomplete([]);
    
    const userMsg: Message = { 
      role: "user", 
      content: userMessage
    };
    setCurrentMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Update conversation history for current mode
    const newHistory: ChatMessage[] = [
      ...currentHistory,
      { role: "user", content: userMessage },
    ];
    setCurrentHistory(newHistory);

    try {
      // Pass mode-specific context
      const sessionCtx = assistantMode === 'normal' ? normalSessionContext : undefined;
      const { data, error } = await chat(userMessage, newHistory, sessionCtx, assistantMode);

      if (error) {
        throw new Error(error);
      }

      if (data) {
        const { response, context } = data;

        // Update session context from backend (only for normal mode)
        if (assistantMode === 'normal' && context.sessionContext) {
          setNormalSessionContext(context.sessionContext);
        }

        // Save intent for reference (only for normal mode)
        if (assistantMode === 'normal' && context.intent) {
          setLastIntent(context.intent);
        }

        // Switch tabs based on detected intent (only on Browse page, only normal mode)
        if (assistantMode === 'normal' && location.pathname === '/browse' && context.intent) {
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
        setCurrentHistory(updatedHistory);
        
        // Create message with matches, context, and auto post
        const newMessage: Message = {
          role: "assistant",
          content: response,
          matches: assistantMode === 'normal' ? context.matches : undefined,
          recommendedAction: context.recommendedAction,
          intent: context.intent,
          autoPost: assistantMode === 'normal' ? context.autoPost : undefined,
          aiUsed: context.aiUsed,
          needsLocation: assistantMode === 'normal' ? context.needsLocation : undefined,
        };

        setCurrentMessages((prev) => [...prev, newMessage]);
        
        // Save to session memory for current mode
        if (assistantMode === 'normal') {
          saveSessionMemory('normal', {
            category: context.sessionContext?.category,
            location: context.sessionContext?.location,
            history: updatedHistory,
            sessionContext: context.sessionContext,
            messages: [...currentMessages, userMsg, newMessage],
          });
        } else {
          saveSessionMemory('general', {
            history: updatedHistory,
            messages: [...currentMessages, userMsg, newMessage],
          });
        }
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      setCurrentMessages((prev) => [
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
  
  // Handle clearing conversation and memory for current mode
  const handleClearConversation = () => {
    clearModeMemory(assistantMode);
    
    if (assistantMode === 'normal') {
      setNormalSessionContext(undefined);
      setNormalMessages([{
        role: "assistant",
        content: "Lost & Found Investigator ready.\n\nDescribe what you lost or found.",
      }]);
      setNormalHistory([]);
    } else {
      setGeneralMessages([{
        role: "assistant",
        content: "General Mode AI ready.\n\nAsk me anything!",
      }]);
      setGeneralHistory([]);
    }
    
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
    <Card className="fixed bottom-6 right-6 w-[420px] h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-col gap-2 py-3 px-4 border-b">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 shadow-[0_2px_10px_rgba(0,191,166,0.3)] ring-1 ring-teal-400/20">
              <img src={aiAssistantLogo} alt="AI Assistant" className="h-full w-full object-cover" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                {assistantMode === 'normal' ? 'Lost & Found Investigator' : 'General AI Assistant'}
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium">
                {assistantMode === 'normal' ? 'Smart search assistant' : 'Open domain questions'}
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
        </div>
        
        {/* Mode Toggle Buttons */}
        <div className="flex gap-2">
          <Button
            variant={assistantMode === 'normal' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "flex-1 text-xs h-8",
              assistantMode === 'normal' && "ring-2 ring-primary/30"
            )}
            onClick={() => handleModeSwitch('normal')}
          >
            Normal Mode
          </Button>
          <Button
            variant={assistantMode === 'general' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "flex-1 text-xs h-8",
              assistantMode === 'general' && "ring-2 ring-primary/30"
            )}
            onClick={() => handleModeSwitch('general')}
          >
            General Mode
          </Button>
        </div>
        
        {/* Helper Text */}
        <p className="text-[10px] text-muted-foreground text-center">
          {assistantMode === 'normal' 
            ? "Normal Mode helps with Lost & Found items only." 
            : "General Mode allows open AI questions."}
        </p>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {currentMessages.map((message, index) => (
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
                  <span className="text-sm text-muted-foreground">
                    {assistantMode === 'normal' ? 'Investigating...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardContent className="p-3 border-t">
        {/* Autocomplete suggestions (only in normal mode) */}
        {assistantMode === 'normal' && autocomplete.length > 0 && (
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
            placeholder={assistantMode === 'normal' 
              ? "Describe what you lost or found..." 
              : "Ask me anything..."
            }
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

      {/* Location dialog removed - text-based location input only */}
    </Card>
  );
};

export default AIAssistant;