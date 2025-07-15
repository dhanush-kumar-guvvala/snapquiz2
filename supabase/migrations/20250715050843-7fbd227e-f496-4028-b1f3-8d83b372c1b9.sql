-- Remove the trigger approach and fix RLS policies instead
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add INSERT policy for profiles table to allow user creation
CREATE POLICY "Allow profile creation during signup" ON public.profiles
  FOR INSERT 
  WITH CHECK (true);

-- Also add a policy specifically for the service role to insert profiles
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT 
  TO service_role
  WITH CHECK (true);

-- Grant INSERT permission to authenticated users
GRANT INSERT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;