import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface ItemClosureDialogProps {
  itemId: string;
  itemTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onClosed: () => void;
}

const CLOSURE_REASONS = [
  { value: 'found_by_owner', label: 'Item found by owner' },
  { value: 'returned_to_owner', label: 'Item returned to owner' },
  { value: 'duplicate_listing', label: 'Duplicate listing' },
  { value: 'posted_by_mistake', label: 'Posted by mistake' },
  { value: 'no_longer_relevant', label: 'No longer relevant' },
  { value: 'other', label: 'Other' },
];

export const ItemClosureDialog = ({
  itemId,
  itemTitle,
  isOpen,
  onClose,
  onClosed,
}: ItemClosureDialogProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = async () => {
    if (!reason) {
      toast.error('Please select a reason for closing this listing');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to close a listing');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create closure record for admin analytics
      const { error: closureError } = await supabase
        .from('item_closures')
        .insert({
          item_id: itemId,
          user_id: user.id,
          reason: reason,
          notes: notes || null,
        });

      if (closureError) throw closureError;

      // Update item status to closed
      const { error: updateError } = await supabase
        .from('items')
        .update({ status: 'closed' })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Listing closed successfully');
      onClosed();
      onClose();
    } catch (error) {
      console.error('Error closing item:', error);
      toast.error('Failed to close listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setReason('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Close Listing
          </DialogTitle>
          <DialogDescription>
            You are about to close "{itemTitle}". This action helps maintain platform trust and analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Reason for closing <span className="text-destructive">*</span>
            </Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {CLOSURE_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>
              <strong>Note:</strong> Closed listings are preserved for platform analytics and trust metrics. They will no longer appear in search results.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={isSubmitting || !reason}>
            {isSubmitting ? 'Closing...' : 'Close Listing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
