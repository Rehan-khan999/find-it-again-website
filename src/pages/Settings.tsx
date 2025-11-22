import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Shield, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleDeleteAccount = async () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account",
      variant: "destructive"
    });
  };

  return (
    <div className="min-h-screen glass-effect">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          <h1 className="text-4xl font-cyber font-bold mb-2">
            <span className="text-gradient">Account</span> <span className="text-neon">Settings</span>
          </h1>
          <p className="text-muted-foreground mb-8 font-cyber">{t('labels.customizeYourExperience')}</p>

          <div className="space-y-6">
            {/* Notification Settings */}
            <Card className="glass-card border border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-cyber">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <CardDescription className="font-cyber">
                  Manage how you receive updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="font-cyber">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground font-cyber">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications" className="font-cyber">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground font-cyber">
                      Get instant push notifications
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="match-notifications" className="font-cyber">Match Alerts</Label>
                    <p className="text-sm text-muted-foreground font-cyber">
                      Notify me when items are matched
                    </p>
                  </div>
                  <Switch
                    id="match-notifications"
                    checked={matchNotifications}
                    onCheckedChange={setMatchNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card className="glass-card border border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-cyber">
                  <Shield className="h-5 w-5 text-primary" />
                  Privacy & Security
                </CardTitle>
                <CardDescription className="font-cyber">
                  Control your data and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-cyber">Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground font-cyber">
                      Your profile is visible to other users
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-cyber">Show Email</Label>
                    <p className="text-sm text-muted-foreground font-cyber">
                      Display your email on posted items
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Email Preferences */}
            <Card className="glass-card border border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-cyber">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Preferences
                </CardTitle>
                <CardDescription className="font-cyber">
                  Choose what emails you receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-cyber">Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground font-cyber">
                      Get a weekly summary of activity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-cyber">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground font-cyber">
                      Receive news and updates
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="glass-card border border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-cyber text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="font-cyber">
                  Irreversible actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="font-cyber font-semibold">
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border border-primary/20">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-cyber">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="font-cyber">
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-cyber">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-cyber"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
