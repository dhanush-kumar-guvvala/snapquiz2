
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, Trophy, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QuizAnalyticsProps {
  quizId: string;
  onBack: () => void;
}

interface AnalyticsData {
  quiz: {
    title: string;
    quiz_code: string;
    total_questions: number;
    duration_minutes: number;
  };
  attempts: Array<{
    id: string;
    student_id: string;
    student: {
      id: string;
      username: string | null;
      full_name: string;
      email: string;
    };
    score: number;
    completed_at: string;
    time_taken_minutes: number;
  }>;
  questionStats: Array<{
    question_text: string;
    correct_count: number;
    total_attempts: number;
    accuracy: number;
  }>;
}

export const QuizAnalytics: React.FC<QuizAnalyticsProps> = ({ quizId, onBack }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [quizId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch quiz details
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('title, quiz_code, total_questions, duration_minutes')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      // Fetch quiz attempts with student details
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          student_id,
          score,
          completed_at,
          time_taken_minutes,
          profiles!quiz_attempts_student_id_fkey (
            id,
            username,
            full_name,
            email
          )
        `)
        .eq('quiz_id', quizId)
        .eq('is_completed', true);

      if (attemptsError) throw attemptsError;

      // Fetch question-wise statistics
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          student_answers (
            is_correct,
            attempt_id
          )
        `)
        .eq('quiz_id', quizId);

      if (questionsError) throw questionsError;

      // Process question statistics
      const questionStats = questions.map(question => {
        const answers = question.student_answers || [];
        const correctCount = answers.filter(answer => answer.is_correct).length;
        const totalAttempts = answers.length;
        const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

        return {
          question_text: question.question_text,
          correct_count: correctCount,
          total_attempts: totalAttempts,
          accuracy: Math.round(accuracy)
        };
      });

      // Format attempts data
      const formattedAttempts = attempts.map(attempt => ({
        id: attempt.id,
        student_id: attempt.student_id,
        student: {
          id: attempt.profiles?.id || attempt.student_id,
          username: attempt.profiles?.username || null,
          full_name: attempt.profiles?.full_name || 'Unknown',
          email: attempt.profiles?.email || 'Unknown'
        },
        score: attempt.score || 0,
        completed_at: attempt.completed_at || '',
        time_taken_minutes: attempt.time_taken_minutes || 0
      }));

      setAnalytics({
        quiz,
        attempts: formattedAttempts,
        questionStats
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quiz analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Failed to load analytics</div>
      </div>
    );
  }

  const averageScore = analytics.attempts.length > 0 
    ? Math.round(analytics.attempts.reduce((sum, attempt) => sum + attempt.score, 0) / analytics.attempts.length)
    : 0;

  const averageTime = analytics.attempts.length > 0
    ? Math.round(analytics.attempts.reduce((sum, attempt) => sum + attempt.time_taken_minutes, 0) / analytics.attempts.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{analytics.quiz.title}</h1>
              <p className="text-gray-600">Quiz Code: {analytics.quiz.quiz_code}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.attempts.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageTime}m</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Student Results */}
          <Card>
            <CardHeader>
              <CardTitle>Student Results</CardTitle>
              <CardDescription>Individual student performance</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.attempts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No attempts yet</p>
              ) : (
                <div className="space-y-4">
                  {analytics.attempts.map((attempt) => (
                    <div key={attempt.id} className="flex justify-between items-center p-3 border rounded-lg">
                       <div>
                         <div className="flex items-center space-x-2">
                           <p className="font-medium">
                             {attempt.student.username ? `@${attempt.student.username}` : attempt.student.full_name}
                           </p>
                           <Badge variant="outline" className="text-xs">
                             ID: {attempt.student.id.slice(0, 8)}
                           </Badge>
                         </div>
                         {attempt.student.username && (
                           <p className="text-sm text-gray-600">{attempt.student.full_name}</p>
                         )}
                         <p className="text-sm text-gray-500">{attempt.student.email}</p>
                         <p className="text-xs text-gray-400">
                           Completed: {new Date(attempt.completed_at).toLocaleDateString()}
                         </p>
                       </div>
                      <div className="text-right">
                        <Badge variant={attempt.score >= 70 ? "default" : "secondary"}>
                          {attempt.score}%
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {attempt.time_taken_minutes}m
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Question Analysis</CardTitle>
              <CardDescription>Performance by question</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.questionStats.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No question data available</p>
              ) : (
                <div className="space-y-4">
                  {analytics.questionStats.map((stat, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm mb-2">
                        Q{index + 1}: {stat.question_text.slice(0, 80)}...
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {stat.correct_count}/{stat.total_attempts} correct
                        </span>
                        <Badge variant={stat.accuracy >= 70 ? "default" : stat.accuracy >= 50 ? "secondary" : "destructive"}>
                          {stat.accuracy}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${
                            stat.accuracy >= 70 ? 'bg-green-500' : 
                            stat.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stat.accuracy}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
