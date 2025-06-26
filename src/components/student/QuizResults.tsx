
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Clock, Target, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QuizResultsProps {
  attemptId: string;
  onBack: () => void;
}

interface ResultsData {
  attempt: {
    score: number;
    time_taken_minutes: number;
    completed_at: string;
    quiz: {
      title: string;
      quiz_code: string;
      total_questions: number;
    };
  };
  answers: Array<{
    question: {
      question_text: string;
      correct_answer: string;
      question_type: string;
    };
    student_answer: string;
    is_correct: boolean;
  }>;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ attemptId, onBack }) => {
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      // Fetch attempt details
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select(`
          score,
          time_taken_minutes,
          completed_at,
          quizzes!quiz_attempts_quiz_id_fkey (
            title,
            quiz_code,
            total_questions
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Fetch answers with questions
      const { data: answers, error: answersError } = await supabase
        .from('student_answers')
        .select(`
          student_answer,
          is_correct,
          questions!student_answers_question_id_fkey (
            question_text,
            correct_answer,
            question_type
          )
        `)
        .eq('attempt_id', attemptId);

      if (answersError) throw answersError;

      // Format the data
      const formattedResults = {
        attempt: {
          score: attempt.score || 0,
          time_taken_minutes: attempt.time_taken_minutes || 0,
          completed_at: attempt.completed_at || '',
          quiz: {
            title: attempt.quizzes?.title || 'Unknown Quiz',
            quiz_code: attempt.quizzes?.quiz_code || '',
            total_questions: attempt.quizzes?.total_questions || 0
          }
        },
        answers: answers.map(answer => ({
          question: {
            question_text: answer.questions?.question_text || '',
            correct_answer: answer.questions?.correct_answer || '',
            question_type: answer.questions?.question_type || ''
          },
          student_answer: answer.student_answer,
          is_correct: answer.is_correct
        }))
      };

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quiz results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading results...</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Results not found</div>
      </div>
    );
  }

  const correctAnswers = results.answers.filter(a => a.is_correct).length;
  const incorrectAnswers = results.answers.length - correctAnswers;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
              <p className="text-gray-600">{results.attempt.quiz.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Final Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.attempt.score}%</div>
              <Badge variant={results.attempt.score >= 70 ? "default" : "secondary"} className="mt-2">
                {results.attempt.score >= 70 ? "Passed" : "Needs Improvement"}
              </Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Taken</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.attempt.time_taken_minutes}m</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Correct</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incorrect</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{incorrectAnswers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Question-by-Question Review</CardTitle>
            <CardDescription>
              Review your answers and see the correct solutions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {results.answers.map((answer, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium">Question {index + 1}</h3>
                  <Badge variant={answer.is_correct ? "default" : "destructive"}>
                    {answer.is_correct ? "Correct" : "Incorrect"}
                  </Badge>
                </div>
                
                <p className="text-gray-900 mb-4">{answer.question.question_text}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Your Answer:</span>
                    <span className={`text-sm ${answer.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                      {answer.student_answer}
                    </span>
                  </div>
                  
                  {!answer.is_correct && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Correct Answer:</span>
                      <span className="text-sm text-green-600">
                        {answer.question.correct_answer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-4xl font-bold mb-2">{results.attempt.score}%</div>
              <p className="text-gray-600 mb-4">
                You answered {correctAnswers} out of {results.attempt.quiz.total_questions} questions correctly
              </p>
              <p className="text-sm text-gray-500">
                Completed on {new Date(results.attempt.completed_at).toLocaleDateString()} 
                in {results.attempt.time_taken_minutes} minutes
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
