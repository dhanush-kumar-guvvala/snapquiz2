
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'theory' | 'fill_in_the_blank' | 'true_false';
  options: string[] | null;
  order_index: number;
}

interface QuizTakingProps {
  quizId: string;
  onBack: () => void;
  onCompleted: () => void;
}

export const QuizTaking: React.FC<QuizTakingProps> = ({ quizId, onBack, onCompleted }) => {
  const { profile } = useAuth();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initializeQuiz();
  }, [quizId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quiz) {
      handleSubmitQuiz();
    }
  }, [timeLeft, quiz]);

  const initializeQuiz = async () => {
    try {
      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, question_type, options, order_index')
        .eq('quiz_id', quizId)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Parse options from JSON
      const formattedQuestions = questionsData.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options as string) : null
      }));

      // Create quiz attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          student_id: profile?.id,
          total_questions: questionsData.length,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      setQuiz(quizData);
      setQuestions(formattedQuestions);
      setAttemptId(attempt.id);
      setTimeLeft(quizData.duration_minutes * 60); // Convert to seconds
    } catch (error) {
      console.error('Error initializing quiz:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz. Please try again.",
        variant: "destructive",
      });
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const startTime = new Date(quiz.created_at).getTime();
      const endTime = new Date().getTime();
      const timeTakenMinutes = Math.round((endTime - startTime) / (1000 * 60));

      // Submit answers
      const answersToInsert = Object.entries(answers).map(([questionId, answer]) => ({
        attempt_id: attemptId,
        question_id: questionId,
        student_answer: answer,
        is_correct: false // Will be calculated server-side
      }));

      if (answersToInsert.length > 0) {
        const { error: answersError } = await supabase
          .from('student_answers')
          .insert(answersToInsert);

        if (answersError) throw answersError;
      }

      // Calculate score
      let score = 0;
      for (const [questionId, studentAnswer] of Object.entries(answers)) {
        const { data: question, error: questionError } = await supabase
          .from('questions')
          .select('correct_answer')
          .eq('id', questionId)
          .single();

        if (!questionError && question) {
          const isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
          if (isCorrect) score++;

          // Update the answer's correctness
          await supabase
            .from('student_answers')
            .update({ is_correct: isCorrect })
            .eq('attempt_id', attemptId)
            .eq('question_id', questionId);
        }
      }

      const finalScore = Math.round((score / questions.length) * 100);

      // Update quiz attempt
      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          score: finalScore,
          time_taken_minutes: timeTakenMinutes
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      toast({
        title: "Quiz Submitted!",
        description: `You scored ${finalScore}%. Results will be available in 1 hour.`,
      });

      onCompleted();
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading quiz...</div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Quiz not found</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredQuestions = Object.keys(answers).length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Quiz
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className={`font-mono ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              {timeLeft < 300 && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-gray-500 mt-1">
              {answeredQuestions} of {questions.length} questions answered
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
              <Badge variant="outline">{currentQuestion.question_type.replace('_', ' ')}</Badge>
            </div>
            <CardDescription className="text-lg font-medium text-gray-900">
              {currentQuestion.question_text}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Multiple Choice */}
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* True/False */}
            {currentQuestion.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="True" id="true" />
                  <Label htmlFor="true" className="cursor-pointer">True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="False" id="false" />
                  <Label htmlFor="false" className="cursor-pointer">False</Label>
                </div>
              </RadioGroup>
            )}

            {/* Fill in the Blank */}
            {currentQuestion.question_type === 'fill_in_the_blank' && (
              <Input
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Enter your answer"
              />
            )}

            {/* Theory */}
            {currentQuestion.question_type === 'theory' && (
              <Textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Enter your answer"
                rows={6}
              />
            )}

            <div className="flex justify-between pt-6">
              <Button 
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                Previous
              </Button>
              
              {currentQuestionIndex === questions.length - 1 ? (
                <Button 
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? "Submitting..." : "Submit Quiz"}
                </Button>
              ) : (
                <Button onClick={handleNextQuestion}>
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
