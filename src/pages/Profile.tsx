import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import VerifiedBadge from '@/components/VerifiedBadge';
import VerificationPayment from '@/components/VerificationPayment';

interface Profile {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  is_verified: boolean;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    created_at: '',
    is_verified: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user?.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          created_at: data.created_at,
          is_verified: data.is_verified || false
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: t('toast.error'),
        description: t('toast.profileLoadFailed'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: t('toast.success'),
        description: t('toast.profileUpdated')
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t('toast.error'),
        description: t('toast.profileUpdateFailed'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerificationComplete = () => {
    setProfile(prev => ({ ...prev, is_verified: true }));
  };

  if (loading) {
    return (
      <div className="min-h-screen glass-effect flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen glass-effect page-enter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-fade-in">
          <h1 className="text-4xl font-display font-bold mb-2 text-foreground">
            {t('profile.title')}
          </h1>
          <p className="text-muted-foreground mb-8">{t('labels.manageYourAccount')}</p>

          <div className="grid gap-6">
            {/* Profile Header Card */}
            <Card className="glass-card border border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-2 border-primary/30">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback className="text-2xl bg-primary/20">
                      {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {profile.full_name || 'User'}
                      {profile.is_verified && <VerifiedBadge size="lg" />}
                    </CardTitle>
                    <CardDescription>{profile.email}</CardDescription>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {t('profile.joined')} {format(new Date(profile.created_at), 'MMMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Verification Card */}
            <VerificationPayment
              isVerified={profile.is_verified}
              onVerificationComplete={handleVerificationComplete}
              userEmail={profile.email}
              userName={profile.full_name}
            />

            {/* Profile Details Card */}
            <Card className="glass-card border border-primary/20">
              <CardHeader>
                <CardTitle>{t('profile.profileInfo')}</CardTitle>
                <CardDescription>{t('profile.updateDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {t('profile.fullName')}
                  </Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="glass-effect border-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    {t('profile.email')}
                  </Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="glass-effect border-primary/30 opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('profile.emailNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    {t('profile.phone')}
                  </Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="glass-effect border-primary/30"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-modern font-semibold"
                >
                  {saving ? t('buttons.saving') : t('buttons.saveChanges')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
