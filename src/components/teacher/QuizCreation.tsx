import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wand2, Upload, Plus, Minus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuestionConfig {
  type: 'multiple_choice' | 'theory' | 'fill_in_the_blank' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

interface GeneratedQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'theory' | 'fill_in_the_blank' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  correct_answer: string;
  options?: string[];
  points: number;
}

interface QuizCreationProps {
  onBack: () => void;
  onQuizCreated: () => void;
}

export const QuizCreation: React.FC<QuizCreationProps> = ({ onBack, onQuizCreated }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1 - Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
  
  // Step 2 - Question Configuration
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([
    { type: 'multiple_choice', difficulty: 'medium', count: 5 }
  ]);
  
  // Step 3 - Generated Questions
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const addQuestionConfig = () => {
    setQuestionConfigs([...questionConfigs, { type: 'multiple_choice', difficulty: 'medium', count: 1 }]);
  };

  const removeQuestionConfig = (index: number) => {
    setQuestionConfigs(questionConfigs.filter((_, i) => i !== index));
  };

  const updateQuestionConfig = (index: number, field: keyof QuestionConfig, value: any) => {
    const updated = [...questionConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setQuestionConfigs(updated);
  };

  const generateQuestions = async () => {
    setLoading(true);
    
    try {
      // Create the prompt for Gemini AI
      const totalQuestions = questionConfigs.reduce((sum, config) => sum + config.count, 0);
      const prompt = `Generate ${totalQuestions} quiz questions about "${topic}".

Question distribution:
${questionConfigs.map(config => 
  `${config.count} ${config.difficulty} ${config.type.replace('_', ' ')} questions`
).join('\n')}

For each question, provide:
1. Question text
2. Question type
3. Difficulty level
4. Correct answer
5. For multiple choice: provide 4 options (including the correct one)
6. Points (easy=1, medium=2, hard=3)

Format the response as a JSON array with this structure:
[
  {
    "question_text": "Question here?",
    "question_type": "multiple_choice",
    "difficulty": "medium",
    "correct_answer": "Correct answer",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "points": 2
  }
]

Make sure the questions are educational, accurate, and appropriate for the topic "${topic}".`;

      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      setGeneratedQuestions(data.questions);
      setStep(3);
      
      toast({
        title: "Success!",
        description: `Generated ${data.questions.length} questions successfully`,
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (index: number, field: keyof GeneratedQuestion, value: any) => {
    const updated = [...generatedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedQuestions(updated);
  };

  const saveQuiz = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a quiz.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create the quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title,
          description,
          topic,
          total_questions: generatedQuestions.length,
          duration_minutes: durationMinutes,
          is_active: false,
          teacher_id: user.id,
          quiz_code: '', // This will be auto-generated by the trigger
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create the questions
      const questionsToInsert = generatedQuestions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        correct_answer: q.correct_answer,
        options: q.options ? JSON.stringify(q.options) : null,
        points: q.points,
        order_index: index,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "Quiz Created!",
        description: `Quiz "${title}" has been created successfully with code ${quiz.quiz_code}`,
      });

      onQuizCreated();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Create New Quiz</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Set up the basic details for your quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter quiz title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the quiz"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic/Subject</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., World War II, Photosynthesis, Algebra"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  min="5"
                  max="180"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pdf">Upload PDF (Optional)</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-gray-500">
                  Upload a PDF to generate questions from the content
                </p>
              </div>
              
              <Button 
                onClick={() => setStep(2)} 
                className="w-full"
                disabled={!title || !topic}
              >
                Next: Configure Questions
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Question Configuration */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Question Configuration</CardTitle>
              <CardDescription>
                Specify the types and difficulty of questions you want
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questionConfigs.map((config, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Question Set {index + 1}</h4>
                    {questionConfigs.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeQuestionConfig(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={config.type}
                        onValueChange={(value) => updateQuestionConfig(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="theory">Theory</SelectItem>
                          <SelectItem value="fill_in_the_blank">Fill in the Blank</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select
                        value={config.difficulty}
                        onValueChange={(value) => updateQuestionConfig(index, 'difficulty', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Count</Label>
                      <Input
                        type="number"
                        value={config.count}
                        onChange={(e) => updateQuestionConfig(index, 'count', parseInt(e.target.value))}
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button onClick={addQuestionConfig} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Question Set
              </Button>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Previous
                </Button>
                <Button onClick={generateQuestions} disabled={loading}>
                  {loading ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Questions with AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review and Edit Generated Questions */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Generated Questions</CardTitle>
              <CardDescription>
                Review and edit the AI-generated questions before saving
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {generatedQuestions.map((question, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="secondary">Question {index + 1}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <Badge variant="outline">{question.question_type.replace('_', ' ')}</Badge>
                    <Badge variant="outline">{question.points} pts</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  {question.options && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {question.options.map((option, optionIndex) => (
                        <Input
                          key={optionIndex}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...question.options!];
                            newOptions[optionIndex] = e.target.value;
                            updateQuestion(index, 'options', newOptions);
                          }}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Input
                      value={question.correct_answer}
                      onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Previous
                </Button>
                <Button onClick={saveQuiz} disabled={loading}>
                  {loading ? "Saving..." : "Save Quiz"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};
