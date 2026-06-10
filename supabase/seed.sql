-- Seeded users for the user-switcher login flow.
-- These IDs are fixed so the dashboard / sharing UI can reference them.
insert into profiles (id, email, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'abhiram@test.com', 'Abhiram'),
  ('22222222-2222-2222-2222-222222222222', 'john@test.com', 'John')
on conflict (email) do nothing;
