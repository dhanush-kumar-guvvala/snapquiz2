
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuizTaking } from './QuizTaking';
import { QuizResults } from './QuizResults';
import { UsernameSetup } from './UsernameSetup';
import { BookOpen, Clock, Trophy, LogOut, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  completed_at: string;
  time_taken_minutes: number;
  is_completed: boolean;
  quiz: {
    title: string;
    quiz_code: string;
    total_questions: number;
  };
}

export const StudentDashboard = () => {
  const { profile, signOut } = useAuth();
  const [quizCode, setQuizCode] = useState('');
  const [activeView, setActiveView] = useState<'dashboard' | 'quiz' | 'results'>('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes!quiz_attempts_quiz_id_fkey (
            title,
            quiz_code,
            total_questions
          )
        `)
        .eq('student_id', profile?.id)
        .order('started_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      const formattedAttempts = data.map(attempt => ({
        ...attempt,
        quiz: {
          title: attempt.quizzes?.title || 'Unknown Quiz',
          quiz_code: attempt.quizzes?.quiz_code || '',
          total_questions: attempt.quizzes?.total_questions || 0
        }
      }));

      setAttempts(formattedAttempts);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quiz attempts",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchAttempts();
    }
  }, [profile?.id]);

  const handleJoinQuiz = async () => {
    if (!quizCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid quiz code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if quiz exists and is active
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('quiz_code', quizCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (quizError || !quiz) {
        toast({
          title: "Quiz Not Found",
          description: "Invalid quiz code or quiz is not active",
          variant: "destructive",
        });
        return;
      }

      // Check if quiz is within the allowed time window
      const now = new Date();
      if (quiz.start_time && new Date(quiz.start_time) > now) {
        toast({
          title: "Quiz Not Available",
          description: `Quiz will be available from ${new Date(quiz.start_time).toLocaleString()}`,
          variant: "destructive",
        });
        return;
      }

      if (quiz.end_time && new Date(quiz.end_time) < now) {
        toast({
          title: "Quiz Expired",
          description: `Quiz was available until ${new Date(quiz.end_time).toLocaleString()}`,
          variant: "destructive",
        });
        return;
      }

      // Check if student has already attempted this quiz
      const { data: existingAttempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quiz.id)
        .eq('student_id', profile?.id)
        .single();

      if (existingAttempt) {
        toast({
          title: "Already Attempted",
          description: "You have already taken this quiz",
          variant: "destructive",
        });
        return;
      }

      setSelectedQuizId(quiz.id);
      setActiveView('quiz');
    } catch (error) {
      console.error('Error joining quiz:', error);
      toast({
        title: "Error",
        description: "Failed to join quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuizCompleted = () => {
    setActiveView('dashboard');
    setSelectedQuizId(null);
    setQuizCode('');
    fetchAttempts();
  };

  const viewResults = (attemptId: string) => {
    const attempt = attempts.find(a => a.id === attemptId);
    if (!attempt) return;

    // Check if 1 hour has passed since completion
    const completedAt = new Date(attempt.completed_at);
    const now = new Date();
    const hoursPassed = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);

    if (hoursPassed < 1) {
      const remainingMinutes = Math.ceil(60 - (hoursPassed * 60));
      toast({
        title: "Results Not Available",
        description: `Results will be available in ${remainingMinutes} minutes`,
        variant: "destructive",
      });
      return;
    }

    setSelectedAttemptId(attemptId);
    setActiveView('results');
  };

  // Show username setup if student doesn't have a username
  if (profile && !profile.username) {
    return <UsernameSetup onComplete={() => {}} />;
  }

  if (activeView === 'quiz' && selectedQuizId) {
    return (
      <QuizTaking
        quizId={selectedQuizId}
        onBack={() => {
          setActiveView('dashboard');
          setSelectedQuizId(null);
        }}
        onCompleted={handleQuizCompleted}
      />
    );
  }

  if (activeView === 'results' && selectedAttemptId) {
    return (
      <QuizResults
        attemptId={selectedAttemptId}
        onBack={() => {
          setActiveView('dashboard');
          setSelectedAttemptId(null);
        }}
      />
    );
  }

  const completedAttempts = attempts.filter(a => a.is_completed);
  const averageScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / completedAttempts.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
              <p className="text-gray-600">Welcome, {profile?.full_name}</p>
            </div>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Join Quiz Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Join a Quiz</CardTitle>
            <CardDescription>
              Enter the quiz code provided by your teacher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="quizCode" className="sr-only">Quiz Code</Label>
                <Input
                  id="quizCode"
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                  placeholder="Enter quiz code (e.g., ABC123)"
                  maxLength={6}
                />
              </div>
              <Button onClick={handleJoinQuiz} disabled={loading}>
                {loading ? "Joining..." : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Join Quiz
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAttempts.length}</div>
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
              <div className="text-2xl font-bold">
                {completedAttempts.length > 0
                  ? Math.round(completedAttempts.reduce((sum, attempt) => sum + attempt.time_taken_minutes, 0) / completedAttempts.length)
                  : 0}m
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quiz History */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz History</CardTitle>
            <CardDescription>
              Your completed quizzes and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No quizzes taken yet</p>
                <p className="text-sm">Join your first quiz using the code above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{attempt.quiz.title}</h3>
                          <Badge variant="outline" className="font-mono">
                            {attempt.quiz.quiz_code}
                          </Badge>
                          {attempt.is_completed && (
                            <Badge variant={attempt.score >= 70 ? "default" : "secondary"}>
                              {attempt.score}%
                            </Badge>
                          )}
                        </div>
                        {attempt.is_completed ? (
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Score: {attempt.score}%</span>
                            <span>Time: {attempt.time_taken_minutes}m</span>
                            <span>Completed: {new Date(attempt.completed_at).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </div>
                      {attempt.is_completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewResults(attempt.id)}
                        >
                          View Results
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
