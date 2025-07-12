import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClaimStatus } from '@/components/ClaimStatus';
import { ItemDetailsDialog } from '@/components/ItemDetailsDialog';
import { useState } from 'react';
import { MapPin, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  item_type: 'lost' | 'found';
  date_lost_found: string;
  location: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  reward?: string;
  status: string;
  created_at: string;
  photos?: string[];
  latitude?: number;
  longitude?: number;
  verification_questions?: string[];
  user_id: string;
}

const MyItems = () => {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['my-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Item[];
    },
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600">Please sign in to view your items.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Items</h1>
          <p className="text-gray-600">Manage your posted lost and found items</p>
        </div>

        <div className="space-y-6">
          {/* User's Claims */}
          <div>
            <h2 className="text-xl font-semibold mb-4">My Claims</h2>
            <ClaimStatus showUserClaims={true} />
          </div>

          {/* User's Posted Items */}
          <div>
            <h2 className="text-xl font-semibold mb-4">My Posted Items</h2>
            {items.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No items posted yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant={item.item_type === 'lost' ? 'destructive' : 'default'}>
                          {item.item_type.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{item.status}</Badge>
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {item.description}
                      </p>
                      
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{item.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(item.date_lost_found), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <ClaimStatus itemId={item.id} />
                      </div>

                      <Button
                        onClick={() => setSelectedItem(item)}
                        className="w-full mt-4"
                        variant="outline"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ItemDetailsDialog
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default MyItems;