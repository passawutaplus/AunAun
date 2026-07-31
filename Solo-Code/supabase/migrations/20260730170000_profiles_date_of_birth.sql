-- Profile date of birth (settings / basic info). 
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
