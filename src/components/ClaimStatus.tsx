import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface Claim {
  id: string;
  status: string;
  created_at: string;
  item: {
    title: string;
    item_type: string;
  };
}

interface ClaimStatusProps {
  itemId?: string;
  showUserClaims?: boolean;
}

export const ClaimStatus = ({ itemId, showUserClaims = false }: ClaimStatusProps) => {
  const { user } = useAuth();

  const { data: claims = [], refetch } = useQuery({
    queryKey: ['claims', itemId, user?.id, showUserClaims],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase.from('claims').select(`
        id,
        status,
        created_at,
        item:items(title, item_type)
      `);

      if (itemId && !showUserClaims) {
        // Get claims for a specific item (for item owners)
        query = query.eq('item_id', itemId);
      } else if (showUserClaims) {
        // Get user's own claims
        query = query.eq('claimant_id', user.id);
      } else {
        return [];
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Claim[];
    },
    enabled: !!user && (!!itemId || showUserClaims)
  });

  // Real-time updates for claims
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('claims-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claims',
          filter: itemId ? `item_id=eq.${itemId}` : `claimant_id=eq.${user.id}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, itemId, refetch]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!claims.length) {
    return showUserClaims ? (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No claims submitted yet</p>
        </CardContent>
      </Card>
    ) : null;
  }

  return (
    <div className="space-y-2">
      {showUserClaims && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {claims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{claim.item.title}</p>
                  <p className="text-sm text-gray-500 capitalize">{claim.item.item_type} item</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(claim.status)}
                  <Badge variant={getStatusVariant(claim.status)}>
                    {claim.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!showUserClaims && claims.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Claims for this item ({claims.length})
          </h4>
          <div className="space-y-2">
            {claims.map((claim) => (
              <div key={claim.id} className="flex items-center gap-2 text-sm">
                {getStatusIcon(claim.status)}
                <Badge variant={getStatusVariant(claim.status)} className="text-xs">
                  {claim.status}
                </Badge>
                <span className="text-gray-500">
                  {new Date(claim.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};