import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';

interface QRCodeTagProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  itemId: string;
  itemTitle?: string;
}

export const QRCodeTag = ({ open, onOpenChange, itemId, itemTitle }: QRCodeTagProps) => {
  const url = `${window.location.origin}/browse?highlight=${itemId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Tag for Item</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="bg-white p-3 rounded-md">
            <QRCode value={url} size={180} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan to view this item and contact the owner.
          </p>
          {itemTitle && (
            <p className="text-xs text-center">{itemTitle}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
