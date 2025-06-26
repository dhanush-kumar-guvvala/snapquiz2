
-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('teacher', 'student');

-- Create enum for question types
CREATE TYPE question_type AS ENUM ('multiple_choice', 'theory', 'fill_in_the_blank', 'true_false');

-- Create enum for difficulty levels
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  total_questions INTEGER NOT NULL DEFAULT 10,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  start_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT FALSE,
  quiz_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'multiple_choice',
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  correct_answer TEXT NOT NULL,
  options JSONB, -- For multiple choice options
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  time_taken_minutes INTEGER,
  UNIQUE(quiz_id, student_id) -- Ensure one attempt per student per quiz
);

-- Create student answers table
CREATE TABLE public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for quizzes
CREATE POLICY "Teachers can manage their quizzes" ON public.quizzes
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view active quizzes" ON public.quizzes
  FOR SELECT USING (is_active = true);

-- RLS Policies for questions
CREATE POLICY "Teachers can manage questions for their quizzes" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view questions for active quizzes" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.is_active = true
    )
  );

-- RLS Policies for quiz attempts
CREATE POLICY "Students can manage their own attempts" ON public.quiz_attempts
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view attempts for their quizzes" ON public.quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = quiz_attempts.quiz_id 
      AND quizzes.teacher_id = auth.uid()
    )
  );

-- RLS Policies for student answers
CREATE POLICY "Students can manage their own answers" ON public.student_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE quiz_attempts.id = student_answers.attempt_id 
      AND quiz_attempts.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view answers for their quizzes" ON public.student_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      WHERE qa.id = student_answers.attempt_id 
      AND q.teacher_id = auth.uid()
    )
  );

-- Create function to generate unique quiz codes
CREATE OR REPLACE FUNCTION generate_quiz_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quiz codes
CREATE OR REPLACE FUNCTION set_quiz_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quiz_code IS NULL THEN
    LOOP
      NEW.quiz_code := generate_quiz_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quizzes WHERE quiz_code = NEW.quiz_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quiz_code
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION set_quiz_code();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_quizzes_teacher_id ON public.quizzes(teacher_id);
CREATE INDEX idx_quizzes_quiz_code ON public.quizzes(quiz_code);
CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX idx_student_answers_attempt_id ON public.student_answers(attempt_id);
