import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, MapPin, Calendar, ArrowRight, Eye } from "lucide-react";
import { fetchAIMatchSuggestions } from "@/services/aiAssistant";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface MatchSuggestion {
  id: string;
  ai_score: number;
  text_similarity: number;
  image_similarity: number;
  location_proximity: number;
  reasoning: string;
  lost_item: any;
  found_item: any;
}

export const AIMatchSuggestions = () => {
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await fetchAIMatchSuggestions();
        if (data && !error) {
          setSuggestions(data as MatchSuggestion[]);
        }
      } catch (error) {
        console.error("Error loading AI match suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();
  }, [user]);

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Sign in to see AI-powered match suggestions</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Analyzing potential matches...</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">No AI match suggestions yet</p>
          <p className="text-sm text-muted-foreground">
            Post more items to get AI-powered match recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Match Suggestions
          <Badge variant="secondary" className="ml-auto">
            {suggestions.length} potential matches
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="overflow-hidden">
                <div className="p-4">
                  {/* Match score header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={suggestion.ai_score >= 70 ? "default" : "secondary"}
                        className="font-bold"
                      >
                        {Math.round(suggestion.ai_score)}% Match
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/browse?item=${suggestion.lost_item?.id || suggestion.found_item?.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>

                  {/* Items comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Lost Item */}
                    <div className="space-y-2">
                      <Badge variant="destructive" className="text-xs">LOST</Badge>
                      {suggestion.lost_item?.photos?.[0] && (
                        <img
                          src={suggestion.lost_item.photos[0]}
                          alt={suggestion.lost_item.title}
                          className="w-full h-20 object-cover rounded"
                        />
                      )}
                      <p className="text-sm font-medium truncate">{suggestion.lost_item?.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{suggestion.lost_item?.location}</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>

                    {/* Found Item */}
                    <div className="space-y-2">
                      <Badge className="text-xs bg-green-500">FOUND</Badge>
                      {suggestion.found_item?.photos?.[0] && (
                        <img
                          src={suggestion.found_item.photos[0]}
                          alt={suggestion.found_item.title}
                          className="w-full h-20 object-cover rounded"
                        />
                      )}
                      <p className="text-sm font-medium truncate">{suggestion.found_item?.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{suggestion.found_item?.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Match breakdown */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Text Similarity</span>
                      <span>{Math.round(suggestion.text_similarity || 0)}%</span>
                    </div>
                    <Progress value={suggestion.text_similarity || 0} className="h-1" />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Location Proximity</span>
                      <span>{Math.round(suggestion.location_proximity || 0)}%</span>
                    </div>
                    <Progress value={suggestion.location_proximity || 0} className="h-1" />
                  </div>

                  {/* AI Reasoning */}
                  {suggestion.reasoning && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      <strong>AI Analysis:</strong> {suggestion.reasoning}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AIMatchSuggestions;
