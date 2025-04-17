/*
  # Add demo data

  1. Sample Data
    - Creates 10 demo users with profiles
    - Adds sample posts for each user
    - Creates follow relationships between users
    - Adds likes and comments to posts

  2. Content
    - Users have realistic names and bios
    - Posts contain relevant content about roller skating
    - Profile images use Unsplash photos
*/

-- First, create users in the auth.users table
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES
  ('d0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', 'anna@example.com', now()),
  ('d1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', 'max@example.com', now()),
  ('d2d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3b', 'elena@example.com', now()),
  ('d3d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e4b', 'pavel@example.com', now()),
  ('d4d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e5b', 'maria@example.com', now());

-- Then create profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, bio, sports, created_at, updated_at)
VALUES
  ('d0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', 'anna@example.com', 'Анна Соколова', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'Профессиональный инструктор по роликам. Обожаю учить новичков!', ARRAY['Роликовые коньки', 'Скейтборд'], NOW(), NOW()),
  ('d1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', 'max@example.com', 'Максим Волков', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'Катаюсь на всём, что имеет колёса. 5 лет в спорте.', ARRAY['Роликовые коньки', 'Скейтборд', 'Велосипед'], NOW(), NOW()),
  ('d2d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3b', 'elena@example.com', 'Елена Морозова', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'Фристайл роллер. Участница городских соревнований.', ARRAY['Роликовые коньки'], NOW(), NOW()),
  ('d3d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e4b', 'pavel@example.com', 'Павел Князев', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Люблю длинные прогулки на роликах по набережной.', ARRAY['Роликовые коньки', 'Самокат'], NOW(), NOW()),
  ('d4d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e5b', 'maria@example.com', 'Мария Дубова', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'Начинающий роллер. Ищу компанию для совместных катаний!', ARRAY['Роликовые коньки'], NOW(), NOW());

-- Insert demo posts
INSERT INTO public.posts (id, user_id, content, image_url, likes, created_at, updated_at)
VALUES
  ('e0e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1c', 'd0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', 'Провела сегодня отличную тренировку с новичками! Всегда радуюсь, когда вижу прогресс своих учеников. 🛼', 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800', 0, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('e1e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2c', 'd1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', 'Новый трюк освоен! Месяц тренировок не прошёл даром. Кто хочет научиться - пишите в комментариях! 🎯', 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800', 0, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('e2e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3c', 'd2d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3b', 'Готовимся к городским соревнованиям! Осталось две недели до выступления. Держите за меня кулачки! 🏆', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800', 0, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('e3e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e4c', 'd3d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e4b', 'Вечерняя прогулка по набережной. Лучший способ закончить день! 🌅', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800', 0, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('e4e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e5c', 'd4d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e5b', 'Первые шаги на роликах! Спасибо @anna за отличный урок! 🎉', null, 0, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week');

-- Create some follows
INSERT INTO public.follows (follower_id, following_id, created_at)
VALUES
  ('d1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', 'd0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', NOW()),
  ('d2d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3b', 'd0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', NOW()),
  ('d3d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e4b', 'd0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', NOW()),
  ('d4d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e5b', 'd0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', NOW()),
  ('d0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', 'd1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', NOW()),
  ('d2d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3b', 'd1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', NOW());

-- Add some likes
INSERT INTO public.likes (post_id, user_id, created_at)
VALUES
  ('e0e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1c', 'd1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', NOW()),
  ('e0e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1c', 'd2d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3b', NOW()),
  ('e1e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2c', 'd0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', NOW()),
  ('e2e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3c', 'd1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', NOW()),
  ('e2e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3c', 'd3d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e4b', NOW());

-- Add some comments
INSERT INTO public.comments (post_id, user_id, content, created_at, updated_at)
VALUES
  ('e0e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1c', 'd4d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e5b', 'Спасибо за урок! Было очень полезно! 🙏', NOW(), NOW()),
  ('e1e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2c', 'd0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', 'Отличный трюк! Как долго тренировался?', NOW(), NOW()),
  ('e2e8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3c', 'd1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', 'Удачи на соревнованиях! 💪', NOW(), NOW());

-- Add some locations
INSERT INTO public.athlete_locations (user_id, latitude, longitude, last_updated)
VALUES
  ('d0d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e1b', 55.751244, 37.618423, NOW()),
  ('d1d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e2b', 55.753215, 37.622504, NOW()),
  ('d2d8aa1a-b1b0-4a7a-8c2f-f6c35f4a8e3b', 55.754124, 37.620169, NOW());