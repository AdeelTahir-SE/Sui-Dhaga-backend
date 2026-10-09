-- Seed Data for Sui Dhaga Relational Database

-- 1. Admin Profile
insert into public.profiles (id, role, status, full_name, phone, address, bio)
values 
  ('99999999-9999-9999-9999-999999999999', 'admin', 'active', 'Sui Dhaga Admin', '+923000000000', 'Lahore, Pakistan', 'System Administrator')
on conflict (id) do update set full_name = excluded.full_name;

-- 5. Fabrics Catalog
insert into public.fabrics (id, user_id, name, material, price_per_meter, color, pattern, in_stock)
values 
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Pure Silk Brocade', 'Silk', 3500.00, 'Crimson Red', 'Zari Weave Floral', true),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Premium Egyptian Cotton Lawn', 'Cotton', 1600.00, 'Emerald Green', 'Solid Pastel', true),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Pure Chiffon with Sequin Work', 'Chiffon', 2200.00, 'Rose Gold', 'Subtle Shimmer', true)
on conflict (id) do nothing;

-- 6. Sample Measurements
insert into public.measurements (id, user_id, title, unit, chest, waist, hips, shoulder, sleeve_length, inseam, neck, notes)
values 
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Default Formal Measurements', 'in', 36.0, 29.5, 39.0, 14.5, 22.0, 38.0, 14.0, 'Prefer slightly relaxed fit around chest.')
on conflict (id) do nothing;

-- 7. Sample AI Designs
insert into public.designs (id, user_id, title, description, type, prompt, colors, fabric, embroidery, status)
values 
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Royal Maroon Wedding Anarkali', 'Floor length Anarkali gown with intricate golden dabka embroidery and organza dupatta.', 'text-to-design', 'Royal maroon bridal anarkali with gold embellishments and net sleeves', array['Maroon', 'Antique Gold', 'Crimson'], 'Raw Silk & Organza', 'Zardozi & Dabka', 'completed')
on conflict (id) do nothing;

-- 8. Community Posts
insert into public.community_posts (id, user_id, title, content, tags, likes_count, saves_count)
values 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'My Eid Outfit Experience with Master Tariq!', 'Got my 3-piece silk suit customized and the fit was absolutely immaculate! The neckline embroidery matched my sketch perfectly.', array['eidlook', 'customtailoring', 'pakistanifashion'], 14, 5)
on conflict (id) do nothing;

