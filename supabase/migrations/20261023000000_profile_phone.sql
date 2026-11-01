-- Add an optional phone number to each customer's own profile.
-- Existing profile RLS and grants already limit access to the row owner.

alter table public.profiles
  add column if not exists phone text
    check (
      phone is null
      or (
        char_length(phone) between 8 and 16
        and phone ~ '^\+?[1-9][0-9]{6,14}$'
      )
    );
