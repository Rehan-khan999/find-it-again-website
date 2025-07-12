
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSelector } from '@/components/LocationSelector';
import { PhotoUpload } from '@/components/PhotoUpload';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, MapPinIcon, ImageIcon, InfoIcon, PlusIcon, TrashIcon, HelpCircleIcon } from 'lucide-react';
import { findPotentialMatches, notifyNearbyUsers } from '@/services/notificationService';

const categories = [
  'Electronics',
  'Jewelry',
  'Clothing',
  'Keys',
  'Documents',
  'Bags',
  'Sports Equipment',
  'Books',
  'Other'
];

const PostLost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    dateLost: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    reward: '',
    additionalInfo: '',
    photos: [] as string[],
    verificationQuestions: [] as string[]
  });

  const addVerificationQuestion = () => {
    setFormData(prev => ({
      ...prev,
      verificationQuestions: [...prev.verificationQuestions, '']
    }));
  };

  const updateVerificationQuestion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      verificationQuestions: prev.verificationQuestions.map((q, i) => i === index ? value : q)
    }));
  };

  const removeVerificationQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      verificationQuestions: prev.verificationQuestions.filter((_, i) => i !== index)
    }));
  };

  const handleLocationSelect = (location: { address: string; lat: number; lng: number; }) => {
    setFormData(prev => ({
      ...prev,
      location: location.address,
      latitude: location.lat,
      longitude: location.lng
    }));
  };

  const handlePhotosChange = (urls: string[]) => {
    setFormData(prev => ({ ...prev, photos: urls }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to post a lost item.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title || !formData.description || !formData.category || !formData.location) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('items')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          item_type: 'lost',
          date_lost_found: formData.dateLost,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          contact_name: formData.contactName || user.email?.split('@')[0] || 'Anonymous',
          contact_phone: formData.contactPhone,
          contact_email: formData.contactEmail || user.email || '',
          reward: formData.reward,
          additional_info: formData.additionalInfo,
          photos: formData.photos,
          verification_questions: formData.verificationQuestions,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications for potential matches and nearby users
      try {
        await Promise.all([
          findPotentialMatches(data.id),
          notifyNearbyUsers(data.id)
        ]);
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the entire operation if notifications fail
      }

      toast({
        title: "Lost item posted successfully!",
        description: "Your lost item has been posted and users with potential matches will be notified."
      });

      navigate('/browse');
    } catch (error) {
      console.error('Error posting lost item:', error);
      toast({
        title: "Error posting item",
        description: "There was an error posting your lost item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to post a lost item.</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="h-6 w-6" />
            Post Lost Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Item Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Blue iPhone 13"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the lost item..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateLost" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date Lost
                </Label>
                <Input
                  id="dateLost"
                  type="date"
                  value={formData.dateLost}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateLost: e.target.value }))}
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <MapPinIcon className="h-4 w-4" />
                Location Where Lost *
              </Label>
              <LocationSelector
                onLocationSelect={handleLocationSelect}
              />
            </div>

            {/* Photos */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <ImageIcon className="h-4 w-4" />
                Photos
              </Label>
              <PhotoUpload onPhotosChange={handlePhotosChange} />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              
              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="Your phone number"
                />
              </div>

              <div>
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="Your email address"
                />
              </div>
            </div>

            {/* Verification Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <HelpCircleIcon className="h-4 w-4" />
                  Verification Questions (Optional)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVerificationQuestion}
                  className="flex items-center gap-1"
                >
                  <PlusIcon className="h-3 w-3" />
                  Add Question
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Add questions to help verify if someone has really found your item.
              </p>
              
              {formData.verificationQuestions.map((question, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={question}
                    onChange={(e) => updateVerificationQuestion(index, e.target.value)}
                    placeholder={`Verification question ${index + 1}...`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeVerificationQuestion(index)}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="reward">Reward (Optional)</Label>
                <Input
                  id="reward"
                  value={formData.reward}
                  onChange={(e) => setFormData(prev => ({ ...prev, reward: e.target.value }))}
                  placeholder="e.g., $50 reward"
                />
              </div>

              <div>
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                  placeholder="Any other relevant details..."
                  rows={2}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Posting...' : 'Post Lost Item'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostLost;
