import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface Item {
  id: string;
  title: string;
  item_type: 'lost' | 'found';
  verification_questions?: string[];
  user_id: string;
}

interface ClaimDialogProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClaimDialog = ({ item, isOpen, onClose }: ClaimDialogProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const submitClaim = useMutation({
    mutationFn: async (claimData: {
      itemId: string;
      verificationAnswers: Record<string, string>;
    }) => {
      const { data, error } = await supabase
        .from('claims')
        .insert({
          item_id: claimData.itemId,
          claimant_id: user?.id,
          verification_answers: claimData.verificationAnswers,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to item owner
      await supabase.functions.invoke('notify-users', {
        body: {
          type: 'claim',
          userId: item?.user_id,
          title: 'New Claim Submitted',
          message: `Someone has submitted a claim for your ${item?.item_type} item "${item?.title}". Please review the verification answers.`,
          relatedItemId: item?.id
        }
      });

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Claim submitted successfully",
        description: "The item owner will review your claim and verification answers.",
      });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      onClose();
      setAnswers({});
    },
    onError: (error) => {
      console.error('Error submitting claim:', error);
      toast({
        title: "Error submitting claim",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async () => {
    if (!item || !user) return;

    // Check if verification questions are answered
    const verificationQuestions = item.verification_questions || [];
    if (verificationQuestions.length > 0) {
      const unanswered = verificationQuestions.filter((_, index) => !answers[index.toString()]);
      if (unanswered.length > 0) {
        toast({
          title: "Please answer all verification questions",
          description: "All verification questions must be answered to submit a claim.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await submitClaim.mutateAsync({
        itemId: item.id,
        verificationAnswers: answers
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex.toString()]: answer
    }));
  };

  if (!item) return null;

  const verificationQuestions = item.verification_questions || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Item</DialogTitle>
          <DialogDescription>
            Submit a claim for "{item.title}". Please answer the verification questions to prove ownership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {verificationQuestions.length > 0 ? (
            <>
              <div className="space-y-4">
                <Label className="text-sm font-medium">Verification Questions</Label>
                {verificationQuestions.map((question, index) => (
                  <div key={index} className="space-y-2">
                    <Label className="text-sm">{question}</Label>
                    <Textarea
                      placeholder="Your answer..."
                      value={answers[index.toString()] || ''}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No verification questions have been set for this item. You can still submit a claim.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Claim"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};