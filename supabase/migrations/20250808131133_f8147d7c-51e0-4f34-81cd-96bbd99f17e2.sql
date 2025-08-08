-- Promote the specified email to admin (idempotent)
insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role
from auth.users u
where lower(u.email) = lower('rehanadilk@gmail.com')
on conflict (user_id, role) do nothing;