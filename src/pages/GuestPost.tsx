import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationSelector } from '@/components/LocationSelector';
import { PhotoUpload } from '@/components/PhotoUpload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const GuestPost = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    title: '',
    description: '',
    category: '',
    date: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    reward: '',
    additionalInfo: '',
    photos: [] as string[],
    verificationQuestions: [] as string[],
  });

  const handleLocationSelect = (l: { address: string; lat: number; lng: number }) => {
    setFormData((p) => ({ ...p, location: l.address, latitude: l.lat, longitude: l.lng }));
  };

  const handlePhotosChange = (urls: string[]) => setFormData((p) => ({ ...p, photos: urls }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !['lost', 'found'].includes(type)) {
      toast({ title: 'Invalid type', description: 'Unknown post type.', variant: 'destructive' });
      return;
    }

    if (!formData.email) {
      toast({ title: 'Email required', description: 'Enter a valid email to verify your post.', variant: 'destructive' });
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        item_type: type,
        email: formData.email,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date_lost_found: formData.date || null,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        contact_name: formData.contactName || 'Guest',
        contact_phone: formData.contactPhone || '',
        contact_email: formData.contactEmail || formData.email,
        reward: formData.reward || null,
        additional_info: formData.additionalInfo || null,
        photos: formData.photos,
        verification_questions: formData.verificationQuestions,
      };

      const { data, error } = await supabase.functions.invoke('guest-submit', {
        body: payload,
      });
      if (error) throw error;

      toast({
        title: 'Check your email',
        description: 'We sent you a verification link to publish your post.',
      });
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to submit', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Post as Guest ({type})</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email (required)</Label>
              <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <Label>Location</Label>
              <LocationSelector onLocationSelect={handleLocationSelect} />
            </div>

            <div>
              <Label>Photos</Label>
              <PhotoUpload onPhotosChange={handlePhotosChange} />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Submitting…' : 'Submit & Verify by Email'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestPost;
