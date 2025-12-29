-- Allow authenticated users to view other users' public profile info (avatar, name, verification status, created_at)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);