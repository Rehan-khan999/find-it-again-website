import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, X, Sparkles } from 'lucide-react';
import { GENIE_EVENTS, triggerGenieReaction, triggerPresentChat } from './ThreeCanvas';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const GenieChatPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "✨ Greetings, seeker! I am the Genie of Lost & Found. Tell me what treasure you seek or have discovered, and I shall assist you in your quest!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geniePos, setGeniePos] = useState<{ x: number; y: number; canvasRect?: DOMRect } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for genie events
  useEffect(() => {
    const handleEmerged = () => {
      console.log('GenieChatPanel: Received EMERGED event');
      setIsVisible(true);
      // Trigger presentChat animation when chat opens
      setTimeout(() => {
        triggerPresentChat(true);
        inputRef.current?.focus();
      }, 100);
    };

    const handleHidden = () => {
      console.log('GenieChatPanel: Received HIDDEN event');
      // Reset presentChat animation when genie hides
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    triggerGenieReaction('nod');

    try {
      const response = await fetch('https://dmarkaigzovaqwpigtxe.supabase.co/functions/v1/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtYXJrYWlnem92YXF3cGlndHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzEzMDEsImV4cCI6MjA2Njk0NzMwMX0.IJ01ugvnjFNp4YT0mODR2IwzD337H3rWTuQRfONA_To`,
        },
        body: JSON.stringify({
          action: 'chat',
          message: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || "I sense a disturbance in the cosmic winds. Please try again." 
      }]);

      triggerGenieReaction('thumbsUp');
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "The mystical connection wavers... Please try your request again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isVisible) return null;

  // Chat panel positioned to the RIGHT side, adjacent to the genie
  // Layout: LAMP (left) - GENIE (center) - CHAT (right)
  // 
  // The 3D canvas is at bottom-right: 10px from right, 10px from bottom, 420x420
  // The chat should appear to the RIGHT of the genie, adjacent to it
  
  const panelWidth = 320;
  const panelHeight = 380;
  
  // Dynamic positioning based on genie's projected position
  // Position chat to the RIGHT of genie, adjacent
  let panelRight = 20; // Close to right edge, adjacent to genie
  let panelBottom = 60;
  
  if (geniePos && geniePos.canvasRect) {
    // Position chat so its left edge is near genie's right side
    // Chat appears on the RIGHT side of the genie, adjacent
    panelRight = window.innerWidth - geniePos.x - panelWidth - 40;
    panelBottom = window.innerHeight - geniePos.y - panelHeight / 2;
    
    // Clamp to screen bounds - keep it close to genie on right
    panelRight = Math.max(10, Math.min(panelRight, 180));
    panelBottom = Math.max(10, Math.min(panelBottom, window.innerHeight - panelHeight - 10));
  }

  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-500 ease-out",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        right: `${panelRight}px`,
        bottom: `${panelBottom}px`,
        width: `${panelWidth}px`,
        maxHeight: `${panelHeight}px`,
      }}
    >
      {/* Connecting line from genie to chat on right (appears to present it) */}
      <div 
        className="absolute w-8 h-1 pointer-events-none hidden md:block"
        style={{
          top: '35%',
          left: '-32px',
          background: 'linear-gradient(to left, rgba(34, 211, 238, 0.7), transparent)',
          borderRadius: '2px',
        }}
      />

      {/* Glassmorphism cosmic panel - styled like a magical scroll */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/30 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-purple-950/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_60px_rgba(34,211,238,0.25)]">
        {/* Scroll-like decorative edges */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-amber-700/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-amber-700/20 to-transparent" />
        
        {/* Cosmic stars overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ top: '10%', left: '15%' }} />
          <div className="absolute w-0.5 h-0.5 bg-cyan-200 rounded-full animate-pulse" style={{ top: '25%', right: '20%', animationDelay: '0.4s' }} />
          <div className="absolute w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{ bottom: '30%', left: '10%', animationDelay: '0.9s' }} />
          <div className="absolute w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{ top: '60%', right: '15%', animationDelay: '1.3s' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-4 w-4 text-cyan-400 opacity-20" />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Genie Assistant</h3>
              <p className="text-[9px] text-cyan-300/70">Lost & Found Oracle</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[220px] p-2.5" ref={scrollRef}>
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
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                    <span className="text-[10px] text-white/70">Consulting the cosmos...</span>
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
  );
};
