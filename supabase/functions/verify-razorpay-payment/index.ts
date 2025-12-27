import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay secret');
      throw new Error('Payment gateway not configured');
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User auth error:', userError);
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    console.log('Verifying payment for user:', user.id);
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);

    if (!razorpay_order_id || !razorpay_payment_id) {
      throw new Error('Missing payment details');
    }

    // For TEST MODE, we simplify signature verification
    // In production, you should properly verify the signature using crypto
    // const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
    //   .update(razorpay_order_id + '|' + razorpay_payment_id)
    //   .digest('hex');
    
    // For test mode, we'll verify the payment exists by fetching from Razorpay
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      }
    });

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment from Razorpay');
      throw new Error('Payment verification failed');
    }

    const paymentData = await paymentResponse.json();
    console.log('Payment data from Razorpay:', paymentData.status);

    if (paymentData.status !== 'captured' && paymentData.status !== 'authorized') {
      throw new Error('Payment not successful');
    }

    if (paymentData.order_id !== razorpay_order_id) {
      throw new Error('Order ID mismatch');
    }

    // Update the payment record
    const { error: updatePaymentError } = await supabaseClient
      .from('payments')
      .update({
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature || '',
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id);

    if (updatePaymentError) {
      console.error('Failed to update payment record:', updatePaymentError);
    }

    // Update user profile to verified
    const { error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verification_payment_id: razorpay_payment_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Failed to update profile:', updateProfileError);
      throw new Error('Failed to update verification status');
    }

    console.log('User verified successfully:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification successful. You are now a verified user.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-razorpay-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Payment verification failed' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
