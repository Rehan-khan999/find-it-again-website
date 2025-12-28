import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, Search, MapPin, HelpCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface MatchItem {
  id: string;
  title: string;
  category: string;
  location: string;
  date?: string;
  item_type?: string;
}

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  matches?: MatchItem[];
  missing?: string[];
  isError?: boolean;
}

export const AIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('lost-found-ai-chat', {
        body: {
          message: messageText.trim(),
          userId: user?.id || 'guest',
          source: 'chatbot',
        },
      });

      if (error) {
        throw new Error(error.message || 'Request failed');
      }
      setRetryCount(0);

      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || data.fallback || 'No response received.',
        matches: data.matches,
        missing: data.missing,
        isError: !!data.error,
      };

      if (data.error) {
        assistantMessage.content = data.error;
        assistantMessage.isError = true;
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Retry once if first attempt fails
      if (retryCount < 1) {
        setRetryCount(prev => prev + 1);
        setIsLoading(false);
        // Re-attempt after short delay
        setTimeout(() => sendMessage(messageText), 1000);
        return;
      }

      const errorMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'The assistant is temporarily unavailable. Please use manual search or try again later.',
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      setRetryCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    let message = '';
    switch (action) {
      case 'lost':
        message = 'I want to report a lost item';
        break;
      case 'found':
        message = 'I want to report a found item';
        break;
      case 'search':
        message = 'Help me find my item';
        break;
    }
    sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleMatchClick = (itemId: string) => {
    navigate(`/browse?item=${itemId}`);
  };

  return (
    <Card className="h-full flex flex-col max-h-[600px]">
      <CardHeader className="flex-shrink-0 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          Lost & Found Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="text-center space-y-2">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">
                  How can I help you today?
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('lost')}
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Report Lost Item
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('found')}
                  className="gap-2"
                >
                  <Search className="w-4 h-4" />
                  Report Found Item
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('search')}
                  className="gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Help Me Find My Item
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-4 py-3 rounded-lg text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : message.isError
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "bg-muted text-foreground"
                    )}
                  >
                    {message.isError && (
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Error</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {/* Missing Fields */}
                    {message.missing && message.missing.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">
                          Please provide the following:
                        </p>
                        <ul className="text-xs space-y-1">
                          {message.missing.map((field, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {field}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Match Results */}
                    {message.matches && message.matches.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Found {message.matches.length} matching item(s):
                        </p>
                        {message.matches.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleMatchClick(item.id)}
                            className="w-full text-left p-2 rounded bg-background/50 hover:bg-background transition-colors border border-border/30"
                          >
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.category} • {item.location}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted px-4 py-3 rounded-lg flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4 space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe your item or ask a question..."
              className="flex-1 min-h-[48px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="self-end h-[48px] w-[48px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send • This assistant only helps with Lost & Found items
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
