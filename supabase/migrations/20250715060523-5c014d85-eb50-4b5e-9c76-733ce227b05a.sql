-- Update any quizzes that still have empty quiz codes
UPDATE public.quizzes 
SET quiz_code = generate_quiz_code()
WHERE quiz_code IS NULL OR quiz_code = '';