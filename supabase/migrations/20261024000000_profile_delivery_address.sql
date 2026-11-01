-- Add saved delivery fields to the existing per-customer profile.
-- Existing profile RLS and grants continue to protect these columns.

alter table public.profiles
  add column if not exists pin_code text
    check (pin_code is null or pin_code ~ '^[1-9][0-9]{5}$'),
  add column if not exists state text
    check (state is null or char_length(state) between 2 and 40),
  add column if not exists city text
    check (city is null or char_length(city) between 2 and 60),
  add column if not exists street text
    check (street is null or char_length(street) between 5 and 200),
  add column if not exists landmark text
    check (landmark is null or char_length(landmark) between 1 and 100);
