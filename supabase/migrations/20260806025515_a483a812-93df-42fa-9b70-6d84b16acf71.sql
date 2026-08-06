-- 1. ITEMS: remove public (anon) access to contact details
DROP POLICY IF EXISTS "Anyone can view active items" ON public.items;
CREATE POLICY "Authenticated users can view active items"
ON public.items FOR SELECT TO authenticated
USING (status = 'active');

CREATE OR REPLACE VIEW public.items_public AS
SELECT id, user_id, title, description, category, item_type, date_lost_found,
       location, latitude, longitude, reward, additional_info, status, photos,
       verification_questions, created_at, updated_at
FROM public.items
WHERE status = 'active';

ALTER VIEW public.items_public SET (security_invoker = off);
GRANT SELECT ON public.items_public TO anon, authenticated;

-- 2. PROFILES: remove blanket authenticated read of emails/phones
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, avatar_url, is_verified, verified_at, created_at
FROM public.profiles;

ALTER VIEW public.public_profiles SET (security_invoker = off);
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3. DONATIONS: prevent forging donations for other users
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;
CREATE POLICY "Donations must be anonymous or own"
ON public.donations FOR INSERT TO anon, authenticated
WITH CHECK (donor_user_id IS NULL OR donor_user_id = auth.uid());

-- 4. SECURITY DEFINER functions: revoke direct API execution
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin_or_moderator(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_conversations(uuid) FROM anon;
