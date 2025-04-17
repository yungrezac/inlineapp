/*
  # Stories Feature Implementation

  1. New Tables
    - `stories` table for storing user stories
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)

  2. Security
    - Enable RLS on stories table
    - Add policies for:
      - Viewing stories (all authenticated users)
      - Creating stories (own stories only)
      - Deleting stories (own stories only)

  3. Performance
    - Add index on expires_at for faster queries
    - Add cleanup function for expired stories
*/

-- Create stories table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    CONSTRAINT stories_expires_at_check CHECK (expires_at > created_at)
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Enable RLS if not already enabled
DO $$ BEGIN
  ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create policies if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stories' 
    AND policyname = 'Users can view all stories'
  ) THEN
    CREATE POLICY "Users can view all stories"
      ON stories
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stories' 
    AND policyname = 'Users can create own stories'
  ) THEN
    CREATE POLICY "Users can create own stories"
      ON stories
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stories' 
    AND policyname = 'Users can delete own stories'
  ) THEN
    CREATE POLICY "Users can delete own stories"
      ON stories
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create index if it doesn't exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create or replace cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;