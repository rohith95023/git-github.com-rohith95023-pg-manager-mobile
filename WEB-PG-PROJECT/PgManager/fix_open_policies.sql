-- Fix for OPEN policies causing data leaks

-- 1. Drop dangerous open policies on rooms
DROP POLICY IF EXISTS "Allow all for authenticated" ON rooms;
DROP POLICY IF EXISTS "Allow read for anon" ON rooms;

-- 2. Drop dangerous open policy on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Verify the changes
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rooms', 'profiles')
ORDER BY tablename, policyname;
