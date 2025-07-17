import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  total_questions: number;
  duration_minutes: number;
  is_active: boolean;
  quiz_code: string;
  created_at: string;
  start_time: string | null;
  end_time: string | null;
  teacher_id: string;
  _count?: {
    quiz_attempts: number;
  };
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  completed_at: string;
  time_taken_minutes: number;
  is_completed: boolean;
  started_at: string;
  quiz?: {
    title: string;
    quiz_code: string;
    total_questions: number;
  };
}

export const useQuizManagement = (userId?: string) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch quizzes for teachers
  const fetchQuizzes = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          quiz_attempts(count)
        `)
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const quizzesWithCount = data.map(quiz => ({
        ...quiz,
        _count: {
          quiz_attempts: quiz.quiz_attempts?.length || 0
        }
      }));

      setQuizzes(quizzesWithCount);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to fetch quizzes');
      toast({
        title: "Error",
        description: "Failed to fetch quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch quiz attempts for students
  const fetchAttempts = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
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
        .eq('student_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const formattedAttempts = data.map(attempt => ({
        ...attempt,
        quiz: {
          title: attempt.quizzes?.title || 'Unknown Quiz',
          quiz_code: attempt.quizzes?.quiz_code || '',
          total_questions: attempt.quizzes?.total_questions || 0
        }
      }));

      setAttempts(formattedAttempts);
    } catch (err) {
      console.error('Error fetching attempts:', err);
      setError('Failed to fetch quiz attempts');
      toast({
        title: "Error",
        description: "Failed to fetch quiz attempts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get quiz by code
  const getQuizByCode = async (quizCode: string): Promise<Quiz | null> => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('quiz_code', quizCode.toUpperCase())
        .single();

      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('Error fetching quiz by code:', err);
      return null;
    }
  };

  // Toggle quiz status
  const toggleQuizStatus = async (quizId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_active: !currentStatus })
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quiz ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      await fetchQuizzes();
      return true;
    } catch (err) {
      console.error('Error updating quiz status:', err);
      toast({
        title: "Error",
        description: "Failed to update quiz status",
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete quiz
  const deleteQuiz = async (quizId: string) => {
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

      await fetchQuizzes();
      return true;
    } catch (err) {
      console.error('Error deleting quiz:', err);
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive",
      });
      return false;
    }
  };

  // Share quiz link
  const shareQuizLink = (quizCode: string) => {
    const shareUrl = `${window.location.origin}/quiz/${quizCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied!",
      description: "Students can now access this quiz using the copied link",
    });
    return shareUrl;
  };

  // Join quiz by code
  const joinQuizByCode = async (quizCode: string): Promise<{ success: boolean; quiz?: Quiz; message?: string }> => {
    try {
      const quiz = await getQuizByCode(quizCode);
      
      if (!quiz) {
        return { success: false, message: "Quiz not found or invalid code" };
      }

      if (!quiz.is_active) {
        return { success: false, message: "Quiz is not currently active" };
      }

      // Check time window
      const now = new Date();
      if (quiz.start_time && new Date(quiz.start_time) > now) {
        return { 
          success: false, 
          message: `Quiz will be available from ${new Date(quiz.start_time).toLocaleString()}` 
        };
      }

      if (quiz.end_time && new Date(quiz.end_time) < now) {
        return { 
          success: false, 
          message: `Quiz expired on ${new Date(quiz.end_time).toLocaleString()}` 
        };
      }

      // Check if already attempted
      if (userId) {
        const { data: existingAttempt } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quiz.id)
          .eq('student_id', userId)
          .single();

        if (existingAttempt) {
          return { success: false, message: "You have already attempted this quiz" };
        }
      }

      return { success: true, quiz };
    } catch (err) {
      console.error('Error joining quiz:', err);
      return { success: false, message: "Failed to join quiz. Please try again." };
    }
  };

  // Create realtime subscription for quiz updates
  const subscribeToQuizUpdates = (callback: () => void) => {
    if (!userId) return;

    const subscription = supabase
      .channel('quiz-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'quizzes',
          filter: `teacher_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  // Auto-fetch data when userId changes
  useEffect(() => {
    if (userId) {
      fetchQuizzes();
      fetchAttempts();
    }
  }, [userId]);

  return {
    // State
    quizzes,
    attempts,
    loading,
    error,
    
    // Actions
    fetchQuizzes,
    fetchAttempts,
    getQuizByCode,
    toggleQuizStatus,
    deleteQuiz,
    shareQuizLink,
    joinQuizByCode,
    subscribeToQuizUpdates,
    
    // Computed values
    activeQuizzes: quizzes.filter(q => q.is_active),
    totalAttempts: quizzes.reduce((sum, quiz) => sum + (quiz._count?.quiz_attempts || 0), 0),
    completedAttempts: attempts.filter(a => a.is_completed),
    averageScore: attempts.length > 0 
      ? Math.round(attempts.filter(a => a.is_completed).reduce((sum, attempt) => sum + attempt.score, 0) / attempts.filter(a => a.is_completed).length) || 0
      : 0,
  };
};