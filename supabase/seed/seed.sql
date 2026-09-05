-- Seed Data for Sui Dhaga Relational Database

-- 1. Sample User Profiles
insert into public.profiles (id, role, status, full_name, phone, address, bio)
values 
  ('11111111-1111-1111-1111-111111111111', 'customer', 'active', 'Ayesha Khan', '+923001234567', 'Gulberg III, Lahore', 'Fashion lover looking for bespoke Eastern wear.'),
  ('22222222-2222-2222-2222-222222222222', 'tailor', 'active', 'Master Tariq', '+923007654321', 'Anarkali Bazaar, Lahore', 'Master tailor with 20+ years of bridal & formal wear experience.'),
  ('33333333-3333-3333-3333-333333333333', 'tailor', 'active', 'Zainab Stitching Studio', '+923009876543', 'F-7 Markaz, Islamabad', 'Specializing in contemporary fusion wear and ready-to-wear kurtas.'),
  ('99999999-9999-9999-9999-999999999999', 'admin', 'active', 'Sui Dhaga Admin', '+923000000000', 'Lahore, Pakistan', 'System Administrator')
on conflict (id) do update set full_name = excluded.full_name;

-- 2. Sample Tailor Profiles
insert into public.tailors (id, user_id, shop_name, specialties, city, address, experience_years, bio, rating, review_count, verification_status, verified, latitude, longitude)
values 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Royal Heritage Tailors', array['bridal', 'lehenga', 'sherwani', 'formal-wear'], 'Lahore', 'Shop 12, Anarkali Bazaar', 22, 'Master artisans in hand embroidery and bespoke bridal wear.', 4.9, 38, 'verified', true, 31.5714, 74.3087),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Zainab Haute Couture', array['kurta', 'shalwar-kameez', 'casual-wear', 'western-fusion'], 'Islamabad', 'Plaza 4, F-7 Markaz', 8, 'Modern tailoring for contemporary women and men.', 4.7, 19, 'verified', true, 33.7215, 73.0563)
on conflict (id) do nothing;

-- 3. Tailor Services
insert into public.tailor_services (id, tailor_id, title, price, description, category)
values 
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bespoke Bridal Lehenga Stitching', 25000.00, 'Full custom bridal lehenga with custom fitting, can-can, and lining.', 'bridal'),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Designer Sherwani Stitching', 18000.00, 'Handcrafted groom sherwani with inner kurta and churidar.', 'formal'),
  ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Women 3-Piece Suit Stitching', 3500.00, 'Modern cut shirt, trouser, and dupatta finishing.', 'casual'),
  ('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Men Kurta Pajama', 2500.00, 'Tailored cotton/linen kurta with classic or modern collar.', 'casual')
on conflict (id) do nothing;

-- 4. Tailor Availability
insert into public.tailor_availability (id, tailor_id, day_of_week, start_time, end_time, is_available)
values 
  ('a0111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Monday', '10:00', '19:00', true),
  ('a0222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tuesday', '10:00', '19:00', true),
  ('a0333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Wednesday', '10:00', '19:00', true),
  ('b0111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Monday', '11:00', '20:00', true),
  ('b0222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Thursday', '11:00', '20:00', true)
on conflict (id) do nothing;

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

