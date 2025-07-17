import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { QuizTaking } from '@/components/student/QuizTaking';
import { UsernameSetup } from '@/components/student/UsernameSetup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  quiz_code: string;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  total_questions: number;
}

export const QuizAccess = () => {
  const { quizCode } = useParams<{ quizCode: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [activeView, setActiveView] = useState<'info' | 'taking'>('info');
  const [existingAttempt, setExistingAttempt] = useState<any>(null);

  useEffect(() => {
    if (quizCode) {
      fetchQuizInfo();
    }
  }, [quizCode]);

  const fetchQuizInfo = async () => {
    if (!quizCode) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch quiz information
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('quiz_code', quizCode.toUpperCase())
        .single();

      if (quizError || !quizData) {
        setError('Quiz not found. Please check the quiz code and try again.');
        return;
      }

      setQuiz(quizData);

      // Check if student has already attempted this quiz
      if (profile?.id) {
        const { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizData.id)
          .eq('student_id', profile.id)
          .single();

        setExistingAttempt(attemptData);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setError('Failed to load quiz information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!quiz || !profile?.id) return;

    // Check if quiz is active
    if (!quiz.is_active) {
      toast({
        title: "Quiz Not Active",
        description: "This quiz is not currently active.",
        variant: "destructive",
      });
      return;
    }

    // Check time window
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

    // Check if already attempted
    if (existingAttempt) {
      toast({
        title: "Already Attempted",
        description: "You have already taken this quiz.",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    setActiveView('taking');
  };

  const handleQuizCompleted = () => {
    navigate('/');
  };

  const handleBack = () => {
    navigate('/');
  };

  // Show username setup if student doesn't have a username
  if (profile && !profile.username) {
    return <UsernameSetup onComplete={() => window.location.reload()} />;
  }

  // Show quiz taking interface
  if (activeView === 'taking' && quiz) {
    return (
      <QuizTaking
        quizId={quiz.id}
        onBack={() => setActiveView('info')}
        onCompleted={handleQuizCompleted}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz information...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Quiz Not Found</CardTitle>
            <CardDescription>
              {error || 'The quiz you\'re looking for could not be found.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const isAvailable = quiz.is_active &&
    (!quiz.start_time || new Date(quiz.start_time) <= now) &&
    (!quiz.end_time || new Date(quiz.end_time) > now);

  const getStatusInfo = () => {
    if (!quiz.is_active) {
      return { 
        status: 'inactive', 
        message: 'This quiz is not currently active',
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />
      };
    }
    
    if (quiz.start_time && new Date(quiz.start_time) > now) {
      return { 
        status: 'scheduled', 
        message: `Available from ${new Date(quiz.start_time).toLocaleString()}`,
        icon: <Clock className="h-5 w-5 text-blue-500" />
      };
    }
    
    if (quiz.end_time && new Date(quiz.end_time) < now) {
      return { 
        status: 'expired', 
        message: `Expired on ${new Date(quiz.end_time).toLocaleString()}`,
        icon: <AlertCircle className="h-5 w-5 text-red-500" />
      };
    }
    
    if (existingAttempt) {
      return { 
        status: 'completed', 
        message: 'You have already completed this quiz',
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      };
    }
    
    return { 
      status: 'available', 
      message: 'Ready to start',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />
    };
  };

  const statusInfo = getStatusInfo();
  const canStart = isAvailable && !existingAttempt;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Quiz Access</h1>
            <Button variant="ghost" onClick={handleBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <CardDescription className="mt-2">
                  {quiz.description}
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                {quiz.quiz_code}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              {statusInfo.icon}
              <div>
                <p className="font-medium capitalize">{statusInfo.status}</p>
                <p className="text-sm text-gray-600">{statusInfo.message}</p>
              </div>
            </div>

            {/* Quiz Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Questions</p>
                  <p className="font-medium">{quiz.total_questions}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{quiz.duration_minutes} minutes</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Topic</p>
                  <p className="font-medium">{quiz.topic || 'General'}</p>
                </div>
              </div>
            </div>

            {/* Time Window Info */}
            {(quiz.start_time || quiz.end_time) && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Quiz Schedule</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  {quiz.start_time && (
                    <p>Starts: {new Date(quiz.start_time).toLocaleString()}</p>
                  )}
                  {quiz.end_time && (
                    <p>Ends: {new Date(quiz.end_time).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            {/* Existing Attempt Info */}
            {existingAttempt && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Quiz Completed</h4>
                <div className="space-y-1 text-sm text-green-700">
                  <p>Score: {existingAttempt.score}%</p>
                  <p>Completed: {new Date(existingAttempt.completed_at).toLocaleString()}</p>
                  <p>Time taken: {existingAttempt.time_taken_minutes} minutes</p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-4">
              {canStart ? (
                <Button 
                  onClick={handleStartQuiz} 
                  disabled={isStarting}
                  className="w-full"
                  size="lg"
                >
                  {isStarting ? 'Starting Quiz...' : 'Start Quiz'}
                </Button>
              ) : (
                <Button disabled className="w-full" size="lg">
                  Quiz Not Available
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
