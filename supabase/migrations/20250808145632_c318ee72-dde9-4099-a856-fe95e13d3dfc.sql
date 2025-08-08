-- Fix Admin Users panel: ensure profiles exist and are readable by admins/moderators

-- 1) Create trigger to auto-create profiles on new signups (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END$$;

-- 2) Allow admins/moderators to view all profiles (keep existing self-view policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins and moderators can view all profiles'
  ) THEN
    CREATE POLICY "Admins and moderators can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_admin_or_moderator(auth.uid()));
  END IF;
END$$;

-- 3) Backfill profiles for existing users missing a profile
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name','')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
