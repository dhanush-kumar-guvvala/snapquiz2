-- Add missing columns to quizzes table for scheduling and timing
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;

-- Update the quiz_attempts table ordering issue and add created_at for consistency
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();