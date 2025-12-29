import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Sparkles } from "lucide-react";
import { getAutocomplete, semanticSearch } from "@/services/aiAssistant";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface AISmartSearchProps {
  onResults: (items: any[]) => void;
  placeholder?: string;
  className?: string;
}

export const AISmartSearch = ({
  onResults,
  placeholder = "AI-powered search...",
  className = "",
}: AISmartSearchProps) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchAutocomplete = async () => {
      if (debouncedQuery.length < 2) {
        setAutocomplete([]);
        return;
      }

      const { data } = await getAutocomplete(debouncedQuery);
      if (data) {
        setAutocomplete(data);
        setShowAutocomplete(true);
      }
    };

    fetchAutocomplete();
  }, [debouncedQuery]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onResults([]);
      return;
    }

    setIsSearching(true);
    setShowAutocomplete(false);

    try {
      // Fetch all active items
      const { data: items } = await supabase
        .from("items")
        .select("*")
        .eq("status", "active")
        .limit(100);

      if (items && items.length > 0) {
        // Use semantic search to rank results
        const { data: rankedItems, error } = await semanticSearch(searchQuery, items);

        if (rankedItems && !error) {
          onResults(rankedItems);
        } else {
          // Fallback to basic filtering
          const filtered = items.filter(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.category.toLowerCase().includes(searchQuery.toLowerCase())
          );
          onResults(filtered);
        }
      } else {
        onResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      onResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onResults]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleAutocompleteClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowAutocomplete(false);
    performSearch(suggestion);
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
            onFocus={() => autocomplete.length > 0 && setShowAutocomplete(true)}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
          )}
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {showAutocomplete && autocomplete.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 py-1">
          {autocomplete.map((suggestion, i) => (
            <button
              key={i}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
              onClick={() => handleAutocompleteClick(suggestion)}
            >
              <Search className="h-3 w-3 text-muted-foreground" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AISmartSearch;
