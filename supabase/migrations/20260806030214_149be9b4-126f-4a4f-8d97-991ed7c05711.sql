-- Admin helper functions are needed by RLS policies evaluated as the signed-in user
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Scope admin policies to signed-in users so anonymous requests never evaluate them
DROP POLICY IF EXISTS "Admins can view all items" ON public.items;
CREATE POLICY "Admins can view all items" ON public.items FOR SELECT TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all items" ON public.items;
CREATE POLICY "Admins can update all items" ON public.items FOR UPDATE TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all items" ON public.items;
CREATE POLICY "Admins can delete all items" ON public.items FOR DELETE TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Users can create their own items" ON public.items;
CREATE POLICY "Users can create their own items" ON public.items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
CREATE POLICY "Users can update their own items" ON public.items FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;
CREATE POLICY "Users can delete their own items" ON public.items FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and moderators can view all profiles" ON public.profiles;
CREATE POLICY "Admins and moderators can view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;
CREATE POLICY "Admins can view all donations" ON public.donations FOR SELECT TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
CREATE POLICY "Users can view their own donations" ON public.donations FOR SELECT TO authenticated
USING (auth.uid() = donor_user_id);
