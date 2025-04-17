/*
  # Initial Schema for SportsMate

  1. New Tables
    - profiles
      - id (uuid, references auth.users)
      - full_name (text)
      - avatar_url (text)
      - bio (text)
      - sports (text[])
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - posts
      - id (uuid)
      - user_id (uuid, references profiles)
      - content (text)
      - image_url (text)
      - likes (integer)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - athlete_locations
      - id (uuid)
      - user_id (uuid, references profiles)
      - latitude (double precision)
      - longitude (double precision)
      - last_updated (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    avatar_url text,
    bio text,
    sports text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    image_url text,
    likes integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create athlete_locations table
CREATE TABLE public.athlete_locations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    last_updated timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_locations ENABLE ROW LEVEL SECURITY;

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