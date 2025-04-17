/*
  # Add Routes Table

  1. New Tables
    - user_routes
      - id (uuid, primary key)
      - user_id (uuid, references profiles)
      - name (text)
      - description (text)
      - route_data (jsonb, stores array of coordinates)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create routes table
CREATE TABLE public.user_routes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    name text,
    description text,
    route_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;

-- Routes policies
CREATE POLICY "Users can view own routes"
    ON public.user_routes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routes"
    ON public.user_routes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes"
    ON public.user_routes FOR UPDATE
    USING (auth.uid() = user_id);

-- Add index for user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_user_routes_user_id ON user_routes(user_id);