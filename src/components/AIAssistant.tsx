import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Bot, Send, X, Sparkles, Search, Tag, AlertCircle, Lightbulb } from "lucide-react";
import { clarifyIntent, getAutocomplete, semanticSearch } from "@/services/aiAssistant";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  searchResults?: any[];
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI assistant for FindIt. I can help you search for items, report lost/found items, and find potential matches. What can I help you with today?",
      suggestions: ["Search for lost items", "Report a found item", "Check my matches", "How does this work?"],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const handleSend = async (message?: string) => {
    const userMessage = message || input;
    if (!userMessage.trim()) return;

    setInput("");
    setAutocomplete([]);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // First, clarify intent
      const { data: intentData } = await clarifyIntent(userMessage);

      if (intentData) {
        const { intent, clarification, suggestions } = intentData;

        // Handle different intents
        if (intent === "search" || userMessage.toLowerCase().includes("search") || userMessage.toLowerCase().includes("find")) {
          // Perform semantic search
          const { data: items } = await supabase
            .from("items")
            .select("*")
            .eq("status", "active")
            .limit(50);

          if (items && items.length > 0) {
            const { data: searchResults } = await semanticSearch(userMessage, items);

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: searchResults && searchResults.length > 0
                  ? `I found ${searchResults.length} items that might match your search. Here are the most relevant ones:`
                  : "I couldn't find any items matching your search. Would you like to post a lost item report instead?",
                searchResults: searchResults?.slice(0, 5),
                suggestions: searchResults && searchResults.length > 0
                  ? ["Refine search", "Post lost item", "View all results"]
                  : ["Post lost item", "Search again", "Browse all items"],
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "There are no items in the database yet. Would you like to be the first to post an item?",
                suggestions: ["Post lost item", "Post found item"],
              },
            ]);
          }
        } else if (intent === "lost_item" || userMessage.toLowerCase().includes("lost")) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "I can help you report a lost item. Would you like to start the reporting process?",
              suggestions: ["Start reporting", "Search first", "How does it work?"],
            },
          ]);
        } else if (intent === "found_item" || userMessage.toLowerCase().includes("found")) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Thank you for wanting to report a found item! Would you like to start the reporting process?",
              suggestions: ["Start reporting", "Learn more", "View existing items"],
            },
          ]);
        } else if (clarification !== "CLEAR") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: clarification,
              suggestions,
            },
          ]);
        } else {
          // Handle general queries
          let response = "";
          
          if (userMessage.toLowerCase().includes("match")) {
            response = "I can help you check for potential matches! Our AI automatically analyzes all items and finds potential matches based on descriptions, locations, and images.";
          } else if (userMessage.toLowerCase().includes("how") || userMessage.toLowerCase().includes("work")) {
            response = "FindIt uses AI to help reunite people with their lost items. Simply post a lost or found item, and our system will automatically find potential matches and notify you. We use image recognition, smart text matching, and location analysis.";
          } else if (userMessage.toLowerCase().includes("browse") || userMessage.toLowerCase().includes("all")) {
            navigate("/browse");
            response = "I'm taking you to the browse page where you can see all items.";
          } else {
            response = suggestions.length > 0
              ? `Here are some things I can help you with:`
              : "I'm here to help you find lost items or report found items. What would you like to do?";
          }

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: response,
              suggestions: suggestions.length > 0 ? suggestions : ["Search items", "Post lost item", "Post found item", "Browse all"],
            },
          ]);
        }
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble processing your request. Please try again or use the navigation menu to explore the site.",
          suggestions: ["Try again", "Browse items", "Post item"],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.toLowerCase().includes("post lost") || suggestion.toLowerCase().includes("start reporting") && messages[messages.length - 1]?.content.includes("lost")) {
      navigate("/post-lost");
      setIsOpen(false);
      toast.success("Taking you to post a lost item");
    } else if (suggestion.toLowerCase().includes("post found") || suggestion.toLowerCase().includes("start reporting")) {
      navigate("/post-found");
      setIsOpen(false);
      toast.success("Taking you to post a found item");
    } else if (suggestion.toLowerCase().includes("browse") || suggestion.toLowerCase().includes("view all")) {
      navigate("/browse");
      setIsOpen(false);
    } else if (suggestion.toLowerCase().includes("match")) {
      navigate("/matches");
      setIsOpen(false);
    } else {
      handleSend(suggestion);
    }
  };

  const handleItemClick = (itemId: string) => {
    navigate(`/browse?item=${itemId}`);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">AI Assistant</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{message.content}</p>

                {/* Search Results */}
                {message.searchResults && message.searchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.searchResults.map((item: any) => (
                      <div
                        key={item.id}
                        className="bg-background rounded p-2 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleItemClick(item.id)}
                      >
                        <div className="flex items-start gap-2">
                          {item.photos && item.photos[0] && (
                            <img
                              src={item.photos[0]}
                              alt={item.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.title}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {item.item_type}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {item.location}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.suggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AIAssistant;
