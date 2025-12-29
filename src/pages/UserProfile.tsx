import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MessageCircle, Shield, ShieldCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import VerifiedBadge from '@/components/VerifiedBadge';

interface UserProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_verified: boolean;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // If viewing own profile, redirect to /profile
    if (userId === user.id) {
      navigate('/profile');
      return;
    }

    fetchProfile();
  }, [user, userId, navigate]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, is_verified')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Could not load user profile.',
        variant: 'destructive',
      });
      navigate('/browse');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !userId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to send messages.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: userId,
          content: `Hi! I'd like to connect with you.`,
        });

      if (error) throw error;

      toast({
        title: 'Message sent!',
        description: 'Check the Messages page to continue the conversation.',
      });

      navigate('/messages');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">User not found.</p>
            <Button onClick={() => navigate('/browse')} className="mt-4">
              Back to Browse
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const accountAge = formatDistanceToNow(new Date(profile.created_at), { addSuffix: false });

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="glass-card border border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-28 w-28 border-4 border-primary/30">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
                <AvatarFallback className="text-3xl bg-primary/20 text-foreground">
                  {profile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  {profile.full_name || 'User'}
                  {profile.is_verified && <VerifiedBadge size="lg" />}
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Account Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account Age */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member for</p>
                  <p className="font-semibold">{accountAge}</p>
                </div>
              </div>

              {/* Verification Status */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${profile.is_verified ? 'bg-green-500/10' : 'bg-muted'}`}>
                  {profile.is_verified ? (
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  ) : (
                    <Shield className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={`font-semibold ${profile.is_verified ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {profile.is_verified ? 'Verified' : 'Not Verified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Joined Date */}
            <div className="text-center text-sm text-muted-foreground">
              Joined on {format(new Date(profile.created_at), 'MMMM dd, yyyy')}
            </div>

            {/* Message Button */}
            {user && user.id !== userId && (
              <Button
                onClick={handleSendMessage}
                className="w-full flex items-center justify-center gap-2"
                size="lg"
              >
                <MessageCircle className="w-5 h-5" />
                Send Message
              </Button>
            )}

            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;