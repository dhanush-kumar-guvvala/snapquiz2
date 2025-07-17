
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuizCreation } from './QuizCreation';
import { QuizAnalytics } from './QuizAnalytics';
import { Plus, BookOpen, Users, BarChart3, LogOut, Share2, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  total_questions: number;
  duration_minutes: number;
  is_active: boolean;
  quiz_code: string;
  created_at: string;
  _count?: {
    quiz_attempts: number;
  };
}

export const TeacherDashboard = () => {
  const { profile, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'create' | 'analytics'>('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          quiz_attempts(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include attempt count
      const quizzesWithCount = data.map(quiz => ({
        ...quiz,
        _count: {
          quiz_attempts: quiz.quiz_attempts?.length || 0
        }
      }));

      setQuizzes(quizzesWithCount);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const toggleQuizStatus = async (quizId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_active: !isActive })
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quiz ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });

      fetchQuizzes();
    } catch (error) {
      console.error('Error updating quiz status:', error);
      toast({
        title: "Error",
        description: "Failed to update quiz status",
        variant: "destructive",
      });
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });

      fetchQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive",
      });
    }
  };

  if (activeView === 'create') {
    return (
      <QuizCreation
        onBack={() => setActiveView('dashboard')}
        onQuizCreated={() => {
          setActiveView('dashboard');
          fetchQuizzes();
        }}
      />
    );
  }

  if (activeView === 'analytics' && selectedQuizId) {
    return (
      <QuizAnalytics
        quizId={selectedQuizId}
        onBack={() => {
          setActiveView('dashboard');
          setSelectedQuizId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-gray-600">Welcome back, {profile?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setActiveView('create')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Quiz</span>
              </Button>
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Quizzes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quizzes.filter(q => q.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quizzes.reduce((sum, quiz) => sum + (quiz._count?.quiz_attempts || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Quizzes</CardTitle>
            <CardDescription>
              Manage your quizzes, view analytics, and track student progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No quizzes yet</p>
                <p className="text-sm">Create your first AI-generated quiz to get started</p>
                <Button onClick={() => setActiveView('create')} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                         <div className="flex items-center space-x-3 mb-2">
                           <h3 className="text-lg font-semibold">{quiz.title}</h3>
                           <Badge variant={quiz.is_active ? "default" : "secondary"}>
                             {quiz.is_active ? "Active" : "Inactive"}
                           </Badge>
                         </div>
                         <div className="flex items-center space-x-2 mb-2">
                           <span className="text-sm font-medium text-gray-700">Quiz Code:</span>
                            <Badge 
                              variant="outline" 
                              className="font-mono text-lg px-3 py-1 bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 cursor-pointer"
                              onClick={() => {
                                if (quiz.quiz_code) {
                                  navigator.clipboard.writeText(quiz.quiz_code);
                                  toast({
                                    title: "Copied!",
                                    description: `Quiz code ${quiz.quiz_code} copied to clipboard`,
                                  });
                                }
                              }}
                            >
                              {quiz.quiz_code || 'Loading...'}
                            </Badge>
                            <span className="text-xs text-gray-500">(Click to copy)</span>
                           </div>
                           
                           {/* Shareable Link Section */}
                           <div className="flex items-center space-x-2 mb-2">
                             <span className="text-sm font-medium text-gray-700">Share Link:</span>
                             <div className="flex items-center space-x-1">
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="h-7 px-2"
                                 onClick={() => {
                                   const shareUrl = `${window.location.origin}/quiz/${quiz.quiz_code}`;
                                   navigator.clipboard.writeText(shareUrl);
                                   toast({
                                     title: "Link Copied!",
                                     description: "Quiz link copied to clipboard",
                                   });
                                 }}
                               >
                                 <Copy className="h-3 w-3 mr-1" />
                                 Copy Link
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="h-7 px-2"
                                 onClick={() => {
                                   const shareUrl = `${window.location.origin}/quiz/${quiz.quiz_code}`;
                                   window.open(shareUrl, '_blank');
                                 }}
                               >
                                 <ExternalLink className="h-3 w-3 mr-1" />
                                 Open
                               </Button>
                             </div>
                           </div>
                           
                           <div className="text-xs text-gray-500 mb-2">
                             <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                               {window.location.origin}/quiz/{quiz.quiz_code}
                             </span>
                           </div>
                         <p className="text-gray-600 mb-2">{quiz.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{quiz.total_questions} questions</span>
                          <span>{quiz.duration_minutes} minutes</span>
                          <span>{quiz._count?.quiz_attempts || 0} attempts</span>
                        </div>
                      </div>
                       <div className="flex items-center space-x-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => {
                             const shareUrl = `${window.location.origin}/quiz/${quiz.quiz_code}`;
                             navigator.clipboard.writeText(shareUrl);
                             toast({
                               title: "Link Copied!",
                               description: "Students can now access this quiz using the copied link",
                             });
                           }}
                         >
                           <Share2 className="h-4 w-4 mr-1" />
                           Share
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => {
                             setSelectedQuizId(quiz.id);
                             setActiveView('analytics');
                           }}
                         >
                           <BarChart3 className="h-4 w-4 mr-1" />
                           Analytics
                         </Button>
                         <Button
                           size="sm"
                           variant={quiz.is_active ? "secondary" : "default"}
                           onClick={() => toggleQuizStatus(quiz.id, quiz.is_active)}
                         >
                           {quiz.is_active ? "Deactivate" : "Activate"}
                         </Button>
                         <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => deleteQuiz(quiz.id)}
                         >
                           Delete
                         </Button>
                       </div>
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
