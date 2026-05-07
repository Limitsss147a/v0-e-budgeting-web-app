-- Migration to remove full_name and position from profiles table
-- As per the new requirement: 1 account per institution.

-- Drop the trigger to update the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function to not use full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, institution_id)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data ->> 'role')::user_role, 'user'),
    (new.raw_user_meta_data ->> 'institution_id')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    institution_id = COALESCE(EXCLUDED.institution_id, profiles.institution_id);

  RETURN new;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop the columns from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS full_name,
DROP COLUMN IF EXISTS position;
