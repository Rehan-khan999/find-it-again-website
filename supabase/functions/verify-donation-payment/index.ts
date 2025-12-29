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
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!razorpayKeySecret) {
      console.error('Missing Razorpay secret');
      throw new Error('Payment configuration error');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing payment verification data');
    }

    console.log(`Verifying donation payment: ${razorpay_payment_id}`);

    // Verify signature
    const crypto = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
    const encoder = new TextEncoder();
    const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
    const key = encoder.encode(razorpayKeySecret);
    
    const hmacKey = await crypto.crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.crypto.subtle.sign("HMAC", hmacKey, data);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      throw new Error('Payment verification failed');
    }

    console.log('Signature verified successfully');

    // Update donation record
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error: updateError } = await supabase
      .from('donations')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'completed',
      })
      .eq('razorpay_order_id', razorpay_order_id);

    if (updateError) {
      console.error('Failed to update donation record:', updateError);
      throw new Error('Failed to update donation record');
    }

    console.log('Donation payment verified and recorded successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Thank you for your support!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying donation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
