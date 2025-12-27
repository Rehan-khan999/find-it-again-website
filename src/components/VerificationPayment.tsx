import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BadgeCheck, Shield, Loader2 } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface VerificationPaymentProps {
  isVerified: boolean;
  onVerificationComplete: () => void;
  userEmail: string;
  userName: string;
}

const VerificationPayment = ({ 
  isVerified, 
  onVerificationComplete,
  userEmail,
  userName
}: VerificationPaymentProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleVerification = async () => {
    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please login to continue');
      }

      // Create order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || 'Failed to create order');
      }

      console.log('Order created:', orderData);

      // Configure Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FindIt - Lost & Found',
        description: 'User Verification Fee',
        order_id: orderData.order_id,
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: '#10b981'
        },
        handler: async function (response: any) {
          console.log('Payment successful:', response);
          
          try {
            // Verify payment via edge function
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || 'Payment verification failed');
            }

            toast({
              title: "Verification Successful!",
              description: "You are now a verified user. Thank you for your trust!",
            });

            onVerificationComplete();

          } catch (error: any) {
            console.error('Verification error:', error);
            toast({
              title: "Verification Failed",
              description: error.message || "Payment was received but verification failed. Please contact support.",
              variant: "destructive"
            });
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            toast({
              title: "Payment Cancelled",
              description: "You can complete verification anytime.",
              variant: "destructive"
            });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast({
          title: "Payment Failed",
          description: response.error.description || "Please try again",
          variant: "destructive"
        });
        setLoading(false);
      });

      razorpay.open();

    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  if (isVerified) {
    return (
      <Card className="glass-card border border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <VerifiedBadge size="lg" showTooltip={false} />
            Verified User
          </CardTitle>
          <CardDescription>
            Your account is verified. You have higher trust in the community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="h-5 w-5 text-emerald-500" />
            <span>Verified users get a trust badge visible on all their listings</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="h-6 w-6 text-primary" />
          Get Verified
        </CardTitle>
        <CardDescription>
          Become a verified user to increase trust in your listings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Get a verified badge on your profile</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Higher trust from other users</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Badge visible on all your item listings</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-semibold text-foreground">One-time Verification Fee</p>
            <p className="text-sm text-muted-foreground">Secure payment via Razorpay</p>
          </div>
          <div className="text-2xl font-bold text-primary">₹10</div>
        </div>

        <Button 
          onClick={handleVerification} 
          disabled={loading}
          className="w-full btn-modern font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <BadgeCheck className="mr-2 h-4 w-4" />
              Pay ₹10 & Get Verified
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          This is a test mode payment. No real money will be charged.
        </p>
      </CardContent>
    </Card>
  );
};

export default VerificationPayment;
