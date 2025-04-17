/*
  # Add Notifications and Bookmarks

  1. New Tables
    - notifications
      - id (uuid, primary key)
      - user_id (uuid, references profiles)
      - type (text)
      - data (jsonb)
      - read (boolean)
      - created_at (timestamptz)
    
    - bookmarks
      - id (uuid, primary key)
      - user_id (uuid, references profiles)
      - post_id (uuid, references posts)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
    - Create notification triggers
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    data jsonb NOT NULL,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
    ON public.bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);

-- Add function to create notifications
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'likes' THEN
      INSERT INTO notifications (user_id, type, data)
      SELECT 
        posts.user_id,
        'like',
        jsonb_build_object(
          'post_id', NEW.post_id,
          'user_id', NEW.user_id
        )
      FROM posts
      WHERE posts.id = NEW.post_id
      AND posts.user_id != NEW.user_id;
    ELSIF TG_TABLE_NAME = 'comments' THEN
      INSERT INTO notifications (user_id, type, data)
      SELECT 
        posts.user_id,
        'comment',
        jsonb_build_object(
          'post_id', NEW.post_id,
          'user_id', NEW.user_id,
          'comment_id', NEW.id
        )
      FROM posts
      WHERE posts.id = NEW.post_id
      AND posts.user_id != NEW.user_id;
    ELSIF TG_TABLE_NAME = 'follows' THEN
      IF NEW.following_id != NEW.follower_id THEN
        INSERT INTO notifications (user_id, type, data)
        VALUES (
          NEW.following_id,
          'follow',
          jsonb_build_object(
            'follower_id', NEW.follower_id
          )
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification triggers
CREATE TRIGGER create_like_notification
    AFTER INSERT ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION create_notification();

CREATE TRIGGER create_comment_notification
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION create_notification();

CREATE TRIGGER create_follow_notification
    AFTER INSERT ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION create_notification();