-- Fix Users panel visibility and profile creation

-- 1) Ensure RLS is enabled where needed
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2) Policies for profiles
DROP POLICY IF EXISTS "Admins and moderators can view all profiles" ON public.profiles;
CREATE POLICY "Admins and moderators can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins and moderators can update all profiles" ON public.profiles;
CREATE POLICY "Admins and moderators can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin_or_moderator());

-- 3) Policies for user_roles (allow admins/mods to view all and admins to manage)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and moderators can view all roles" ON public.user_roles;
CREATE POLICY "Admins and moderators can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role('admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role('admin'));

-- 4) Trigger to auto-create profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Backfill profiles for existing users
INSERT INTO public.profiles (id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;