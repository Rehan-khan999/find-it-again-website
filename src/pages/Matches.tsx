import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ItemDetailsDialog } from "@/components/ItemDetailsDialog";
import { useMemo, useState } from "react";
import { Handshake, Eye, Clock, Sparkles } from "lucide-react";
import { computeImageSimilarity } from "@/services/imageSimilarity";

interface Match {
  id: string;
  status: string;
  similarity_score: number;
  created_at: string;
  lost_item_id: string;
  found_item_id: string;
  lost_item: {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    date_lost_found: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    user_id: string;
    item_type: 'lost';
    reward?: string;
    status: string;
    created_at: string;
    latitude?: number;
    longitude?: number;
    verification_questions?: string[];
    photos?: string[];
  };
  found_item: {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    date_lost_found: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    user_id: string;
    item_type: 'found';
    reward?: string;
    status: string;
    created_at: string;
    latitude?: number;
    longitude?: number;
    verification_questions?: string[];
    photos?: string[];
  };
}

const Matches = () => {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiScores, setAiScores] = useState<Record<string, number>>({});

  // Fetch matches for items owned by the current user
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get matches for user's items
      const { data: userItems } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', user.id);

      if (!userItems || userItems.length === 0) return [];

      const userItemIds = userItems.map(item => item.id);

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          lost_item:items!matches_lost_item_id_fkey(*),
          found_item:items!matches_found_item_id_fkey(*)
        `)
        .or(`lost_item_id.in.(${userItemIds.join(',')}),found_item_id.in.(${userItemIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Match[];
    },
    enabled: !!user
  });

  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Matches</h1>
          <p className="text-gray-600">Potential matches for your lost and found items</p>
        </div>

        {matches.length > 0 && (
          <div className="flex items-center justify-center mb-6 gap-3">
            <Button
              variant={aiEnabled ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                if (aiEnabled) {
                  setAiEnabled(false);
                  return;
                }
                setAiLoading(true);
                const scores: Record<string, number> = {};
                try {
                  for (const match of matches) {
                    const userOwnedItem = match.lost_item?.user_id === user?.id ? match.lost_item : match.found_item;
                    const matchedItem = match.lost_item?.user_id === user?.id ? match.found_item : match.lost_item;
                    const a = userOwnedItem?.photos?.[0];
                    const b = matchedItem?.photos?.[0];
                    if (a && b) {
                      const score = await computeImageSimilarity(a, b);
                      scores[match.id] = score;
                    }
                  }
                  setAiScores(scores);
                  setAiEnabled(true);
                } catch (e) {
                  console.error('AI re-rank failed', e);
                } finally {
                  setAiLoading(false);
                }
              }}
              disabled={aiLoading}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Analyzing images…' : (aiEnabled ? 'AI re-rank on' : 'AI re-rank (beta)')}
            </Button>
          </div>
        )}


        {matches.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found yet</h3>
              <p className="text-gray-600">
                When we find potential matches for your items, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {(aiEnabled ? [...matches].sort((a, b) => (aiScores[b.id] ?? 0) - (aiScores[a.id] ?? 0)) : matches).map((match) => {
              const userOwnedItem = match.lost_item?.user_id === user?.id ? match.lost_item : match.found_item;
              const matchedItem = match.lost_item?.user_id === user?.id ? match.found_item : match.lost_item;
              const aiScore = aiScores[match.id];
              
              return (
                <Card key={match.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Handshake className="w-5 h-5" />
                        Potential Match Found
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          match.status === 'confirmed' ? 'default' :
                          match.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          <Clock className="w-3 h-3 mr-1" />
                          {match.status}
                        </Badge>
                        {typeof aiScore === 'number' ? (
                          <Badge variant="outline">
                            AI {Math.round(aiScore * 100)}%
                          </Badge>
                        ) : match.similarity_score ? (
                          <Badge variant="outline">
                            {Math.round(match.similarity_score * 100)}% match
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Match found on {format(new Date(match.created_at), 'MMM dd, yyyy')}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Your Item */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={userOwnedItem?.item_type === 'lost' ? 'destructive' : 'default'}>
                            Your {userOwnedItem?.item_type?.toUpperCase()} Item
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{userOwnedItem?.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{userOwnedItem?.description}</p>
                        <div className="text-sm text-gray-500">
                          <p>Category: {userOwnedItem?.category}</p>
                          <p>Location: {userOwnedItem?.location}</p>
                          <p>Date: {userOwnedItem && format(new Date(userOwnedItem.date_lost_found), 'MMM dd, yyyy')}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewItem(userOwnedItem)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>

                      {/* Matched Item */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={matchedItem?.item_type === 'lost' ? 'destructive' : 'default'}>
                            Matched {matchedItem?.item_type?.toUpperCase()} Item
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{matchedItem?.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{matchedItem?.description}</p>
                        <div className="text-sm text-gray-500">
                          <p>Category: {matchedItem?.category}</p>
                          <p>Location: {matchedItem?.location}</p>
                          <p>Date: {matchedItem && format(new Date(matchedItem.date_lost_found), 'MMM dd, yyyy')}</p>
                          <p>Contact: {matchedItem?.contact_name}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewItem(matchedItem)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <ItemDetailsDialog 
        item={selectedItem}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
};

export default Matches;