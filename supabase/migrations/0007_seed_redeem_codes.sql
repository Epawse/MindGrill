-- 0007_seed_redeem_codes.sql
-- Seed redemption codes for judges and testing.
-- These are inserted directly via migration to bypass RLS (only admin can CRUD).

-- Judge code A: 200 credits, max 10 users, expires in 30 days
INSERT INTO public.redeem_codes (code, credits, max_uses, used_count, expires_at, note, revoked)
VALUES (
  'MG-REDEEM-JUDGE2026A',
  200,
  10,
  0,
  now() + interval '30 days',
  '评委专用码A - 200次额度/最多10人使用/30天有效',
  false
) ON CONFLICT (code) DO NOTHING;

-- Judge code B: 100 credits, max 5 users, expires in 30 days
INSERT INTO public.redeem_codes (code, credits, max_uses, used_count, expires_at, note, revoked)
VALUES (
  'MG-REDEEM-JUDGE2026B',
  100,
  5,
  0,
  now() + interval '30 days',
  '评委专用码B - 100次额度/最多5人使用/30天有效',
  false
) ON CONFLICT (code) DO NOTHING;

-- Test code: 50 credits, 1 use only, expires in 7 days
INSERT INTO public.redeem_codes (code, credits, max_uses, used_count, expires_at, note, revoked)
VALUES (
  'MG-REDEEM-TEST2026X',
  50,
  1,
  0,
  now() + interval '7 days',
  '测试用码 - 50次额度/仅1人使用/7天有效',
  false
) ON CONFLICT (code) DO NOTHING;
