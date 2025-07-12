import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, User, Phone, Mail, DollarSign, MessageCircle, Flag } from "lucide-react";
import { format } from "date-fns";
import { GoogleMap } from "./GoogleMap";
import { ClaimDialog } from "./ClaimDialog";
import { ClaimStatus } from "./ClaimStatus";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  
  if (!item) return null;

  const handleContact = (method: 'phone' | 'email') => {
    if (method === 'phone') {
      window.open(`tel:${item.contact_phone}`);
    } else {
      window.open(`mailto:${item.contact_email}?subject=Regarding your ${item.item_type} item: ${item.title}`);
    }
  };

  const canClaim = user && user.id !== item.user_id && item.status === 'active';

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
    </Dialog>
  );
};