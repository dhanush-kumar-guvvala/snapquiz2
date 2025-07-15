-- First, let's update all existing quizzes that have empty quiz codes
UPDATE public.quizzes 
SET quiz_code = generate_quiz_code()
WHERE quiz_code IS NULL OR quiz_code = '';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_quiz_code_trigger ON public.quizzes;

-- Create the trigger that will set quiz codes for new quizzes
CREATE TRIGGER set_quiz_code_trigger
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_quiz_code();