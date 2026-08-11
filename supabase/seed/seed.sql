-- Seed Data for Sui Dhaga Database

-- 1. Sample User Profiles
INSERT INTO public.resources (id, resource_type, owner_id, data)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'profiles', '11111111-1111-1111-1111-111111111111', '{"name": "Customer User", "email": "customer@suidhaga.com", "role": "customer"}'),
  ('22222222-2222-2222-2222-222222222222', 'profiles', '22222222-2222-2222-2222-222222222222', '{"name": "Tailor User", "email": "tailor@suidhaga.com", "role": "tailor"}');

-- 2. Sample Tailors
INSERT INTO public.resources (id, resource_type, owner_id, data)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'tailors', '22222222-2222-2222-2222-222222222222', '{"shopName": "Royal Tailors", "city": "Lahore", "specialties": ["bridal", "kurta"], "verified": true, "verification_status": "verified"}');

-- 3. Sample Fabrics
INSERT INTO public.resources (id, resource_type, owner_id, data)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'fabrics', '22222222-2222-2222-2222-222222222222', '{"name": "Pure Lawn", "material": "Cotton", "pricePerMeter": 1500, "inStock": true}');
