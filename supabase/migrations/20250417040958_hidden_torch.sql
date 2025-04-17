/*
  # Add profile fields for skater information

  1. Changes
    - Add skates array column to store skate models
    - Add experience_years column for skating experience
    - Add city column for location
    - Add skating_style array column for skating styles
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skates text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_years integer,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS skating_style text[] DEFAULT '{}';