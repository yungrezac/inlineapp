/*
  # Map Features Implementation

  1. New Tables
    - `map_locations` for storing points of interest
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `image_url` (text, optional)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `created_at` (timestamp)

    - `map_routes` for storing user-created routes
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `image_url` (text, optional)
      - `route_data` (jsonb) - stores route coordinates
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for viewing and creating
*/

-- Create map_locations table
CREATE TABLE IF NOT EXISTS map_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create map_routes table
CREATE TABLE IF NOT EXISTS map_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  route_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_routes ENABLE ROW LEVEL SECURITY;

-- Create policies for map_locations
DO $$ BEGIN
  CREATE POLICY "Locations are viewable by everyone"
    ON map_locations
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can create locations"
    ON map_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own locations"
    ON map_locations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete own locations"
    ON map_locations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create policies for map_routes
DO $$ BEGIN
  CREATE POLICY "Routes are viewable by everyone"
    ON map_routes
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can create routes"
    ON map_routes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own routes"
    ON map_routes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete own routes"
    ON map_routes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;