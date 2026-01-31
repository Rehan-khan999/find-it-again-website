import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, X, Sparkles } from 'lucide-react';
import { GENIE_EVENTS, triggerGenieReaction } from './ThreeCanvas';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for genie emergence/hiding
  useEffect(() => {
    const handleEmerged = () => {
      setIsVisible(true);
      setTimeout(() => inputRef.current?.focus(), 500);
    };

    const handleHidden = () => {
      setIsVisible(false);
    };

    window.addEventListener(GENIE_EVENTS.EMERGED, handleEmerged);
    window.addEventListener(GENIE_EVENTS.HIDDEN, handleHidden);

    return () => {
      window.removeEventListener(GENIE_EVENTS.EMERGED, handleEmerged);
      window.removeEventListener(GENIE_EVENTS.HIDDEN, handleHidden);
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

    // Trigger genie nod reaction
    triggerGenieReaction('nod');

    try {
      // Call the AI assistant edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant response
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

  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
      )}
      style={{
        bottom: '180px',
        right: '460px',
        width: '360px',
        maxHeight: '420px',
      }}
    >
      {/* Glassmorphism cosmic panel */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-purple-950/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_80px_rgba(100,150,255,0.2)]">
        {/* Cosmic stars overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ top: '8%', left: '12%', animationDelay: '0s' }} />
          <div className="absolute w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{ top: '22%', right: '18%', animationDelay: '0.4s' }} />
          <div className="absolute w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{ bottom: '28%', left: '8%', animationDelay: '0.9s' }} />
          <div className="absolute w-0.5 h-0.5 bg-cyan-200 rounded-full animate-pulse" style={{ top: '55%', right: '12%', animationDelay: '1.3s' }} />
          <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ bottom: '12%', right: '22%', animationDelay: '1.8s' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-5 w-5 text-cyan-400 opacity-25" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Genie Assistant</h3>
              <p className="text-[10px] text-cyan-300/70">Lost & Found Oracle</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsVisible(false)}
            className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[260px] p-3.5" ref={scrollRef}>
          <div className="space-y-3">
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
                    "max-w-[88%] rounded-xl px-3.5 py-2 text-[13px]",
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-white/10 text-white/90 border border-white/10'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-xl px-3.5 py-2.5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span className="text-xs text-white/70">Consulting the cosmos...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3.5 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Genie..."
              disabled={isLoading}
              className="flex-1 h-9 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400/50 focus:ring-cyan-400/20"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="h-9 px-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Decorative glow effects */}
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-8 -left-8 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
};
