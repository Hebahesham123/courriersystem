-- ----------------------------------------------------------------------------
-- Create two admin users: Salma and Amira.
--
-- STEP 1 (Supabase Dashboard, do this first):
--   Go to: Authentication > Users > "Add user" > "Create new user"
--     - Email: salma@gmail.com  Password: salma123!  (check "Auto Confirm User")
--     - Email: amira@gmail.com  Password: amira123!  (check "Auto Confirm User")
--
-- STEP 2 (this SQL):
--   Run this script in the Supabase SQL editor. It looks up the auth.users
--   rows you just created and inserts/updates the matching public.users
--   profile rows with name + role='admin'.
-- ----------------------------------------------------------------------------

insert into public.users (id, email, name, role)
select au.id, au.email, 'Salma', 'admin'
from auth.users au
where au.email = 'salma@gmail.com'
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    email = excluded.email;

insert into public.users (id, email, name, role)
select au.id, au.email, 'Amira', 'admin'
from auth.users au
where au.email = 'amira@gmail.com'
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    email = excluded.email;

-- Verify:
select id, email, name, role from public.users
where email in ('salma@gmail.com', 'amira@gmail.com');
