/*
  # Add skating fields to profiles

  1. New Fields
    - `skates` (text array) - List of skates the user owns
    - `experience_years` (integer) - Years of skating experience
    - `city` (text) - User's city
    - `skating_style` (text array) - List of skating styles

  2. Changes
    - Added default empty array for skates and skating_style
    - No default values for experience_years and city
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skates text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_years integer,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS skating_style text[] DEFAULT '{}';