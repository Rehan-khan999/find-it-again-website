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
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Missing Razorpay credentials');
      throw new Error('Payment configuration error');
    }

    const { amount, donor_email } = await req.json();

    if (!amount || ![10, 20, 50].includes(amount)) {
      throw new Error('Invalid donation amount');
    }

    console.log(`Creating donation order for amount: ₹${amount}`);

    // Check if user is authenticated (optional)
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        console.log(`Authenticated donor: ${userId}`);
      }
    }

    // Create Razorpay order
    const orderData = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `donation_${Date.now()}`,
      notes: {
        type: 'donation',
        donor_email: donor_email || 'anonymous',
      },
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('Razorpay order creation failed:', errorText);
      throw new Error('Failed to create payment order');
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log('Razorpay order created:', razorpayOrder.id);

    // Store donation record in database
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error: insertError } = await supabase
      .from('donations')
      .insert({
        amount,
        razorpay_order_id: razorpayOrder.id,
        donor_user_id: userId,
        donor_email: donor_email || null,
        status: 'created',
      });

    if (insertError) {
      console.error('Failed to store donation record:', insertError);
      throw new Error('Failed to store donation record');
    }

    console.log('Donation order created successfully');

    return new Response(
      JSON.stringify({
        order_id: razorpayOrder.id,
        amount: amount,
        currency: 'INR',
        key_id: razorpayKeyId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating donation order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
