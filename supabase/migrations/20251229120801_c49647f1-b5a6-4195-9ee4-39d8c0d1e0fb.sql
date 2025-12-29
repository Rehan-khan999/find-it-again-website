-- Create donations table for voluntary support
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount INTEGER NOT NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  donor_user_id UUID REFERENCES auth.users(id),
  donor_email TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert donations (guests can donate)
CREATE POLICY "Anyone can create donations"
ON public.donations
FOR INSERT
WITH CHECK (true);

-- Users can view their own donations
CREATE POLICY "Users can view their own donations"
ON public.donations
FOR SELECT
USING (auth.uid() = donor_user_id);

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));