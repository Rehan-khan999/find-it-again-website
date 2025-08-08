import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "./ReportDialog";
import { CalendarDays, MapPin, User, Phone, Mail, DollarSign, MessageCircle, Flag, QrCode } from "lucide-react";
import { format } from "date-fns";
import { GoogleMap } from "./GoogleMap";
import { ClaimDialog } from "./ClaimDialog";
import { ClaimStatus } from "./ClaimStatus";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeTag } from "@/components/QRCodeTag";

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

interface ItemDetailsDialogProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ItemDetailsDialog = ({ item, isOpen, onClose }: ItemDetailsDialogProps) => {
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  if (!item) return null;

  const handleContact = (method: 'phone' | 'email') => {
    if (method === 'phone') {
      window.open(`tel:${item.contact_phone}`);
    } else {
      window.open(`mailto:${item.contact_email}?subject=Regarding your ${item.item_type} item: ${item.title}`);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to send messages.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (user.id === item.user_id) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot send a message to yourself.",
        variant: "destructive",
      });
      return;
    }

    // Create a conversation by inserting a placeholder message
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: item.user_id,
          content: `Hi! I'm interested in your ${item.item_type} item: "${item.title}". Could you please provide more details?`,
        });

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: "Your message has been sent. Check the Messages page to continue the conversation.",
      });
      
      navigate('/messages');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canClaim = user && user.id !== item.user_id && item.status === 'active';
  const canMessage = user && user.id !== item.user_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={item.item_type === 'lost' ? 'destructive' : 'default'} className="text-xs">
              {item.item_type === 'lost' ? 'LOST' : 'FOUND'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {item.category}
            </Badge>
            {item.reward && (
              <Badge variant="secondary" className="text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                {item.reward}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold">{item.title}</DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            {item.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photos */}
          {item.photos && item.photos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Photos</h3>
              <div className="grid grid-cols-2 gap-2">
                {item.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`${item.title} photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Item Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {item.item_type === 'lost' ? 'Last seen at: ' : 'Found at: '}
                  <span className="font-medium">{item.location}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {item.item_type === 'lost' ? 'Lost on: ' : 'Found on: '}
                  <span className="font-medium">
                    {format(new Date(item.date_lost_found), 'MMM dd, yyyy')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Location Map */}
          {item.latitude && item.longitude && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Location</h3>
              <GoogleMap
                center={{ lat: item.latitude, lng: item.longitude }}
                zoom={15}
                markers={[{
                  position: { lat: item.latitude, lng: item.longitude },
                  title: item.title,
                  type: item.item_type
                }]}
                height="250px"
              />
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  Contact: <span className="font-medium">{item.contact_name}</span>
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleContact('phone')}
                  className="flex items-center gap-2 flex-1"
                  variant="outline"
                >
                  <Phone className="w-4 h-4" />
                  Call {item.contact_phone}
                </Button>
                <Button
                  onClick={() => handleContact('email')}
                  className="flex items-center gap-2 flex-1"
                  variant="outline"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              </div>

              {canMessage && (
                <Button
                  onClick={handleSendMessage}
                  className="w-full flex items-center gap-2 mt-2"
                  variant="default"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send Message
                </Button>
              )}

              {canClaim && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={() => setIsClaimDialogOpen(true)}
                    className="w-full flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    Claim This Item
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Submit a claim if this is your {item.item_type} item
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReportDialog(true)}
                  className="flex-1 flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Report Item
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowQR(true)}
                  className="flex-1 flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Item QR Tag
                </Button>
              </div>
            </div>
          </div>

          {/* Claim Status */}
          <ClaimStatus itemId={item.id} />

          {/* Posted Date */}
          <div className="pt-4 border-t text-xs text-gray-500">
            Posted on {format(new Date(item.created_at), 'MMM dd, yyyy')}
          </div>
        </div>
      </DialogContent>
      
      <ClaimDialog
        item={item}
        isOpen={isClaimDialogOpen}
        onClose={() => setIsClaimDialogOpen(false)}
      />
      <ReportDialog 
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        itemId={item.id}
      />
      <QRCodeTag open={showQR} onOpenChange={setShowQR} itemId={item.id} itemTitle={item.title} />
    </Dialog>
  );
};