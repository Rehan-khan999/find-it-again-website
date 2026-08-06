REVOKE SELECT ON public.items FROM anon;
GRANT SELECT (id, user_id, title, description, category, item_type, date_lost_found,
               location, latitude, longitude, reward, additional_info, status, photos,
               verification_questions, created_at, updated_at)
ON public.items TO anon;
