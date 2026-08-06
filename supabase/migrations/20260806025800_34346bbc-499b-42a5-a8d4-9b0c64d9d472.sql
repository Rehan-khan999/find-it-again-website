-- Anonymous visitors may read active items, but NOT the contact columns
CREATE POLICY "Anon can view active items (non-contact columns)"
ON public.items FOR SELECT TO anon
USING (status = 'active');

REVOKE SELECT (contact_name, contact_phone, contact_email) ON public.items FROM anon;

-- The public view now runs with the querying user's permissions
ALTER VIEW public.items_public SET (security_invoker = on);
