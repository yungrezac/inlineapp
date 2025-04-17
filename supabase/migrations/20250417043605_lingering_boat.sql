/*
  # Add comment likes and replies

  1. New Tables
    - `comment_likes` - Tracks likes on comments
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)
    
    - `comment_replies` - Stores replies to comments
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references comments)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create comment_replies table
CREATE TABLE IF NOT EXISTS comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

-- Policies for comment_likes
CREATE POLICY "Users can view any comment likes"
  ON comment_likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like comments"
  ON comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON comment_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for comment_replies
CREATE POLICY "Users can view any comment replies"
  ON comment_replies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create replies"
  ON comment_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON comment_replies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON comment_replies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger for updating updated_at
CREATE TRIGGER update_comment_replies_updated_at
  BEFORE UPDATE ON comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create notification trigger for replies
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, data)
  SELECT 
    c.user_id,
    'reply',
    jsonb_build_object(
      'comment_id', NEW.parent_id,
      'reply_id', NEW.id,
      'post_id', c.post_id,
      'replier_id', NEW.user_id
    )
  FROM comments c
  WHERE c.id = NEW.parent_id
  AND c.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_reply_notification
  AFTER INSERT ON comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION create_reply_notification();

-- Create notification trigger for likes
CREATE OR REPLACE FUNCTION create_comment_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, data)
  SELECT 
    c.user_id,
    'comment_like',
    jsonb_build_object(
      'comment_id', NEW.comment_id,
      'post_id', c.post_id,
      'liker_id', NEW.user_id
    )
  FROM comments c
  WHERE c.id = NEW.comment_id
  AND c.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_comment_like_notification
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_like_notification();