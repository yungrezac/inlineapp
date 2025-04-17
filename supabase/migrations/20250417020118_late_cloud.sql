/*
  # Add Telegram Authentication Support

  1. Updates
    - Add new columns to profiles table for Telegram integration
    - Add RLS policies for Telegram authenticated users

  2. Changes
    - Add telegram_id column
    - Add auth_provider column
    - Add username column
    - Update RLS policies
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS telegram_id bigint,
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'telegram',
ADD COLUMN IF NOT EXISTS username text;

-- Add unique constraint on telegram_id
ALTER TABLE profiles
ADD CONSTRAINT unique_telegram_id UNIQUE (telegram_id);

-- Update RLS policies for Telegram authentication
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (id = concat('telegram_', auth.uid()));

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = concat('telegram_', auth.uid()));

-- Add index for telegram_id for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);