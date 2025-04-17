/*
  # Add Messaging System

  1. New Tables
    - `chats`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_message` (text)
      - `last_message_at` (timestamptz)
    
    - `chat_participants`
      - `chat_id` (uuid, references chats)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `last_read_at` (timestamptz)
    
    - `messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamptz)
      - `read_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for chat participants
*/

-- Create chats table
CREATE TABLE public.chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_message text,
    last_message_at timestamptz DEFAULT now()
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
    chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    last_read_at timestamptz DEFAULT now(),
    PRIMARY KEY (chat_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Create policies for chats
CREATE POLICY "Users can view chats they participate in"
    ON public.chats
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_id = id AND user_id = auth.uid()
        )
    );

-- Create policies for chat_participants
CREATE POLICY "Users can view chat participants"
    ON public.chat_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_id = chat_participants.chat_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join chats"
    ON public.chat_participants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policies for messages
CREATE POLICY "Users can view messages in their chats"
    ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_id = messages.chat_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their chats"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_id = messages.chat_id AND user_id = auth.uid()
        )
    );

-- Create function to update chat's last message
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chats
    SET last_message = NEW.content,
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last message
CREATE TRIGGER update_chat_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_last_message();