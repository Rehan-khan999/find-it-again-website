import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";

interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  verification_answers: Record<string, string>;
  status: string;
  created_at: string;
  reviewed_at?: string;
  notes?: string;
  items: {
    title: string;
    item_type: string;
    verification_questions: string[];
  };
}

export const ClaimManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch claims for items owned by the current user
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          items:item_id (
            title,
            item_type,
            verification_questions
          )
        `)
        .eq('items.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Claim[];
    },
    enabled: !!user
  });

  const updateClaimStatus = useMutation({
    mutationFn: async ({ claimId, status, notes }: { claimId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('claims')
        .update({
          status,
          notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', claimId);

      if (error) throw error;

      // Get claim details to send notification
      const { data: claim } = await supabase
        .from('claims')
        .select('claimant_id, items:item_id(title)')
        .eq('id', claimId)
        .single();

      if (claim) {
        await supabase.functions.invoke('notify-users', {
          body: {
            type: 'claim_update',
            userId: claim.claimant_id,
            title: `Claim ${status}`,
            message: `Your claim for "${claim.items.title}" has been ${status}. ${notes ? `Note: ${notes}` : ''}`,
            relatedItemId: claim.items.title
          }
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Claim updated successfully",
        description: "The claimant has been notified of your decision.",
      });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setExpandedClaim(null);
      setReviewNotes("");
    },
    onError: (error) => {
      console.error('Error updating claim:', error);
      toast({
        title: "Error updating claim",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const handleApprove = (claimId: string) => {
    updateClaimStatus.mutate({ claimId, status: 'approved', notes: reviewNotes });
  };

  const handleReject = (claimId: string) => {
    updateClaimStatus.mutate({ claimId, status: 'rejected', notes: reviewNotes });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No claims submitted for your items yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Manage Claims</h2>
      
      {claims.map((claim) => (
        <Card key={claim.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Claim for "{claim.items.title}"
              </CardTitle>
              <Badge variant={
                claim.status === 'approved' ? 'default' :
                claim.status === 'rejected' ? 'destructive' : 'secondary'
              }>
                <Clock className="w-3 h-3 mr-1" />
                {claim.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Submitted on {format(new Date(claim.created_at), 'MMM dd, yyyy')}
            </p>
          </CardHeader>
          
          <CardContent>
            {claim.items.verification_questions?.length > 0 && (
              <div className="space-y-3 mb-4">
                <Label className="font-medium">Verification Answers:</Label>
                {claim.items.verification_questions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <p className="font-medium text-sm mb-2">{question}</p>
                    <p className="text-sm text-gray-700">
                      {claim.verification_answers?.[index.toString()] || 'No answer provided'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {claim.status === 'pending' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Review Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes for the claimant..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(claim.id)}
                    disabled={updateClaimStatus.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Claim
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(claim.id)}
                    disabled={updateClaimStatus.isPending}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Claim
                  </Button>
                </div>
              </div>
            )}

            {claim.status !== 'pending' && claim.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Label className="font-medium">Review Notes:</Label>
                <p className="text-sm text-gray-700 mt-1">{claim.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};