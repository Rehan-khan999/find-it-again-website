import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, X, Sparkles, Wifi, WifiOff, MapPin, Tag, Eye, RotateCcw, GripHorizontal } from 'lucide-react';
import { GENIE_EVENTS, triggerGenieReaction, triggerPresentChat } from './ThreeCanvas';
import { cn } from '@/lib/utils';
import { genieChat, checkOllamaConnection, ChatMessage, MatchResult, ConversationContext, SessionContext } from '@/services/genieAI';
import { ItemDetailsDialog } from './ItemDetailsDialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  matches?: MatchResult[];
  recommendedAction?: string;
  intent?: string;
}

// Session memory for Genie (separate from FindIt AI)
const GENIE_MEMORY_KEYS = {
  sessionContext: 'genie_session_context',
  messages: 'genie_messages',
  history: 'genie_history',
};

const getGenieMemory = () => {
  try {
    const storedContext = sessionStorage.getItem(GENIE_MEMORY_KEYS.sessionContext);
    const storedMessages = sessionStorage.getItem(GENIE_MEMORY_KEYS.messages);
    const storedHistory = sessionStorage.getItem(GENIE_MEMORY_KEYS.history);
    return {
      sessionContext: storedContext ? JSON.parse(storedContext) as SessionContext : undefined,
      messages: storedMessages ? JSON.parse(storedMessages) : null,
      history: storedHistory ? JSON.parse(storedHistory) as ChatMessage[] : [],
    };
  } catch {
    return { sessionContext: undefined, messages: null, history: [] };
  }
};

const saveGenieMemory = (data: { sessionContext?: SessionContext; messages?: Message[]; history?: ChatMessage[] }) => {
  try {
    if (data.sessionContext) sessionStorage.setItem(GENIE_MEMORY_KEYS.sessionContext, JSON.stringify(data.sessionContext));
    if (data.messages) sessionStorage.setItem(GENIE_MEMORY_KEYS.messages, JSON.stringify(data.messages.slice(-20)));
    if (data.history) sessionStorage.setItem(GENIE_MEMORY_KEYS.history, JSON.stringify(data.history.slice(-10)));
  } catch {}
};

const clearGenieMemory = () => {
  try {
    sessionStorage.removeItem(GENIE_MEMORY_KEYS.sessionContext);
    sessionStorage.removeItem(GENIE_MEMORY_KEYS.messages);
    sessionStorage.removeItem(GENIE_MEMORY_KEYS.history);
  } catch {}
};

export const GenieChatPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  
  const memory = getGenieMemory();
  
  const [sessionContext, setSessionContext] = useState<SessionContext | undefined>(() => memory.sessionContext);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>(() => memory.history);
  
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = memory.messages;
    return saved || [{ 
      role: 'assistant' as const, 
      content: "✨ Greetings, seeker! I am the Genie of Lost & Found. Tell me what treasure you seek or have discovered, and I shall assist you in your quest!" 
    }];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geniePos, setGeniePos] = useState<{ x: number; y: number; canvasRect?: DOMRect } | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const panelWidth = 340;
  const panelHeight = 420;

  // Initialize panel position - far right to avoid genie overlap
  useEffect(() => {
    const initPosition = () => {
      const initialX = window.innerWidth - panelWidth - 20; // 20px from right edge
      const initialY = window.innerHeight - panelHeight - 60; // 60px from bottom
      setPosition({ x: initialX, y: initialY });
    };
    initPosition();
    window.addEventListener('resize', initPosition);
    return () => window.removeEventListener('resize', initPosition);
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    newX = Math.max(0, Math.min(newX, window.innerWidth - panelWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - panelHeight));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle viewing item details
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

  // Check connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkOllamaConnection();
      setIsConnected(connected);
      console.log('[GenieChatPanel] Edge function connection:', connected);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for genie events
  useEffect(() => {
    const handleEmerged = () => {
      console.log('GenieChatPanel: Received EMERGED event');
      setIsVisible(true);
      setTimeout(() => {
        triggerPresentChat(true);
        inputRef.current?.focus();
      }, 100);
    };

    const handleHidden = () => {
      console.log('GenieChatPanel: Received HIDDEN event');
      triggerPresentChat(false);
      setIsVisible(false);
    };

    const handleGeniePosition = (event: CustomEvent<{ x: number; y: number; canvasRect: DOMRect }>) => {
      setGeniePos(event.detail);
    };

    window.addEventListener(GENIE_EVENTS.EMERGED, handleEmerged);
    window.addEventListener(GENIE_EVENTS.HIDDEN, handleHidden);
    window.addEventListener(GENIE_EVENTS.GENIE_POSITION as any, handleGeniePosition);

    return () => {
      window.removeEventListener(GENIE_EVENTS.EMERGED, handleEmerged);
      window.removeEventListener(GENIE_EVENTS.HIDDEN, handleHidden);
      window.removeEventListener(GENIE_EVENTS.GENIE_POSITION as any, handleGeniePosition);
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Clear conversation
  const handleClearConversation = () => {
    clearGenieMemory();
    setSessionContext(undefined);
    setConversationHistory([]);
    setMessages([{
      role: 'assistant',
      content: '✨ The slate is clean, seeker! A fresh start. Tell me, what treasure do you seek?'
    }]);
    triggerGenieReaction('nod');
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    triggerGenieReaction('nod');

    // Update conversation history
    const newHistory: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];
    setConversationHistory(newHistory);

    try {
      // Call the SAME backend as FindIt AI (Supabase Edge Function)
      const result = await genieChat(userMessage, newHistory, sessionContext);
      
      // Update session context if returned
      if (result.context?.sessionContext) {
        setSessionContext(result.context.sessionContext);
      }
      
      // Update conversation history with assistant response
      const updatedHistory: ChatMessage[] = [
        ...newHistory,
        { role: 'assistant', content: result.response },
      ];
      setConversationHistory(updatedHistory);
      
      // Create message with matches
      const newMessage: Message = {
        role: 'assistant',
        content: result.response,
        matches: result.context?.matches,
        recommendedAction: result.context?.recommendedAction,
        intent: result.context?.intent,
      };

      setMessages(prev => [...prev, newMessage]);
      
      // Save to session memory
      saveGenieMemory({
        sessionContext: result.context?.sessionContext,
        history: updatedHistory,
        messages: [...messages, userMsg, newMessage],
      });

      // Show positive reaction if matches found
      if (result.context?.matches && result.context.matches.length > 0) {
        triggerGenieReaction('thumbsUp');
      } else if (!result.error) {
        triggerGenieReaction('nod');
      }
    } catch (error) {
      console.error('Genie chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ Search engine offline. Error: ${errorMessage}. Please try again.`
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, conversationHistory, sessionContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (confidence >= 50) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  if (!isVisible) return null;

  return (
    <>
      <div 
        ref={panelRef}
        className={cn(
          "fixed transition-opacity duration-500 ease-out pointer-events-auto",
          isVisible ? "opacity-100" : "opacity-0",
          isDragging ? "cursor-grabbing" : ""
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${panelWidth}px`,
          maxHeight: `${panelHeight}px`,
          zIndex: 50,
          transform: 'none', // Use left/top for positioning
        }}
      >
        {/* Glassmorphism panel */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/30 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-purple-950/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_60px_rgba(34,211,238,0.25)]">
          {/* Decorative edges */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-amber-700/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-amber-700/20 to-transparent" />
          
          {/* Cosmic stars overlay */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ top: '10%', left: '15%' }} />
            <div className="absolute w-0.5 h-0.5 bg-cyan-200 rounded-full animate-pulse" style={{ top: '25%', right: '20%', animationDelay: '0.4s' }} />
            <div className="absolute w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{ bottom: '30%', left: '10%', animationDelay: '0.9s' }} />
          </div>

          {/* Draggable Header */}
          <div 
            className={cn(
              "flex items-center justify-between p-2.5 border-b border-white/10",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              {/* Drag indicator */}
              <GripHorizontal className="h-3 w-3 text-white/40" />
              <div className="relative">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <div className="absolute inset-0 animate-ping">
                  <Sparkles className="h-4 w-4 text-cyan-400 opacity-20" />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Genie Assistant</h3>
                <div className="flex items-center gap-1">
                  <p className="text-[9px] text-cyan-300/70">Lost & Found Oracle</p>
                  {isConnected !== null && (
                    <span className="flex items-center gap-0.5">
                      {isConnected ? (
                        <Wifi className="h-2 w-2 text-green-400" />
                      ) : (
                        <WifiOff className="h-2 w-2 text-red-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleClearConversation}
                title="Clear conversation"
                className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="h-[280px] p-2.5" ref={scrollAreaRef}>
            <div className="space-y-2.5">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-lg px-3 py-1.5 text-xs",
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-white/10 text-white/90 border border-white/10'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                    {/* Match Results (same as FindIt AI) */}
                    {message.matches && message.matches.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[10px] font-medium text-cyan-300 mb-1">
                          📊 Ranked Matches:
                        </p>
                        {message.matches.slice(0, 3).map((match: MatchResult, i: number) => (
                          <div
                            key={match.item.id || i}
                            className="bg-black/30 rounded-lg p-2 border border-white/10"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                                #{match.rank}
                              </div>
                              {match.item.photos && match.item.photos[0] && (
                                <img
                                  src={match.item.photos[0]}
                                  alt={match.item.title}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-[11px] font-medium truncate text-white">{match.item.title}</p>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[9px] px-1 py-0 ${getConfidenceColor(match.confidence)}`}
                                  >
                                    {match.confidence}%
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-white/60">
                                  <span className="flex items-center gap-0.5">
                                    <Tag className="h-2.5 w-2.5" />
                                    {match.item.category}
                                  </span>
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {match.item.location?.slice(0, 15)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewItem(match.item)}
                                  className="mt-1 h-5 text-[9px] text-cyan-400 hover:text-cyan-300 p-0"
                                >
                                  <Eye className="h-2.5 w-2.5 mr-1" />
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
                  <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                      <span className="text-[10px] text-white/70">Consulting the cosmic registry...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-2.5 border-t border-white/10">
            <div className="flex gap-1.5">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the Genie..."
                disabled={isLoading}
                className="flex-1 h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400/50 focus:ring-cyan-400/20"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="sm"
                className="h-8 px-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-md shadow-cyan-500/20"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Decorative glow effects */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-16 h-16 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* Item Details Dialog */}
      <ItemDetailsDialog 
        item={selectedItem}
        isOpen={isItemDialogOpen}
        onClose={() => setIsItemDialogOpen(false)}
      />
    </>
  );
};
