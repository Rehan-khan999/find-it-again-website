-- 1. Private contact details table
CREATE TABLE public.profiles_private (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text,
  phone text,
  verification_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles_private TO authenticated;
GRANT ALL ON public.profiles_private TO service_role;

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private profile"
  ON public.profiles_private FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can insert own private profile"
  ON public.profiles_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own private profile"
  ON public.profiles_private FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_private_updated_at
  BEFORE UPDATE ON public.profiles_private
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrate existing data
INSERT INTO public.profiles_private (id, email, phone, verification_payment_id)
SELECT id, email, phone, verification_payment_id FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- 3. Drop sensitive columns from profiles (view depends on none of them)
DROP VIEW IF EXISTS public.public_profiles;
ALTER TABLE public.profiles
  DROP COLUMN email,
  DROP COLUMN phone,
  DROP COLUMN verification_payment_id;

-- 4. profiles now holds only public data: readable by everyone
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profile data is viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 5. Recreate the public view without SECURITY DEFINER
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, is_verified, verified_at, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 6. Signup trigger writes to both tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.profiles_private (id, email)
  VALUES (NEW.id, NEW.email);

  RETURN NEW;
END;
$$;

-- 7. Conversations no longer expose other users' emails
CREATE OR REPLACE FUNCTION public.get_conversations(p_user_id uuid)
 RETURNS TABLE(other_user_id uuid, user_name text, user_email text, last_message text, last_message_time timestamp with time zone, unread_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_users AS (
    SELECT DISTINCT
      CASE WHEN m.sender_id = p_user_id THEN m.receiver_id ELSE m.sender_id END AS other_user_id
    FROM public.messages m
    WHERE m.sender_id = p_user_id OR m.receiver_id = p_user_id
  ),
  latest_messages AS (
    SELECT DISTINCT ON (CASE WHEN m.sender_id = p_user_id THEN m.receiver_id ELSE m.sender_id END)
      CASE WHEN m.sender_id = p_user_id THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
      m.content as last_message,
      m.created_at as last_message_time
    FROM public.messages m
    WHERE m.sender_id = p_user_id OR m.receiver_id = p_user_id
    ORDER BY
      CASE WHEN m.sender_id = p_user_id THEN m.receiver_id ELSE m.sender_id END,
      m.created_at DESC
  ),
  unread_counts AS (
    SELECT m.sender_id as other_user_id, COUNT(*) as unread_count
    FROM public.messages m
    WHERE m.receiver_id = p_user_id AND m.read = false
    GROUP BY m.sender_id
  )
  SELECT
    cu.other_user_id,
    COALESCE(NULLIF(p.full_name, ''), 'User') as user_name,
    NULL::text as user_email,
    lm.last_message,
    lm.last_message_time,
    COALESCE(uc.unread_count, 0) as unread_count
  FROM conversation_users cu
  LEFT JOIN public.profiles p ON p.id = cu.other_user_id
  LEFT JOIN latest_messages lm ON lm.other_user_id = cu.other_user_id
  LEFT JOIN unread_counts uc ON uc.other_user_id = cu.other_user_id
  ORDER BY lm.last_message_time DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_conversations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversations(uuid) TO authenticated;
