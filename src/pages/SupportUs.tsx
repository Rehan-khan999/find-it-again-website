import { useState } from "react";
import { Heart, Coffee, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const DONATION_AMOUNTS = [10, 20, 50];

const SupportUs = () => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleDonate = async (amount: number) => {
    setSelectedAmount(amount);
    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Get session if logged in
      const { data: { session } } = await supabase.auth.getSession();

      // Create donation order
      const { data, error } = await supabase.functions.invoke('create-donation-order', {
        body: {
          amount,
          donor_email: session?.user?.email || null,
        },
      });

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create donation order');
      }

      // Configure Razorpay
      const options = {
        key: data.key_id,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'FindIt',
        description: 'Support FindIt Platform',
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke('verify-donation-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError) {
              throw verifyError;
            }

            toast.success('Thank you for your support!', {
              description: 'Your donation helps us maintain and improve FindIt.',
            });
          } catch (err) {
            console.error('Donation verification error:', err);
            toast.error('Donation verification failed');
          }
        },
        prefill: {
          email: session?.user?.email || '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setSelectedAmount(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Donation error:', error);
      toast.error('Failed to process donation', {
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
      setSelectedAmount(null);
    }
  };

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Support FindIt</h1>
          <p className="text-muted-foreground">Help us help others</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">About This Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              FindIt is a student-built, non-profit platform created to help people 
              reunite with their lost belongings.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you believe in this mission, you may optionally support the project. 
              Donations help with basic maintenance and development.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>Optional • No features unlocked • All platform features remain free</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Support This Project
            </CardTitle>
            <CardDescription>
              Choose an amount to contribute (one-time)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-center">
              {DONATION_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="lg"
                  className="min-w-[100px]"
                  disabled={isProcessing}
                  onClick={() => handleDonate(amount)}
                >
                  {isProcessing && selectedAmount === amount ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    `₹${amount}`
                  )}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Payments are processed securely via Razorpay. No login required.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default SupportUs;
