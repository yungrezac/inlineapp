/*
  # Fix profiles table and add missing tables

  1. Changes
    - Add missing columns to profiles table
    - Create posts table
    - Create athlete_locations table
    - Create user_routes table
    - Add proper RLS policies

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.user_routes;
DROP TABLE IF EXISTS public.athlete_locations;
DROP TABLE IF EXISTS public.posts;
DROP TABLE IF EXISTS public.profiles;

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  sports text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  likes integer DEFAULT 0,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create athlete_locations table
CREATE TABLE public.athlete_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  last_updated timestamptz DEFAULT now()
);

-- Create user_routes table
CREATE TABLE public.user_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  description text,
  route_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" 
  ON public.posts FOR SELECT 
  USING (true);

CREATE POLICY "Users can create posts" 
  ON public.posts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" 
  ON public.posts FOR UPDATE 
  USING (auth.uid() = user_id);

-- Athlete locations policies
CREATE POLICY "Locations are viewable by everyone" 
  ON public.athlete_locations FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own location" 
  ON public.athlete_locations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own location" 
  ON public.athlete_locations FOR UPDATE 
  USING (auth.uid() = user_id);

-- User routes policies
CREATE POLICY "Users can view own routes" 
  ON public.user_routes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routes" 
  ON public.user_routes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes" 
  ON public.user_routes FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_routes_updated_at
  BEFORE UPDATE ON public.user_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();